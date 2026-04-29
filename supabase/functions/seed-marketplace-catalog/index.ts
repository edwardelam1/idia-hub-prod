import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TIERS: Array<{ tier: string; minParticipants: number }> = [
  { tier: "Analyst", minParticipants: 25 },
  { tier: "Professional", minParticipants: 100 },
  { tier: "Enterprise", minParticipants: 500 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Pull live aggregates produced by the upstream pipeline.
    // GOLDEN RULE: never fabricate. If empty, we exit with seeded=0.
    const { data: aggregates, error: aggErr } = await supabase
      .from("universal_data_bundles")
      .select("*")
      .order("created_at", { ascending: false });

    if (aggErr) throw aggErr;

    if (!aggregates || aggregates.length === 0) {
      return new Response(
        JSON.stringify({
          seeded: 0,
          reason:
            "No source aggregates in universal_data_bundles. Upstream pipeline must run first.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Group aggregates by bundle_category so we can spawn one bundle per category per tier.
    const byCategory: Record<string, any[]> = {};
    for (const row of aggregates) {
      const cat = row.bundle_category ?? "general";
      (byCategory[cat] ??= []).push(row);
    }

    let seeded = 0;
    const errors: string[] = [];

    for (const [category, rows] of Object.entries(byCategory)) {
      const totalUsers = rows.reduce(
        (sum, r: any) => sum + (r.unique_users_count ?? 0),
        0,
      );
      const avgQuality =
        rows.reduce((sum, r: any) => sum + (r.quality_score ?? 0), 0) /
        rows.length;

      for (const { tier, minParticipants } of TIERS) {
        if (totalUsers < minParticipants) continue;

        const payload = {
          action: "curate_and_publish",
          bundleType: category,
          data: {
            length: rows.length,
            participant_count: totalUsers,
            unique_users_count: totalUsers,
            avg_quality_score: avgQuality,
            category,
            bundle_category: category,
            data_fusion_level: rows.length > 1 ? "multi_source" : "single_source",
            data_json: { source_aggregate_ids: rows.map((r: any) => r.id) },
            geographic_coverage: "Multiple zones",
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