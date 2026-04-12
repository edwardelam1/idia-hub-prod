import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// War Chest revenue split (100% accounted)
const REVENUE_SPLIT = {
  CORPORATE_REVENUE: 0.6, // 60% → IDIA recognized revenue
  USER_LIQUIDITY_POOL: 0.3, // 30% → distributed as IDIA-USD in Life app
  ECOSYSTEM_WAR_CHEST: 0.1, // 10% → escrowed for Phase 2 liquidity
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, query_cost_credits, query_type, bundle_id } = await req.json();

    if (!user_id || !query_cost_credits || query_cost_credits <= 0) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check balance via get_hub_balance RPC
    const { data: balance, error: balanceError } = await supabase.rpc("get_hub_balance", { uid: user_id });

    if (balanceError) throw balanceError;

    const currentBalance = Number(balance ?? 0);
    if (currentBalance < query_cost_credits) {
      return new Response(
        JSON.stringify({
          error: "Insufficient Synapse Credits",
          required: query_cost_credits,
          available: currentBalance,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Step 1: INSERT CONSUMPTION row (negative amount, PENDING)
    const { data: consumptionRow, error: consumptionError } = await supabase
      .from("synapse_credit_ledger")
      .insert({
        user_id,
        amount_credits: -query_cost_credits,
        entry_type: "CONSUMPTION",
        status: "PENDING",
        metadata: {
          query_type: query_type || "data_query",
          bundle_id: bundle_id || null,
          cost_credits: query_cost_credits,
        },
      })
      .select()
      .single();

    if (consumptionError) throw consumptionError;

    // Step 2: Simulate Synapse Engine confirmation
    // INSERT SETTLEMENT row (zero amount, SETTLED, reference_id → consumption row)
    const fiatEquivalent = query_cost_credits; // 1 credit = $1 USD
    const corporateRevenue = fiatEquivalent * REVENUE_SPLIT.CORPORATE_REVENUE;
    const userLiquidityPool = fiatEquivalent * REVENUE_SPLIT.USER_LIQUIDITY_POOL;
    const ecosystemWarChest = fiatEquivalent * REVENUE_SPLIT.ECOSYSTEM_WAR_CHEST;

    const { data: settlementRow, error: settlementError } = await supabase
      .from("synapse_credit_ledger")
      .insert({
        user_id,
        amount_credits: 0,
        entry_type: "SETTLEMENT",
        status: "SETTLED",
        reference_id: consumptionRow.id,
        metadata: {
          settled_consumption_id: consumptionRow.id,
          query_type: query_type || "data_query",
          bundle_id: bundle_id || null,
          fiat_equivalent_usd: fiatEquivalent,
          revenue_split: {
            corporate_revenue: corporateRevenue,
            user_liquidity_pool: userLiquidityPool,
            ecosystem_war_chest: ecosystemWarChest,
          },
          fbo_routing: "JPM FBO",
        },
      })
      .select()
      .single();

    if (settlementError) throw settlementError;

    // Get updated balance
    const { data: newBalance } = await supabase.rpc("get_hub_balance", { uid: user_id });

    return new Response(
      JSON.stringify({
        success: true,
        consumption_id: consumptionRow.id,
        settlement_id: settlementRow.id,
        credits_consumed: query_cost_credits,
        new_balance: Number(newBalance ?? 0),
        revenue_split: {
          corporate_revenue: corporateRevenue,
          user_liquidity_pool: userLiquidityPool,
          ecosystem_war_chest: ecosystemWarChest,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: any) {
    console.error("execute-hub-query error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
