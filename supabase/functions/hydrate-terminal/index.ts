import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

// Strict CORS to ensure the Sovereign Node can request this from any IP/Localhost
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.info("⚙️ [EDGE: hydrate-terminal] START: Invocation received.");

  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    console.info("⚙️ [EDGE: hydrate-terminal] PROGRESS: Resolving CORS preflight.");
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Extract Payload
    const { pairing_code } = await req.json();
    console.info(`⚙️ [EDGE: hydrate-terminal] PROGRESS: Extracted pairing_code: ${pairing_code}`);

    if (!pairing_code) {
      throw new Error("Missing pairing_code in request body.");
    }

    // 3. Initialize Supabase Admin Client
    // We MUST use the SERVICE_ROLE key because the terminal is currently unauthenticated 
    // and the vault table's RLS blocks anonymous reads. The code IS the credential.
    console.info("⚙️ [EDGE: hydrate-terminal] PROGRESS: Initializing secure Admin client.");
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Query the Vault
    console.info(`⚙️ [EDGE: hydrate-terminal] PROGRESS: Querying idia_schema_manifest_vault for code: ${pairing_code}`);
    const { data, error } = await supabaseAdmin
      .from('idia_schema_manifest_vault')
      .select('schema_payload')
      .eq('pairing_code', pairing_code)
      .single();

    if (error) {
      console.error(`⚙️ [EDGE: hydrate-terminal] DB_ERROR: ${error.message} | Code: ${error.code}`);
      throw new Error(`Failed to locate blueprint for code: ${pairing_code}`);
    }

    if (!data || !data.schema_payload) {
      console.error(`⚙️ [EDGE: hydrate-terminal] LOGIC_ERROR: Record found but schema_payload is empty.`);
      throw new Error("Corrupted blueprint in vault.");
    }

    // 5. Successful Handshake
    console.info("⚙️ [EDGE: hydrate-terminal] END: Blueprint located. Dispatching to Sovereign Node.");
    return new Response(
      JSON.stringify({ 
        success: true, 
        payload: data.schema_payload 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    // Granular Failure Logging
    console.error(`⚙️ [EDGE: hydrate-terminal] CRITICAL_FAILURE: ${error.message}`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
})