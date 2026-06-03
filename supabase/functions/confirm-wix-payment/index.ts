// Edge function: confirm-wix-payment
// Phase 1 settlement path. Called by the SPA after Wix redirects the user
// back to /billing?success=true&paymentId=... or /purchase?success=true&paymentId=...
// Verifies the payment with Wix, then idempotently inserts a row into
// public.synapse_credit_ledger keyed by transaction_id = paymentId.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WIX_DOMAIN = "https://www.thebigidia.com";
const CREDIT_RATE_USD = 0.75; // 1 CR = $0.75

interface WixStatusResponse {
  paymentId?: string;
  status?: string; // expected "paid" | "approved" | "completed"
  amount?: number; // USD
  userId?: string;
  planId?: string;
  credits?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SECRET_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const paymentId = String(body?.paymentId ?? "").trim();
    if (!paymentId) {
      return json({ error: "paymentId required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Idempotency check first — if already recorded, return success without verifying.
    const { data: existing } = await admin
      .from("synapse_credit_ledger")
      .select("id, amount, amount_usdc")
      .eq("transaction_id", paymentId)
      .maybeSingle();

    if (existing) {
      console.log(`[confirm-wix-payment] already recorded paymentId=${paymentId}`);
      return json({
        ok: true,
        alreadyRecorded: true,
        credits: Number(existing.amount),
        amount: Number(existing.amount_usdc),
      });
    }

    // Verify with Wix. Velo backend should expose /_functions/payment-status
    // returning { paymentId, status, amount, userId, credits, planId }.
    const wixApiKey = Deno.env.get("WIX_API_KEY") ?? "";
    const wixUrl = `${WIX_DOMAIN}/_functions/payment-status?paymentId=${encodeURIComponent(paymentId)}`;
    const wixRes = await fetch(wixUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${wixApiKey}`,
      },
    });

    if (!wixRes.ok) {
      const text = await wixRes.text().catch(() => "");
      console.error(`[confirm-wix-payment] wix status HTTP ${wixRes.status}: ${text}`);
      return json(
        { error: "wix_verification_failed", status: wixRes.status },
        502,
      );
    }

    const wixData = (await wixRes.json()) as WixStatusResponse;
    const paidStatus = String(wixData.status ?? "").toLowerCase();
    const isPaid = ["paid", "approved", "completed", "success"].includes(paidStatus);
    if (!isPaid) {
      console.warn(
        `[confirm-wix-payment] payment not paid yet paymentId=${paymentId} status=${paidStatus}`,
      );
      return json({ ok: false, status: paidStatus, error: "not_paid" }, 409);
    }

    // Bind the payment to the calling user. Reject if Wix says it belongs to someone else.
    if (wixData.userId && wixData.userId !== userId) {
      console.error(
        `[confirm-wix-payment] userId mismatch caller=${userId} wix=${wixData.userId}`,
      );
      return json({ error: "user_mismatch" }, 403);
    }

    const amountUsd = Number(wixData.amount ?? 0);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return json({ error: "invalid_amount" }, 400);
    }
    const credits = wixData.credits && Number.isFinite(wixData.credits)
      ? Number(wixData.credits)
      : amountUsd / CREDIT_RATE_USD;

    const { error: insertErr } = await admin
      .from("synapse_credit_ledger")
      .insert({
        user_id: userId,
        entry_type: "deposit",
        transaction_type: "synapse_purchase",
        amount: credits,
        amount_usdc: amountUsd,
        funding_source: "FIAT_FBO",
        status: "completed",
        description: `Wix purchase ($${amountUsd.toFixed(2)})`,
        transaction_id: paymentId,
        metadata: { source: "confirm-wix-payment", planId: wixData.planId ?? null },
      });

    if (insertErr) {
      // Race with webhook is fine — unique constraint on transaction_id.
      if (insertErr.code === "23505") {
        return json({ ok: true, alreadyRecorded: true, credits, amount: amountUsd });
      }
      console.error(`[confirm-wix-payment] insert error: ${insertErr.message}`);
      return json({ error: insertErr.message }, 500);
    }

    console.log(
      `[confirm-wix-payment] recorded paymentId=${paymentId} user=${userId} credits=${credits}`,
    );
    return json({ ok: true, alreadyRecorded: false, credits, amount: amountUsd });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[confirm-wix-payment] fatal: ${message}`);
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}