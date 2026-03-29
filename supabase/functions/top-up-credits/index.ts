import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, credit_amount, usd_amount, payment_reference } = await req.json();

    if (!user_id || !credit_amount || credit_amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current balance
    const { data: lastEntry } = await supabase
      .from('synapse_credit_ledger')
      .select('balance_after')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentBalance = lastEntry?.balance_after ?? 0;
    const newBalance = Number(currentBalance) + Number(credit_amount);

    // Insert deposit entry
    const { data: entry, error } = await supabase
      .from('synapse_credit_ledger')
      .insert({
        user_id,
        entry_type: 'deposit',
        amount: credit_amount,
        balance_after: newBalance,
        description: `Credit top-up: ${credit_amount} CRD ($${usd_amount} USD)`,
        reference_id: payment_reference || `PAY-${crypto.randomUUID().slice(0, 8)}`,
        metadata: { usd_amount, payment_method: 'worldpay' },
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      new_balance: newBalance,
      entry_id: entry.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
