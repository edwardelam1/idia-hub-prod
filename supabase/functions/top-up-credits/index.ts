import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, credit_amount, usd_amount, payment_reference } = await req.json();

    if (!user_id || !credit_amount || credit_amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txId = payment_reference || `PAY-${crypto.randomUUID().slice(0, 8)}`;

    // Write to synapse_credit_ledger (append-only, SUM-based balance)
    const { data: entry, error } = await supabase
      .from("synapse_credit_ledger")
      .insert({
        user_id,
        amount: Number(credit_amount),
        entry_type: "deposit",
        status: "SETTLED",
        metadata: {
          usd_amount,
          payment_method: "worldpay",
          payment_reference: txId,
        },
      })
      .select()
      .single();

    if (error) throw error;

    // Get new balance via SUM-based RPC
    const { data: newBalance } = await supabase.rpc("get_synapse_balance", { uid: user_id });

    return new Response(
      JSON.stringify({
        success: true,
        new_balance: Number(newBalance ?? 0),
        entry_id: entry.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
