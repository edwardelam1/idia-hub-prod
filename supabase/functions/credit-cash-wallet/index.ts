import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { 
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { user_id, reward_amount, currency, source, description } = await req.json();
    
    if (!user_id || !reward_amount || reward_amount <= 0) {
      throw new Error("Invalid payout parameters: user_id and positive reward_amount required");
    }

    // Generate idempotency reference
    const referenceId = `reward_${user_id}_${Date.now()}`;

    // Insert reward into synapse_credit_ledger as a SETTLED reward entry
    const { error: ledgerError } = await supabase
      .from("synapse_credit_ledger")
      .insert({
        user_id,
        amount: reward_amount,
        entry_type: "reward",
        transaction_type: "REWARD",
        description: description || `Data contribution reward: $${reward_amount}`,
        reference_id: referenceId,
        status: "SETTLED",
      });

    if (ledgerError) {
      throw new Error(`Ledger insert failed: ${ledgerError.message}`);
    }

    console.log(`Credited $${reward_amount} ${currency || 'USD'} to user ${user_id} | Source: ${source} | Ref: ${referenceId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      credited: reward_amount,
      reference_id: referenceId,
      currency: currency || "USD"
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error("Credit Cash Wallet Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
