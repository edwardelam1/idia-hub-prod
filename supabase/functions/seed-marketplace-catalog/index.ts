import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tier gates are based on RECORD volume of real anonymized data.
// Participant counts in early Hub stages are tiny; volume reflects depth.
const TIERS: Array<{ tier: string; minRecords: number }> = [
  { tier: "Analyst", minRecords: 10 },
  { tier: "Professional", minRecords: 250 },
  { tier: "Enterprise", minRecords: 1000 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Pull live anonymized aggregates from the real source-of-truth tables:
    //   staged_health_data       (biometric + activity records)
    //   staged_lifestyle_data    (lifestyle / behavioral / social events)
    // GOLDEN RULE: never fabricate. If both are empty, exit with seeded=0.
    const [healthRes, lifestyleRes] = await Promise.all([
      supabase
        .from("staged_health_data")
        .select("activity_type,faculty,data_quality_score,user_id,pseudo_user_id"),
      supabase
        .from("staged_lifestyle_data")
        .select("event_category,event_type,data_quality_score,user_id,pseudo_user_id"),
    ]);

    if (healthRes.error) throw healthRes.error;
    if (lifestyleRes.error) throw lifestyleRes.error;

    const healthRows = healthRes.data ?? [];
    const lifestyleRows = lifestyleRes.data ?? [];

    if (healthRows.length === 0 && lifestyleRows.length === 0) {
      return new Response(
        JSON.stringify({
          seeded: 0,
          reason:
            "No anonymized records in staged_health_data or staged_lifestyle_data. Upstream pipeline must run first.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Group by category. Health -> faculty (biometric / activity / etc.).
    // Lifestyle -> event_category (social / behavioral / location).
    const byCategory: Record<string, any[]> = {};
    for (const r of healthRows) {
      const cat = `health.${(r as any).faculty ?? (r as any).activity_type ?? "general"}`;
      (byCategory[cat] ??= []).push(r);
    }
    for (const r of lifestyleRows) {
      const cat = `lifestyle.${(r as any).event_category ?? "general"}`;
      (byCategory[cat] ??= []).push(r);
    }

    let seeded = 0;
    const errors: string[] = [];

    for (const [category, rows] of Object.entries(byCategory)) {
      const totalRecords = rows.length;
      const uniqueUsers = new Set(
        rows
          .map((r: any) => r.pseudo_user_id ?? r.user_id)
          .filter((v) => v != null),
      ).size;
      const avgQuality =
        rows.reduce((sum, r: any) => sum + (r.data_quality_score ?? 0), 0) /
        totalRecords;

      for (const { tier, minRecords } of TIERS) {
        if (totalRecords < minRecords) continue;

        const payload = {
          action: "curate_and_publish",
          bundleType: category,
          data: {
            length: totalRecords,
            participant_count: uniqueUsers,
            unique_users_count: uniqueUsers,
            avg_quality_score: avgQuality,
            category,
            bundle_category: category,
            tier,
            data_fusion_level:
              category.startsWith("health.") && byCategory[`lifestyle.${category.split(".")[1]}`]
                ? "multi_source"
                : "single_source",
            data_json: {
              source: category.startsWith("health.")
                ? "staged_health_data"
                : "staged_lifestyle_data",
              record_count: totalRecords,
              unique_users: uniqueUsers,
            },
            geographic_coverage: "Anonymized zones",
          },
        };

        try {
          const resp = await fetch(`${supabaseUrl}/functions/v1/ai-data-curator`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify(payload),
          });
          const result = await resp.json();
          if (!resp.ok || result.error) {
            errors.push(`${category}/${tier}: ${result.error ?? resp.status}`);
          } else {
            seeded++;
          }
        } catch (e) {
          errors.push(`${category}/${tier}: ${(e as Error).message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ seeded, errors, categories: Object.keys(byCategory) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("seed-marketplace-catalog error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});