import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Authentication required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      throw new Error("Invalid authentication token");
    }
    const userId = claimsData.claims.sub as string;

    // 2. Parse and validate body
    const body = await req.json();
    const {
      client_id,
      aca_record_ids = [],
      country_of_origin = "US",
      egress_type = "api_query",
      data_summary = null,
    } = body;

    if (!client_id) throw new Error("client_id is required");
    if (!Array.isArray(aca_record_ids) || aca_record_ids.length === 0) {
      throw new Error("aca_record_ids must be a non-empty array");
    }

    const timestamp = new Date().toISOString();

    // 3. Generate batch_checksum = SHA-256 of sorted aca_record_ids
    const sortedIds = [...aca_record_ids].sort();
    const batchChecksum = await sha256(sortedIds.join("|"));

    // 4. Generate liability_token_hash = SHA-256 of {client_id}|{timestamp}|{batch_checksum}
    const liabilityTokenHash = await sha256(`${client_id}|${timestamp}|${batchChecksum}`);

    // 5. Generate DigiRAMP anchor (internal cryptographic anchor)
    const digiRampAnchorId = "DRA-" + await sha256(`${liabilityTokenHash}|${timestamp}`);

    // 6. Parallel write using service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Egress fee: 250 CRD per protocol spec
    const egressFee = -250;
    const referenceId = `EGRESS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    // Write ledger entry + egress log in parallel
    const [ledgerResult, egressResult] = await Promise.all([
      adminClient.from("synapse_credit_ledger").insert({
        user_id: userId,
        amount: egressFee,
        entry_type: "usage",
        status: "SETTLED",
        description: "Liability Shield Payload Egress Fee",
        reference_id: referenceId,
      }).select("id").single(),

      adminClient.from("egress_logs").insert({
        user_id: userId,
        client_id,
        liability_token_hash: liabilityTokenHash,
        batch_checksum: batchChecksum,
        aca_record_references: aca_record_ids,
        country_of_origin,
        digiramp_anchor_id: digiRampAnchorId,
        egress_type,
        data_payload_summary: data_summary,
      }).select("id").single(),
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
    await adminClient.from("egress_logs")
      .update({ synapse_ledger_entry_id: ledgerResult.data.id })
      .eq("id", egressResult.data.id);

    // 7. Return full liability token object
    return new Response(JSON.stringify({
      success: true,
      liability_token_hash: liabilityTokenHash,
      batch_checksum: batchChecksum,
      digiramp_anchor_id: digiRampAnchorId,
      egress_log_id: egressResult.data.id,
      aca_record_references: aca_record_ids,
      country_of_origin,
      timestamp,
      egress_fee_charged: Math.abs(egressFee),
      api_header: `X-IDIA-LIABILITY-TOKEN: LT-${liabilityTokenHash}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Liability Shield Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
