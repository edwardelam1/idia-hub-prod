import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIERS = [
  { tier: "Analyst", minRecords: 10 },
  { tier: "Professional", minRecords: 250 },
  { tier: "Enterprise", minRecords: 1000 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  console.info("[BEGIN: LifestyleBundle.Handler]");
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    console.info("[BEGIN: LifestyleBundle.DB.SelectStagedLifestyle]");
    const { data: rows, error } = await supabase
      .from("staged_lifestyle_data")
      .select("event_category,event_type,data_quality_score,user_id,pseudo_user_id");
    console.info(`[END: LifestyleBundle.DB.SelectStagedLifestyle] count=${rows?.length ?? 0} error=${error?.message ?? "none"}`);
    if (error) throw error;

    const lifestyleRows = rows ?? [];
    if (lifestyleRows.length === 0) {
      console.info("[END: LifestyleBundle.Handler] reason=empty_source");
      return new Response(
        JSON.stringify({ seeded: 0, reason: "staged_lifestyle_data empty — Golden Rule preserved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const byCategory: Record<string, any[]> = {};
    for (const r of lifestyleRows) {
      const cat = `lifestyle.${(r as any).event_category ?? "general"}`;
      (byCategory[cat] ??= []).push(r);
    }

    let seeded = 0;
    const errors: string[] = [];

    for (const [category, group] of Object.entries(byCategory)) {
      const totalRecords = group.length;
      const uniqueUsers = new Set(
        group.map((r: any) => r.pseudo_user_id ?? r.user_id).filter((v) => v != null),
      ).size;
      const avgQuality =
        group.reduce((s, r: any) => s + (r.data_quality_score ?? 0), 0) / totalRecords;

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
            data_fusion_level: "single_source",
            data_json: { source: "staged_lifestyle_data", record_count: totalRecords, unique_users: uniqueUsers },
            geographic_coverage: "Anonymized zones",
          },
        };

        console.info(`[BEGIN: LifestyleBundle.FetchCurator] category=${category} tier=${tier}`);
        try {
          const resp = await fetch(`${supabaseUrl}/functions/v1/ai-data-curator`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify(payload),
          });
          const result = await resp.json().catch(() => ({}));
          console.info(`[END: LifestyleBundle.FetchCurator] category=${category} tier=${tier} status=${resp.status} ok=${resp.ok}`);
          if (!resp.ok || result.error) {
            errors.push(`${category}/${tier}: ${result.error ?? resp.status}`);
          } else {
            seeded++;
          }
        } catch (e) {
          console.error(`[CATCH: LifestyleBundle.FetchCurator] category=${category} tier=${tier} error=${(e as Error).message}`);
          errors.push(`${category}/${tier}: ${(e as Error).message}`);
        }
      }
    }

    console.info(`[END: LifestyleBundle.Handler] seeded=${seeded} errors=${errors.length}`);
    return new Response(
      JSON.stringify({ seeded, errors, categories: Object.keys(byCategory) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`[CATCH: LifestyleBundle.Handler] ${(error as Error).message}`);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
