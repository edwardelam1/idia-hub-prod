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
    const circleApiKey = Deno.env.get('CIRCLE_API_KEY');
    const circleMasterWalletId = Deno.env.get('CIRCLE_MASTER_WALLET_ID');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, amount, destination_address } = await req.json();

    if (!user_id || !amount || amount < 1 || !destination_address) {
      return new Response(JSON.stringify({ error: 'Invalid parameters. Requires user_id, amount >= 1, and destination_address.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(destination_address)) {
      return new Response(JSON.stringify({ error: 'Invalid wallet address format.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current balance from latest ledger entry
    const { data: lastEntry, error: balanceError } = await supabase
      .from('synapse_credit_ledger')
      .select('balance_idia_usd, balance_after')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (balanceError) throw balanceError;

    const currentBalance = Number(lastEntry?.balance_idia_usd ?? lastEntry?.balance_after ?? 0);

    if (currentBalance < amount) {
      return new Response(JSON.stringify({ error: `Insufficient balance. Available: $${currentBalance.toFixed(4)}, Requested: $${amount.toFixed(4)}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newBalance = currentBalance - amount;
    const transactionId = `WD-${crypto.randomUUID().slice(0, 12)}`;

    // Insert PENDING withdrawal into ledger
    const { data: withdrawalEntry, error: insertError } = await supabase
      .from('synapse_credit_ledger')
      .insert({
        user_id,
        entry_type: 'deduction',
        amount: -amount,
        balance_after: newBalance,
        amount_idia_usd: -amount,
        balance_idia_usd: newBalance,
        transaction_id: transactionId,
        transaction_type: 'WITHDRAWAL',
        status: 'PENDING',
        destination_wallet: destination_address,
        description: `Withdrawal: ${amount.toFixed(4)} IDIA-USD → USDC to ${destination_address.slice(0, 6)}...${destination_address.slice(-4)}`,
        reference_id: transactionId,
        metadata: { destination_address, withdrawal_method: 'circle_usdc' },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Attempt Circle transfer if API key is configured
    let circleTransferId: string | null = null;

    if (circleApiKey && circleMasterWalletId) {
      try {
        const circleResponse = await fetch('https://api.circle.com/v1/transfers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${circleApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idempotencyKey: transactionId,
            source: { type: 'wallet', id: circleMasterWalletId },
            destination: { type: 'blockchain', address: destination_address, chain: 'ETH' },
            amount: { amount: amount.toFixed(2), currency: 'USD' },
          }),
        });

        if (circleResponse.ok) {
          const circleData = await circleResponse.json();
          circleTransferId = circleData.data?.id || null;

          // Update ledger to SETTLED with circle transfer ID
          await supabase
            .from('synapse_credit_ledger')
            .update({
              status: 'SETTLED',
              circle_transfer_id: circleTransferId,
            })
            .eq('id', withdrawalEntry.id);
        } else {
          throw new Error(`Circle API error: ${circleResponse.status}`);
        }
      } catch (circleErr: any) {
        // Circle transfer failed — insert compensatory deposit to refund
        await supabase
          .from('synapse_credit_ledger')
          .update({ status: 'FAILED' })
          .eq('id', withdrawalEntry.id);

        const refundTxId = `RF-${crypto.randomUUID().slice(0, 12)}`;
        await supabase
          .from('synapse_credit_ledger')
          .insert({
            user_id,
            entry_type: 'deposit',
            amount: amount,
            balance_after: currentBalance,
            amount_idia_usd: amount,
            balance_idia_usd: currentBalance,
            transaction_id: refundTxId,
            transaction_type: 'DEPOSIT',
            status: 'SETTLED',
            description: `Refund: Circle transfer failed for ${transactionId}`,
            reference_id: refundTxId,
            metadata: { refund_for: transactionId, error: circleErr.message },
          });

        return new Response(JSON.stringify({
          error: 'Circle transfer failed. Your balance has been refunded.',
          details: circleErr.message,
        }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // No Circle API configured — mark as SETTLED (mock mode)
      await supabase
        .from('synapse_credit_ledger')
        .update({ status: 'SETTLED' })
        .eq('id', withdrawalEntry.id);
    }

    return new Response(JSON.stringify({
      success: true,
      transaction_id: transactionId,
      amount_withdrawn: amount,
      new_balance: newBalance,
      circle_transfer_id: circleTransferId,
      destination: destination_address,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
