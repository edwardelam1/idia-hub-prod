
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

    console.log('Processing real-time health data streams...')

    // Get pending data from processing queue
    const { data: pendingData, error: queueError } = await supabaseClient
      .from('data_processing_queue')
      .select('*, raw_strava_data(*)')
      .eq('processing_status', 'pending')
      .limit(10) // Process in batches

    if (queueError) {
      console.error('Error fetching pending data:', queueError)
      throw queueError
    }

    if (!pendingData || pendingData.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending data to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${pendingData.length} pending records`)

    const processedCount = await processBatch(supabaseClient, pendingData)

    // Check if we should trigger real-time bundle updates
    await checkForRealTimeBundleUpdates(supabaseClient)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCount,
        message: `Successfully processed ${processedCount} records`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-health-streams:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function processBatch(supabaseClient: any, pendingData: any[]): Promise<number> {
  let processedCount = 0

  for (const item of pendingData) {
    try {
      // Mark as processing
      await supabaseClient
        .from('data_processing_queue')
        .update({ 
          processing_status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)

      // Call anonymization function
      const anonymizeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/anonymize-and-stage-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          rawData: item.raw_strava_data,
          userId: item.raw_strava_data.user_id,
          connectionId: item.raw_strava_data.connection_id
        })
      })

      if (anonymizeResponse.ok) {
        await supabaseClient
          .from('data_processing_queue')
          .update({ 
            processing_status: 'completed',
            processing_stage: 'staging',
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
        
        processedCount++
      } else {
        throw new Error(`Anonymization failed: ${await anonymizeResponse.text()}`)
      }

    } catch (error) {
      console.error(`Error processing item ${item.id}:`, error)
      
      // Update retry count and mark as failed if max retries exceeded
      const newRetryCount = (item.retry_count || 0) + 1
      const status = newRetryCount >= 3 ? 'failed' : 'pending'
      
      await supabaseClient
        .from('data_processing_queue')
        .update({ 
          processing_status: status,
          retry_count: newRetryCount,
          error_details: { error: error.message, timestamp: new Date().toISOString() },
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
    }
  }

  return processedCount
}

async function checkForRealTimeBundleUpdates(supabaseClient: any) {
  // Check if enough new data has been processed to trigger bundle updates
  const { data: recentData, error } = await supabaseClient
    .from('staged_health_data')
    .select('id')
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour

  if (error) {
    console.error('Error checking recent data:', error)
    return
  }

  // If we have significant new data, trigger bundle regeneration
  if (recentData && recentData.length > 50) {
    console.log(`Triggering real-time bundle update with ${recentData.length} new records`)
    
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/create-health-data-bundle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({ trigger: 'real-time' })
    })
  }
}
