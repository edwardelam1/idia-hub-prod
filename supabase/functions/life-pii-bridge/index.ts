/**
 * life-pii-bridge — Zero-PII Bridge for IDIA Hub
 * 
 * Returns PII data to the authenticated Hub session.
 * PII is NEVER persisted in the Hub database.
 * 
 * Current implementation: Stubbed to return PII from auth.users metadata.
 * Future: Will validate a signed JWT from IDIA Life's Secure Enclave
 * containing encrypted PII payload pushed on device login.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate the user's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError) {
      console.error('life-pii-bridge auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Session Invalid' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- STUB IMPLEMENTATION ---
    // TODO: Replace with real Secure Enclave integration.
    // In production, this would:
    // 1. Accept a signed payload from IDIA Life app (pushed on login)
    // 2. Validate the signature against the user's device public key
    // 3. Decrypt the PII from the Secure Enclave payload
    // 4. Return the decrypted PII (never persisting it)
    //
    // For now, we pull from auth.users metadata as a stand-in.

    const metadata = user.user_metadata ?? {}
    const email = user.email ?? null

    // Derive display name from metadata or email prefix
    const fullName = [metadata.first_name, metadata.last_name]
      .filter(Boolean)
      .join(' ') || metadata.full_name || metadata.name || null

    const displayName = fullName || (email ? email.split('@')[0] : null)

    // Fetch platform_guid from profiles (non-PII identifier)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profileRow } = await adminClient
      .from('profiles')
      .select('platform_guid, account_type, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()

    return new Response(
      JSON.stringify({
        platform_guid: profileRow?.platform_guid ?? null,
        display_name: displayName,
        full_name: fullName,
        email: email,
        avatar_url: profileRow?.avatar_url ?? metadata.avatar_url ?? null,
        account_type: profileRow?.account_type ?? 'business',
        source: 'auth_metadata_stub', // Will be 'secure_enclave' in production
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('life-pii-bridge error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
