import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildFingerprint, WindowKey, WINDOW_KEYS } from "./bundle-freshness.ts";
import { resolveSizeLabel } from "./bundle-pricing.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** A window must hold at least this many records to be worth listing. */
const MIN_RECORDS = 10;


export interface RunOptions {
  /** staging table name as reported by get_staging_aggregates_windowed */
  source: string;
  /** log prefix, e.g. "HealthBundle" */
  label: string;
  /** key used for the contributor field inside data_json */
  contributorKey: string;
}

/**
 * Generates marketplace bundles for every (category, tier, time window) that has
 * real data. Publishing itself is gated by the curator's volatility check —
 * this runner never fabricates records (Golden Rule).
 */
export async function runWindowedBundleGeneration({ source, label, contributorKey }: RunOptions) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey);

  console.info(`[BEGIN: ${label}.DB.WindowedAggregates]`);
  const { data: aggregates, error } = await supabase.rpc("get_staging_aggregates_windowed");
  console.info(
    `[END: ${label}.DB.WindowedAggregates] rows=${aggregates?.length ?? 0} error=${error?.message ?? "none"}`,
  );
  if (error) throw error;

  const groups = (aggregates ?? []).filter(
    (a: any) => a.source === source && Number(a.total_records) > 0,
  );

  if (groups.length === 0) {
    console.info(`[END: ${label}.Handler] reason=empty_source`);
    return { seeded: 0, unchanged: 0, deactivated: 0, errors: [], reason: `${source} empty — Golden Rule preserved` };
  }

  let seeded = 0;
  let unchanged = 0;
  const errors: string[] = [];
  const liveKeys = new Set<string>();

  // Order windows deterministically: freshest first.
  const ordered = [...groups].sort(
    (a: any, b: any) => WINDOW_KEYS.indexOf(a.window_key as WindowKey) - WINDOW_KEYS.indexOf(b.window_key as WindowKey),
  );

  for (const group of ordered) {
    const category = group.category as string;
    const windowKey = group.window_key as string;
    const totalRecords = Number(group.total_records);
    const contributors = Number(group.distinct_contributors);
    const avgQuality = Number(group.avg_quality);
    const fingerprint = buildFingerprint(group);

    if (totalRecords < MIN_RECORDS) continue;

    // Exactly one listing per (category, window). The label below describes the
    // size of the dataset; it never influences price.
    const tier = resolveSizeLabel(totalRecords);
    liveKeys.add(`${category}|${windowKey}`);

    const payload = {
      action: "curate_and_publish",
      bundleType: category,
      data: {
        length: totalRecords,
        record_count: totalRecords,
        participant_count: contributors,
        unique_users_count: contributors,
        avg_quality_score: avgQuality,
        category,
        bundle_category: category,
        tier,
        data_fusion_level: "single_source",
        window_key: windowKey,
        window_start: group.window_start,
        window_end: group.window_end,
        source_latest_at: group.source_latest_at,
        stat_fingerprint: fingerprint,
        data_json: {
          source,
          record_count: totalRecords,
          [contributorKey]: contributors,
          window_key: windowKey,
          window_start: group.window_start,
          window_end: group.window_end,
          source_latest_at: group.source_latest_at,
          activity_mix: group.activity_mix ?? {},
        },
        geographic_coverage: "Anonymized zones",
      },
    };

    console.info(`[BEGIN: ${label}.Curate] category=${category} window=${windowKey} records=${totalRecords}`);
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/ai-data-curator`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify(payload),
      });
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok || result.error) {
        errors.push(`${category}/${windowKey}: ${result.error ?? resp.status}`);
      } else if (result?.result?.mode === "unchanged") {
        unchanged++;
      } else {
        seeded++;
      }
    } catch (e) {
      console.error(`[CATCH: ${label}.Curate] category=${category} window=${windowKey} error=${(e as Error).message} stack=${(e as Error).stack}`);
      errors.push(`${category}/${windowKey}: ${(e as Error).message}`);
    }
    console.info(`[END: ${label}.Curate] category=${category} window=${windowKey}`);
  }


  // Windows that no longer hold data must not keep selling dead numbers.
  let deactivated = 0;
  const categories = Array.from(new Set(groups.map((g: any) => g.category as string)));
  // Match on the domain root (e.g. "health") so listings from retired
  // sub-categories are swept too, not just the ones still being generated.
  const roots = Array.from(new Set(categories.map((c) => c.split(".")[0])));
  if (roots.length > 0) {
    const { data: activeRows } = await supabase
      .from("marketplace_bundles")
      .select("bundle_id, category, tier, window_key")
      .eq("is_active", true);

    const stale = (activeRows ?? []).filter(
      (r: any) =>
        roots.includes(String(r.category ?? "").split(".")[0]) &&
        !liveKeys.has(`${r.category}|${r.window_key ?? "all"}`),
    );
    if (stale.length > 0) {
      const { error: deactivateError } = await supabase
        .from("marketplace_bundles")
        .update({ is_active: false })
        .in("bundle_id", stale.map((r: any) => r.bundle_id));
      if (deactivateError) errors.push(`deactivate: ${deactivateError.message}`);
      else deactivated = stale.length;
    }
  }

  console.info(
    `[END: ${label}.Handler] seeded=${seeded} unchanged=${unchanged} deactivated=${deactivated} errors=${errors.length}`,
  );
  return { seeded, unchanged, deactivated, errors, categories };
}
