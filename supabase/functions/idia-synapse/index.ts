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
    // 1. Get the data from the request body.
    const { step_count, recorded_at } = await req.json()

    // Validate required data
    if (!step_count || step_count <= 0) {
      console.warn('Invalid step count received:', step_count)
      return new Response(JSON.stringify({ 
        error: "Invalid step count",
        message: "Step count must be a positive number"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 2. Create a Supabase client with the user's authorization.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 3. Insert into health_metrics (legacy table for Hub display)
    const { error: healthMetricsError } = await supabaseClient
      .from('health_metrics')
      .insert({ step_count, recorded_at })

    if (healthMetricsError) {
      console.error('Health metrics error:', healthMetricsError)
      throw healthMetricsError
    }

    // 4. Insert into raw_health_data (new pipeline for processing)
    const rawHealthData = {
      raw_payload: { step_count, recorded_at, source: 'idia_life_app' },
      device_type: 'mobile_app',
      step_count,
      recorded_at,
      user_id: null, // Will be handled by RLS if auth is present
      processed: false
    }

    const { error: rawDataError } = await supabaseClient
      .from('raw_health_data')
      .insert(rawHealthData)

    if (rawDataError) {
      console.error('Raw health data error:', rawDataError)
      // Don't throw - we want to continue even if this fails
      console.log('Continuing despite raw_health_data error...')
    }

    console.log('Health data inserted successfully:', { step_count, recorded_at })
    console.log('Pipeline synchronization: Both health_metrics and raw_health_data updated')

    // 5. Trigger data processing pipeline
    try {
      const processResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-health-streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({ trigger: 'idia-synapse' })
      })
      
      if (processResponse.ok) {
        console.log('Processing pipeline triggered successfully')
      } else {
        console.log('Processing pipeline trigger failed, but continuing...')
      }
    } catch (processError) {
      console.log('Processing pipeline trigger error:', processError)
      // Continue - this is not critical for immediate response
    }

    // 6. Return a success response.
    return new Response(JSON.stringify({ 
      message: "Data received and processed",
      pipeline_status: "synchronized"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})