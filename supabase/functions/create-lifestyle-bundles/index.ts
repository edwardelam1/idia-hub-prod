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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    console.info("[BEGIN: LifestyleBundle.DB.StagingAggregates]");
    const { data: aggregates, error } = await supabase.rpc("get_staging_aggregates");
    console.info(
      `[END: LifestyleBundle.DB.StagingAggregates] rows=${aggregates?.length ?? 0} error=${error?.message ?? "none"}`,
    );
    if (error) throw error;

    const groups = (aggregates ?? []).filter(
      (a: any) => a.source === "staged_lifestyle_data" && Number(a.total_records) > 0,
    );

    if (groups.length === 0) {
      console.info("[END: LifestyleBundle.Handler] reason=empty_source");
      return new Response(
        JSON.stringify({ seeded: 0, reason: "staged_lifestyle_data empty — Golden Rule preserved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let seeded = 0;
    const errors: string[] = [];

    for (const group of groups) {
      const category = group.category as string;
      const totalRecords = Number(group.total_records);
      const uniqueUsers = Number(group.distinct_contributors);
      const avgQuality = Number(group.avg_quality);

      for (const { tier, minRecords } of TIERS) {
        if (totalRecords < minRecords) continue;

        const payload = {
          action: "curate_and_publish",
          bundleType: category,
          data: {
            length: totalRecords,
            record_count: totalRecords,
            participant_count: uniqueUsers,
            unique_users_count: uniqueUsers,
            avg_quality_score: avgQuality,
            category,
            bundle_category: category,
            tier,
            data_fusion_level: "single_source",
            data_json: {
              source: "staged_lifestyle_data",
              record_count: totalRecords,
              unique_users: uniqueUsers,
            },
            geographic_coverage: "Anonymized zones",
          },
        };

        console.info(`[BEGIN: LifestyleBundle.FetchCurator] category=${category} tier=${tier} records=${totalRecords}`);
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
      JSON.stringify({ seeded, errors, categories: groups.map((g: any) => g.category) }),
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
