import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Revenue split constants (100% accounted)
const REVENUE_SPLIT = {
  USER_LIQUIDITY_POOL: 0.30, // 30% → distributed to data contributors
  IDIA_REVENUE: 0.60,        // 60% → platform revenue
  BURN: 0.05,                // 5%  → deflationary burn
  COMMUNITY_POOL: 0.05,      // 5%  → community pool
};

// IDIA-BETA token has 18 decimals on Flare Coston2
const TOKEN_DECIMALS = 18n;
const HARDCAP = 1_000_000_000n * (10n ** TOKEN_DECIMALS); // 1 Billion tokens

function fiatToTokenAmount(fiatAmount: number): bigint {
  // Convert fiat (e.g. $5.00) to 18-decimal BigInt
  // Use integer math to avoid floating point issues
  const cents = Math.round(fiatAmount * 10000); // 4 decimal places
  const base = BigInt(cents);
  const multiplier = 10n ** (TOKEN_DECIMALS - 4n); // 18 - 4 = 14
  return base * multiplier;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const flareRpcUrl = Deno.env.get('FLARE_RPC_URL');
    const awsKmsKeyId = Deno.env.get('AWS_KMS_KEY_ID');
    const idiaTreasuryAddress = Deno.env.get('IDIA_TREASURY_ADDRESS');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      payment_reference,
      total_fiat_amount,
      bundle_id,
      contributing_users, // Array of { user_id: string, weight: number }
    } = await req.json();

    if (!total_fiat_amount || total_fiat_amount <= 0 || !contributing_users?.length) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate splits
    const userPoolTotal = total_fiat_amount * REVENUE_SPLIT.USER_LIQUIDITY_POOL;
    const idiaRevenue = total_fiat_amount * REVENUE_SPLIT.IDIA_REVENUE;
    const burnAmount = total_fiat_amount * REVENUE_SPLIT.BURN;
    const communityAmount = total_fiat_amount * REVENUE_SPLIT.COMMUNITY_POOL;

    // Normalize weights
    const totalWeight = contributing_users.reduce((sum: number, u: any) => sum + (u.weight || 1), 0);

    const userResults: any[] = [];
    let totalTokensMinted = 0n;

    for (const contributor of contributing_users) {
      const userWeight = (contributor.weight || 1) / totalWeight;
      const userEarnings = userPoolTotal * userWeight;

      // Get user's current balance
      const { data: lastEntry } = await supabase
        .from('synapse_credit_ledger')
        .select('balance_idia_usd, balance_after')
        .eq('user_id', contributor.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const currentBalance = Number(lastEntry?.balance_idia_usd ?? lastEntry?.balance_after ?? 0);
      const newBalance = currentBalance + userEarnings;
      const txId = `DS-${crypto.randomUUID().slice(0, 12)}`;

      // Insert DATA_SALE ledger entry
      const { data: entry, error: insertError } = await supabase
        .from('synapse_credit_ledger')
        .insert({
          user_id: contributor.user_id,
          entry_type: 'deposit',
          amount: userEarnings,
          balance_after: newBalance,
          amount_idia_usd: userEarnings,
          balance_idia_usd: newBalance,
          transaction_id: txId,
          transaction_type: 'DATA_SALE',
          status: 'SETTLED',
          description: `Data Sale: ${userWeight.toFixed(2)}% of ${bundle_id || 'bundle'} (${formatUsd(userEarnings)})`,
          reference_id: payment_reference || txId,
          metadata: {
            bundle_id,
            payment_reference,
            total_fiat_amount,
            user_weight: userWeight,
            revenue_split: REVENUE_SPLIT,
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Failed to credit user ${contributor.user_id}:`, insertError);
        continue;
      }

      // Flare Network receipt — prepare token amount
      const tokenAmount = fiatToTokenAmount(userEarnings);
      totalTokensMinted += tokenAmount;

      let flareTxHash: string | null = null;

      // If Flare RPC is configured, prepare the transaction
      if (flareRpcUrl && awsKmsKeyId && idiaTreasuryAddress) {
        // Check hardcap
        if (totalTokensMinted <= HARDCAP) {
          try {
            // Prepare ERC-20 transfer payload
            // transfer(address to, uint256 amount) = 0xa9059cbb
            const toAddress = contributor.user_id.replace(/-/g, '').padStart(40, '0'); // placeholder mapping
            const amountHex = tokenAmount.toString(16).padStart(64, '0');
            const txData = `0xa9059cbb${toAddress.padStart(64, '0')}${amountHex}`;

            // In production: sign via AWS KMS and broadcast to Flare Coston2
            // For now, log the prepared transaction
            console.log(`Flare receipt prepared for ${contributor.user_id}: ${tokenAmount.toString()} tokens (${userEarnings.toFixed(4)} USD)`);
            
            // Mock tx hash for development
            flareTxHash = `0x${crypto.randomUUID().replace(/-/g, '')}`;

            // Update ledger with Flare tx hash
            if (entry?.id) {
              await supabase
                .from('synapse_credit_ledger')
                .update({ flare_tx_hash: flareTxHash })
                .eq('id', entry.id);
            }
          } catch (flareErr) {
            console.error(`Flare receipt failed for ${contributor.user_id}:`, flareErr);
          }
        } else {
          console.warn(`Hardcap reached. Skipping Flare receipt for ${contributor.user_id}`);
        }
      }

      userResults.push({
        user_id: contributor.user_id,
        earned_idia_usd: userEarnings,
        new_balance: newBalance,
        flare_tx_hash: flareTxHash,
        token_amount: tokenAmount.toString(),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      payment_reference,
      total_fiat_amount,
      splits: {
        user_pool: userPoolTotal,
        idia_revenue: idiaRevenue,
        burn: burnAmount,
        community_pool: communityAmount,
      },
      users_credited: userResults.length,
      user_results: userResults,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('process-data-sale error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function formatUsd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}
