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

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized: Invalid user token");

    const { amount, description, referenceId } = await req.json();
    const deductionAmount = Math.abs(amount || 1);

    // Get current balance
    const { data: latestEntry, error: balError } = await supabaseClient
      .from("synapse_credit_ledger")
      .select("balance_after")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (balError) throw new Error(`Balance lookup failed: ${balError.message}`);

    const currentBalance = latestEntry ? Number(latestEntry.balance_after) : 0;
    if (currentBalance < deductionAmount) {
      return new Response(
        JSON.stringify({ error: "Insufficient Synapse Credits", available: currentBalance }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newBalance = currentBalance - deductionAmount;

    const { error: ledgerError } = await supabaseClient
      .from("synapse_credit_ledger")
      .insert({
        user_id: user.id,
        amount: -deductionAmount,
        balance_after: newBalance,
        entry_type: "usage",
        status: "SETTLED",
        description: description || "AI Marketplace Search Deduction",
        reference_id: referenceId || `USAGE-${crypto.randomUUID().slice(0, 8)}`,
      });

    if (ledgerError) throw new Error(`Ledger Insert Failed: ${ledgerError.message}`);

    console.log(`Deducted ${deductionAmount} CR from user ${user.id}. New balance: ${newBalance}`);

    return new Response(
      JSON.stringify({ success: true, deducted: deductionAmount, newBalance }),
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
