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

  console.info("[BEGIN: BusinessBundle.Handler]");
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    console.info("[BEGIN: BusinessBundle.DB.SelectStagedBusiness]");
    const { data: rows, error } = await supabase
      .from("staged_business_data")
      .select("business_category,data_quality_score,pseudo_business_id");
    console.info(`[END: BusinessBundle.DB.SelectStagedBusiness] count=${rows?.length ?? 0} error=${error?.message ?? "none"}`);
    if (error) throw error;

    const businessRows = rows ?? [];
    if (businessRows.length === 0) {
      console.info("[END: BusinessBundle.Handler] reason=empty_source");
      return new Response(
        JSON.stringify({ seeded: 0, reason: "staged_business_data empty — Golden Rule preserved" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const byCategory: Record<string, any[]> = {};
    for (const r of businessRows) {
      const cat = `business.${(r as any).business_category ?? "general"}`;
      (byCategory[cat] ??= []).push(r);
    }

    let seeded = 0;
    const errors: string[] = [];

    for (const [category, group] of Object.entries(byCategory)) {
      const totalRecords = group.length;
      const uniqueBusinesses = new Set(
        group.map((r: any) => r.pseudo_business_id).filter((v) => v != null),
      ).size;
      const avgQuality =
        group.reduce((s, r: any) => s + Number(r.data_quality_score ?? 0), 0) / totalRecords;

      for (const { tier, minRecords } of TIERS) {
        if (totalRecords < minRecords) continue;

        const payload = {
          action: "curate_and_publish",
          bundleType: category,
          data: {
            length: totalRecords,
            participant_count: uniqueBusinesses,
            unique_users_count: uniqueBusinesses,
            avg_quality_score: avgQuality,
            category,
            bundle_category: category,
            tier,
            data_fusion_level: "single_source",
            data_json: { source: "staged_business_data", record_count: totalRecords, unique_businesses: uniqueBusinesses },
            geographic_coverage: "Anonymized zones",
          },
        };

        console.info(`[BEGIN: BusinessBundle.FetchCurator] category=${category} tier=${tier}`);
        try {
          const resp = await fetch(`${supabaseUrl}/functions/v1/ai-data-curator`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify(payload),
          });
          const result = await resp.json().catch(() => ({}));
          console.info(`[END: BusinessBundle.FetchCurator] category=${category} tier=${tier} status=${resp.status} ok=${resp.ok}`);
          if (!resp.ok || result.error) {
            errors.push(`${category}/${tier}: ${result.error ?? resp.status}`);
          } else {
            seeded++;
          }
        } catch (e) {
          console.error(`[CATCH: BusinessBundle.FetchCurator] category=${category} tier=${tier} error=${(e as Error).message}`);
          errors.push(`${category}/${tier}: ${(e as Error).message}`);
        }
      }
    }

    console.info(`[END: BusinessBundle.Handler] seeded=${seeded} errors=${errors.length}`);
    return new Response(
      JSON.stringify({ seeded, errors, categories: Object.keys(byCategory) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error(`[CATCH: BusinessBundle.Handler] ${(error as Error).message}`);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
