import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Network
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const BASE_MAINNET_RPC = "https://mainnet.base.org";
const BASE_RPC_URL = Deno.env.get("BASE_RPC_URL") || BASE_SEPOLIA_RPC;

// Protocol contracts (Base Sepolia — testnet)
const IDIA_TOKEN_ADDRESS = "0x137D913d89d0D6a5b2d1Db76173770C94d25387B";
const REGISTRY_ADDRESS = "0x463ce6d5B2E2c9D4bBE930f0CEBeF08b6Eb274F7";
const LIABILITY_RECEIPT_ADDRESS = "0x9e1CD33c2534dbeb0E82db7A0366A483fC9bD6DE";
const GLOBAL_WAR_CHEST = "0xd052C6F3846b4Fe56E579880Ec9ea2764ABDe708"; // Timelock as fallback
const POOL_FACTORY_ADDRESS = "0x60EA2012dd55B6E828c1ec3085821dA9d6658630";

// USDC on Base Sepolia
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// System wallets
const SYSTEM_CASH_REGISTER = "0x649436db4d9352240d1132d9372293e5cc6af0e3";
const TREASURY_WALLET = "0xd816D83703764551A7F292dbC435669AA89631a7";

// Escrow addresses (for token distribution after data purchase)
const ESCROW_ECOSYSTEM = "0xDc93eca954fD2625001b2fb9E9A098914365ADe9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate caller using getUser() — reliable across all Supabase versions
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Authentication required — no Bearer token provided");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use getUser() instead of getClaims() — getClaims is unavailable on older SDK
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user?.id) {
      console.error("Auth verification failed:", userError?.message);
      throw new Error("Invalid authentication token — could not resolve user identity");
    }
    const userId = userData.user.id;

    // Reject zero-UUID to prevent orphan rows invisible to RLS
    if (userId === "00000000-0000-0000-0000-000000000000") {
      throw new Error("Invalid user identity — zero UUID rejected");
    }

    console.log(`DELT Transfer: Authenticated user ${userId.slice(0, 8)}...`);

    // 2. Parse and validate body
    const body = await req.json();
    const {
      client_id,
      aca_record_ids = [],
      country_of_origin = "US",
      egress_type = "api_query",
      data_summary = null,
    } = body;

    const normalizedClientId = typeof client_id === "string" ? client_id.trim() : "";
    const normalizedAcaRecordIds = Array.isArray(aca_record_ids)
      ? Array.from(new Set(aca_record_ids.map((id) => String(id ?? "").trim()).filter(Boolean)))
      : [];

    if (!normalizedClientId) throw new Error("client_id is required");
    if (normalizedAcaRecordIds.length === 0) {
      throw new Error("aca_record_ids must be a non-empty array");
    }

    const timestamp = new Date().toISOString();

    // 3. Generate batch_checksum = SHA-256 of sorted aca_record_ids
    const sortedIds = [...normalizedAcaRecordIds].sort();
    const batchChecksum = await sha256(sortedIds.join("|"));

    // 4. Generate liability_token_hash = SHA-256 of {client_id}|{timestamp}|{batch_checksum}
    const liabilityTokenHash = await sha256(`${normalizedClientId}|${timestamp}|${batchChecksum}`);

    // 5. Generate DigiRAMP anchor (internal cryptographic anchor)
    const digiRampAnchorId = "0x" + (await sha256(`${liabilityTokenHash}|${timestamp}`));

    // 6. Parallel write using service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Write ledger entry + egress log in parallel
    const [ledgerResult, egressResult] = await Promise.all([
      adminClient
        .from("synapse_credit_ledger")
        .insert({
          user_id: userId,
          amount: egressFee,
          entry_type: "usage",
          status: "settled",
          description: "Liability Shield Payload Egress Fee",
          reference_id: referenceId,
        })
        .select("id")
        .single(),

      adminClient
        .from("egress_logs")
        .insert({
          user_id: userId,
          client_id: normalizedClientId,
          liability_token_hash: liabilityTokenHash,
          batch_checksum: batchChecksum,
          aca_record_references: normalizedAcaRecordIds,
          country_of_origin,
          digiramp_anchor_id: digiRampAnchorId,
          egress_type,
          data_payload_summary: data_summary,
        })
        .select("id")
        .single(),
    ]);

    if (ledgerResult.error) {
      console.error("Ledger write failed:", ledgerResult.error);
      throw new Error(`Ledger write failed: ${ledgerResult.error.message}`);
    }

    if (egressResult.error) {
      console.error("Egress log write failed:", egressResult.error);
      throw new Error(`Egress log write failed: ${egressResult.error.message}`);
    }

    // Update egress log with ledger reference
    await adminClient
      .from("egress_logs")
      .update({ synapse_ledger_entry_id: ledgerResult.data.id })
      .eq("id", egressResult.data.id);

    console.log(`DELT Transfer: Success — egress_log ${egressResult.data.id}, user ${userId.slice(0, 8)}...`);

    // 7. Return full liability token object
    return new Response(
      JSON.stringify({
        success: true,
        liability_token_hash: liabilityTokenHash,
        batch_checksum: batchChecksum,
        digiramp_anchor_id: digiRampAnchorId,
        egress_log_id: egressResult.data.id,
        aca_record_references: normalizedAcaRecordIds,
        country_of_origin,
        timestamp,
        egress_fee_charged: Math.abs(egressFee),
        api_header: `X-IDIA-LIABILITY-TOKEN: LT-${liabilityTokenHash}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Liability Shield Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
