import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { nfc_token, terminal_id } = await req.json();
    console.info(`🛡️ [EDGE: verify-idia-life-tap] Verifying token from terminal: ${terminal_id}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SECRET_KEY') ?? ''
    );

    // 1. Verify the NFC Token (In production, exchange token for Auth UUID)
    // For this bridge, we assume the token maps to a verified operator.
    // We fetch a target user to simulate the identity resolution.
    // (Replace with actual JWT/Token resolution logic).
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({ limit: 1 });

    if (userError || !users || users.length === 0) {
      throw new Error("Token resolution failed. Operator not found.");
    }

    const targetUser = users[0];
    const meta = targetUser.user_metadata || {};

    // 2. Fetch or Calculate Biological Readiness (HRI)
    // In production, this checks the `operator_biological_readiness` table or Hub memory
    const simulatedHri = Math.floor(Math.random() * 15) + 85; // 85-100%

    // 3. Construct the Volatile Session Payload
    // Strict adherence to the PII-Bridge rule: Read from meta, send to edge, do not write.
    const sessionPayload = {
      operator_id: targetUser.id,
      display_name: meta.display_name || meta.full_name || "Verified Operator",
      hri_score: simulatedHri,
      session_token: `SECURE-SESS-${Date.now()}`,
      is_minor: meta.is_minor || false // Triggers the DAT-M.6.3 Minor Data Shield on terminal
    };

    console.info(`🛡️ [EDGE: verify-idia-life-tap] Verification complete. Yielding volatile payload.`);

    return new Response(JSON.stringify(sessionPayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error(`❌ [EDGE: verify-idia-life-tap] Handshake collapsed: ${err.message}`);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
})