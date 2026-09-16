// Quote Bundle — server-side authority on what a cart line costs.
// The client may display a price; this is the price that gets charged.
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

  console.info("[PHASE_START: QuoteBundle.Request]");
  try {
    console.info("[PHASE_START: QuoteBundle.Auth]");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.info("[PHASE_END: QuoteBundle.Auth] missing bearer");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      console.info("[PHASE_END: QuoteBundle.Auth] invalid claims");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.info("[PHASE_END: QuoteBundle.Auth] ok");

    console.info("[PHASE_START: QuoteBundle.Validate]");
    const body = await req.json().catch(() => ({}));
    // Accept both the legacy shape (bundle_ids) and the scoped shape (items).
    const rawItems: any[] = Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.bundle_ids)
        ? body.bundle_ids.map((id: string) => ({ bundle_id: id }))
        : [];
    if (rawItems.length === 0) {
      console.info("[PHASE_END: QuoteBundle.Validate] no items");
      return new Response(JSON.stringify({ error: "No cart items supplied" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rawItems.length > 50) {
      console.info("[PHASE_END: QuoteBundle.Validate] too many items");
      return new Response(JSON.stringify({ error: "Too many cart items (max 50)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.info(`[PHASE_END: QuoteBundle.Validate] items=${rawItems.length}`);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const bundleIds = [...new Set(rawItems.map((i) => String(i.bundle_id ?? "")).filter(Boolean))];

    console.info(`[PHASE_START: QuoteBundle.DB.Catalogue] ids=${bundleIds.length}`);
    const { data: bundles, error: bundleErr } = await admin
      .from("marketplace_bundles")
      .select("bundle_id, title, price, data_json, is_active")
      .in("bundle_id", bundleIds);
    if (bundleErr) throw bundleErr;
    console.info(`[PHASE_END: QuoteBundle.DB.Catalogue] rows=${bundles?.length ?? 0}`);

    console.info("[PHASE_START: QuoteBundle.Price]");
    const items: any[] = [];
    let total = 0;
    for (const raw of rawItems) {
      const bundle = (bundles ?? []).find((b: any) => b.bundle_id === raw.bundle_id);
      if (!bundle || !bundle.is_active) {
        items.push({
          bundle_id: raw.bundle_id,
          streams: raw.streams ?? [],
          name: raw.name ?? "Unavailable bundle",
          base_valuation: 0,
          unavailable: true,
        });
        continue;
      }
      const quantity = Math.max(1, Math.min(10, Number(raw.quantity ?? 1)));
      const { price, recordCount, streams } = priceSelection(
        (bundle.data_json as any)?.activity_mix,
        Number(bundle.price ?? 0),
        raw.streams,
      );
      const lineTotal = price * quantity;
      total += lineTotal;
      items.push({
        bundle_id: bundle.bundle_id,
        name: bundle.title,
        streams,
        record_count: recordCount,
        quantity,
        base_valuation: price,
        line_total: lineTotal,
        stale: raw.price != null && Number(raw.price) !== price,
      });
    }
    console.info(`[PHASE_END: QuoteBundle.Price] total=${total}`);

    console.info("[PHASE_END: QuoteBundle.Request] ok");
    return new Response(JSON.stringify({ items, total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(
      "[FATAL: QuoteBundle]",
      err instanceof Error ? `${err.message}\n${err.stack}` : String(err),
    );
    console.info("[PHASE_END: QuoteBundle.Request] failed");
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Quote failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
