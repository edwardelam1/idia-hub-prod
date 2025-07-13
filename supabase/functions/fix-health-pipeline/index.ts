import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting health pipeline fix...')

    // 1. Process pending queue items for health data
    const { data: pendingHealthData, error: queueError } = await supabaseClient
      .from('data_processing_queue')
      .select('*')
      .eq('data_source_type', 'health_data')
      .eq('processing_status', 'pending')

    if (queueError) {
      console.error('Error fetching pending health data:', queueError)
      throw queueError
    }

    console.log(`Found ${pendingHealthData?.length || 0} pending health data items`)

    // 2. Process raw health data that hasn't been processed
    const { data: unprocessedRawData, error: rawDataError } = await supabaseClient
      .from('raw_health_data')
      .select('*')
      .eq('processed', false)
      .limit(50) // Increased batch size

    if (rawDataError) {
      console.error('Error fetching unprocessed raw data:', rawDataError)
      throw rawDataError
    }

    console.log(`Found ${unprocessedRawData?.length || 0} unprocessed raw health data items`)

    let processedCount = 0

    // 3. Process unprocessed raw health data
    for (const rawData of unprocessedRawData || []) {
      try {
        // Validate and extract data
        const stepCount = rawData.step_count || rawData.raw_payload?.step_count
        const recordedAt = rawData.recorded_at || rawData.raw_payload?.recorded_at

        if (stepCount !== null && stepCount !== undefined && stepCount >= 0) {
          // Create staged health data entry
          const { error: stagedError } = await supabaseClient
            .from('staged_health_data')
            .insert({
              pseudo_user_id: rawData.user_id ? `user_${rawData.user_id.slice(0, 8)}` : 'anonymous',
              activity_type: 'daily_activity',
              steps_count: stepCount,
              device_type: rawData.device_type || 'mobile_app',
              data_quality_score: stepCount > 0 ? 0.8 : 0.3,
              data_completeness_score: 0.7,
              raw_data_id: rawData.id
            })

          if (!stagedError) {
            // Also insert into health_metrics for immediate display
            const { error: healthMetricError } = await supabaseClient
              .from('health_metrics')
              .insert({
                step_count: stepCount,
                recorded_at: recordedAt,
                user_id: rawData.user_id
              })

            // Mark raw data as processed
            await supabaseClient
              .from('raw_health_data')
              .update({ 
                processed: true,
                processing_completed_at: new Date().toISOString()
              })
              .eq('id', rawData.id)

            processedCount++
            console.log(`Processed raw health data item ${rawData.id}, health_metric_error:`, healthMetricError)
          } else {
            console.error(`Failed to create staged data for ${rawData.id}:`, stagedError)
          }
        }
      } catch (error) {
        console.error(`Error processing raw data ${rawData.id}:`, error)
      }
    }

    // 4. Fix null health metrics by triggering proper data insertion
    const { data: nullMetrics, error: nullError } = await supabaseClient
      .from('health_metrics')
      .select('*')
      .is('step_count', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!nullError && nullMetrics) {
      console.log(`Found ${nullMetrics.length} health metrics with null step counts`)
      
      // Delete invalid entries to prevent confusion
      for (const metric of nullMetrics) {
        await supabaseClient
          .from('health_metrics')
          .delete()
          .eq('id', metric.id)
      }
    }

    // 5. Trigger bundle generation if we processed significant data
    if (processedCount > 0) {
      console.log(`Triggering bundle generation after processing ${processedCount} items`)
      
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-health-data-bundle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({ 
            trigger: 'pipeline_fix',
            processed_count: processedCount 
          })
        })
      } catch (bundleError) {
        console.log('Bundle generation trigger failed:', bundleError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed_count: processedCount,
        pending_queue_items: pendingHealthData?.length || 0,
        unprocessed_raw_items: unprocessedRawData?.length || 0,
        message: `Pipeline fixed: processed ${processedCount} health data items`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in fix-health-pipeline:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})