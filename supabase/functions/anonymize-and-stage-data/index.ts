
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

    const { rawData, userId, connectionId } = await req.json()
    
    console.log('Processing raw data for anonymization:', { userId, connectionId })

    // Generate pseudonym for the user
    const pseudoUserId = await generatePseudonym(userId)
    
    // Extract and anonymize location data
    const { anonymizedLocationHash, anonymizedLocationZone } = anonymizeLocationData(rawData)
    
    // Extract health metrics from raw data
    const healthMetrics = extractHealthMetrics(rawData)
    
    // Calculate data quality score
    const dataQualityScore = calculateDataQualityScore(healthMetrics)
    
    // Insert into staged_health_data table
    const { data: stagedData, error: stagingError } = await supabaseClient
      .from('staged_health_data')
      .insert({
        pseudo_user_id: pseudoUserId,
        activity_type: rawData.type || 'Unknown',
        duration_seconds: rawData.moving_time || rawData.elapsed_time,
        distance_meters: rawData.distance,
        elevation_gain_meters: rawData.total_elevation_gain,
        average_heartrate: rawData.average_heartrate,
        max_heartrate: rawData.max_heartrate,
        average_speed_mps: rawData.average_speed,
        max_speed_mps: rawData.max_speed,
        calories_burned: rawData.calories,
        anonymized_location_hash: anonymizedLocationHash,
        anonymized_location_zone: anonymizedLocationZone,
        device_type: rawData.device_name,
        weather_conditions: rawData.weather,
        effort_score: rawData.suffer_score,
        data_quality_score: dataQualityScore,
        ...healthMetrics
      })
      .select()

    if (stagingError) {
      console.error('Error staging data:', stagingError)
      throw stagingError
    }

    // Update processing queue status
    await supabaseClient
      .from('data_processing_queue')
      .update({ 
        processing_status: 'completed',
        processing_stage: 'staging',
        updated_at: new Date().toISOString()
      })
      .eq('raw_data_id', rawData.id)

    console.log('Successfully staged anonymized data:', stagedData[0]?.id)

    return new Response(
      JSON.stringify({ success: true, stagedDataId: stagedData[0]?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in anonymize-and-stage-data:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generatePseudonym(userId: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(userId + 'IDIA_SALT_2024')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)
    return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    console.error('Error generating pseudonym:', error)
    // Fallback to a simpler hash method
    return 'pseudo_' + Math.random().toString(36).substring(2, 15)
  }
}

function anonymizeLocationData(rawData: any) {
  try {
    if (rawData.start_latlng && rawData.start_latlng.length === 2) {
      const [lat, lng] = rawData.start_latlng
      // Round to 1 decimal place for zone anonymization
      const roundedLat = Math.round(lat * 10) / 10
      const roundedLng = Math.round(lng * 10) / 10
      
      return {
        anonymizedLocationHash: `HASH_${Math.abs(lat * lng).toString(36).substring(0, 8)}`,
        anonymizedLocationZone: `ZONE_${roundedLat}_${roundedLng}`
      }
    }
  } catch (error) {
    console.error('Error anonymizing location:', error)
  }
  
  return {
    anonymizedLocationHash: null,
    anonymizedLocationZone: null
  }
}

function extractHealthMetrics(rawData: any) {
  return {
    resting_heart_rate: rawData.resting_heart_rate || null,
    sleep_duration: rawData.sleep_duration || null,
    sleep_quality_score: rawData.sleep_quality || null,
    stress_level: rawData.stress_level || null,
    workout_intensity: rawData.workout_intensity || calculateWorkoutIntensity(rawData),
    recovery_score: rawData.recovery_score || null,
    steps_count: rawData.steps || null
  }
}

function calculateWorkoutIntensity(rawData: any): number | null {
  if (rawData.average_heartrate && rawData.max_heartrate) {
    // Simple intensity calculation based on heart rate zones
    const intensity = (rawData.average_heartrate / rawData.max_heartrate) * 100
    return Math.round(intensity)
  }
  return null
}

function calculateDataQualityScore(healthMetrics: any): number {
  let score = 0.5 // Base score
  
  if (healthMetrics.resting_heart_rate) score += 0.1
  if (healthMetrics.sleep_duration) score += 0.1
  if (healthMetrics.workout_intensity) score += 0.1
  if (healthMetrics.recovery_score) score += 0.1
  if (healthMetrics.steps_count) score += 0.1
  
  return Math.min(score, 1.0)
}
