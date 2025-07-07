import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Health Data Processor activated - checking for processing needs...');

    // Check for recent staged health data
    const { data: recentData, error: dataError } = await supabaseClient
      .from('staged_health_data')
      .select('id, created_at, activity_type')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .order('created_at', { ascending: false });

    if (dataError) {
      console.error('Error fetching recent data:', dataError);
      throw dataError;
    }

    const recentCount = recentData?.length || 0;
    console.log(`Found ${recentCount} recent health records`);

    // Always attempt to trigger bundle generation when engaged manually
    console.log('Triggering bundle generation...');
    
    try {
      const bundleResponse = await supabaseClient.functions.invoke('create-health-data-bundle', {
        body: { 
          trigger: 'manual_engage',
          dataCount: recentCount,
          threshold_override: true // Allow processing even with low data count
        }
      });

      if (bundleResponse.error) {
        console.error('Bundle generation error:', bundleResponse.error);
        // Don't throw error, continue with response
      } else {
        console.log('Bundle generation triggered successfully:', bundleResponse.data);
      }
    } catch (bundleError) {
      console.error('Bundle generation failed:', bundleError);
      // Don't throw error, continue with response
    }

    // Get current marketplace status
    const { data: bundles, error: bundleError } = await supabaseClient
      .from('marketplace_bundles')
      .select('bundle_id, title, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (bundleError) {
      console.error('Error fetching bundles:', bundleError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        recentDataCount: recentCount,
        activeBundles: bundles?.length || 0,
        latestBundles: bundles?.map(b => ({ id: b.bundle_id, title: b.title })) || [],
        timestamp: new Date().toISOString(),
        message: `Processed ${recentCount} recent records, ${bundles?.length || 0} active bundles`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in health-data-processor:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});