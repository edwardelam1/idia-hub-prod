// Edge function: wix-payment-webhook
// Phase 2 settlement backstop. Wix Automations POSTs paymentReceived events
// here with an x-wix-signature header (HMAC-SHA256 of the raw body using
// WIX_WEBHOOK_SECRET). On valid signed payloads we idempotently insert a
// ledger row keyed by paymentId. JWT verification is disabled in config.toml.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "content-type, x-wix-signature, x-wix-event",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CREDIT_RATE_USD = 0.75;

interface WixWebhookPayload {
  paymentId?: string;
  userId?: string;
  amount?: number; // USD
  credits?: number;
  status?: string;
  planId?: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-wix-signature") ?? "";
  const secret = Deno.env.get("WIX_WEBHOOK_SECRET") ?? "";

  if (!secret) {
    console.error("[wix-payment-webhook] missing WIX_WEBHOOK_SECRET env");
    return json({ error: "server_misconfigured" }, 500);
  }

  const expectedSig = await hmacHex(secret, rawBody);
  if (!timingSafeEqual(expectedSig, signatureHeader.trim().toLowerCase())) {
    console.warn("[wix-payment-webhook] signature mismatch");
    return json({ error: "invalid_signature" }, 401);
  }

  let payload: WixWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const paymentId = String(payload.paymentId ?? "").trim();
  const userId = String(payload.userId ?? "").trim();
  const status = String(payload.status ?? "").toLowerCase();
  const amountUsd = Number(payload.amount ?? 0);

  if (!paymentId || !userId) return json({ error: "missing_fields" }, 400);
  if (!["paid", "approved", "completed", "success"].includes(status)) {
    console.log(`[wix-payment-webhook] ignoring status=${status} paymentId=${paymentId}`);
    return json({ ok: true, ignored: true, reason: "status_not_paid" });
  }
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return json({ error: "invalid_amount" }, 400);
  }

  const credits = payload.credits && Number.isFinite(payload.credits)
    ? Number(payload.credits)
    : amountUsd / CREDIT_RATE_USD;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SECRET_KEY")!,
  );

  const { error } = await admin.from("synapse_credit_ledger").insert({
    user_id: userId,
    entry_type: "deposit",
    transaction_type: "synapse_purchase",
    amount: credits,
    amount_usdc: amountUsd,
    funding_source: "FIAT_FBO",
    status: "completed",
    description: `Wix purchase ($${amountUsd.toFixed(2)})`,
    transaction_id: paymentId,
    metadata: {
      source: "wix-payment-webhook",
      planId: payload.planId ?? null,
      ...(payload.metadata ?? {}),
    },
  });

  if (error) {
    if (error.code === "23505") {
      console.log(`[wix-payment-webhook] already recorded paymentId=${paymentId}`);
      return json({ ok: true, alreadyRecorded: true });
    }
    console.error(`[wix-payment-webhook] insert error: ${error.message}`);
    return json({ error: error.message }, 500);
  }

  console.log(`[wix-payment-webhook] recorded paymentId=${paymentId} user=${userId}`);
  return json({ ok: true, alreadyRecorded: false, credits });
});

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}