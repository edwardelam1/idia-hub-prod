
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
    
    console.log('Processing raw data for anonymization:', { 
      userId, 
      connectionId, 
      dataSource: rawData?.source || 'unknown',
      availableFields: Object.keys(rawData || {})
    })

    // Generate pseudonym for the user
    const pseudoUserId = await generatePseudonym(userId)
    
    // Extract and anonymize location data
    const { anonymizedLocationHash, anonymizedLocationZone } = anonymizeLocationData(rawData)
    
    // Extract health metrics from raw data (handles both Apple Health and Strava)
    const healthMetrics = extractHealthMetrics(rawData)
    
    // Calculate comprehensive data quality score
    const dataQualityScore = calculateComprehensiveDataQualityScore(healthMetrics, rawData)
    
    // Insert into staged_health_data table with proper field mapping
    const stagedHealthData = mapToStagedHealthData(rawData, healthMetrics, {
      pseudoUserId,
      anonymizedLocationHash,
      anonymizedLocationZone,
      dataQualityScore
    })
    
    const { data: stagedData, error: stagingError } = await supabaseClient
      .from('staged_health_data')
      .insert(stagedHealthData)
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
  // Handle both Apple Health and Strava data formats
  const isAppleHealth = rawData.source === 'apple_health'
  
  if (isAppleHealth) {
    return {
      resting_heart_rate: rawData.restingHeartRate || rawData.resting_heart_rate || null,
      sleep_duration: rawData.sleepHours ? rawData.sleepHours * 3600 : rawData.sleep_duration || null,
      sleep_quality_score: rawData.sleepQuality || rawData.sleep_quality || null,
      stress_level: rawData.stressLevel || rawData.stress_level || null,
      workout_intensity: rawData.workoutIntensity || calculateWorkoutIntensity(rawData),
      recovery_score: rawData.recoveryScore || rawData.recovery_score || null,
      steps_count: rawData.step_count || rawData.steps || null,
      calories_burned: rawData.calories || rawData.activeEnergyBurned || null,
      heart_rate_variability_ms: rawData.heartRateVariability || rawData.hrv || null,
      average_heartrate: rawData.heartRate || rawData.averageHeartRate || null,
      time_in_bed_minutes: rawData.timeInBed ? rawData.timeInBed * 60 : null,
      time_asleep_minutes: rawData.timeAsleep ? rawData.timeAsleep * 60 : null,
      distance_walking_running_meters: rawData.walkingDistance || rawData.runningDistance || null,
      mindful_minutes: rawData.mindfulMinutes || null,
      blood_oxygen_saturation: rawData.oxygenSaturation || null
    }
  } else {
    // Strava format
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
}

function calculateWorkoutIntensity(rawData: any): number | null {
  if (rawData.average_heartrate && rawData.max_heartrate) {
    // Simple intensity calculation based on heart rate zones
    const intensity = (rawData.average_heartrate / rawData.max_heartrate) * 100
    return Math.round(intensity)
  }
  return null
}

function calculateComprehensiveDataQualityScore(healthMetrics: any, rawData: any): number {
  let basicMetricsCount = 0
  let vitalsCount = 0
  let nutritionCount = 0
  let hasSleepData = false
  let hasClinicalData = false
  let symptomsCount = 0
  
  // Count basic metrics
  if (healthMetrics.steps_count) basicMetricsCount++
  if (healthMetrics.calories_burned) basicMetricsCount++
  if (healthMetrics.distance_walking_running_meters) basicMetricsCount++
  if (healthMetrics.average_heartrate) basicMetricsCount++
  
  // Count vitals
  if (healthMetrics.resting_heart_rate) vitalsCount++
  if (healthMetrics.heart_rate_variability_ms) vitalsCount++
  if (healthMetrics.blood_oxygen_saturation) vitalsCount++
  if (rawData.bodyTemperature) vitalsCount++
  
  // Check for sleep data
  if (healthMetrics.sleep_duration || healthMetrics.time_asleep_minutes) {
    hasSleepData = true
  }
  
  // Check for clinical data
  if (rawData.bloodPressure || rawData.weight || rawData.height) {
    hasClinicalData = true
  }
  
  // Use the comprehensive scoring function from database
  return Math.min(1.0, 0.3 + (basicMetricsCount * 0.1) + (vitalsCount * 0.08) + 
    (hasSleepData ? 0.15 : 0) + (hasClinicalData ? 0.2 : 0))
}

function mapToStagedHealthData(rawData: any, healthMetrics: any, metadata: any) {
  const isAppleHealth = rawData.source === 'apple_health'
  
  const baseData = {
    pseudo_user_id: metadata.pseudoUserId,
    activity_type: rawData.type || (isAppleHealth ? 'HealthKit' : 'Unknown'),
    anonymized_location_hash: metadata.anonymizedLocationHash,
    anonymized_location_zone: metadata.anonymizedLocationZone,
    device_type: rawData.device_name || rawData.device_type || (isAppleHealth ? 'iPhone' : 'Unknown'),
    data_quality_score: metadata.dataQualityScore,
    ...healthMetrics
  }
  
  if (isAppleHealth) {
    // Apple Health specific mappings
    return {
      ...baseData,
      // Weight and body composition
      weight_kg: rawData.weight || null,
      height_cm: rawData.height || null,
      body_mass_index: rawData.bmi || null,
      body_fat_percentage: rawData.bodyFat || null,
      
      // Blood pressure and vitals
      systolic_blood_pressure: rawData.bloodPressureSystolic || null,
      diastolic_blood_pressure: rawData.bloodPressureDiastolic || null,
      respiratory_rate_per_min: rawData.respiratoryRate || null,
      body_temperature_celsius: rawData.bodyTemperature || null,
      
      // Activity and exercise
      vo2_max: rawData.vo2Max || null,
      flights_climbed: rawData.flightsClimbed || null,
      walking_speed_mps: rawData.walkingSpeed || null,
      
      // Nutrition data
      dietary_energy_kcal: rawData.dietaryEnergy || null,
      protein_g: rawData.protein || null,
      carbohydrates_g: rawData.carbohydrates || null,
      total_fat_g: rawData.totalFat || null,
      water_ml: rawData.water || null,
      
      // Mental health and wellness
      mood_score: rawData.mood || null,
      mindful_minutes: rawData.mindfulMinutes || null,
      stress_level: rawData.stressLevel || null
    }
  } else {
    // Strava format
    return {
      ...baseData,
      duration_seconds: rawData.moving_time || rawData.elapsed_time,
      distance_meters: rawData.distance,
      elevation_gain_meters: rawData.total_elevation_gain,
      average_heartrate: rawData.average_heartrate,
      max_heartrate: rawData.max_heartrate,
      average_speed_mps: rawData.average_speed,
      max_speed_mps: rawData.max_speed,
      calories_burned: rawData.calories,
      weather_conditions: rawData.weather,
      effort_score: rawData.suffer_score
    }
  }
}
