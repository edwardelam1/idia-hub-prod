import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Get the data from the request body - now accepts all health data
    const healthData = await req.json()
    
    console.log('Received health data:', healthData)
    
    // Extract step count for validation (still required as primary field)
    const step_count = healthData.step_count || healthData.steps || 0
    const recorded_at = healthData.recorded_at || healthData.timestamp
    
    // Enhanced data validation - more permissive
    if (typeof step_count !== 'number' || step_count < 0 || step_count > 200000) {
      console.warn('Invalid step count received:', step_count, 'type:', typeof step_count)
      return new Response(JSON.stringify({ 
        error: "Invalid step count",
        message: "Step count must be a non-negative number below 200,000",
        received: { step_count, type: typeof step_count }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Validate recorded_at timestamp
    if (recorded_at && isNaN(Date.parse(recorded_at))) {
      console.warn('Invalid timestamp received:', recorded_at)
      return new Response(JSON.stringify({ 
        error: "Invalid timestamp",
        message: "recorded_at must be a valid ISO timestamp"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 2. Create a Supabase client with the user's authorization.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 3. Extract user_id if available for better deduplication
    let user_id = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const payload = JSON.parse(atob(token.split('.')[1]));
        user_id = payload.sub;
      } catch (e) {
        console.log('Could not extract user_id from token, proceeding without user_id');
      }
    }

    // 4. Use improved duplicate checking function
    const { data: isDuplicate, error: checkError } = await supabaseClient.rpc(
      'check_raw_health_data_duplicate',
      {
        p_step_count: step_count,
        p_recorded_at: recorded_at || new Date().toISOString(),
        p_user_id: user_id
      }
    );

    if (checkError) {
      console.error('Error checking for duplicates:', checkError);
    }

    if (isDuplicate) {
      console.log('Duplicate record detected, skipping insert');
      return new Response(
        JSON.stringify({ 
          message: 'Data received (duplicate detected and skipped)',
          pipeline_status: 'deduplicated'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 5. Insert into raw_health_data with complete Apple Health data
    const rawHealthData = {
      raw_payload: { 
        ...healthData, 
        source: 'apple_health',
        processed_at: new Date().toISOString(),
        // Preserve all HealthKit data types
        healthkit_data_types: extractHealthKitDataTypes(healthData),
        data_completeness: calculateDataCompleteness(healthData)
      },
      device_type: healthData.device_type || 'apple_health',
      step_count,
      recorded_at: recorded_at || new Date().toISOString(),
      user_id,
      processed: false
    }

    // Helper function to extract and categorize HealthKit data types
    function extractHealthKitDataTypes(data: any) {
      const healthkitTypes = {
        activity: {},
        vitals: {},
        nutrition: {},
        sleep: {},
        clinical: {},
        reproductive: {},
        mindfulness: {},
        body_measurements: {}
      };

      // Activity data
      if (data.steps || data.step_count) healthkitTypes.activity.steps = data.steps || data.step_count;
      if (data.distanceWalkingRunning) healthkitTypes.activity.walking_distance = data.distanceWalkingRunning;
      if (data.distanceCycling) healthkitTypes.activity.cycling_distance = data.distanceCycling;
      if (data.flightsClimbed) healthkitTypes.activity.flights_climbed = data.flightsClimbed;
      if (data.activeEnergyBurned) healthkitTypes.activity.active_calories = data.activeEnergyBurned;
      if (data.basalEnergyBurned) healthkitTypes.activity.basal_calories = data.basalEnergyBurned;

      // Vitals
      if (data.heartRate) healthkitTypes.vitals.heart_rate = data.heartRate;
      if (data.heartRateVariability) healthkitTypes.vitals.heart_rate_variability = data.heartRateVariability;
      if (data.restingHeartRate) healthkitTypes.vitals.resting_heart_rate = data.restingHeartRate;
      if (data.bloodPressureSystolic) healthkitTypes.vitals.blood_pressure_systolic = data.bloodPressureSystolic;
      if (data.bloodPressureDiastolic) healthkitTypes.vitals.blood_pressure_diastolic = data.bloodPressureDiastolic;
      if (data.respiratoryRate) healthkitTypes.vitals.respiratory_rate = data.respiratoryRate;
      if (data.oxygenSaturation) healthkitTypes.vitals.oxygen_saturation = data.oxygenSaturation;
      if (data.bodyTemperature) healthkitTypes.vitals.body_temperature = data.bodyTemperature;

      // Body measurements
      if (data.height) healthkitTypes.body_measurements.height = data.height;
      if (data.bodyMass || data.weight) healthkitTypes.body_measurements.weight = data.bodyMass || data.weight;
      if (data.bodyMassIndex) healthkitTypes.body_measurements.bmi = data.bodyMassIndex;
      if (data.bodyFatPercentage) healthkitTypes.body_measurements.body_fat_percentage = data.bodyFatPercentage;
      if (data.leanBodyMass) healthkitTypes.body_measurements.lean_body_mass = data.leanBodyMass;
      if (data.waistCircumference) healthkitTypes.body_measurements.waist_circumference = data.waistCircumference;

      // Nutrition
      if (data.dietaryEnergyConsumed) healthkitTypes.nutrition.calories = data.dietaryEnergyConsumed;
      if (data.dietaryProtein) healthkitTypes.nutrition.protein = data.dietaryProtein;
      if (data.dietaryFatTotal) healthkitTypes.nutrition.fat_total = data.dietaryFatTotal;
      if (data.dietaryCarbohydrates) healthkitTypes.nutrition.carbohydrates = data.dietaryCarbohydrates;
      if (data.dietaryFiber) healthkitTypes.nutrition.fiber = data.dietaryFiber;
      if (data.dietarySugar) healthkitTypes.nutrition.sugar = data.dietarySugar;
      if (data.dietaryWater) healthkitTypes.nutrition.water = data.dietaryWater;
      if (data.dietaryCaffeine) healthkitTypes.nutrition.caffeine = data.dietaryCaffeine;

      // Sleep
      if (data.sleepAnalysis) healthkitTypes.sleep.sleep_analysis = data.sleepAnalysis;
      if (data.timeInBed) healthkitTypes.sleep.time_in_bed = data.timeInBed;
      if (data.timeAsleep) healthkitTypes.sleep.time_asleep = data.timeAsleep;

      // Clinical
      if (data.bloodGlucose) healthkitTypes.clinical.blood_glucose = data.bloodGlucose;
      if (data.insulinDelivery) healthkitTypes.clinical.insulin_delivery = data.insulinDelivery;
      if (data.medications) healthkitTypes.clinical.medications = data.medications;
      if (data.allergies) healthkitTypes.clinical.allergies = data.allergies;

      // Reproductive Health
      if (data.menstrualFlow) healthkitTypes.reproductive.menstrual_flow = data.menstrualFlow;
      if (data.ovulationTestResult) healthkitTypes.reproductive.ovulation_test = data.ovulationTestResult;
      if (data.basalBodyTemperature) healthkitTypes.reproductive.basal_body_temperature = data.basalBodyTemperature;
      if (data.cervicalMucusQuality) healthkitTypes.reproductive.cervical_mucus = data.cervicalMucusQuality;

      // Mindfulness & Mental Health
      if (data.mindfulSession) healthkitTypes.mindfulness.mindful_session = data.mindfulSession;
      if (data.moodScore) healthkitTypes.mindfulness.mood = data.moodScore;

      return healthkitTypes;
    }

    function calculateDataCompleteness(data: any): number {
      const totalPossibleFields = 65; // Approximate count of HealthKit data types
      let fieldsPresent = 0;
      
      // Count present fields
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
          fieldsPresent++;
        }
      });
      
      return Math.min(1.0, fieldsPresent / totalPossibleFields);
    }

    const { data: insertedData, error: rawDataError } = await supabaseClient
      .from('raw_health_data')
      .insert(rawHealthData)
      .select()
      .single()

    if (rawDataError) {
      console.error('Raw health data error:', rawDataError)
      throw rawDataError
    }

    console.log('Health data inserted successfully:', { 
      step_count, 
      recorded_at, 
      data_id: insertedData?.id,
      validation_status: 'passed',
      pipeline_status: 'linear',
      timestamp: new Date().toISOString()
    })

    // 6. Return a success response.
    return new Response(JSON.stringify({ 
      message: "Data received and processed",
      pipeline_status: "synchronized"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})