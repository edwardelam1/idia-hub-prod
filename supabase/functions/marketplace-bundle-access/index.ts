// Marketplace Bundle Access — Live egress via synapse-controller (no simulation).
// Mirrors Best Friend AI's receipt transmission pattern.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SECRET_KEY")!;

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
    const { bundle_id, quantity = 1 } = body ?? {};
    if (!bundle_id || typeof bundle_id !== "string") {
      console.info("[BEGIN: MarketplaceBundleAccess.Validation.Stall] bundle_id missing.");
      return new Response(JSON.stringify({ error: "bundle_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

    console.info(`[BEGIN: MarketplaceBundleAccess.BundleResolve] bundle_id=${bundle_id}`);
    const { data: bundle, error: bundleErr } = await admin
      .from("marketplace_bundles")
      .select("bundle_id, title, category, data_json, is_active")
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

    // Pull the real ACA record keys backing this bundle.
    const dj: any = bundle.data_json ?? {};
    const acaRecordIds: string[] = Array.isArray(dj.aca_record_ids)
      ? dj.aca_record_ids
      : Array.isArray(dj.records)
        ? dj.records.map((r: any) => r?.aca_hash_key ?? r?.id).filter(Boolean)
        : [];

    if (acaRecordIds.length === 0) {
      console.info("[BEGIN: MarketplaceBundleAccess.Lineage.Stall] No auditable lineage in bundle.");
      return new Response(JSON.stringify({ error: "Bundle has no auditable lineage." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.info(`[END: MarketplaceBundleAccess.BundleResolve] records=${acaRecordIds.length}`);

    // Hand off to synapse-controller — same contract Best Friend AI uses.
    console.info("[BEGIN: MarketplaceBundleAccess.SynapseHandoff]");
    const synapseRes = await fetch(`${SUPABASE_URL}/functions/v1/synapse-controller`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        apikey: SUPABASE_SECRET_KEY,
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
