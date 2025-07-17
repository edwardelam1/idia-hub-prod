
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
  
  console.log('Extracting health metrics from flat payload:', {
    source: rawData.source,
    availableFields: Object.keys(rawData || {}),
    sampleValues: {
      steps: rawData.steps,
      heartRate: rawData.heartRate,
      weight: rawData.weight,
      height: rawData.height,
      oxygenSaturation: rawData.oxygenSaturation
    }
  })
  
  if (isAppleHealth) {
    // Extract from flat HealthKitManager.swift payload structure
    return {
      // Basic Activity Metrics (always collected)
      steps_count: rawData.steps || rawData.step_count || null,
      calories_burned: rawData.calories || rawData.activeEnergyBurned || null,
      distance_walking_running_meters: rawData.distanceWalkingRunning || rawData.walkingRunningDistance || null,
      distance_cycling_meters: rawData.distanceCycling || rawData.cyclingDistance || null,
      flights_climbed: rawData.flightsClimbed || null,
      
      // Heart Rate and Cardiovascular (primary vitals)
      average_heartrate: rawData.heartRate || rawData.averageHeartRate || null,
      resting_heart_rate: rawData.restingHeartRate || null,
      heart_rate_variability_ms: rawData.heartRateVariability || rawData.hrv || null,
      blood_oxygen_saturation: rawData.oxygenSaturation || rawData.bloodOxygen || null,
      systolic_blood_pressure: rawData.bloodPressureSystolic || rawData.systolicBP || null,
      diastolic_blood_pressure: rawData.bloodPressureDiastolic || rawData.diastolicBP || null,
      vo2_max: rawData.vo2Max || rawData.maxOxygenUptake || null,
      
      // Body Measurements & Composition
      height_cm: rawData.height || rawData.bodyHeight || null,
      weight_kg: rawData.weight || rawData.bodyMass || null,
      body_mass_index: rawData.bodyMassIndex || rawData.bmi || null,
      body_fat_percentage: rawData.bodyFatPercentage || null,
      lean_body_mass_kg: rawData.leanBodyMass || null,
      waist_circumference_cm: rawData.waistCircumference || null,
      
      // Temperature and Respiratory
      body_temperature_celsius: rawData.bodyTemperature || null,
      basal_body_temperature_celsius: rawData.basalBodyTemperature || null,
      respiratory_rate_per_min: rawData.respiratoryRate || null,
      
      // Sleep Metrics (comprehensive)
      sleep_duration: rawData.sleepHours ? rawData.sleepHours * 3600 : rawData.sleepAnalysis || null,
      time_in_bed_minutes: rawData.timeInBed ? rawData.timeInBed * 60 : null,
      time_asleep_minutes: rawData.timeAsleep ? rawData.timeAsleep * 60 : null,
      awake_duration_minutes: rawData.awakeDuration || null,
      rem_duration_minutes: rawData.remSleep || null,
      core_sleep_duration_minutes: rawData.coreSleep || null,
      deep_sleep_duration_minutes: rawData.deepSleep || null,
      sleep_quality_score: rawData.sleepQuality || null,
      
      // Nutrition & Hydration (comprehensive)
      dietary_energy_kcal: rawData.dietaryEnergyConsumed || rawData.calories || null,
      protein_g: rawData.dietaryProtein || null,
      total_fat_g: rawData.dietaryFatTotal || null,
      saturated_fat_g: rawData.dietaryFatSaturated || null,
      polyunsaturated_fat_g: rawData.dietaryFatPolyunsaturated || null,
      monounsaturated_fat_g: rawData.dietaryFatMonounsaturated || null,
      carbohydrates_g: rawData.dietaryCarbohydrates || null,
      fiber_g: rawData.dietaryFiber || null,
      sugar_g: rawData.dietarySugar || null,
      water_ml: rawData.dietaryWater || null,
      caffeine_mg: rawData.dietaryCaffeine || null,
      
      // Vitamins & Minerals
      vitamin_c_mg: rawData.dietaryVitaminC || null,
      vitamin_d_mcg: rawData.dietaryVitaminD || null,
      calcium_mg: rawData.dietaryCalcium || null,
      iron_mg: rawData.dietaryIron || null,
      sodium_mg: rawData.dietarySodium || null,
      potassium_mg: rawData.dietaryPotassium || null,
      
      // Movement & Mobility Metrics
      walking_speed_mps: rawData.walkingSpeed || null,
      step_length_cm: rawData.stepLength || null,
      walking_asymmetry_percentage: rawData.walkingAsymmetry || null,
      double_support_time_percentage: rawData.doubleSupportTime || null,
      
      // Reproductive Health
      menstrual_flow: rawData.menstrualFlow || null,
      ovulation_test_result: rawData.ovulationTestResult || null,
      cervical_mucus_quality: rawData.cervicalMucusQuality || null,
      sexual_activity: rawData.sexualActivity || null,
      
      // Mental Health & Wellness
      mindful_minutes: rawData.mindfulMinutes || null,
      mood_score: rawData.moodScore || null,
      stress_level: rawData.stressLevel || null,
      emotional_state: rawData.emotionalState || null,
      
      // ECG and advanced cardiac
      ecg_classification: rawData.ecgClassification || null,
      
      // Exercise and Performance
      workout_intensity: rawData.workoutIntensity || calculateWorkoutIntensity(rawData),
      recovery_score: rawData.recoveryScore || null,
      effort_score: rawData.effortScore || null,
      
      // Clinical Data (if available)
      clinical_allergies: rawData.allergies ? JSON.stringify(rawData.allergies) : null,
      clinical_conditions: rawData.conditions ? JSON.stringify(rawData.conditions) : null,
      clinical_medications: rawData.medications ? JSON.stringify(rawData.medications) : null,
      clinical_procedures: rawData.procedures ? JSON.stringify(rawData.procedures) : null,
      clinical_lab_results: rawData.labResults ? JSON.stringify(rawData.labResults) : null,
      clinical_vitals: rawData.clinicalVitals ? JSON.stringify(rawData.clinicalVitals) : null,
      clinical_immunizations: rawData.immunizations ? JSON.stringify(rawData.immunizations) : null,
      
      // Symptoms and medication adherence
      symptoms_logged: rawData.symptoms ? JSON.stringify(rawData.symptoms) : null,
      medication_doses: rawData.medicationDoses ? JSON.stringify(rawData.medicationDoses) : null,
      medication_adherence_score: rawData.medicationAdherence || null,
      
      // Source and device tracking
      healthkit_source_bundles: rawData.sourceBundle ? JSON.stringify([rawData.sourceBundle]) : null,
      device_type: rawData.deviceName || rawData.device_type || 'iPhone'
    }
  } else {
    // Strava format (existing logic)
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
  let sleepMetricsCount = 0
  let bodyCompositionCount = 0
  let reproductiveHealthCount = 0
  let mentalHealthCount = 0
  let clinicalDataCount = 0
  let totalFieldsPresent = 0
  
  console.log('Calculating comprehensive data quality for all 37 HealthKit fields...')
  
  // Count basic activity metrics (5 fields)
  if (healthMetrics.steps_count) { basicMetricsCount++; totalFieldsPresent++ }
  if (healthMetrics.calories_burned) { basicMetricsCount++; totalFieldsPresent++ }
  if (healthMetrics.distance_walking_running_meters) { basicMetricsCount++; totalFieldsPresent++ }
  if (healthMetrics.distance_cycling_meters) { basicMetricsCount++; totalFieldsPresent++ }
  if (healthMetrics.flights_climbed) { basicMetricsCount++; totalFieldsPresent++ }
  
  // Count cardiovascular and vitals (7 fields)
  if (healthMetrics.average_heartrate) { vitalsCount++; totalFieldsPresent++ }
  if (healthMetrics.resting_heart_rate) { vitalsCount++; totalFieldsPresent++ }
  if (healthMetrics.heart_rate_variability_ms) { vitalsCount++; totalFieldsPresent++ }
  if (healthMetrics.blood_oxygen_saturation) { vitalsCount++; totalFieldsPresent++ }
  if (healthMetrics.systolic_blood_pressure) { vitalsCount++; totalFieldsPresent++ }
  if (healthMetrics.diastolic_blood_pressure) { vitalsCount++; totalFieldsPresent++ }
  if (healthMetrics.vo2_max) { vitalsCount++; totalFieldsPresent++ }
  
  // Count body composition and measurements (6 fields)
  if (healthMetrics.height_cm) { bodyCompositionCount++; totalFieldsPresent++ }
  if (healthMetrics.weight_kg) { bodyCompositionCount++; totalFieldsPresent++ }
  if (healthMetrics.body_mass_index) { bodyCompositionCount++; totalFieldsPresent++ }
  if (healthMetrics.body_fat_percentage) { bodyCompositionCount++; totalFieldsPresent++ }
  if (healthMetrics.lean_body_mass_kg) { bodyCompositionCount++; totalFieldsPresent++ }
  if (healthMetrics.waist_circumference_cm) { bodyCompositionCount++; totalFieldsPresent++ }
  
  // Count nutrition data (11 fields)
  if (healthMetrics.dietary_energy_kcal) { nutritionCount++; totalFieldsPresent++ }
  if (healthMetrics.protein_g) { nutritionCount++; totalFieldsPresent++ }
  if (healthMetrics.total_fat_g) { nutritionCount++; totalFieldsPresent++ }
  if (healthMetrics.carbohydrates_g) { nutritionCount++; totalFieldsPresent++ }
  if (healthMetrics.fiber_g) { nutritionCount++; totalFieldsPresent++ }
  if (healthMetrics.sugar_g) { nutritionCount++; totalFieldsPresent++ }
  if (healthMetrics.water_ml) { nutritionCount++; totalFieldsPresent++ }
  if (healthMetrics.caffeine_mg) { nutritionCount++; totalFieldsPresent++ }
  if (healthMetrics.vitamin_c_mg) { nutritionCount++; totalFieldsPresent++ }
  if (healthMetrics.vitamin_d_mcg) { nutritionCount++; totalFieldsPresent++ }
  if (healthMetrics.calcium_mg) { nutritionCount++; totalFieldsPresent++ }
  
  // Count sleep metrics (8 fields)
  if (healthMetrics.sleep_duration) { sleepMetricsCount++; totalFieldsPresent++ }
  if (healthMetrics.time_in_bed_minutes) { sleepMetricsCount++; totalFieldsPresent++ }
  if (healthMetrics.time_asleep_minutes) { sleepMetricsCount++; totalFieldsPresent++ }
  if (healthMetrics.awake_duration_minutes) { sleepMetricsCount++; totalFieldsPresent++ }
  if (healthMetrics.rem_duration_minutes) { sleepMetricsCount++; totalFieldsPresent++ }
  if (healthMetrics.core_sleep_duration_minutes) { sleepMetricsCount++; totalFieldsPresent++ }
  if (healthMetrics.deep_sleep_duration_minutes) { sleepMetricsCount++; totalFieldsPresent++ }
  if (healthMetrics.sleep_quality_score) { sleepMetricsCount++; totalFieldsPresent++ }
  
  // Count reproductive health (4 fields)
  if (healthMetrics.menstrual_flow) { reproductiveHealthCount++; totalFieldsPresent++ }
  if (healthMetrics.ovulation_test_result) { reproductiveHealthCount++; totalFieldsPresent++ }
  if (healthMetrics.cervical_mucus_quality) { reproductiveHealthCount++; totalFieldsPresent++ }
  if (healthMetrics.basal_body_temperature_celsius) { reproductiveHealthCount++; totalFieldsPresent++ }
  
  // Count mental health and wellness (4 fields)
  if (healthMetrics.mindful_minutes) { mentalHealthCount++; totalFieldsPresent++ }
  if (healthMetrics.mood_score) { mentalHealthCount++; totalFieldsPresent++ }
  if (healthMetrics.stress_level) { mentalHealthCount++; totalFieldsPresent++ }
  if (healthMetrics.emotional_state) { mentalHealthCount++; totalFieldsPresent++ }
  
  // Count clinical data (7 fields)
  if (healthMetrics.clinical_allergies) { clinicalDataCount++; totalFieldsPresent++ }
  if (healthMetrics.clinical_conditions) { clinicalDataCount++; totalFieldsPresent++ }
  if (healthMetrics.clinical_medications) { clinicalDataCount++; totalFieldsPresent++ }
  if (healthMetrics.clinical_procedures) { clinicalDataCount++; totalFieldsPresent++ }
  if (healthMetrics.clinical_lab_results) { clinicalDataCount++; totalFieldsPresent++ }
  if (healthMetrics.clinical_vitals) { clinicalDataCount++; totalFieldsPresent++ }
  if (healthMetrics.clinical_immunizations) { clinicalDataCount++; totalFieldsPresent++ }
  
  // Calculate comprehensive score weighted by category importance
  const activityScore = (basicMetricsCount / 5) * 0.20  // 20% weight
  const vitalsScore = (vitalsCount / 7) * 0.25         // 25% weight (most important)
  const nutritionScore = (nutritionCount / 11) * 0.15  // 15% weight
  const sleepScore = (sleepMetricsCount / 8) * 0.15    // 15% weight
  const bodyScore = (bodyCompositionCount / 6) * 0.10  // 10% weight
  const reproductiveScore = (reproductiveHealthCount / 4) * 0.05  // 5% weight
  const mentalScore = (mentalHealthCount / 4) * 0.05   // 5% weight
  const clinicalScore = (clinicalDataCount / 7) * 0.05 // 5% weight
  
  const comprehensiveScore = activityScore + vitalsScore + nutritionScore + 
    sleepScore + bodyScore + reproductiveScore + mentalScore + clinicalScore
  
  // Data completeness based on total fields present out of 37
  const completenessScore = totalFieldsPresent / 37
  
  // Final score combines both comprehensive scoring and completeness
  const finalScore = Math.min(1.0, (comprehensiveScore * 0.7) + (completenessScore * 0.3))
  
  console.log('Data quality breakdown:', {
    totalFieldsPresent,
    basicMetrics: basicMetricsCount,
    vitals: vitalsCount,
    nutrition: nutritionCount,
    sleep: sleepMetricsCount,
    bodyComposition: bodyCompositionCount,
    reproductiveHealth: reproductiveHealthCount,
    mentalHealth: mentalHealthCount,
    clinical: clinicalDataCount,
    comprehensiveScore: comprehensiveScore.toFixed(3),
    completenessScore: completenessScore.toFixed(3),
    finalScore: finalScore.toFixed(3)
  })
  
  return finalScore
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
