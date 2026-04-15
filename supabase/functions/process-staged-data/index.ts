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
    
    const { staged_data_id, data_type } = await req.json();
    
    if (!staged_data_id) {
      throw new Error("Missing staged_data_id");
    }
    
    // Resolve table mapping for global ingestion across OSR
    const tableMap: Record<string, string> = {
      'health': 'staged_health_data',
      'lifestyle': 'staged_lifestyle_data',
      'professional': 'staged_professional_data'
    };
    
    // Auto-detect data_type if not provided by checking tables
    let targetTable = data_type ? (tableMap[data_type] || 'staged_health_data') : '';
    let stagedData: any = null;
    
    if (targetTable) {
      const { data, error } = await supabase
        .from(targetTable)
        .select("*")
        .eq("id", staged_data_id)
        .maybeSingle();
      
      if (!error && data) stagedData = data;
    }
    
    // If no data_type provided or lookup failed, try each table
    if (!stagedData) {
      for (const [key, table] of Object.entries(tableMap)) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("id", staged_data_id)
          .maybeSingle();
        
        if (!error && data) {
          stagedData = data;
          targetTable = table;
          break;
        }
      }
    }

    if (!stagedData) {
      throw new Error(`Synapse Engine: Failed to resolve record ${staged_data_id}`);
    }

    // Skip if already processed
    if (stagedData.reward_calculated === true) {
      console.log(`Record ${staged_data_id} already processed. Skipping.`);
      return new Response(JSON.stringify({ 
        success: true, 
        deducted: 0, 
        note: "Already processed" 
      }), { status: 200, headers: corsHeaders });
    }

    // 2. Synapse Economic Constants (SPEC-AI.5.2 Formula)
    const CREDIT_USD_VALUATION = 0.75;
    const REVENUE_SHARE_PCT = 0.30;
    const OSR_VERACITY_MIN = 0.90;

    // 3. Look up marketplace bundle context by category
    let bundleCredits = 0;
    let totalParticipants = 1;
    
    const bundleCategory = targetTable === 'staged_health_data' ? 'Health & Wellness' 
      : targetTable === 'staged_lifestyle_data' ? 'Lifestyle & Behavioral'
      : 'Professional';
    
    const { data: bundle } = await supabase
      .from("marketplace_bundles")
      .select("price, participant_count")
      .ilike("category", `%${bundleCategory.split(' ')[0]}%`)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (bundle) {
      bundleCredits = bundle.price || 0;
      totalParticipants = bundle.participant_count || 1;
    }
    
    // Deterministic Weights from OSR
    const veracity = stagedData.data_quality_score || 0.00;
    const utility = stagedData.data_completeness_score || 0.00;

    // 4. OSR Verification (Truth Arbiter)
    if (veracity < OSR_VERACITY_MIN) {
      console.warn(`OSR Quarantine: ID ${staged_data_id} failed veracity check (${veracity}).`);
      
      await supabase.from(targetTable).update({ 
        reward_calculated: true, 
        reward_amount: 0,
        synapse_weight_coefficient: 0
      }).eq("id", staged_data_id);
      
      return new Response(JSON.stringify({ 
        success: false, 
        status: "QUARANTINED", 
        reason: `Veracity ${veracity.toFixed(2)} below 0.90 threshold`
      }), { status: 200, headers: corsHeaders });
    }

    // 5. THE SYNAPSE FORMULA: Weighted Revenue Share (SPEC-AI.5.2)
    const poolUSD = (bundleCredits * CREDIT_USD_VALUATION) * REVENUE_SHARE_PCT;
    const weight = (veracity + utility) / 2;
    const payoutAmount = Number(((poolUSD / totalParticipants) * weight).toFixed(4));

    // 6. Resolve real user_id from pseudo_user_id for ledger credit
    let realUserId: string | null = null;
    
    if (stagedData.user_id) {
      realUserId = stagedData.user_id;
    } else if (stagedData.pseudo_user_id) {
      const { data: resolvedId } = await supabase
        .rpc("get_user_id_from_pseudonym", { p_pseudo_id: stagedData.pseudo_user_id });
      realUserId = resolvedId;
    }

    // 7. Execute FBO Cash Payout via credit-cash-wallet
    if (payoutAmount > 0 && realUserId) {
      await supabase.functions.invoke("credit-cash-wallet", {
        body: { 
          user_id: realUserId, 
          reward_amount: payoutAmount, 
          currency: "USD",
          source: "synapse_engine_royalty", 
          description: `Royalty: ${bundleCredits} CR Bundle Share (Weight: ${weight.toFixed(2)})`
        }
      });
      
      console.log(`Payout $${payoutAmount} to user ${realUserId} (weight: ${weight.toFixed(2)})`);
    }

    // 8. Finalize Staged Record
    await supabase.from(targetTable).update({ 
      reward_calculated: true, 
      reward_amount: payoutAmount,
      synapse_weight_coefficient: weight
    }).eq("id", staged_data_id);

    return new Response(JSON.stringify({ 
      success: true, 
      reward_cash: payoutAmount,
      weight_applied: weight,
      settlement: "USD_FIAT"
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error("Synapse Engine Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
