// supabase/functions/alchemy-usdc-webhook/index.ts
// Receives Alchemy Address Activity webhooks for USDC on Base, verifies HMAC,
// records each transfer idempotently, and applies the delta to wallets.idia_beta_balance
// (canonical micro-USDC scale: 1 USDC = 1_000_000).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"; // lowercase

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-alchemy-signature",
};

console.log("[BOOT: alchemy-usdc-webhook] online");

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return bytesToHex(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// USDC `value` from Alchemy address activity comes as a decimal string in USDC units (e.g. "1.234567")
// or sometimes as a hex rawValue. Normalize to micro-USDC bigint.
function toMicroUsdc(activity: any): bigint {
  if (activity?.rawContract?.rawValue) {
    // hex string of base units (already micro for USDC since decimals=6)
    try {
      return BigInt(activity.rawContract.rawValue);
    } catch {
      /* fall through */
    }
  }
  const v = activity?.value;
  if (typeof v === "number") return BigInt(Math.round(v * 1_000_000));
  if (typeof v === "string") {
    const [whole, frac = ""] = v.split(".");
    const fracPadded = (frac + "000000").slice(0, 6);
    return BigInt(whole) * 1_000_000n + BigInt(fracPadded || "0");
  }
  return 0n;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  console.log("[BEGIN: INVOKE] alchemy-usdc-webhook");
  let stage = "INIT";

  try {
    stage = "READ_BODY";
    const rawBody = await req.text();

    stage = "VERIFY_SIGNATURE";
    const signingKey = Deno.env.get("ALCHEMY_WEBHOOK_SIGNING_KEY");
    if (!signingKey) {
      console.error("[FATAL] ALCHEMY_WEBHOOK_SIGNING_KEY not configured");
      return new Response(JSON.stringify({ error: "server_misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provided =
      req.headers.get("x-alchemy-signature") || req.headers.get("X-Alchemy-Signature") || "";
    const expected = await hmacSha256Hex(signingKey, rawBody);
    if (!provided || !timingSafeEqual(provided.toLowerCase(), expected.toLowerCase())) {
      console.warn(`[REJECT: SIGNATURE] provided=${provided.slice(0, 12)}... expected=${expected.slice(0, 12)}...`);
      return new Response(JSON.stringify({ error: "invalid_signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[STATUS: SIGNATURE_OK]");

    stage = "PARSE_PAYLOAD";
    const payload = JSON.parse(rawBody);
    const activities: any[] = payload?.event?.activity ?? payload?.activity ?? [];
    console.log(`[STATUS: PAYLOAD] activities=${activities.length}`);

    if (activities.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    stage = "INIT_ADMIN";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let processed = 0;
    let skipped = 0;

    for (const a of activities) {
      try {
        const contract = String(a?.rawContract?.address ?? a?.contractAddress ?? "").toLowerCase();
        if (a?.asset && String(a.asset).toUpperCase() !== "USDC" && contract !== USDC_BASE) {
          skipped++;
          continue;
        }
        if (contract && contract !== USDC_BASE) {
          skipped++;
          continue;
        }

        const fromAddr = String(a?.fromAddress ?? "").toLowerCase();
        const toAddr = String(a?.toAddress ?? "").toLowerCase();
        const txHash = String(a?.hash ?? a?.transactionHash ?? "").toLowerCase();
        const logIndex = Number(a?.log?.logIndex ?? a?.logIndex ?? 0);
        const blockNumber = a?.blockNum ? parseInt(String(a.blockNum), 16) : null;
        const amountMicro = toMicroUsdc(a);

        if (!txHash || amountMicro === 0n) {
          skipped++;
          continue;
        }

        // Resolve which of our wallets is involved (one row per direction)
        const { data: matched } = await supabase
          .from("wallets")
          .select("user_id, wallet_address")
          .or(`wallet_address.ilike.${toAddr},wallet_address.ilike.${fromAddr}`);

        if (!matched || matched.length === 0) {
          skipped++;
          continue;
        }

        for (const w of matched) {
          const wallet = String(w.wallet_address).toLowerCase();
          const direction: "in" | "out" = wallet === toAddr ? "in" : "out";
          const delta = direction === "in" ? amountMicro : -amountMicro;

          const { error: insErr } = await supabase.from("usdc_onchain_events").insert({
            tx_hash: txHash,
            log_index: logIndex,
            from_address: fromAddr,
            to_address: toAddr,
            amount_micro: Number(amountMicro), // bigint -> number; safe for USDC scale (<2^53)
            block_number: blockNumber,
            direction,
            wallet_user_id: w.user_id,
            source: "alchemy_webhook",
            raw_payload: a,
          });

          if (insErr) {
            // Unique violation = duplicate delivery; skip without applying delta
            if (insErr.code === "23505") {
              console.log(`[SKIP: DUPLICATE] tx=${txHash} log=${logIndex} dir=${direction}`);
              continue;
            }
            console.error(`[ERROR: EVENT_INSERT] ${insErr.message}`);
            continue;
          }

          const { error: rpcErr } = await supabase.rpc("apply_usdc_delta", {
            p_user_id: w.user_id,
            p_micro_delta: Number(delta),
            p_block_number: blockNumber,
          });
          if (rpcErr) {
            console.error(`[ERROR: APPLY_DELTA] user=${w.user_id} ${rpcErr.message}`);
            continue;
          }

          processed++;
          console.log(
            `[OK] user=${w.user_id} dir=${direction} delta=${delta.toString()} tx=${txHash}`,
          );
        }
      } catch (inner: any) {
        console.error(`[ERROR: ACTIVITY] ${inner?.message}`);
      }
    }

    console.log(`[END: INVOKE] processed=${processed} skipped=${skipped}`);
    return new Response(JSON.stringify({ ok: true, processed, skipped }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(`🚨 [FATAL: ${stage}] ${err?.message}`);
    return new Response(JSON.stringify({ error: err?.message ?? "unknown", failed_at: stage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
