// Edge function to process lifestyle data from device_events into staged_lifestyle_data
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LifestyleProcessingRequest {
  force_process?: boolean;
  batch_size?: number;
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
    );

    console.log('Starting lifestyle data processing...');

    // Get pending lifestyle processing queue items
    const { data: pendingItems, error: queueError } = await supabaseClient
      .from('lifestyle_processing_queue')
      .select(`
        id,
        device_event_id,
        data_category,
        processing_stage
      `)
      .eq('processing_status', 'pending')
      .limit(50);

    if (queueError) {
      console.error('Error fetching queue items:', queueError);
      throw queueError;
    }

    console.log(`Found ${pendingItems?.length || 0} pending lifestyle items to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const item of pendingItems || []) {
      try {
        console.log(`Processing lifestyle queue item ${item.id}...`);

        // Mark as processing
        await supabaseClient
          .from('lifestyle_processing_queue')
          .update({ processing_status: 'processing' })
          .eq('id', item.id);

        // Get the device event data
        const { data: deviceEvent, error: eventError } = await supabaseClient
          .from('device_events')
          .select('*')
          .eq('id', item.device_event_id)
          .single();

        if (eventError || !deviceEvent) {
          console.error(`Error fetching device event ${item.device_event_id}:`, eventError);
          throw new Error(`Device event not found: ${item.device_event_id}`);
        }

        // Process and anonymize the lifestyle data
        const processedData = await processLifestyleEvent(deviceEvent);

        // Insert into staged_lifestyle_data
        const { error: insertError } = await supabaseClient
          .from('staged_lifestyle_data')
          .insert([processedData]);

        if (insertError) {
          console.error('Error inserting staged lifestyle data:', insertError);
          throw insertError;
        }

        // Mark as completed
        await supabaseClient
          .from('lifestyle_processing_queue')
          .update({ 
            processing_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        processedCount++;
        console.log(`Successfully processed lifestyle item ${item.id}`);

      } catch (error) {
        console.error(`Error processing lifestyle item ${item.id}:`, error);
        
        // Mark as failed and increment retry count
        await supabaseClient
          .from('lifestyle_processing_queue')
          .update({ 
            processing_status: 'failed',
            error_details: { error: error.message },
            retry_count: item.retry_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        errorCount++;
      }
    }

    // Trigger bundle generation if we processed data
    if (processedCount > 0) {
      console.log('Triggering lifestyle bundle generation...');
      
      const { error: bundleError } = await supabaseClient.functions.invoke('create-lifestyle-bundles', {
        body: { 
          trigger: 'lifestyle_data_processed',
          processed_count: processedCount 
        }
      });

      if (bundleError) {
        console.error('Error triggering bundle generation:', bundleError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: processedCount,
        error_count: errorCount,
        message: `Processed ${processedCount} lifestyle items, ${errorCount} errors`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Lifestyle processing error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Function to process and anonymize lifestyle event data
async function processLifestyleEvent(deviceEvent: any) {
  const payload = deviceEvent.json_payload;
  
  // Generate pseudonymized user ID
  const pseudoUserId = await generatePseudonym(deviceEvent.user_id);
  
  // Anonymize location data if present
  const locationZone = payload.location ? 
    anonymizeLocation(payload.location.latitude, payload.location.longitude) : null;

  // Extract lifestyle patterns
  const activityContext = extractActivityContext(payload);
  const socialInteractions = extractSocialInteractions(payload);
  const appUsagePatterns = extractAppUsagePatterns(payload);
  const deviceUsageMetrics = extractDeviceUsageMetrics(payload);

  // Calculate data quality scores
  const dataQualityScore = calculateLifestyleDataQuality(payload);
  const dataCompletenessScore = calculateLifestyleDataCompleteness(payload);

  return {
    pseudo_user_id: pseudoUserId,
    event_type: deviceEvent.event_type,
    event_category: deviceEvent.data_category || 'lifestyle',
    session_duration: payload.session_duration || null,
    location_zone: locationZone,
    activity_context: activityContext,
    social_interactions: socialInteractions,
    app_usage_patterns: appUsagePatterns,
    device_usage_metrics: deviceUsageMetrics,
    data_quality_score: dataQualityScore,
    data_completeness_score: dataCompletenessScore,
    anonymized_from_event_id: deviceEvent.id
  };
}

// Helper functions for data extraction and processing
function extractActivityContext(payload: any) {
  return {
    activity_type: payload.activity_type || 'unknown',
    duration: payload.duration || null,
    intensity: payload.intensity || null,
    context: payload.context || null,
    weather_conditions: payload.weather || null
  };
}

function extractSocialInteractions(payload: any) {
  return {
    interaction_count: payload.social_interactions?.count || 0,
    interaction_types: payload.social_interactions?.types || [],
    group_activities: payload.social_interactions?.group_activities || false,
    social_context: payload.social_interactions?.context || null
  };
}

function extractAppUsagePatterns(payload: any) {
  return {
    app_category: payload.app_usage?.category || null,
    usage_duration: payload.app_usage?.duration || null,
    feature_usage: payload.app_usage?.features || [],
    engagement_level: payload.app_usage?.engagement || null
  };
}

function extractDeviceUsageMetrics(payload: any) {
  return {
    device_type: payload.device_info?.type || 'mobile',
    os_version: payload.device_info?.os_version || null,
    battery_level: payload.device_info?.battery_level || null,
    network_type: payload.device_info?.network_type || null,
    screen_time: payload.device_info?.screen_time || null
  };
}

function calculateLifestyleDataQuality(payload: any): number {
  let score = 0.3; // Base score
  
  // Add points for completeness
  if (payload.location) score += 0.2;
  if (payload.social_interactions) score += 0.15;
  if (payload.app_usage) score += 0.15;
  if (payload.device_info) score += 0.1;
  if (payload.context) score += 0.1;
  
  return Math.min(score, 1.0);
}

function calculateLifestyleDataCompleteness(payload: any): number {
  const totalFields = 8;
  let completedFields = 0;
  
  if (payload.event_type) completedFields++;
  if (payload.duration) completedFields++;
  if (payload.location) completedFields++;
  if (payload.social_interactions) completedFields++;
  if (payload.app_usage) completedFields++;
  if (payload.device_info) completedFields++;
  if (payload.context) completedFields++;
  if (payload.session_id) completedFields++;
  
  return completedFields / totalFields;
}

async function generatePseudonym(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + 'IDIA_LIFESTYLE_SALT_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function anonymizeLocation(lat: number, lng: number): string {
  // Round to 1 decimal place for zone-level anonymization
  const zoneLat = Math.round(lat * 10) / 10;
  const zoneLng = Math.round(lng * 10) / 10;
  return `ZONE_${zoneLat}_${zoneLng}`;
}