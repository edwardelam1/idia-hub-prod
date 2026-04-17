import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string) {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user?.id) throw new Error("Invalid user session");
    const userId = userData.user.id;

    // Reject zero-UUID
    if (userId === "00000000-0000-0000-0000-000000000000") {
      throw new Error("Rejected: anonymous identity is not permitted");
    }

    const body = await req.json();
    const {
      client_id,
      aca_record_ids = [],
      intent_type = "RESEARCH",
      query_complexity = 1.0,
      country_of_origin = "US",
    } = body;

    if (aca_record_ids.length === 0) throw new Error("No auditable lineage provided");

    // FLAT RATE: Every AI search that touches data costs exactly 1 CR ($0.75 fiat).
    // Record receipt is preserved for egress logging + downstream IDIA Life payout attribution,
    // but is decoupled from the fee itself.
    const FLAT_FEE_CR = 1;
    const totalSynapseDeduction = -FLAT_FEE_CR;

    // 2. CRYPTOGRAPHIC TOKEN GENERATION
    const timestamp = new Date().toISOString();
    const sortedIds = [...aca_record_ids].sort();
    const batchChecksum = await sha256(sortedIds.join("|"));
    const liabilityTokenHash = await sha256(`${client_id}|${timestamp}|${batchChecksum}`);
    const digiRampAnchorId = "DRA-" + (await sha256(`${liabilityTokenHash}|${timestamp}`));

    // 3. ATOMIC LEDGER AND EGRESS WRITE
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const referenceId = `SYN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const [ledgerResult, egressResult] = await Promise.all([
      adminClient
        .from("synapse_credit_ledger")
        .insert({
          user_id: userId,
          amount: totalSynapseDeduction,
          entry_type: "USAGE",
          transaction_type: "FEE",
          status: "SETTLED",
          description: `Synapse Gas: ${intent_type} [Flat 1 CR]`,
          reference_id: referenceId,
        })
        .select("id")
        .single(),

      adminClient
        .from("egress_logs")
        .insert({
          user_id: userId,
          client_id,
          liability_token_hash: liabilityTokenHash,
          batch_checksum: batchChecksum,
          aca_record_references: aca_record_ids,
          country_of_origin,
          digiramp_anchor_id: digiRampAnchorId,
          egress_type: intent_type,
        })
        .select("id")
        .single(),
    ]);

    if (ledgerResult.error) throw new Error(`Ledger rejection: ${ledgerResult.error.message}`);
    if (egressResult.error) throw new Error(`Egress failure: ${egressResult.error.message}`);

    // Bind the egress log to the financial ledger entry
    await adminClient
      .from("egress_logs")
      .update({ synapse_ledger_entry_id: ledgerResult.data.id })
      .eq("id", egressResult.data.id);

    // 4. RETURN FINANCIALS AND AUDIT PAYLOAD
    return new Response(
      JSON.stringify({
        success: true,
        liability_token_hash: liabilityTokenHash,
        financials: {
          gas_consumed: Number(computeCost.toFixed(4)),
          minting_fee: mintingFee,
          total_cr_deducted: Number(Math.abs(totalSynapseDeduction).toFixed(4)),
          fiat_equivalent_value: Number((Math.abs(totalSynapseDeduction) * 0.75).toFixed(4)),
        },
        audit: {
          records_processed: aca_record_ids.length,
          intent: intent_type,
          complexity_multiplier: query_complexity,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
