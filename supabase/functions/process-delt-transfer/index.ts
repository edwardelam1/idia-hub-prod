import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { privateKeyToAccount } from "https://esm.sh/viem@2.9.20/accounts";
import { base } from "https://esm.sh/viem@2.9.20/chains";
import { createWalletClient, http, publicActions, keccak256, toHex } from "https://esm.sh/viem@2.9.20";
import { PROTOCOL } from "../_shared/contracts.ts";

// Network — hard mainnet enforcement. Single canonical Alchemy URL (BASE_RPC_URL retired
// to eliminate dual-env-var collisions that caused out-of-sequence RPC calls).
const ALCHEMY_BASE_RPC_URL = Deno.env.get("ALCHEMY_BASE_RPC_URL");
if (!ALCHEMY_BASE_RPC_URL) {
  throw new Error("CRITICAL: ALCHEMY_BASE_RPC_URL secret is not set. process-delt-transfer halted.");
}

// Protocol contracts — Base Mainnet (sourced from _shared/contracts.ts).
// BUG FIXES vs prior constants:
//   * IDIA_TOKEN_ADDRESS was 0x137D913…387B — that is the Registry, not IDIA.
//   * REGISTRY_ADDRESS    was 0x463ce6…74F7 — stale / not deployed.
//   * LIABILITY_RECEIPT   was 0x9e1CD3…D6DE — pre-prod; canonical is 0x5eA573…0BD3.
//   * USDC_ADDRESS        was 0x036CbD…CF7e — Base Sepolia USDC; mainnet is 0x833589f…02913.
//   * GLOBAL_WAR_CHEST    was 0xd052C6F…e708 — that is escrow.ecosystem, not the DAO Safe.
const IDIA_TOKEN_ADDRESS = PROTOCOL.idiaToken;
const REGISTRY_ADDRESS = PROTOCOL.registry;
const LIABILITY_RECEIPT_ADDRESS = PROTOCOL.liabilityReceipt;
const POOL_FACTORY_ADDRESS = PROTOCOL.poolFactory;
const GLOBAL_WAR_CHEST = PROTOCOL.safe;
const USDC_ADDRESS = PROTOCOL.usdc;
const TREASURY_WALLET = PROTOCOL.treasury;
const ESCROW_ECOSYSTEM = PROTOCOL.escrow.ecosystem;

// System wallets (Hub-owned, not part of the governance protocol)
const SYSTEM_CASH_REGISTER = "0x649436db4d9352240d1132d9372293e5cc6af0e3";

const LIABILITY_RECEIPT_ABI = [
  {
    name: "mintReceipt",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dataBuyer", type: "address" },
      { name: "acaHashes", type: "bytes32[]" },
      { name: "purchaseAmount", type: "uint256" },
      { name: "synapseReceiptId", type: "bytes32" },
      { name: "dataBundleRef", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
] as const;

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
  let currentStep = "INIT";
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    currentStep = "AUTHENTICATION";
    console.info(`[BEGIN: ${currentStep}] Validating caller identity.`);

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
      console.error(`[FATAL: ${currentStep}] Auth verification failed:`, userError?.message);
      throw new Error("Invalid authentication token — could not resolve user identity");
    }
    const userId = userData.user.id;

    // Reject zero-UUID to prevent orphan rows invisible to RLS
    if (userId === "00000000-0000-0000-0000-000000000000") {
      throw new Error("Invalid user identity — zero UUID rejected");
    }

    console.info(`[END: ${currentStep}] DELT Transfer: Authenticated user ${userId.slice(0, 8)}...`);

    currentStep = "PAYLOAD_PARSING";
    console.info(`[BEGIN: ${currentStep}] Extracting parameters.`);

    // 2. Parse and validate body
    const body = await req.json();
    const {
      client_id,
      aca_record_ids = [],
      country_of_origin = "US",
      egress_type = "api_query",
      data_summary = null,
      egress_fee = 1000000, // Safe default to prevent undefined breaking the ledger insert
      reference_id = `DELT-${Date.now()}`, // Safe default
    } = body;

    const egressFee = egress_fee;
    const referenceId = reference_id;

    const normalizedClientId = typeof client_id === "string" ? client_id.trim() : "";
    const normalizedAcaRecordIds = Array.isArray(aca_record_ids)
      ? Array.from(new Set(aca_record_ids.map((id) => String(id ?? "").trim()).filter(Boolean)))
      : [];

    if (!normalizedClientId) throw new Error("client_id is required");
    if (normalizedAcaRecordIds.length === 0) {
      throw new Error("aca_record_ids must be a non-empty array");
    }

    const timestamp = new Date().toISOString();
    console.info(`[END: ${currentStep}] Parsed successfully. IDs count: ${normalizedAcaRecordIds.length}`);

    currentStep = "CRYPTOGRAPHIC_ANCHORS";
    console.info(`[BEGIN: ${currentStep}] Generating cryptographic hashes.`);

    // 3. Generate batch_checksum = SHA-256 of sorted aca_record_ids
    const sortedIds = [...normalizedAcaRecordIds].sort();
    const batchChecksum = await sha256(sortedIds.join("|"));

    // 4. Generate liability_token_hash = SHA-256 of {client_id}|{timestamp}|{batch_checksum}
    const liabilityTokenHash = await sha256(`${normalizedClientId}|${timestamp}|${batchChecksum}`);

    // 5. Generate DigiRAMP anchor (internal cryptographic anchor)
    const digiRampAnchorId = "0x" + (await sha256(`${liabilityTokenHash}|${timestamp}`));

    console.info(`[END: ${currentStep}] Token Hash generated: ${liabilityTokenHash.slice(0, 8)}...`);

    currentStep = "LEDGER_AND_EGRESS_WRITES";
    console.info(`[BEGIN: ${currentStep}] Parallel DB operations executing.`);

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
      console.error(`[FATAL: ${currentStep}] Ledger write failed:`, ledgerResult.error);
      throw new Error(`Ledger write failed: ${ledgerResult.error.message}`);
    }

    if (egressResult.error) {
      console.error(`[FATAL: ${currentStep}] Egress log write failed:`, egressResult.error);
      throw new Error(`Egress log write failed: ${egressResult.error.message}`);
    }

    console.info(`[TRACE: ${currentStep}] Reconciling Ledger ID onto Egress Log...`);
    // Update egress log with ledger reference
    await adminClient
      .from("egress_logs")
      .update({ synapse_ledger_entry_id: ledgerResult.data.id })
      .eq("id", egressResult.data.id);

    console.info(`[END: ${currentStep}] Success — egress_log ${egressResult.data.id}, user ${userId.slice(0, 8)}...`);

    // ====================================================================
    // PHASE 4: LIABILITY RECEIPT MINTING
    // ====================================================================
    currentStep = "MINTING_LIABILITY_RECEIPT";
    let blockchainReceiptHash = "N/A";

    try {
      console.info(`[BEGIN: ${currentStep}] Initiating on-chain verification for Buyer.`);
      const rawKey = Deno.env.get("RELAYER_PRIVATE_KEY");

      if (!rawKey) {
        console.warn(`[WARN: ${currentStep}] RELAYER_PRIVATE_KEY missing. Bypassing on-chain mint.`);
      } else {
        console.info(`[TRACE: ${currentStep}] Configuring blockchain network connections...`);
        const formattedKey = rawKey.trim().startsWith("0x") ? rawKey.trim() : `0x${rawKey.trim()}`;
        const account = privateKeyToAccount(formattedKey as `0x${string}`);
        const client = createWalletClient({
          account,
          chain: base,
          transport: http(ALCHEMY_BASE_RPC_URL),
        }).extend(publicActions);

        console.info(`[TRACE: ${currentStep}] Querying target profile for buyer wallet...`);
        const { data: profile } = await adminClient.from("profiles").select("wallet_address").eq("id", userId).single();
        const dataBuyerAddress = profile?.wallet_address || SYSTEM_CASH_REGISTER;

        // Ensure strict bytes32 formatting for the blockchain execution
        const synapseReceiptIdBytes = `0x${liabilityTokenHash}` as `0x${string}`;
        const mappedAcaHashes = normalizedAcaRecordIds.map((id: string) => keccak256(toHex(id)));
        const dataBundleRefStr = `bundle-${batchChecksum.slice(0, 8)}`;

        console.info(`[TRACE: ${currentStep}] Broadcasting contract write to Base Mainnet...`);
        const hash = await client.writeContract({
          address: LIABILITY_RECEIPT_ADDRESS,
          abi: LIABILITY_RECEIPT_ABI,
          functionName: "mintReceipt",
          args: [
            dataBuyerAddress as `0x${string}`,
            mappedAcaHashes as `0x${string}`[],
            BigInt(egressFee),
            synapseReceiptIdBytes,
            dataBundleRefStr,
          ],
        });

        console.info(`[TRACE: ${currentStep}] Awaiting sequencer inclusion for TX: ${hash}`);
        const receiptTx = await client.waitForTransactionReceipt({ hash });

        if (receiptTx.status !== "success") {
          throw new Error(`Transaction reverted: ${hash}`);
        }

        blockchainReceiptHash = hash;
        console.info(`[END: ${currentStep}] Liability receipt locked on-chain. TX: ${blockchainReceiptHash}`);
      }
    } catch (mintError: any) {
      console.error(`[FATAL: ${currentStep}] Liability receipt execution failed: ${mintError.message}`);
      // Continuing execution to return the Token payload to the client despite the contract failing
    }

    currentStep = "FINAL_RESPONSE";
    console.info(`[BEGIN: ${currentStep}] Packaging token issuance payload.`);

    // 7. Return full liability token object
    return new Response(
      JSON.stringify({
        success: true,
        liability_token_hash: liabilityTokenHash,
        batch_checksum: batchChecksum,
        digiramp_anchor_id: digiRampAnchorId,
        egress_log_id: egressResult.data.id,
        on_chain_liability_hash: blockchainReceiptHash, // Newly injected output
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
  } catch (error: any) {
    console.error(`🚨 [FATAL STALL: ${currentStep}]:`, error.message);
    return new Response(
      JSON.stringify({
        error: error.message,
        failed_at: currentStep,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
