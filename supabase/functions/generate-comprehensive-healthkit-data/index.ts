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

    console.log('Generating comprehensive Apple HealthKit data with all 60+ data types...')

    // Generate diverse health records with all HealthKit data types
    const comprehensiveHealthRecords = []

    for (let i = 0; i < 50; i++) {
      const record = generateComprehensiveHealthKitRecord(i)
      comprehensiveHealthRecords.push(record)
    }

    console.log(`Generated ${comprehensiveHealthRecords.length} comprehensive health records`)

    // Insert records into staged_health_data
    const { data: insertedRecords, error: insertError } = await supabaseClient
      .from('staged_health_data')
      .insert(comprehensiveHealthRecords)
      .select()

    if (insertError) {
      console.error('Error inserting comprehensive health data:', insertError)
      throw insertError
    }

    console.log(`Successfully inserted ${insertedRecords?.length || 0} comprehensive health records`)

    // Trigger bundle generation with the new comprehensive data
    const { data: bundleResult, error: bundleError } = await supabaseClient.functions.invoke('create-health-data-bundle', {
      body: { 
        trigger: 'comprehensive_healthkit_test',
        force_process: true,
        comprehensive_data_available: true
      }
    })

    if (bundleError) {
      console.error('Bundle generation error:', bundleError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Comprehensive HealthKit data generated and processed',
        recordsGenerated: comprehensiveHealthRecords.length,
        recordsInserted: insertedRecords?.length || 0,
        bundleGeneration: bundleResult || 'triggered',
        dataTypesIncluded: getIncludedDataTypes()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-comprehensive-healthkit-data:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateComprehensiveHealthKitRecord(index: number) {
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() - index)

  // Generate pseudo user ID
  const pseudoUserId = `healthkit_user_${Math.random().toString(36).substring(2, 15)}`

  return {
    pseudo_user_id: pseudoUserId,
    activity_type: getRandomActivityType(),
    device_type: getRandomDeviceType(),
    created_at: baseDate.toISOString(),
    processed_at: baseDate.toISOString(),

    // Activity & Movement Data (10+ types)
    steps_count: Math.floor(Math.random() * 15000) + 3000,
    distance_walking_running_meters: Math.floor(Math.random() * 8000) + 1000,
    distance_cycling_meters: Math.random() > 0.7 ? Math.floor(Math.random() * 25000) + 5000 : null,
    flights_climbed: Math.floor(Math.random() * 20) + 1,
    calories_burned: Math.floor(Math.random() * 800) + 200,
    walking_speed_mps: 1.2 + Math.random() * 0.8,
    step_length_cm: 65 + Math.random() * 15,
    walking_asymmetry_percentage: Math.random() * 5,
    double_support_time_percentage: 25 + Math.random() * 10,

    // Cardiovascular & Vitals (15+ types)
    average_heartrate: Math.floor(Math.random() * 50) + 70,
    resting_heart_rate: Math.floor(Math.random() * 20) + 55,
    heart_rate_variability_ms: Math.floor(Math.random() * 40) + 25,
    blood_oxygen_saturation: 95 + Math.random() * 5,
    systolic_blood_pressure: Math.floor(Math.random() * 40) + 110,
    diastolic_blood_pressure: Math.floor(Math.random() * 20) + 70,
    respiratory_rate_per_min: Math.floor(Math.random() * 8) + 12,
    body_temperature_celsius: 36.1 + Math.random() * 1.5,
    vo2_max: Math.random() > 0.6 ? Math.floor(Math.random() * 30) + 35 : null,

    // Body Composition & Measurements (8+ types)
    height_cm: Math.random() > 0.8 ? Math.floor(Math.random() * 30) + 160 : null,
    weight_kg: Math.random() > 0.7 ? Math.floor(Math.random() * 40) + 60 : null,
    body_mass_index: Math.random() > 0.7 ? 18.5 + Math.random() * 12 : null,
    body_fat_percentage: Math.random() > 0.6 ? Math.floor(Math.random() * 20) + 10 : null,
    lean_body_mass_kg: Math.random() > 0.6 ? Math.floor(Math.random() * 30) + 45 : null,
    waist_circumference_cm: Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 70 : null,

    // Comprehensive Nutrition Data (15+ types)
    dietary_energy_kcal: Math.random() > 0.6 ? Math.floor(Math.random() * 1500) + 1200 : null,
    protein_g: Math.random() > 0.6 ? Math.floor(Math.random() * 80) + 40 : null,
    carbohydrates_g: Math.random() > 0.6 ? Math.floor(Math.random() * 200) + 100 : null,
    total_fat_g: Math.random() > 0.6 ? Math.floor(Math.random() * 60) + 30 : null,
    saturated_fat_g: Math.random() > 0.5 ? Math.floor(Math.random() * 20) + 5 : null,
    polyunsaturated_fat_g: Math.random() > 0.5 ? Math.floor(Math.random() * 15) + 3 : null,
    monounsaturated_fat_g: Math.random() > 0.5 ? Math.floor(Math.random() * 25) + 8 : null,
    fiber_g: Math.random() > 0.5 ? Math.floor(Math.random() * 25) + 15 : null,
    sugar_g: Math.random() > 0.5 ? Math.floor(Math.random() * 60) + 20 : null,
    water_ml: Math.random() > 0.7 ? Math.floor(Math.random() * 1500) + 1500 : null,
    caffeine_mg: Math.random() > 0.4 ? Math.floor(Math.random() * 200) + 50 : null,
    sodium_mg: Math.random() > 0.4 ? Math.floor(Math.random() * 1000) + 1000 : null,
    potassium_mg: Math.random() > 0.4 ? Math.floor(Math.random() * 2000) + 2000 : null,
    vitamin_c_mg: Math.random() > 0.3 ? Math.floor(Math.random() * 80) + 60 : null,
    vitamin_d_mcg: Math.random() > 0.3 ? Math.floor(Math.random() * 15) + 10 : null,
    calcium_mg: Math.random() > 0.3 ? Math.floor(Math.random() * 600) + 800 : null,
    iron_mg: Math.random() > 0.3 ? Math.floor(Math.random() * 10) + 8 : null,

    // Sleep Analytics (8+ types)
    sleep_duration: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 7 : null,
    time_in_bed_minutes: Math.random() > 0.7 ? Math.floor(Math.random() * 60) + 420 : null,
    time_asleep_minutes: Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 400 : null,
    awake_duration_minutes: Math.random() > 0.6 ? Math.floor(Math.random() * 20) + 10 : null,
    rem_duration_minutes: Math.random() > 0.6 ? Math.floor(Math.random() * 60) + 60 : null,
    core_sleep_duration_minutes: Math.random() > 0.6 ? Math.floor(Math.random() * 120) + 180 : null,
    deep_sleep_duration_minutes: Math.random() > 0.6 ? Math.floor(Math.random() * 80) + 60 : null,
    sleep_quality_score: Math.random() > 0.6 ? Math.floor(Math.random() * 4) + 7 : null,

    // Women's Health (4+ types)
    menstrual_flow: Math.random() > 0.8 ? getRandomMenstrualFlow() : null,
    ovulation_test_result: Math.random() > 0.9 ? getRandomOvulationResult() : null,
    basal_body_temperature_celsius: Math.random() > 0.8 ? 36.2 + Math.random() * 0.8 : null,
    cervical_mucus_quality: Math.random() > 0.85 ? getRandomCervicalMucus() : null,

    // Mental Health & Mindfulness (4+ types)
    mindful_minutes: Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 5 : null,
    mood_score: Math.random() > 0.4 ? Math.floor(Math.random() * 5) + 6 : null,
    stress_level: Math.random() > 0.4 ? Math.floor(Math.random() * 5) + 3 : null,
    emotional_state: Math.random() > 0.6 ? getRandomEmotionalState() : null,

    // Clinical Data (6+ types)
    clinical_conditions: Math.random() > 0.9 ? [getRandomClinicalCondition()] : null,
    clinical_medications: Math.random() > 0.85 ? [getRandomMedication()] : null,
    clinical_vitals: Math.random() > 0.8 ? { temperature: 98.6, pulse: 72 } : null,
    clinical_lab_results: Math.random() > 0.95 ? { cholesterol: 180, glucose: 95 } : null,
    clinical_allergies: Math.random() > 0.9 ? [getRandomAllergy()] : null,
    clinical_immunizations: Math.random() > 0.95 ? [getRandomImmunization()] : null,

    // Additional HealthKit-specific metrics
    workout_intensity: Math.random() > 0.5 ? Math.floor(Math.random() * 40) + 60 : null,
    recovery_score: Math.random() > 0.6 ? Math.floor(Math.random() * 40) + 60 : null,
    effort_score: Math.random() > 0.5 ? Math.floor(Math.random() * 50) + 50 : null,

    // Data quality metrics
    data_quality_score: 0.7 + Math.random() * 0.3,
    data_completeness_score: 0.6 + Math.random() * 0.4,

    // Location (anonymized)
    anonymized_location_zone: Math.random() > 0.7 ? `ZONE_${Math.floor(Math.random() * 50)}_${Math.floor(Math.random() * 50)}` : null,
    anonymized_location_hash: Math.random() > 0.7 ? `HASH_${Math.random().toString(36).substring(2, 10)}` : null,

    // Additional metrics for variety
    sexual_activity: Math.random() > 0.95 ? true : null,
    symptoms_logged: Math.random() > 0.8 ? [getRandomSymptom()] : null,
    ecg_classification: Math.random() > 0.95 ? getRandomECGClassification() : null,
    medication_adherence_score: Math.random() > 0.8 ? Math.floor(Math.random() * 30) + 70 : null,
    medication_doses: Math.random() > 0.9 ? [{ medication: 'Vitamin D', dose: '1000 IU' }] : null,
    healthkit_source_bundles: [`com.apple.health.${Math.random().toString(36).substring(2, 8)}`]
  }
}

function getRandomActivityType(): string {
  const activities = [
    'Walking', 'Running', 'Cycling', 'Swimming', 'Hiking', 'Workout', 
    'Yoga', 'Dancing', 'Tennis', 'Basketball', 'Soccer', 'Golf',
    'Strength Training', 'CrossFit', 'Pilates', 'Climbing', 'Skiing'
  ]
  return activities[Math.floor(Math.random() * activities.length)]
}

function getRandomDeviceType(): string {
  const devices = ['iPhone', 'Apple Watch', 'iPad', 'HealthKit App']
  return devices[Math.floor(Math.random() * devices.length)]
}

function getRandomMenstrualFlow(): string {
  const flows = ['light', 'medium', 'heavy', 'spotting']
  return flows[Math.floor(Math.random() * flows.length)]
}

function getRandomOvulationResult(): string {
  const results = ['positive', 'negative', 'inconclusive']
  return results[Math.floor(Math.random() * results.length)]
}

function getRandomCervicalMucus(): string {
  const qualities = ['dry', 'sticky', 'creamy', 'watery', 'egg_white']
  return qualities[Math.floor(Math.random() * qualities.length)]
}

function getRandomEmotionalState(): string {
  const states = ['happy', 'sad', 'anxious', 'calm', 'energetic', 'tired', 'stressed', 'relaxed']
  return states[Math.floor(Math.random() * states.length)]
}

function getRandomClinicalCondition(): string {
  const conditions = ['Hypertension', 'Diabetes Type 2', 'Asthma', 'Seasonal Allergies', 'Migraine']
  return conditions[Math.floor(Math.random() * conditions.length)]
}

function getRandomMedication(): string {
  const medications = ['Lisinopril', 'Metformin', 'Albuterol', 'Ibuprofen', 'Vitamin D3', 'Omega-3']
  return medications[Math.floor(Math.random() * medications.length)]
}

function getRandomAllergy(): string {
  const allergies = ['Pollen', 'Dust Mites', 'Pet Dander', 'Shellfish', 'Peanuts', 'Latex']
  return allergies[Math.floor(Math.random() * allergies.length)]
}

function getRandomImmunization(): string {
  const immunizations = ['COVID-19', 'Influenza', 'Tdap', 'MMR', 'Hepatitis B']
  return immunizations[Math.floor(Math.random() * immunizations.length)]
}

function getRandomSymptom(): string {
  const symptoms = ['Headache', 'Fatigue', 'Nausea', 'Dizziness', 'Insomnia', 'Joint Pain']
  return symptoms[Math.floor(Math.random() * symptoms.length)]
}

function getRandomECGClassification(): string {
  const classifications = ['Normal', 'Atrial Fibrillation', 'Sinus Rhythm', 'Inconclusive']
  return classifications[Math.floor(Math.random() * classifications.length)]
}

function getIncludedDataTypes(): string[] {
  return [
    'Activity & Movement (9 types): steps, distances, flights, calories, walking metrics',
    'Cardiovascular & Vitals (9 types): heart rate, blood pressure, oxygen saturation, temperature',
    'Body Composition (6 types): height, weight, BMI, body fat, lean mass, waist circumference',
    'Comprehensive Nutrition (17 types): calories, macronutrients, vitamins, minerals, hydration',
    'Sleep Analytics (8 types): duration, stages, quality, in-bed time',
    'Women\'s Health (4 types): menstrual tracking, ovulation, basal temperature, cervical mucus',
    'Mental Health (4 types): mindfulness, mood, stress, emotional state',
    'Clinical Data (6 types): conditions, medications, vitals, lab results, allergies, immunizations',
    'Additional HealthKit Metrics (8 types): workout intensity, recovery, ECG, symptoms, adherence'
  ]
}