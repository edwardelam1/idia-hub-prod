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
    // 1. Get the data from the request body - now accepts all health data
    const healthData = await req.json()
    
    console.log('Received health data:', healthData)
    
    // Extract step count for validation (still required as primary field)
    const step_count = healthData.step_count || healthData.steps || 0
    const recorded_at = healthData.recorded_at || healthData.timestamp
    
    // Enhanced data validation - more permissive
    if (typeof step_count !== 'number' || step_count < 0 || step_count > 200000) {
      console.warn('Invalid step count received:', step_count, 'type:', typeof step_count)
      return new Response(JSON.stringify({ 
        error: "Invalid step count",
        message: "Step count must be a non-negative number below 200,000",
        received: { step_count, type: typeof step_count }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Validate recorded_at timestamp
    if (recorded_at && isNaN(Date.parse(recorded_at))) {
      console.warn('Invalid timestamp received:', recorded_at)
      return new Response(JSON.stringify({ 
        error: "Invalid timestamp",
        message: "recorded_at must be a valid ISO timestamp"
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

    // 3. Extract user_id if available for better deduplication
    let user_id = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        user_id = payload.sub;
      } catch (e) {
        console.log('Could not extract user_id from token, proceeding without user_id');
      }
    }

    // 4. Use improved duplicate checking function
    const { data: isDuplicate, error: checkError } = await supabaseClient.rpc(
      'check_raw_health_data_duplicate',
      {
        p_step_count: step_count,
        p_recorded_at: recorded_at || new Date().toISOString(),
        p_user_id: user_id
      }
    );

    if (checkError) {
      console.error('Error checking for duplicates:', checkError);
    }

    if (isDuplicate) {
      console.log('Duplicate record detected, skipping insert');
      return new Response(
        JSON.stringify({ 
          message: 'Data received (duplicate detected and skipped)',
          pipeline_status: 'deduplicated'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 5. Insert into raw_health_data with complete Apple Health data
    const rawHealthData = {
      raw_payload: { 
        ...healthData, 
        source: 'apple_health',
        processed_at: new Date().toISOString()
      },
      device_type: healthData.device_type || 'apple_health',
      step_count,
      recorded_at: recorded_at || new Date().toISOString(),
      user_id,
      processed: false
    }

    const { data: insertedData, error: rawDataError } = await supabaseClient
      .from('raw_health_data')
      .insert(rawHealthData)
      .select()
      .single()

    if (rawDataError) {
      console.error('Raw health data error:', rawDataError)
      throw rawDataError
    }

    console.log('Health data inserted successfully:', { 
      step_count, 
      recorded_at, 
      data_id: insertedData?.id,
      validation_status: 'passed',
      pipeline_status: 'linear',
      timestamp: new Date().toISOString()
    })

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