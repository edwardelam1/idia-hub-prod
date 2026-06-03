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
      Deno.env.get('SUPABASE_SECRET_KEY') ?? ''
    )

    console.log('Starting comprehensive health pipeline recovery...')

    // Step 1: Process stuck raw health data
    console.log('Step 1: Processing stuck raw health data...')
    const { data: fixResult, error: fixError } = await supabaseClient.functions.invoke('fix-health-pipeline', {
      body: { comprehensive_fix: true }
    })

    if (fixError) {
      console.error('Error in fix-health-pipeline:', fixError)
      throw fixError
    }

    console.log('Fix health pipeline result:', fixResult)

    // Step 2: Process health streams
    console.log('Step 2: Processing health streams...')
    const { data: streamResult, error: streamError } = await supabaseClient.functions.invoke('process-health-streams', {
      body: { trigger: 'recovery_mode' }
    })

    if (streamError) {
      console.error('Error in process-health-streams:', streamError)
      throw streamError
    }

    console.log('Process health streams result:', streamResult)

    // Step 3: Generate fresh marketplace bundles
    console.log('Step 3: Generating fresh marketplace bundles...')
    const { data: bundleResult, error: bundleError } = await supabaseClient.functions.invoke('trigger-comprehensive-bundle-generation', {
      body: { trigger: 'pipeline_recovery' }
    })

    if (bundleError) {
      console.error('Error in bundle generation:', bundleError)
      throw bundleError
    }

    console.log('Bundle generation result:', bundleResult)

    // Step 4: Get final pipeline status
    console.log('Step 4: Checking final pipeline status...')
    const { data: rawHealthData } = await supabaseClient
      .from('raw_health_data')
      .select('processing_status')
      .eq('processing_status', 'pending')

    const { data: activeBundles } = await supabaseClient
      .from('marketplace_bundles')
      .select('id, created_at')
      .eq('is_active', true)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const { data: recentRewards } = await supabaseClient
      .from('transactions')
      .select('id, amount, created_at')
      .eq('transaction_type', 'data_reward')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const recoveryResults = {
      success: true,
      message: 'Health pipeline recovery completed successfully',
      pipeline_status: {
        pending_raw_data: rawHealthData?.length || 0,
        new_bundles_today: activeBundles?.length || 0,
        recent_rewards: recentRewards?.length || 0
      },
      steps_completed: {
        fix_health_pipeline: !!fixResult,
        process_health_streams: !!streamResult,
        generate_bundles: !!bundleResult
      },
      fix_result: fixResult,
      stream_result: streamResult,
      bundle_result: bundleResult
    }

    console.log('Pipeline recovery completed:', recoveryResults)

    return new Response(
      JSON.stringify(recoveryResults),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in pipeline recovery:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        message: 'Pipeline recovery failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})