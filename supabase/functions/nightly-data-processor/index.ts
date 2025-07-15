import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🌙 Nightly data processor starting...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current time for logging
    const startTime = new Date();
    console.log(`Processing start time: ${startTime.toISOString()}`);

    // 1. Check staged health data volume for the last 24 hours
    const { data: recentData, error: recentError } = await supabase
      .from('staged_health_data')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentError) {
      console.error('Error fetching recent staged data:', recentError);
      throw recentError;
    }

    console.log(`📊 Found ${recentData?.length || 0} staged health records from last 24 hours`);

    // 2. Get total staged health data count
    const { data: totalData, error: totalError } = await supabase
      .from('staged_health_data')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('Error fetching total staged data count:', totalError);
      throw totalError;
    }

    const totalCount = totalData?.length || 0;
    console.log(`📈 Total staged health records: ${totalCount}`);

    // 3. Trigger health data bundle creation with nightly trigger
    console.log('🎯 Triggering health data bundle creation...');
    
    const { data: bundleResult, error: bundleError } = await supabase.functions.invoke(
      'create-health-data-bundle',
      {
        body: {
          trigger: 'nightly',
          automated: true,
          source: 'nightly-data-processor',
          timestamp: startTime.toISOString()
        }
      }
    );

    if (bundleError) {
      console.error('Error creating health data bundles:', bundleError);
      throw bundleError;
    }

    console.log('✅ Bundle creation response:', bundleResult);

    // 4. Check marketplace bundles created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { data: todayBundles, error: bundlesError } = await supabase
      .from('marketplace_bundles')
      .select('*')
      .gte('created_at', todayStart.toISOString())
      .eq('is_active', true);

    if (bundlesError) {
      console.error('Error fetching today\'s bundles:', bundlesError);
    }

    console.log(`📦 Active bundles created today: ${todayBundles?.length || 0}`);

    // 5. Generate processing summary
    const endTime = new Date();
    const processingDuration = endTime.getTime() - startTime.getTime();

    const summary = {
      success: true,
      timestamp: startTime.toISOString(),
      processing_duration_ms: processingDuration,
      recent_staged_data_count: recentData?.length || 0,
      total_staged_data_count: totalCount,
      bundles_created_today: todayBundles?.length || 0,
      bundle_creation_result: bundleResult,
      message: 'Nightly data processing completed successfully'
    };

    console.log('🎉 Nightly processing completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Nightly processing failed:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      message: 'Nightly data processing failed'
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    );
  }
});