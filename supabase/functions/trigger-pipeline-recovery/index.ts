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

    console.log('Starting comprehensive pipeline recovery...')

    // 1. Trigger fix-health-pipeline multiple times to clear backlog
    const fixResults = []
    for (let i = 0; i < 3; i++) {
      try {
        const fixResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fix-health-pipeline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({ 
            trigger: 'recovery_batch',
            batch_number: i + 1
          })
        })
        
        if (fixResponse.ok) {
          const result = await fixResponse.json()
          fixResults.push(result)
          console.log(`Fix batch ${i + 1} completed:`, result)
        }
      } catch (error) {
        console.error(`Fix batch ${i + 1} failed:`, error)
      }
    }

    // 2. Trigger process-health-streams to handle queue
    try {
      const streamResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-health-streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ trigger: 'recovery' })
      })
      
      if (streamResponse.ok) {
        const streamResult = await streamResponse.json()
        console.log('Stream processing completed:', streamResult)
      }
    } catch (error) {
      console.error('Stream processing failed:', error)
    }

    // 3. Get final statistics
    const [healthMetrics, rawHealthData, queueData] = await Promise.allSettled([
      supabaseClient.from('health_metrics').select('id').order('created_at', { ascending: false }).limit(10),
      supabaseClient.from('raw_health_data').select('id, processed').eq('processed', false),
      supabaseClient.from('data_processing_queue').select('id, processing_status').eq('processing_status', 'pending')
    ])

    const stats = {
      recent_health_metrics: healthMetrics.status === 'fulfilled' ? healthMetrics.value.data?.length || 0 : 0,
      unprocessed_raw_data: rawHealthData.status === 'fulfilled' ? rawHealthData.value.data?.length || 0 : 0,
      pending_queue_items: queueData.status === 'fulfilled' ? queueData.value.data?.length || 0 : 0
    }

    console.log('Recovery complete. Final stats:', stats)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Pipeline recovery completed',
        fix_batches_run: fixResults.length,
        fix_results: fixResults,
        final_stats: stats
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in pipeline recovery:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})