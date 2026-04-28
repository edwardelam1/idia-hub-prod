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

    const { nfcPayload, locationId, items, totalAmount } = await req.json();

    // Validate NFC payload structure
    if (!nfcPayload?.signature || !nfcPayload?.walletAddress || !nfcPayload?.amount) {
      return new Response(JSON.stringify({ 
        error: "Invalid NFC payload", 
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate signature using our database function
    const { data: signatureValid } = await supabaseClient.rpc('validate_nfc_signature', {
      p_transaction_data: { amount: nfcPayload.amount, timestamp: nfcPayload.timestamp },
      p_signature: nfcPayload.signature,
      p_wallet_address: nfcPayload.walletAddress
    });

    if (!signatureValid) {
      return new Response(JSON.stringify({ 
        error: "Invalid NFC signature", 
        success: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create POS transaction
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('pos_transactions')
      .insert({
        location_id: locationId,
        total_amount: totalAmount,
        payment_method: 'IDIA-USD (NFC)',
        payment_processor: 'idia_blockchain',
        idia_usd_amount: nfcPayload.amount,
        nfc_payload: nfcPayload,
        status: 'pending_verification'
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      return new Response(JSON.stringify({ 
        error: "Failed to create transaction", 
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create NFC transaction record
    const { data: nfcTransaction, error: nfcError } = await supabaseClient
      .from('nfc_transactions')
      .insert({
        transaction_id: transaction.id,
        customer_wallet_address: nfcPayload.walletAddress,
        idia_amount: nfcPayload.amount,
        usd_equivalent: totalAmount,
        exchange_rate: totalAmount / nfcPayload.amount,
        signature_payload: nfcPayload.signature,
        verification_status: 'verified'
      })
      .select()
      .single();

    if (nfcError) {
      console.error('NFC transaction error:', nfcError);
      // Rollback main transaction if NFC record fails
      await supabaseClient
        .from('pos_transactions')
        .delete()
        .eq('id', transaction.id);
      
      return new Response(JSON.stringify({ 
        error: "Failed to process NFC payment", 
        success: false 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update transaction status to completed
    await supabaseClient
      .from('pos_transactions')
      .update({ status: 'completed' })
      .eq('id', transaction.id);

    // Create success notification
    await supabaseClient
      .from('merchant_notifications')
      .insert({
        facility_id: locationId,
        notification_type: 'order_received',
        title: 'IDIA-USD Payment Received',
        message: `Successfully processed ${nfcPayload.amount} IDIA-USD payment`,
        payload: {
          transaction_id: transaction.id,
          amount: nfcPayload.amount,
          wallet: nfcPayload.walletAddress.substring(0, 8) + '...'
        },
        priority: 2
      });

    return new Response(JSON.stringify({ 
      success: true,
      transaction_id: transaction.id,
      nfc_transaction_id: nfcTransaction.id,
      verification_status: 'verified',
      blockchain_processing: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('NFC processing error:', error);
    return new Response(JSON.stringify({ 
      error: error.message, 
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});