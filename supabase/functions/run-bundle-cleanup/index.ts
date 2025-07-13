import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Running bundle cleanup to remove duplicates...')

    // Call the cleanup-duplicate-bundles function
    const { data: cleanupResult, error: cleanupError } = await supabaseClient.functions.invoke(
      'cleanup-duplicate-bundles',
      {
        body: { trigger: 'manual_cleanup' }
      }
    )

    if (cleanupError) {
      console.error('Error running cleanup:', cleanupError)
      throw cleanupError
    }

    console.log('Cleanup completed:', cleanupResult)

    return new Response(JSON.stringify({
      success: true,
      message: 'Bundle cleanup completed successfully',
      cleanupResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in run-bundle-cleanup:', error)
    return new Response(JSON.stringify({
      error: error.message,
      function: 'run-bundle-cleanup'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})