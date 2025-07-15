import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Force generating fresh bundles with latest staged health data...')

    // Call the create-health-data-bundle function with force_process
    const { data, error } = await supabaseClient.functions.invoke('create-health-data-bundle', {
      body: { 
        trigger: 'manual_engage', 
        force_process: true 
      }
    })

    if (error) {
      console.error('Error generating fresh bundles:', error)
      throw error
    }

    console.log('Fresh bundle generation result:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Fresh bundles generated successfully',
        result: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in force-fresh-bundle-generation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})