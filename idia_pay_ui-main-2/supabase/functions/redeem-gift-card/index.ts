import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { cardCode, pinCode, amount, locationId, transactionId } = await req.json();

    if (!cardCode || !amount || !locationId) {
      return new Response(JSON.stringify({ 
        error: "Missing required parameters", 
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find gift card by code
    const { data: giftCard, error: cardError } = await supabaseClient
      .from('gift_cards')
      .select('*')
      .eq('card_code', cardCode)
      .eq('is_active', true)
      .single();

    if (cardError || !giftCard) {
      return new Response(JSON.stringify({ 
        error: "Gift card not found or inactive", 
        success: false 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate PIN if required
    if (giftCard.pin_code && giftCard.pin_code !== pinCode) {
      return new Response(JSON.stringify({ 
        error: "Invalid PIN code", 
        success: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check sufficient balance
    if (giftCard.current_balance < amount) {
      return new Response(JSON.stringify({ 
        error: "Insufficient balance", 
        available_balance: giftCard.current_balance,
        success: false 
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate new balance
    const newBalance = giftCard.current_balance - amount;

    // Create redemption record
    const { data: redemption, error: redemptionError } = await supabaseClient
      .from('gift_card_redemptions')
      .insert({
        gift_card_id: giftCard.id,
        transaction_id: transactionId,
        amount_redeemed: amount,
        remaining_balance: newBalance,
        location_id: locationId
      })
      .select()
      .single();

    if (redemptionError) {
      console.error('Redemption creation error:', redemptionError);
      return new Response(JSON.stringify({ 
        error: "Failed to process redemption", 
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update gift card balance
    const { error: updateError } = await supabaseClient
      .from('gift_cards')
      .update({ 
        current_balance: newBalance,
        last_used_at: new Date().toISOString(),
        usage_count: giftCard.usage_count + 1
      })
      .eq('id', giftCard.id);

    if (updateError) {
      console.error('Gift card update error:', updateError);
      // Rollback redemption record
      await supabaseClient
        .from('gift_card_redemptions')
        .delete()
        .eq('id', redemption.id);
      
      return new Response(JSON.stringify({ 
        error: "Failed to update gift card", 
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create notification
    await supabaseClient
      .from('merchant_notifications')
      .insert({
        facility_id: locationId,
        notification_type: 'order_received',
        title: 'Gift Card Redeemed',
        message: `Gift card redeemed for $${amount}`,
        payload: {
          gift_card_id: giftCard.id,
          redemption_id: redemption.id,
          amount_redeemed: amount,
          remaining_balance: newBalance
        },
        priority: 1
      });

    return new Response(JSON.stringify({ 
      success: true,
      redemption_id: redemption.id,
      amount_redeemed: amount,
      remaining_balance: newBalance,
      card_number: giftCard.card_code.replace(/\d(?=\d{4})/g, "*")
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Gift card processing error:', error);
    return new Response(JSON.stringify({ 
      error: error.message, 
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});