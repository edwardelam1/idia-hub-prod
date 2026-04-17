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

    const { rawData, userId, connectionId, raw_data_id } = await req.json()

    console.log('Processing raw data for anonymization:', {
      userId,
      connectionId,
      raw_data_id,
      dataSource: rawData?.source || 'unknown',
      availableFields: Object.keys(rawData || {})
    })

    // Generate pseudonym for the user
    const pseudoUserId = await generatePseudonym(userId || 'anonymous')

    // Extract and anonymize location data
    const { anonymizedLocationHash, anonymizedLocationZone } = anonymizeLocationData(rawData || {})

    // Extract health metrics from raw data (handles both Apple Health and Strava)
    const healthMetrics = extractHealthMetrics(rawData || {})

    // Calculate comprehensive data quality score
    const dataQualityScore = calculateComprehensiveDataQualityScore(healthMetrics, rawData || {})

    // Generate ACA (Anonymous Content Address) hash for this record
    const acaHashKey = await generateAcaHash(pseudoUserId, healthMetrics, rawData || {})

    // Build the final payload JSONB — everything that isn't a top-level column lives here.
    // This is a plain JS object; the supabase-js client will JSON-encode it once.
    const payload = {
      health_metrics: healthMetrics,
      anonymized_location_hash: anonymizedLocationHash,
      anonymized_location_zone: anonymizedLocationZone,
      device_type: rawData?.device_name || rawData?.device_type || (rawData?.source === 'apple_health' ? 'iPhone' : 'Unknown'),
      source: rawData?.source || 'unknown',
      // Source-bundle metadata (e.g. com.apple.health) — moved here from the removed column
      source_bundle: rawData?.sourceBundle
        ? (Array.isArray(rawData.sourceBundle) ? rawData.sourceBundle : [rawData.sourceBundle])
        : null,
      // Strava-specific extras retained for downstream queries
      ...(rawData?.source !== 'apple_health' ? {
        duration_seconds: rawData?.moving_time ?? rawData?.elapsed_time ?? null,
        distance_meters: rawData?.distance ?? null,
        elevation_gain_meters: rawData?.total_elevation_gain ?? null,
        average_speed_mps: rawData?.average_speed ?? null,
        max_speed_mps: rawData?.max_speed ?? null,
        weather_conditions: rawData?.weather ?? null,
        effort_score: rawData?.suffer_score ?? null,
      } : {}),
    }

    // Insert ONLY columns that exist in staged_health_data schema.
    const stagedHealthData = {
      aca_hash_key: acaHashKey,
      activity_type: rawData?.type || (rawData?.source === 'apple_health' ? 'HealthKit' : 'Unknown'),
      entity_id: userId ?? null,
      payload, // plain object — Supabase serializes once
      processed_at: new Date().toISOString(),
      data_quality_score: dataQualityScore,
    }

    const { data: stagedData, error: stagingError } = await supabaseClient
      .from('staged_health_data')
      .insert(stagedHealthData)
      .select()

    if (stagingError) {
      console.error('Error staging data:', stagingError)
      throw stagingError
    }

    // Update processing queue status (best-effort)
    if (rawData?.id || raw_data_id) {
      await supabaseClient
        .from('data_processing_queue')
        .update({
          processing_status: 'completed',
          processing_stage: 'staging',
          updated_at: new Date().toISOString()
        })
        .eq('raw_data_id', rawData?.id ?? raw_data_id)
    }

    console.log('Successfully staged anonymized data:', stagedData?.[0]?.id)

    return new Response(
      JSON.stringify({ success: true, stagedDataId: stagedData?.[0]?.id, acaHashKey }),
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
    return 'pseudo_' + Math.random().toString(36).substring(2, 15)
  }
}

async function generateAcaHash(pseudoUserId: string, metrics: any, rawData: any): Promise<string> {
  try {
    const seed = `${pseudoUserId}|${rawData?.source || 'unknown'}|${rawData?.id || crypto.randomUUID()}|${JSON.stringify(metrics).slice(0, 256)}`
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed))
    return 'ACA_' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 48)
  } catch {
    return 'ACA_' + crypto.randomUUID().replace(/-/g, '')
  }
}

function anonymizeLocationData(rawData: any) {
  try {
    if (rawData.start_latlng && rawData.start_latlng.length === 2) {
      const [lat, lng] = rawData.start_latlng
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
  return { anonymizedLocationHash: null, anonymizedLocationZone: null }
}

function extractHealthMetrics(rawData: any) {
  const isAppleHealth = rawData.source === 'apple_health'

  if (isAppleHealth) {
    return {
      steps_count: rawData.steps ?? rawData.step_count ?? null,
      calories_burned: rawData.calories ?? rawData.activeEnergyBurned ?? null,
      distance_walking_running_meters: rawData.distanceWalkingRunning ?? rawData.walkingRunningDistance ?? null,
      distance_cycling_meters: rawData.distanceCycling ?? rawData.cyclingDistance ?? null,
      flights_climbed: rawData.flightsClimbed ?? null,
      average_heartrate: rawData.heartRate ?? rawData.averageHeartRate ?? null,
      resting_heart_rate: rawData.restingHeartRate ?? null,
      heart_rate_variability_ms: rawData.heartRateVariability ?? rawData.hrv ?? null,
      blood_oxygen_saturation: rawData.oxygenSaturation ?? rawData.bloodOxygen ?? null,
      systolic_blood_pressure: rawData.bloodPressureSystolic ?? rawData.systolicBP ?? null,
      diastolic_blood_pressure: rawData.bloodPressureDiastolic ?? rawData.diastolicBP ?? null,
      vo2_max: rawData.vo2Max ?? rawData.maxOxygenUptake ?? null,
      height_cm: rawData.height ?? rawData.bodyHeight ?? null,
      weight_kg: rawData.weight ?? rawData.bodyMass ?? null,
      body_mass_index: rawData.bodyMassIndex ?? rawData.bmi ?? null,
      body_fat_percentage: rawData.bodyFatPercentage ?? null,
      lean_body_mass_kg: rawData.leanBodyMass ?? null,
      waist_circumference_cm: rawData.waistCircumference ?? null,
      body_temperature_celsius: rawData.bodyTemperature ?? null,
      basal_body_temperature_celsius: rawData.basalBodyTemperature ?? null,
      respiratory_rate_per_min: rawData.respiratoryRate ?? null,
      sleep_duration: rawData.sleepHours ? rawData.sleepHours * 3600 : (rawData.sleepAnalysis ?? null),
      time_in_bed_minutes: rawData.timeInBed ? rawData.timeInBed * 60 : null,
      time_asleep_minutes: rawData.timeAsleep ? rawData.timeAsleep * 60 : null,
      awake_duration_minutes: rawData.awakeDuration ?? null,
      rem_duration_minutes: rawData.remSleep ?? null,
      core_sleep_duration_minutes: rawData.coreSleep ?? null,
      deep_sleep_duration_minutes: rawData.deepSleep ?? null,
      sleep_quality_score: rawData.sleepQuality ?? null,
      dietary_energy_kcal: rawData.dietaryEnergyConsumed ?? rawData.calories ?? null,
      protein_g: rawData.dietaryProtein ?? null,
      total_fat_g: rawData.dietaryFatTotal ?? null,
      saturated_fat_g: rawData.dietaryFatSaturated ?? null,
      polyunsaturated_fat_g: rawData.dietaryFatPolyunsaturated ?? null,
      monounsaturated_fat_g: rawData.dietaryFatMonounsaturated ?? null,
      carbohydrates_g: rawData.dietaryCarbohydrates ?? null,
      fiber_g: rawData.dietaryFiber ?? null,
      sugar_g: rawData.dietarySugar ?? null,
      water_ml: rawData.dietaryWater ?? null,
      caffeine_mg: rawData.dietaryCaffeine ?? null,
      vitamin_c_mg: rawData.dietaryVitaminC ?? null,
      vitamin_d_mcg: rawData.dietaryVitaminD ?? null,
      calcium_mg: rawData.dietaryCalcium ?? null,
      iron_mg: rawData.dietaryIron ?? null,
      sodium_mg: rawData.dietarySodium ?? null,
      potassium_mg: rawData.dietaryPotassium ?? null,
      walking_speed_mps: rawData.walkingSpeed ?? null,
      step_length_cm: rawData.stepLength ?? null,
      walking_asymmetry_percentage: rawData.walkingAsymmetry ?? null,
      double_support_time_percentage: rawData.doubleSupportTime ?? null,
      menstrual_flow: rawData.menstrualFlow ?? null,
      ovulation_test_result: rawData.ovulationTestResult ?? null,
      cervical_mucus_quality: rawData.cervicalMucusQuality ?? null,
      sexual_activity: rawData.sexualActivity ?? null,
      mindful_minutes: rawData.mindfulMinutes ?? null,
      mood_score: rawData.moodScore ?? null,
      stress_level: rawData.stressLevel ?? null,
      emotional_state: rawData.emotionalState ?? null,
      ecg_classification: rawData.ecgClassification ?? null,
      workout_intensity: rawData.workoutIntensity ?? calculateWorkoutIntensity(rawData),
      recovery_score: rawData.recoveryScore ?? null,
      effort_score: rawData.effortScore ?? null,
      // Clinical data — kept as plain objects/arrays inside payload (no JSON.stringify needed)
      clinical_allergies: rawData.allergies ?? null,
      clinical_conditions: rawData.conditions ?? null,
      clinical_medications: rawData.medications ?? null,
      clinical_procedures: rawData.procedures ?? null,
      clinical_lab_results: rawData.labResults ?? null,
      clinical_vitals: rawData.clinicalVitals ?? null,
      clinical_immunizations: rawData.immunizations ?? null,
      symptoms_logged: rawData.symptoms ?? null,
      medication_doses: rawData.medicationDoses ?? null,
      medication_adherence_score: rawData.medicationAdherence ?? null,
    }
  }

  // Strava format
  return {
    resting_heart_rate: rawData.resting_heart_rate ?? null,
    sleep_duration: rawData.sleep_duration ?? null,
    sleep_quality_score: rawData.sleep_quality ?? null,
    stress_level: rawData.stress_level ?? null,
    workout_intensity: rawData.workout_intensity ?? calculateWorkoutIntensity(rawData),
    recovery_score: rawData.recovery_score ?? null,
    steps_count: rawData.steps ?? null,
    average_heartrate: rawData.average_heartrate ?? null,
    max_heartrate: rawData.max_heartrate ?? null,
    calories_burned: rawData.calories ?? null,
  }
}

function calculateWorkoutIntensity(rawData: any): number | null {
  if (rawData.average_heartrate && rawData.max_heartrate) {
    return Math.round((rawData.average_heartrate / rawData.max_heartrate) * 100)
  }
  return null
}

function calculateComprehensiveDataQualityScore(healthMetrics: any, _rawData: any): number {
  const weights: Record<string, { fields: string[]; weight: number }> = {
    activity: { fields: ['steps_count', 'calories_burned', 'distance_walking_running_meters', 'distance_cycling_meters', 'flights_climbed'], weight: 0.20 },
    vitals: { fields: ['average_heartrate', 'resting_heart_rate', 'heart_rate_variability_ms', 'blood_oxygen_saturation', 'systolic_blood_pressure', 'diastolic_blood_pressure', 'vo2_max'], weight: 0.25 },
    nutrition: { fields: ['dietary_energy_kcal', 'protein_g', 'total_fat_g', 'carbohydrates_g', 'fiber_g', 'sugar_g', 'water_ml', 'caffeine_mg', 'vitamin_c_mg', 'vitamin_d_mcg', 'calcium_mg'], weight: 0.15 },
    sleep: { fields: ['sleep_duration', 'time_in_bed_minutes', 'time_asleep_minutes', 'awake_duration_minutes', 'rem_duration_minutes', 'core_sleep_duration_minutes', 'deep_sleep_duration_minutes', 'sleep_quality_score'], weight: 0.15 },
    body: { fields: ['height_cm', 'weight_kg', 'body_mass_index', 'body_fat_percentage', 'lean_body_mass_kg', 'waist_circumference_cm'], weight: 0.10 },
    reproductive: { fields: ['menstrual_flow', 'ovulation_test_result', 'cervical_mucus_quality', 'basal_body_temperature_celsius'], weight: 0.05 },
    mental: { fields: ['mindful_minutes', 'mood_score', 'stress_level', 'emotional_state'], weight: 0.05 },
    clinical: { fields: ['clinical_allergies', 'clinical_conditions', 'clinical_medications', 'clinical_procedures', 'clinical_lab_results', 'clinical_vitals', 'clinical_immunizations'], weight: 0.05 },
  }

  let weighted = 0
  let totalPresent = 0
  let totalFields = 0

  for (const cat of Object.values(weights)) {
    const present = cat.fields.filter(f => healthMetrics[f] !== null && healthMetrics[f] !== undefined).length
    weighted += (present / cat.fields.length) * cat.weight
    totalPresent += present
    totalFields += cat.fields.length
  }

  const completeness = totalFields > 0 ? totalPresent / totalFields : 0
  return Math.min(1.0, weighted * 0.7 + completeness * 0.3)
}
