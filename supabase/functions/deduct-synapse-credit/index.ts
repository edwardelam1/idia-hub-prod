import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) throw new Error("Unauthorized: Invalid user token");

    const { amount, description, referenceId } = await req.json();

    // HARD CAP: Never allow a deduction greater than 1 CR per API call
    const deductionAmount = Math.min(Math.abs(amount || 1), 1);
    const safeReferenceId = referenceId || crypto.randomUUID();

    // IDEMPOTENCY CHECK: Prevent double-billing for the same search
    const { data: existingTransaction } = await supabaseClient
      .from("synapse_credit_ledger")
      .select("id")
      .eq("reference_id", safeReferenceId)
      .maybeSingle();

    if (existingTransaction) {
      console.log(`Transaction ${safeReferenceId} already processed. Skipping deduction.`);
      return new Response(
        JSON.stringify({ success: true, deducted: 0, note: "Idempotency match. No charge." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process the exact 1 CR deduction
    const { error: ledgerError } = await supabaseClient
      .from("synapse_credit_ledger")
      .insert({
        user_id: user.id,
        amount: -deductionAmount,
        entry_type: "deduction",
        transaction_type: "FEE",
        description: description || "AI Marketplace Search Deduction",
        reference_id: safeReferenceId,
        status: "SETTLED",
      });

    if (ledgerError) {
      throw new Error(`Ledger Insert Failed: ${ledgerError.message} (Details: ${ledgerError.details})`);
    }

    console.log(`Deducted ${deductionAmount} CR from user ${user.id}. Ref: ${safeReferenceId}`);

    return new Response(
      JSON.stringify({ success: true, deducted: deductionAmount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Deduction Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
