// Marketplace Bundle Access — Live egress via synapse-controller (no simulation).
// Mirrors Best Friend AI's receipt transmission pattern.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { priceSelection } from "../_shared/stream-pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    console.info("[BEGIN: MarketplaceBundleAccess.Request]");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.info("[BEGIN: MarketplaceBundleAccess.Auth.Stall] Missing bearer.");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      console.info("[BEGIN: MarketplaceBundleAccess.Auth.Stall] Claims invalid.");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { bundle_id, quantity = 1, streams: requestedStreams } = body ?? {};
    if (!bundle_id || typeof bundle_id !== "string") {
      console.info("[BEGIN: MarketplaceBundleAccess.Validation.Stall] bundle_id missing.");
      return new Response(JSON.stringify({ error: "bundle_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.info(`[BEGIN: MarketplaceBundleAccess.BundleResolve] bundle_id=${bundle_id}`);
    const { data: bundle, error: bundleErr } = await admin
      .from("marketplace_bundles")
      .select("bundle_id, title, category, data_json, is_active, price, window_key, window_start, window_end")
      .eq("bundle_id", bundle_id)
      .maybeSingle();

    if (bundleErr || !bundle) {
      console.info("[BEGIN: MarketplaceBundleAccess.BundleResolve.Stall] not found.");
      return new Response(JSON.stringify({ error: "Bundle not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!bundle.is_active) {
      return new Response(JSON.stringify({ error: "Bundle is inactive" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dj: any = bundle.data_json ?? {};

    // Price this purchase server-side. A partial (à la carte) pick pays exactly
    // its share of the records; the client's number is never trusted.
    console.info("[PHASE_START: MarketplaceBundleAccess.Price]");
    const selection = priceSelection(
      dj?.activity_mix,
      Number((bundle as any).price ?? 0),
      Array.isArray(requestedStreams) ? requestedStreams.map((s: unknown) => String(s)) : null,
    );
    if (Array.isArray(requestedStreams) && requestedStreams.length > 0 && selection.streams.length === 0) {
      console.info("[PHASE_END: MarketplaceBundleAccess.Price] selected streams no longer in bundle");
      return new Response(
        JSON.stringify({ error: "The selected data streams are no longer part of this bundle." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.info(
      `[PHASE_END: MarketplaceBundleAccess.Price] price=${selection.price} streams=${selection.streams.length}`,
    );

    // Resolve the real source records backing this purchase.
    console.info("[PHASE_START: MarketplaceBundleAccess.Lineage]");
    let acaRecordIds: string[] = Array.isArray(dj.aca_record_ids)
      ? dj.aca_record_ids
      : Array.isArray(dj.records)
        ? dj.records.map((r: any) => r?.aca_hash_key ?? r?.id).filter(Boolean)
        : [];

    if (acaRecordIds.length === 0) {
      const root = String(bundle.category ?? "").split(".")[0];
      const LINEAGE_SOURCES: Record<string, { table: string; typeColumn: string | null; timeColumn: string }> = {
        health: { table: "staged_health_data", typeColumn: "activity_type", timeColumn: "created_at" },
        lifestyle: { table: "staged_lifestyle_data", typeColumn: "event_type", timeColumn: "created_at" },
        business: { table: "staged_business_data", typeColumn: null, timeColumn: "created_at" },
        vehicle: { table: "staged_ford_data", typeColumn: "metric_type", timeColumn: "recorded_at" },
        ford: { table: "staged_ford_data", typeColumn: "metric_type", timeColumn: "recorded_at" },
      };
      const src = LINEAGE_SOURCES[root];
      if (!src) {
        console.info(`[PHASE_END: MarketplaceBundleAccess.Lineage] unknown source root=${root}`);
        return new Response(JSON.stringify({ error: "Bundle has no auditable lineage." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let query = admin.from(src.table).select("aca_hash_key").limit(5000);
      const windowStart = (bundle as any).window_start as string | null;
      const windowEnd = (bundle as any).window_end as string | null;
      if (windowStart && !windowStart.startsWith("-infinity")) query = query.gte(src.timeColumn, windowStart);
      if (windowEnd) query = query.lte(src.timeColumn, windowEnd);

      const lineageStreams =
        selection.streams.length > 0 ? selection.streams : Object.keys(dj?.activity_mix ?? {});
      if (src.typeColumn && lineageStreams.length > 0) query = query.in(src.typeColumn, lineageStreams);

      const { data: lineageRows, error: lineageErr } = await query;
      if (lineageErr) throw lineageErr;
      acaRecordIds = (lineageRows ?? []).map((r: any) => r.aca_hash_key).filter(Boolean);
      console.info(
        `[PHASE_END: MarketplaceBundleAccess.Lineage] table=${src.table} streams=${lineageStreams.length} records=${acaRecordIds.length}`,
      );
    } else {
      console.info(`[PHASE_END: MarketplaceBundleAccess.Lineage] embedded records=${acaRecordIds.length}`);
    }

    if (acaRecordIds.length === 0) {
      console.info("[PHASE_END: MarketplaceBundleAccess.Lineage] empty after resolution");
      return new Response(JSON.stringify({ error: "No source records remain for this selection." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hand off to synapse-controller — same contract Best Friend AI uses.
    console.info("[BEGIN: MarketplaceBundleAccess.SynapseHandoff]");
    const synapseRes = await fetch(`${SUPABASE_URL}/functions/v1/synapse-controller`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        user_id: userId,
        client_id: "IDIA_HUB_MARKETPLACE",
        intent_type: "MARKETPLACE_BUNDLE_ACCESS",
        sub_module_id: bundle.category ?? "general",
        aca_record_ids: acaRecordIds,
        metadata: {
          bundle_id: bundle.bundle_id,
          bundle_title: bundle.title,
          quantity,
        },
      }),
    });

    const synapsePayload = await synapseRes.json().catch(() => ({}));
    if (!synapseRes.ok || synapsePayload?.error) {
      console.info(
        `[BEGIN: MarketplaceBundleAccess.SynapseHandoff.Stall] HTTP ${synapseRes.status}: ${synapsePayload?.error}`,
      );
      return new Response(
        JSON.stringify({ error: synapsePayload?.error ?? "Synapse controller rejected egress." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.info(`[END: MarketplaceBundleAccess.SynapseHandoff] ref=${synapsePayload.reference_id}`);

    console.info("[END: MarketplaceBundleAccess.Request] success.");
    return new Response(
      JSON.stringify({
        success: true,
        bundle_id: bundle.bundle_id,
        bundle_title: bundle.title,
        fee_cr: synapsePayload.fee,
        reference_id: synapsePayload.reference_id,
        consumed_records: synapsePayload.consumed_records,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.info("[BEGIN: MarketplaceBundleAccess.Request.Stall]");
    console.error("[FATAL: MarketplaceBundleAccess]", err?.message);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
