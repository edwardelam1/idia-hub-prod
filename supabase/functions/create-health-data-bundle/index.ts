import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Data transformation utilities
const transformActivityType = (activityType: string): string => {
  const activityMapping: { [key: string]: string } = {
    'daily_activity': 'Walk',
    'health_metrics': 'Daily Activity',
    'Daily Activity': 'Walk'
  };
  
  // Return a realistic activity type or the original if already realistic
  const realisticTypes = ['Run', 'Walk', 'Bike', 'Swim', 'Hike', 'Workout', 'TrailRun'];
  if (realisticTypes.includes(activityType)) return activityType;
  
  return activityMapping[activityType] || 'Walk';
};

const transformDeviceType = (deviceType: string): string => {
  const deviceMapping: { [key: string]: string } = {
    'Health App': 'iPhone',
    'iPhone Health App': 'iPhone',
    'mobile_app': 'iPhone'
  };
  
  // Return a realistic device type or the original if already realistic
  const realisticDevices = ['iPhone', 'Apple Watch', 'Garmin', 'Fitbit', 'Strava'];
  if (realisticDevices.includes(deviceType)) return deviceType;
  
  return deviceMapping[deviceType] || 'iPhone';
};

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

    const requestBody = await req.json().catch(() => ({}));
    const { trigger = 'nightly', force_process = false } = requestBody;
    
    console.log(`Starting ${trigger} health data bundle creation...`)

    // Get staged health data - prioritize fresh data
    let healthDataQuery = supabaseClient.from('staged_health_data').select('*');
    
    if (trigger === 'real_time') {
      // For real-time triggers, get recent data with priority on fresh entries
      healthDataQuery = healthDataQuery.order('created_at', { ascending: false }).limit(1000);
    } else if (trigger === 'manual_engage' || force_process) {
      // For manual engagement, get ALL available data to ensure comprehensive bundles
      healthDataQuery = healthDataQuery.order('created_at', { ascending: false });
    } else {
      // For scheduled runs, get all data to ensure comprehensive bundle content
      healthDataQuery = healthDataQuery.order('created_at', { ascending: false }).limit(2000);
    }

    const { data: healthData, error: dataError } = await healthDataQuery;

    if (dataError) {
      console.error('Error fetching health data:', dataError)
      throw dataError
    }

    if (!healthData || healthData.length === 0) {
      console.log(`No health data to process for ${trigger}`)
      return new Response(
        JSON.stringify({ 
          message: `No data to bundle for ${trigger}`,
          trigger,
          dataCount: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${healthData.length} health records`)

    // Generate bundles based on available data
    const bundles = await generateHealthBundles(healthData)

    // Insert bundles into marketplace with duplication prevention
    const bundleResults = []
    for (const bundle of bundles) {
      // Check for existing similar bundles and force fresh data update
      const { data: existingBundles } = await supabaseClient
        .from('marketplace_bundles')
        .select('bundle_id, title, created_at, bundle_version, data_json')
        .eq('title', bundle.title)
        .eq('category', bundle.category)
        .eq('is_active', true)

      if (existingBundles && existingBundles.length > 0) {
        console.log(`Force updating existing bundle with fresh data: ${bundle.title}`)
        
        // REPLACE existing bundle data with fresh data (don't merge)
        const existingBundle = existingBundles[0]
        const newVersion = (existingBundle.bundle_version || 1) + 1
        
        // Use fresh data entirely, include sample of actual records
        const freshData = {
          ...bundle.data_json,
          last_update: new Date().toISOString(),
          data_source: 'Fresh staged health data',
          total_fresh_records: bundle.contacts_count,
          sample_fresh_data: healthData.slice(0, 15).map(d => ({
            activity_type: d.activity_type,
            steps_count: d.steps_count,
            device_type: d.device_type,
            created_at: d.created_at,
            avg_heartrate: d.average_heartrate,
            calories_burned: d.calories_burned
          })),
          version_history: [
            { version: newVersion, updated_at: new Date().toISOString(), data_source: 'fresh_staged_data' }
          ]
        }
        
        const { data: updatedBundle, error: updateError } = await supabaseClient
          .from('marketplace_bundles')
          .update({
            contacts_count: bundle.contacts_count, // Use fresh count
            data_json: freshData, // Use entirely fresh data
            key_insights: [
              ...bundle.key_insights,
              `Refreshed with ${bundle.contacts_count} current records`,
              `Fresh data from ${new Date().toISOString().split('T')[0]}`,
              `Latest step counts and activity data included`
            ],
            updated_at: new Date().toISOString(),
            bundle_version: newVersion,
            price: calculateBundlePrice(healthData, bundle.tier, freshData)
          })
          .eq('bundle_id', existingBundle.bundle_id)
          .select()

        if (!updateError && updatedBundle) {
          bundleResults.push(updatedBundle[0])
          console.log(`Force updated existing bundle: ${bundle.title} to version ${newVersion} with fresh data`)
        }
        continue
      }

      // Create new bundle only if no duplicates found
      const { data: newBundle, error: bundleError } = await supabaseClient
        .from('marketplace_bundles')
        .insert({
          ...bundle,
          bundle_version: 1
        })
        .select()

      if (bundleError) {
        console.error('Error creating bundle:', bundleError)
        continue
      }

      bundleResults.push(newBundle[0])
      console.log(`Created new bundle: ${bundle.title}`)

      // Log bundle generation
      await supabaseClient
        .from('bundle_generation_logs')
        .insert({
          bundle_id: newBundle[0].bundle_id,
          generation_type: trigger === 'manual_engage' ? 'manual' : 'nightly',
          data_source_count: healthData.length,
          quality_metrics: {
            avg_quality_score: calculateAverageQuality(healthData),
            data_completeness: calculateDataCompleteness(healthData),
            geographic_coverage: calculateGeographicCoverage(healthData),
            trigger_type: trigger
          }
        })
    }

    console.log(`Successfully created ${bundleResults.length} bundles`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        bundlesCreated: bundleResults.length,
        bundles: bundleResults.map(b => ({ id: b.bundle_id, title: b.title })),
        dataProcessed: healthData.length,
        trigger,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-health-data-bundle:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateHealthBundles(healthData: any[]) {
  const bundles = []
  console.log(`Generating bundles from ${healthData.length} health records`)

  // 1. Apple HealthKit Vitals Bundle - cardiovascular and respiratory data
  const vitalsData = healthData.filter(d => 
    d.average_heartrate || d.resting_heart_rate || d.heart_rate_variability_ms || 
    d.blood_oxygen_saturation || d.systolic_blood_pressure || d.diastolic_blood_pressure ||
    d.respiratory_rate_per_min || d.body_temperature_celsius
  )
  if (vitalsData.length > 0) {
    bundles.push(createHealthKitVitalsBundle(vitalsData))
  }

  // 2. Body Composition & Fitness Bundle - body measurements and fitness metrics
  const bodyCompData = healthData.filter(d => 
    d.height_cm || d.weight_kg || d.body_mass_index || d.body_fat_percentage || 
    d.lean_body_mass_kg || d.waist_circumference_cm || d.vo2_max
  )
  if (bodyCompData.length > 0) {
    bundles.push(createBodyCompositionBundle(bodyCompData))
  }

  // 3. Nutritional Health Bundle - comprehensive nutrition tracking
  const nutritionData = healthData.filter(d => 
    d.dietary_energy_kcal || d.protein_g || d.carbohydrates_g || d.total_fat_g || 
    d.fiber_g || d.sugar_g || d.water_ml || d.caffeine_mg || d.vitamin_c_mg || 
    d.vitamin_d_mcg || d.calcium_mg || d.iron_mg || d.sodium_mg || d.potassium_mg
  )
  if (nutritionData.length > 0) {
    bundles.push(createNutritionalHealthBundle(nutritionData))
  }

  // 4. Sleep & Recovery Analytics Bundle - comprehensive sleep metrics
  const sleepData = healthData.filter(d => 
    d.sleep_duration || d.time_in_bed_minutes || d.time_asleep_minutes || 
    d.rem_duration_minutes || d.core_sleep_duration_minutes || d.deep_sleep_duration_minutes || 
    d.awake_duration_minutes || d.sleep_quality_score
  )
  if (sleepData.length > 0) {
    bundles.push(createSleepRecoveryBundle(sleepData))
  }

  // 5. Activity & Movement Bundle - steps, distance, exercise metrics
  const activityData = healthData.filter(d => 
    d.steps_count || d.distance_walking_running_meters || d.distance_cycling_meters || 
    d.flights_climbed || d.walking_speed_mps || d.step_length_cm || d.calories_burned ||
    d.walking_asymmetry_percentage || d.double_support_time_percentage
  )
  if (activityData.length > 0) {
    bundles.push(createActivityMovementBundle(activityData))
  }

  // 6. Women's Health Bundle - reproductive and hormonal health
  const womensHealthData = healthData.filter(d => 
    d.menstrual_flow || d.ovulation_test_result || d.basal_body_temperature_celsius || 
    d.cervical_mucus_quality
  )
  if (womensHealthData.length > 0) {
    bundles.push(createWomensHealthBundle(womensHealthData))
  }

  // 7. Mental Health & Mindfulness Bundle - mood, stress, mindfulness
  const mentalHealthData = healthData.filter(d => 
    d.mindful_minutes || d.mood_score || d.stress_level || d.emotional_state
  )
  if (mentalHealthData.length > 0) {
    bundles.push(createMentalHealthBundle(mentalHealthData))
  }

  // 8. Clinical Health Bundle - medical conditions and medications
  const clinicalData = healthData.filter(d => 
    d.clinical_conditions || d.clinical_medications || d.clinical_vitals || 
    d.clinical_lab_results || d.clinical_allergies || d.clinical_immunizations
  )
  if (clinicalData.length > 0) {
    bundles.push(createClinicalHealthBundle(clinicalData))
  }

  // 9. Comprehensive HealthKit Collection - all available data types
  const comprehensiveData = healthData.filter(d => 
    Object.keys(d).filter(key => d[key] !== null && d[key] !== undefined).length >= 5
  )
  if (comprehensiveData.length > 0) {
    bundles.push(createComprehensiveHealthKitBundle(comprehensiveData))
  }

  // 10. Urban Wellness Dynamics Bundle - location-based health patterns
  const urbanData = healthData.filter(d => d.anonymized_location_zone?.includes('ZONE_'))
  if (urbanData.length > 0) {
    bundles.push(createUrbanWellnessBundle(urbanData))
  }

  console.log(`Generated ${bundles.length} unique health data bundles`)
  return bundles
}

function createUrbanWellnessBundle(data: any[]) {
  // Use fresh data with priority on recent entries
  const freshData = data.slice(0, 500); // Take most recent 500 records
  const transformedData = freshData.map(d => ({
    ...d,
    activity_type: transformActivityType(d.activity_type),
    device_type: transformDeviceType(d.device_type)
  }));

  const aggregatedData = {
    total_activities: transformedData.length,
    avg_workout_intensity: calculateAverage(transformedData, 'workout_intensity'),
    avg_steps_per_day: calculateAverage(transformedData, 'steps_count'),
    avg_sleep_quality: calculateAverage(transformedData, 'sleep_quality_score'),
    stress_distribution: calculateStressDistribution(transformedData),
    activity_type_breakdown: calculateActivityBreakdown(transformedData),
    zone_coverage: [...new Set(transformedData.map(d => d.anonymized_location_zone))].length,
    latest_step_counts: transformedData.slice(0, 5).map(d => d.steps_count).filter(Boolean),
    data_freshness: new Date().toISOString(),
    sample_activities: transformedData.slice(0, 10)
  }

  return {
    title: `Urban Wellness Dynamics Collection`,
    description: 'Comprehensive anonymized view of urban population activity and wellness trends',
    category: 'Health & Fitness',
    tier: 'Enterprise',
    price: calculateBundlePrice(transformedData, 'Enterprise', aggregatedData),
    contacts_count: transformedData.length,
    data_json: { ...aggregatedData, sample_data: transformedData.slice(0, 10) },
    key_insights: [
      `${aggregatedData.total_activities} anonymized health activities analyzed`,
      `Average workout intensity: ${aggregatedData.avg_workout_intensity?.toFixed(1)}%`,
      `${aggregatedData.zone_coverage} urban zones covered`,
      `Sleep quality trends across metropolitan areas`
    ],
    features: ['IDIA Synapse Engine™', 'Anonymized Health Data', 'Urban Zone Analysis', 'Activity Pattern Recognition'],
    suggested_filters: ['Activity Type', 'Intensity Level', 'Urban Zone', 'Time Period']
  }
}

function createPerformanceAnalyticsBundle(data: any[]) {
  console.log(`Performance bundle using ${data.length} records with step data`)
  
  const aggregatedData = {
    total_workouts: data.length,
    avg_intensity: calculateAverage(data, 'workout_intensity'),
    avg_steps: calculateAverage(data, 'steps_count'),
    max_steps: Math.max(...data.map(d => d.steps_count || 0)),
    min_steps: Math.min(...data.filter(d => d.steps_count > 0).map(d => d.steps_count)),
    step_distribution: calculateStepDistribution(data),
    performance_correlation: calculatePerformanceCorrelation(data),
    intensity_distribution: calculateIntensityDistribution(data),
    activity_patterns: calculateActivityPatterns(data),
    recent_activity_sample: data.slice(0, 10).map(d => ({
      steps: d.steps_count,
      activity: d.activity_type,
      date: d.created_at
    }))
  }

  return {
    title: `Athletic Performance Analytics Collection`,
    description: 'Advanced metrics on workout intensity, activity patterns, and performance optimization',
    category: 'Sports & Performance',
    tier: 'Professional',
    price: calculateBundlePrice(data, 'Professional', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} performance sessions analyzed (up from ~6 to full dataset)`,
      `Average daily steps: ${aggregatedData.avg_steps?.toFixed(0) || 'N/A'} (max: ${aggregatedData.max_steps})`,
      `Fresh data from ${new Date().toISOString().split('T')[0]}`,
      `Activity pattern insights from complete dataset`
    ],
    features: ['Performance Metrics', 'Activity Analysis', 'Pattern Recognition', 'Optimization Insights'],
    suggested_filters: ['Intensity Range', 'Step Count', 'Activity Duration', 'Performance Tier']
  }
}

function createSleepRecoveryBundle(data: any[]) {
  const aggregatedData = {
    total_sleep_records: data.length,
    avg_sleep_duration: calculateAverage(data, 'sleep_duration'),
    avg_sleep_quality: calculateAverage(data, 'sleep_quality_score'),
    sleep_activity_correlation: calculateSleepActivityCorrelation(data),
    quality_distribution: calculateSleepQualityDistribution(data),
    recovery_insights: calculateRecoveryInsights(data)
  }

  return {
    title: `Sleep & Recovery Patterns Collection`,
    description: 'Comprehensive analysis of sleep patterns, quality metrics, and recovery correlations',
    category: 'Health & Wellness',
    tier: 'Professional',
    price: calculateBundlePrice(data, 'Professional', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} sleep cycles analyzed`,
      `Average sleep quality: ${aggregatedData.avg_sleep_quality?.toFixed(1) || 'N/A'}/10`,
      `Sleep-activity correlation identified`,
      `Recovery optimization patterns discovered`
    ],
    features: ['Sleep Analytics', 'Quality Scoring', 'Pattern Recognition', 'Recovery Correlation'],
    suggested_filters: ['Sleep Duration', 'Quality Score', 'Recovery Time', 'Activity Impact']
  }
}

function createComprehensiveHealthBundle(data: any[]) {
  const aggregatedData = {
    total_records: data.length,
    health_metrics_available: calculateHealthMetricsAvailable(data),
    average_bmi: calculateAverage(data, 'body_mass_index'),
    average_vo2_max: calculateAverage(data, 'vo2_max'),
    heart_rate_variability: calculateAverage(data, 'heart_rate_variability_ms'),
    blood_oxygen_levels: calculateAverage(data, 'blood_oxygen_saturation'),
    health_score_distribution: calculateHealthScoreDistribution(data)
  }

  return {
    title: `Comprehensive Health Metrics Collection`,
    description: 'Advanced health analytics including cardiovascular, respiratory, and metabolic indicators',
    category: 'Health & Fitness',
    tier: 'Professional',
    price: calculateBundlePrice(data, 'Professional', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} comprehensive health records`,
      `Average BMI: ${aggregatedData.average_bmi?.toFixed(1) || 'N/A'}`,
      `VO2 Max insights available`,
      `Cardiovascular health patterns identified`
    ],
    features: ['Advanced Health Metrics', 'Cardiovascular Analysis', 'Metabolic Insights', 'Wellness Scoring'],
    suggested_filters: ['BMI Range', 'VO2 Max Level', 'Heart Rate Variability', 'Health Score']
  }
}

function createNutritionalInsightsBundle(data: any[]) {
  const aggregatedData = {
    total_nutrition_records: data.length,
    avg_daily_calories: calculateAverage(data, 'dietary_energy_kcal'),
    avg_protein_intake: calculateAverage(data, 'protein_g'),
    avg_carb_intake: calculateAverage(data, 'carbohydrates_g'),
    avg_water_intake: calculateAverage(data, 'water_ml'),
    nutrition_completeness: calculateNutritionCompleteness(data)
  }

  return {
    title: `Nutritional Insights Collection`,
    description: 'Comprehensive nutritional intake analysis including macronutrients and hydration patterns',
    category: 'Health & Nutrition',
    tier: 'Professional',
    price: calculateBundlePrice(data, 'Professional', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} nutritional data points analyzed`,
      `Average daily calories: ${aggregatedData.avg_daily_calories?.toFixed(0) || 'N/A'} kcal`,
      `Protein intake patterns identified`,
      `Hydration trends analyzed`
    ],
    features: ['Macronutrient Analysis', 'Caloric Tracking', 'Hydration Patterns', 'Nutritional Scoring'],
    suggested_filters: ['Calorie Range', 'Protein Level', 'Carbohydrate Intake', 'Water Consumption']
  }
}

function createClinicalHealthBundle(data: any[]) {
  const aggregatedData = {
    total_clinical_records: data.length,
    conditions_tracked: calculateConditionsTracked(data),
    medications_analyzed: calculateMedicationsAnalyzed(data),
    vital_signs_coverage: calculateVitalSignsCoverage(data),
    clinical_insights: calculateClinicalInsights(data)
  }

  return {
    title: `Clinical Health Analytics Collection`,
    description: 'Advanced clinical data including conditions, medications, and vital signs analysis',
    category: 'Clinical Research',
    tier: 'Enterprise',
    price: calculateBundlePrice(data, 'Enterprise', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} clinical health records`,
      `Multiple health conditions tracked`,
      `Medication adherence patterns`,
      `Vital signs monitoring insights`
    ],
    features: ['Clinical Data Analysis', 'Condition Tracking', 'Medication Insights', 'Vital Signs Monitoring'],
    suggested_filters: ['Condition Type', 'Medication Category', 'Age Group', 'Vital Signs Range']
  }
}

function createRegionalTrendsBundle(regionalData: any) {
  const regions = Object.keys(regionalData)
  const totalRecords = Object.values(regionalData).reduce((sum: number, data: any) => sum + data.length, 0)
  const flatData = Object.values(regionalData).flat() as any[]

  const aggregatedData = {
    regions_covered: regions.length,
    total_records: totalRecords,
    regional_comparisons: calculateRegionalComparisons(regionalData),
    trend_analysis: calculateTrendAnalysis(regionalData),
    demographic_insights: calculateDemographicInsights(regionalData)
  }

  return {
    title: `Regional Health Trends Collection (${regions.length} Regions)`,
    description: 'Cross-regional comparison of health trends, activity patterns, and wellness metrics',
    category: 'Market Research',
    tier: 'Enterprise',
    price: calculateBundlePrice(flatData, 'Enterprise', aggregatedData),
    contacts_count: totalRecords,
    data_json: aggregatedData,
    key_insights: [
      `${regions.length} regions analyzed`,
      `${totalRecords} data points aggregated`,
      `Regional health disparities identified`,
      `Emerging wellness trends mapped`
    ],
    features: ['Regional Analysis', 'Trend Mapping', 'Comparative Metrics', 'Demographic Insights'],
    suggested_filters: ['Geographic Region', 'Trend Period', 'Health Metric', 'Population Segment']
  }
}

// Data-based pricing algorithm
function calculateBundlePrice(data: any[], tier: string, aggregatedData: any): number {
  // Base price per data record depending on quality
  const basePrice = 75;
  const dataCount = data.length;
  
  // Calculate quality multiplier (0.8x - 1.2x)
  const avgQualityScore = calculateAverage(data, 'data_quality_score') || 0.5;
  const qualityMultiplier = 0.8 + (avgQualityScore * 0.4);
  
  // Calculate completeness multiplier (0.9x - 1.1x)
  const completenessScore = calculateDataCompleteness(data);
  const completenessMultiplier = 0.9 + (completenessScore * 0.2);
  
  // Tier multipliers
  const tierMultipliers = {
    'Analyst': 1.0,
    'Professional': 1.3,
    'Enterprise': 1.6
  };
  const tierMultiplier = tierMultipliers[tier] || 1.0;
  
  // Data richness bonuses
  let richnessBonus = 1.0;
  
  // Multiple activity types bonus (+10% per additional type)
  const activityTypes = new Set(data.map(d => d.activity_type).filter(a => a));
  if (activityTypes.size > 1) {
    richnessBonus += (activityTypes.size - 1) * 0.1;
  }
  
  // Zone coverage bonus (+5% per zone)
  const zones = new Set(data.map(d => d.anonymized_location_zone).filter(z => z));
  if (zones.size > 1) {
    richnessBonus += (zones.size - 1) * 0.05;
  }
  
  // Clinical data present (+25%)
  const hasClinicalData = data.some(d => 
    d.clinical_conditions || d.clinical_medications || d.clinical_vitals || d.clinical_lab_results
  );
  if (hasClinicalData) {
    richnessBonus += 0.25;
  }
  
  // Sleep data present (+15%)
  const hasSleepData = data.some(d => d.sleep_duration || d.sleep_quality_score);
  if (hasSleepData) {
    richnessBonus += 0.15;
  }
  
  // Nutritional data present (+20%)
  const hasNutritionalData = data.some(d => 
    d.dietary_energy_kcal || d.protein_g || d.carbohydrates_g || d.total_fat_g
  );
  if (hasNutritionalData) {
    richnessBonus += 0.20;
  }
  
  // Calculate final price
  let finalPrice = dataCount * basePrice * qualityMultiplier * completenessMultiplier * tierMultiplier * richnessBonus;
  
  // Apply reasonable bounds ($300-8000)
  finalPrice = Math.max(300, Math.min(8000, finalPrice));
  
  // Round to nearest dollar
  return Math.round(finalPrice);
}

// Helper functions
function calculateAverage(data: any[], field: string): number | null {
  const values = data.map(d => d[field]).filter(v => v !== null && v !== undefined && !isNaN(v))
  return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : null
}

function calculateHealthMetricsAvailable(data: any[]) {
  const metrics = ['heart_rate_variability_ms', 'blood_oxygen_saturation', 'vo2_max', 'body_mass_index', 'systolic_blood_pressure']
  return metrics.filter(metric => data.some(d => d[metric] !== null && d[metric] !== undefined)).length
}

function calculateHealthScoreDistribution(data: any[]) {
  // Create a health score based on available metrics
  const scores = data.map(d => {
    let score = 50 // Base score
    if (d.vo2_max > 35) score += 20
    if (d.body_mass_index && d.body_mass_index < 25) score += 15
    if (d.blood_oxygen_saturation > 95) score += 15
    return Math.min(100, score)
  })
  
  return {
    excellent: scores.filter(s => s >= 80).length,
    good: scores.filter(s => s >= 60 && s < 80).length,
    fair: scores.filter(s => s >= 40 && s < 60).length,
    poor: scores.filter(s => s < 40).length
  }
}

function calculateNutritionCompleteness(data: any[]) {
  const nutritionFields = ['dietary_energy_kcal', 'protein_g', 'carbohydrates_g', 'total_fat_g', 'water_ml']
  return data.map(record => {
    const completedFields = nutritionFields.filter(field => record[field] !== null && record[field] !== undefined)
    return completedFields.length / nutritionFields.length
  }).reduce((sum, val) => sum + val, 0) / data.length
}

function calculateConditionsTracked(data: any[]) {
  const conditions = new Set()
  data.forEach(d => {
    if (d.clinical_conditions && Array.isArray(d.clinical_conditions)) {
      d.clinical_conditions.forEach((condition: any) => conditions.add(condition.name || condition))
    }
  })
  return conditions.size
}

function calculateMedicationsAnalyzed(data: any[]) {
  const medications = new Set()
  data.forEach(d => {
    if (d.clinical_medications && Array.isArray(d.clinical_medications)) {
      d.clinical_medications.forEach((med: any) => medications.add(med.name || med))
    }
  })
  return medications.size
}

function calculateVitalSignsCoverage(data: any[]) {
  const vitalSigns = ['systolic_blood_pressure', 'diastolic_blood_pressure', 'respiratory_rate_per_min', 'body_temperature_celsius']
  return vitalSigns.filter(vital => data.some(d => d[vital] !== null && d[vital] !== undefined)).length
}

function calculateClinicalInsights(data: any[]) {
  return {
    total_conditions: calculateConditionsTracked(data),
    total_medications: calculateMedicationsAnalyzed(data),
    vital_signs_tracked: calculateVitalSignsCoverage(data),
    data_richness_score: (calculateConditionsTracked(data) + calculateMedicationsAnalyzed(data) + calculateVitalSignsCoverage(data)) / 3
  }
}

function calculateAverageQuality(data: any[]): number {
  return calculateAverage(data, 'data_quality_score') || 0.5
}

function calculateDataCompleteness(data: any[]): number {
  const fields = ['steps_count', 'workout_intensity', 'sleep_duration', 'anonymized_location_zone']
  const completeness = data.map(record => {
    const nonNullFields = fields.filter(field => record[field] !== null && record[field] !== undefined)
    return nonNullFields.length / fields.length
  })
  return completeness.reduce((sum, val) => sum + val, 0) / completeness.length
}

function calculateGeographicCoverage(data: any[]): number {
  const uniqueZones = new Set(data.map(d => d.anonymized_location_zone).filter(z => z))
  return uniqueZones.size
}

function calculateStressDistribution(data: any[]) {
  const stressLevels = data.map(d => d.stress_level).filter(s => s !== null && !isNaN(s))
  return {
    low: stressLevels.filter(s => s <= 3).length,
    medium: stressLevels.filter(s => s > 3 && s <= 7).length,
    high: stressLevels.filter(s => s > 7).length
  }
}

function calculateActivityBreakdown(data: any[]) {
  const breakdown: { [key: string]: number } = {}
  data.forEach(d => {
    breakdown[d.activity_type] = (breakdown[d.activity_type] || 0) + 1
  })
  return breakdown
}

function groupByRegion(data: any[]) {
  const grouped: { [key: string]: any[] } = {}
  data.forEach(d => {
    if (d.anonymized_location_zone) {
      if (!grouped[d.anonymized_location_zone]) {
        grouped[d.anonymized_location_zone] = []
      }
      grouped[d.anonymized_location_zone].push(d)
    }
  })
  return grouped
}

function calculatePerformanceCorrelation(data: any[]): number {
  const pairs = data.map(d => [d.workout_intensity, d.steps_count]).filter(p => p[0] && p[1])
  if (pairs.length < 2) return 0
  
  const n = pairs.length
  const sumX = pairs.reduce((sum, p) => sum + p[0], 0)
  const sumY = pairs.reduce((sum, p) => sum + p[1], 0)
  const correlation = (sumX / n) / (sumY / n) * 100
  return Math.min(Math.max(correlation, -100), 100) / 100
}

function calculateIntensityDistribution(data: any[]) {
  const intensities = data.map(d => d.workout_intensity).filter(i => i !== null && !isNaN(i))
  return {
    low: intensities.filter(i => i <= 30).length,
    moderate: intensities.filter(i => i > 30 && i <= 70).length,
    high: intensities.filter(i => i > 70).length
  }
}

function calculateStepDistribution(data: any[]) {
  const steps = data.map(d => d.steps_count).filter(s => s > 0)
  return {
    low: steps.filter(s => s <= 3000).length,
    moderate: steps.filter(s => s > 3000 && s <= 7000).length,
    high: steps.filter(s => s > 7000).length,
    average: steps.reduce((sum, s) => sum + s, 0) / steps.length
  }
}

function calculateActivityPatterns(data: any[]) {
  return {
    high_activity: data.filter(d => (d.steps_count || 0) > 8000).length,
    moderate_activity: data.filter(d => (d.steps_count || 0) > 4000 && (d.steps_count || 0) <= 8000).length,
    low_activity: data.filter(d => (d.steps_count || 0) <= 4000).length
  }
}

function calculateSleepActivityCorrelation(data: any[]): number {
  const pairs = data.map(d => [d.sleep_quality_score, d.steps_count]).filter(p => p[0] && p[1])
  if (pairs.length < 2) return 0
  
  const avgSleep = pairs.reduce((sum, p) => sum + p[0], 0) / pairs.length
  const avgSteps = pairs.reduce((sum, p) => sum + p[1], 0) / pairs.length
  return Math.min(Math.max(avgSleep / 10 * avgSteps / 10000, -1), 1)
}

function calculateSleepQualityDistribution(data: any[]) {
  const qualities = data.map(d => d.sleep_quality_score).filter(q => q !== null && !isNaN(q))
  return {
    poor: qualities.filter(q => q <= 3).length,
    fair: qualities.filter(q => q > 3 && q <= 7).length,
    excellent: qualities.filter(q => q > 7).length
  }
}

function calculateRecoveryInsights(data: any[]) {
  return {
    total_records: data.length,
    with_sleep_data: data.filter(d => d.sleep_duration || d.sleep_quality_score).length,
    with_activity_data: data.filter(d => d.steps_count || d.workout_intensity).length
  }
}

function calculateRegionalComparisons(regionalData: any) {
  const comparisons: { [key: string]: any } = {}
  Object.keys(regionalData).forEach(region => {
    const data = regionalData[region]
    comparisons[region] = {
      total_records: data.length,
      avg_steps: calculateAverage(data, 'steps_count'),
      avg_intensity: calculateAverage(data, 'workout_intensity')
    }
  })
  return comparisons
}

function calculateTrendAnalysis(regionalData: any) {
  return {
    regions_analyzed: Object.keys(regionalData).length,
    total_data_points: Object.values(regionalData).reduce((sum: number, data: any) => sum + data.length, 0),
    trend_period: '30_days'
  }
}

function calculateDemographicInsights(regionalData: any) {
  return {
    geographic_diversity: Object.keys(regionalData).length,
    data_density: Object.values(regionalData).reduce((sum: number, data: any) => sum + data.length, 0),
    coverage_quality: 'high'
  }
}

// New HealthKit-specific bundle creation functions

function createHealthKitVitalsBundle(data: any[]) {
  const aggregatedData = {
    total_vitals_records: data.length,
    avg_heart_rate: calculateAverage(data, 'average_heartrate'),
    avg_resting_heart_rate: calculateAverage(data, 'resting_heart_rate'),
    avg_heart_rate_variability: calculateAverage(data, 'heart_rate_variability_ms'),
    avg_blood_oxygen: calculateAverage(data, 'blood_oxygen_saturation'),
    avg_systolic_bp: calculateAverage(data, 'systolic_blood_pressure'),
    avg_diastolic_bp: calculateAverage(data, 'diastolic_blood_pressure'),
    avg_respiratory_rate: calculateAverage(data, 'respiratory_rate_per_min'),
    avg_body_temperature: calculateAverage(data, 'body_temperature_celsius'),
    vitals_completeness: calculateVitalsCompleteness(data),
    cardiovascular_insights: calculateCardiovascularInsights(data)
  }

  return {
    title: `Apple HealthKit Vitals Collection`,
    description: 'Comprehensive cardiovascular and respiratory health metrics from Apple HealthKit',
    category: 'Health & Vitals',
    tier: 'Professional',
    price: calculateBundlePrice(data, 'Professional', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} vital signs measurements`,
      `Heart rate: ${aggregatedData.avg_heart_rate?.toFixed(0) || 'N/A'} bpm average`,
      `Blood oxygen: ${aggregatedData.avg_blood_oxygen?.toFixed(1) || 'N/A'}% average`,
      `Heart rate variability tracked`
    ],
    features: ['Heart Rate Analysis', 'Blood Pressure Tracking', 'Oxygen Saturation', 'Respiratory Metrics'],
    suggested_filters: ['Heart Rate Range', 'Blood Pressure Category', 'Oxygen Level', 'Temperature Range']
  }
}

function createBodyCompositionBundle(data: any[]) {
  const aggregatedData = {
    total_body_records: data.length,
    avg_height: calculateAverage(data, 'height_cm'),
    avg_weight: calculateAverage(data, 'weight_kg'),
    avg_bmi: calculateAverage(data, 'body_mass_index'),
    avg_body_fat: calculateAverage(data, 'body_fat_percentage'),
    avg_lean_mass: calculateAverage(data, 'lean_body_mass_kg'),
    avg_waist_circumference: calculateAverage(data, 'waist_circumference_cm'),
    avg_vo2_max: calculateAverage(data, 'vo2_max'),
    body_composition_trends: calculateBodyCompositionTrends(data),
    fitness_level_distribution: calculateFitnessLevelDistribution(data)
  }

  return {
    title: `Body Composition & Fitness Metrics Collection`,
    description: 'Advanced body composition analysis and fitness performance indicators',
    category: 'Fitness & Body Composition',
    tier: 'Professional',
    price: calculateBundlePrice(data, 'Professional', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} body composition measurements`,
      `Average BMI: ${aggregatedData.avg_bmi?.toFixed(1) || 'N/A'}`,
      `VO2 Max: ${aggregatedData.avg_vo2_max?.toFixed(1) || 'N/A'} ml/kg/min`,
      `Body fat percentage tracked`
    ],
    features: ['BMI Analysis', 'Body Fat Tracking', 'VO2 Max Metrics', 'Lean Mass Monitoring'],
    suggested_filters: ['BMI Category', 'Body Fat Range', 'VO2 Max Level', 'Weight Range']
  }
}

function createNutritionalHealthBundle(data: any[]) {
  const aggregatedData = {
    total_nutrition_records: data.length,
    avg_daily_calories: calculateAverage(data, 'dietary_energy_kcal'),
    avg_protein: calculateAverage(data, 'protein_g'),
    avg_carbs: calculateAverage(data, 'carbohydrates_g'),
    avg_fat: calculateAverage(data, 'total_fat_g'),
    avg_fiber: calculateAverage(data, 'fiber_g'),
    avg_sugar: calculateAverage(data, 'sugar_g'),
    avg_water: calculateAverage(data, 'water_ml'),
    avg_caffeine: calculateAverage(data, 'caffeine_mg'),
    vitamin_mineral_tracking: calculateVitaminMineralTracking(data),
    macronutrient_distribution: calculateMacronutrientDistribution(data)
  }

  return {
    title: `Apple HealthKit Nutrition Collection`,
    description: 'Comprehensive nutritional intake analysis including macronutrients, micronutrients, and hydration',
    category: 'Nutrition & Diet',
    tier: 'Professional',
    price: calculateBundlePrice(data, 'Professional', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} nutritional data entries`,
      `Average calories: ${aggregatedData.avg_daily_calories?.toFixed(0) || 'N/A'} kcal/day`,
      `Protein intake: ${aggregatedData.avg_protein?.toFixed(1) || 'N/A'}g average`,
      `Comprehensive micronutrient tracking`
    ],
    features: ['Caloric Analysis', 'Macronutrient Breakdown', 'Micronutrient Tracking', 'Hydration Monitoring'],
    suggested_filters: ['Calorie Range', 'Protein Level', 'Carb Intake', 'Vitamin Levels']
  }
}

function createActivityMovementBundle(data: any[]) {
  const aggregatedData = {
    total_activity_records: data.length,
    avg_daily_steps: calculateAverage(data, 'steps_count'),
    avg_walking_distance: calculateAverage(data, 'distance_walking_running_meters'),
    avg_cycling_distance: calculateAverage(data, 'distance_cycling_meters'),
    avg_flights_climbed: calculateAverage(data, 'flights_climbed'),
    avg_walking_speed: calculateAverage(data, 'walking_speed_mps'),
    avg_step_length: calculateAverage(data, 'step_length_cm'),
    walking_asymmetry: calculateAverage(data, 'walking_asymmetry_percentage'),
    movement_patterns: calculateMovementPatterns(data),
    activity_diversity: calculateActivityDiversity(data)
  }

  return {
    title: `Activity & Movement Analytics Collection`,
    description: 'Detailed analysis of daily movement patterns, walking gait, and physical activity metrics',
    category: 'Activity & Movement',
    tier: 'Professional',
    price: calculateBundlePrice(data, 'Professional', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} activity measurements`,
      `Average steps: ${aggregatedData.avg_daily_steps?.toFixed(0) || 'N/A'} per day`,
      `Walking speed: ${aggregatedData.avg_walking_speed?.toFixed(2) || 'N/A'} m/s`,
      `Gait analysis and movement patterns`
    ],
    features: ['Step Counting', 'Distance Tracking', 'Gait Analysis', 'Movement Patterns'],
    suggested_filters: ['Step Range', 'Distance Type', 'Walking Speed', 'Activity Level']
  }
}

function createWomensHealthBundle(data: any[]) {
  const aggregatedData = {
    total_reproductive_records: data.length,
    menstrual_flow_tracking: calculateMenstrualFlowTracking(data),
    ovulation_data: calculateOvulationData(data),
    basal_temperature_trends: calculateBasalTemperatureTrends(data),
    cervical_mucus_patterns: calculateCervicalMucusPatterns(data),
    reproductive_health_insights: calculateReproductiveHealthInsights(data)
  }

  return {
    title: `Women's Health & Reproductive Analytics Collection`,
    description: 'Comprehensive reproductive health tracking including menstrual cycles, ovulation, and fertility indicators',
    category: 'Women\'s Health',
    tier: 'Professional',
    price: calculateBundlePrice(data, 'Professional', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} reproductive health data points`,
      `Menstrual cycle tracking available`,
      `Ovulation pattern analysis`,
      `Fertility indicator monitoring`
    ],
    features: ['Cycle Tracking', 'Ovulation Analysis', 'Temperature Monitoring', 'Fertility Insights'],
    suggested_filters: ['Cycle Phase', 'Flow Intensity', 'Ovulation Status', 'Fertility Window']
  }
}

function createMentalHealthBundle(data: any[]) {
  const aggregatedData = {
    total_mental_health_records: data.length,
    avg_mindful_minutes: calculateAverage(data, 'mindful_minutes'),
    avg_mood_score: calculateAverage(data, 'mood_score'),
    avg_stress_level: calculateAverage(data, 'stress_level'),
    emotional_state_distribution: calculateEmotionalStateDistribution(data),
    mindfulness_patterns: calculateMindfulnessPatterns(data),
    stress_correlation: calculateStressCorrelation(data)
  }

  return {
    title: `Mental Health & Mindfulness Collection`,
    description: 'Comprehensive mental wellness tracking including mood, stress levels, and mindfulness practices',
    category: 'Mental Health',
    tier: 'Professional',
    price: calculateBundlePrice(data, 'Professional', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} mental health assessments`,
      `Average mood score: ${aggregatedData.avg_mood_score?.toFixed(1) || 'N/A'}/10`,
      `Mindfulness: ${aggregatedData.avg_mindful_minutes?.toFixed(0) || 'N/A'} minutes average`,
      `Stress pattern analysis available`
    ],
    features: ['Mood Tracking', 'Stress Analysis', 'Mindfulness Monitoring', 'Emotional Pattern Recognition'],
    suggested_filters: ['Mood Range', 'Stress Level', 'Mindfulness Duration', 'Emotional State']
  }
}

function createComprehensiveHealthKitBundle(data: any[]) {
  const aggregatedData = {
    total_comprehensive_records: data.length,
    data_types_available: calculateDataTypesAvailable(data),
    health_score: calculateOverallHealthScore(data),
    data_richness_metrics: calculateDataRichnessMetrics(data),
    comprehensive_insights: calculateComprehensiveInsights(data),
    healthkit_coverage: calculateHealthKitCoverage(data)
  }

  return {
    title: `Comprehensive Apple HealthKit Collection`,
    description: 'Complete health ecosystem data including all available HealthKit metrics and insights',
    category: 'Comprehensive Health',
    tier: 'Enterprise',
    price: calculateBundlePrice(data, 'Enterprise', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} comprehensive health records`,
      `${aggregatedData.data_types_available} different HealthKit data types`,
      `Multi-dimensional health analysis`,
      `Complete health ecosystem coverage`
    ],
    features: ['All HealthKit Metrics', 'Cross-Category Analysis', 'Health Score Calculation', 'Comprehensive Insights'],
    suggested_filters: ['Data Type', 'Health Category', 'Data Completeness', 'Time Period']
  }
}

// Helper functions for new bundle types

function calculateVitalsCompleteness(data: any[]): number {
  const vitalFields = ['average_heartrate', 'resting_heart_rate', 'blood_oxygen_saturation', 'systolic_blood_pressure']
  return data.map(record => {
    const completedFields = vitalFields.filter(field => record[field] !== null && record[field] !== undefined)
    return completedFields.length / vitalFields.length
  }).reduce((sum, val) => sum + val, 0) / data.length
}

function calculateCardiovascularInsights(data: any[]) {
  return {
    heart_rate_zones: calculateHeartRateZones(data),
    blood_pressure_categories: calculateBloodPressureCategories(data),
    cardiovascular_risk_factors: calculateCardiovascularRiskFactors(data)
  }
}

function calculateHeartRateZones(data: any[]) {
  const heartRates = data.map(d => d.average_heartrate).filter(hr => hr)
  return {
    resting: heartRates.filter(hr => hr < 60).length,
    normal: heartRates.filter(hr => hr >= 60 && hr <= 100).length,
    elevated: heartRates.filter(hr => hr > 100).length
  }
}

function calculateBloodPressureCategories(data: any[]) {
  const bpData = data.filter(d => d.systolic_blood_pressure && d.diastolic_blood_pressure)
  return {
    normal: bpData.filter(d => d.systolic_blood_pressure < 120 && d.diastolic_blood_pressure < 80).length,
    elevated: bpData.filter(d => d.systolic_blood_pressure >= 120 && d.systolic_blood_pressure < 130 && d.diastolic_blood_pressure < 80).length,
    high: bpData.filter(d => d.systolic_blood_pressure >= 130 || d.diastolic_blood_pressure >= 80).length
  }
}

function calculateCardiovascularRiskFactors(data: any[]) {
  return {
    total_assessments: data.length,
    heart_rate_variability_tracked: data.filter(d => d.heart_rate_variability_ms).length,
    blood_pressure_tracked: data.filter(d => d.systolic_blood_pressure && d.diastolic_blood_pressure).length
  }
}

function calculateBodyCompositionTrends(data: any[]) {
  return {
    bmi_distribution: calculateBMIDistribution(data),
    body_fat_trends: calculateBodyFatTrends(data),
    fitness_metrics: calculateFitnessMetrics(data)
  }
}

function calculateBMIDistribution(data: any[]) {
  const bmis = data.map(d => d.body_mass_index).filter(bmi => bmi)
  return {
    underweight: bmis.filter(bmi => bmi < 18.5).length,
    normal: bmis.filter(bmi => bmi >= 18.5 && bmi < 25).length,
    overweight: bmis.filter(bmi => bmi >= 25 && bmi < 30).length,
    obese: bmis.filter(bmi => bmi >= 30).length
  }
}

function calculateBodyFatTrends(data: any[]) {
  const bodyFats = data.map(d => d.body_fat_percentage).filter(bf => bf)
  return {
    low: bodyFats.filter(bf => bf < 15).length,
    normal: bodyFats.filter(bf => bf >= 15 && bf <= 25).length,
    high: bodyFats.filter(bf => bf > 25).length,
    average: bodyFats.length > 0 ? bodyFats.reduce((sum, bf) => sum + bf, 0) / bodyFats.length : null
  }
}

function calculateFitnessMetrics(data: any[]) {
  return {
    vo2_max_tracked: data.filter(d => d.vo2_max).length,
    body_composition_tracked: data.filter(d => d.body_fat_percentage || d.lean_body_mass_kg).length,
    physical_measurements_tracked: data.filter(d => d.height_cm || d.weight_kg).length
  }
}

function calculateFitnessLevelDistribution(data: any[]) {
  const vo2MaxValues = data.map(d => d.vo2_max).filter(v => v)
  return {
    poor: vo2MaxValues.filter(v => v < 25).length,
    fair: vo2MaxValues.filter(v => v >= 25 && v < 35).length,
    good: vo2MaxValues.filter(v => v >= 35 && v < 45).length,
    excellent: vo2MaxValues.filter(v => v >= 45).length
  }
}

function calculateVitaminMineralTracking(data: any[]) {
  const vitamins = ['vitamin_c_mg', 'vitamin_d_mcg']
  const minerals = ['calcium_mg', 'iron_mg', 'sodium_mg', 'potassium_mg']
  
  return {
    vitamins_tracked: vitamins.filter(vitamin => data.some(d => d[vitamin])).length,
    minerals_tracked: minerals.filter(mineral => data.some(d => d[mineral])).length,
    total_micronutrients: [...vitamins, ...minerals].filter(nutrient => data.some(d => d[nutrient])).length
  }
}

function calculateMacronutrientDistribution(data: any[]) {
  const proteinCalories = data.map(d => (d.protein_g || 0) * 4)
  const carbCalories = data.map(d => (d.carbohydrates_g || 0) * 4)
  const fatCalories = data.map(d => (d.total_fat_g || 0) * 9)
  
  return {
    avg_protein_calories: proteinCalories.reduce((sum, cal) => sum + cal, 0) / proteinCalories.length,
    avg_carb_calories: carbCalories.reduce((sum, cal) => sum + cal, 0) / carbCalories.length,
    avg_fat_calories: fatCalories.reduce((sum, cal) => sum + cal, 0) / fatCalories.length
  }
}

function calculateMovementPatterns(data: any[]) {
  return {
    high_step_days: data.filter(d => (d.steps_count || 0) > 10000).length,
    moderate_step_days: data.filter(d => (d.steps_count || 0) >= 5000 && (d.steps_count || 0) <= 10000).length,
    low_step_days: data.filter(d => (d.steps_count || 0) < 5000).length,
    flights_climbed_tracked: data.filter(d => d.flights_climbed).length
  }
}

function calculateActivityDiversity(data: any[]) {
  const walkingData = data.filter(d => d.distance_walking_running_meters)
  const cyclingData = data.filter(d => d.distance_cycling_meters)
  
  return {
    walking_sessions: walkingData.length,
    cycling_sessions: cyclingData.length,
    total_activity_types: (walkingData.length > 0 ? 1 : 0) + (cyclingData.length > 0 ? 1 : 0)
  }
}

function calculateMenstrualFlowTracking(data: any[]) {
  const flowData = data.map(d => d.menstrual_flow).filter(f => f)
  return {
    total_entries: flowData.length,
    flow_patterns: flowData.reduce((acc, flow) => {
      acc[flow] = (acc[flow] || 0) + 1
      return acc
    }, {} as { [key: string]: number })
  }
}

function calculateOvulationData(data: any[]) {
  const ovulationData = data.map(d => d.ovulation_test_result).filter(o => o)
  return {
    total_tests: ovulationData.length,
    positive_results: ovulationData.filter(result => result === 'positive').length,
    negative_results: ovulationData.filter(result => result === 'negative').length
  }
}

function calculateBasalTemperatureTrends(data: any[]) {
  const temperatures = data.map(d => d.basal_body_temperature_celsius).filter(t => t)
  return {
    total_measurements: temperatures.length,
    avg_temperature: temperatures.length > 0 ? temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length : null,
    temperature_range: temperatures.length > 0 ? {
      min: Math.min(...temperatures),
      max: Math.max(...temperatures)
    } : null
  }
}

function calculateCervicalMucusPatterns(data: any[]) {
  const mucusData = data.map(d => d.cervical_mucus_quality).filter(m => m)
  return {
    total_observations: mucusData.length,
    quality_patterns: mucusData.reduce((acc, quality) => {
      acc[quality] = (acc[quality] || 0) + 1
      return acc
    }, {} as { [key: string]: number })
  }
}

function calculateReproductiveHealthInsights(data: any[]) {
  return {
    menstrual_tracking: data.filter(d => d.menstrual_flow).length,
    ovulation_tracking: data.filter(d => d.ovulation_test_result).length,
    temperature_tracking: data.filter(d => d.basal_body_temperature_celsius).length,
    comprehensive_fertility_data: data.filter(d => 
      d.menstrual_flow || d.ovulation_test_result || d.basal_body_temperature_celsius || d.cervical_mucus_quality
    ).length
  }
}

function calculateEmotionalStateDistribution(data: any[]) {
  const states = data.map(d => d.emotional_state).filter(s => s)
  return states.reduce((acc, state) => {
    acc[state] = (acc[state] || 0) + 1
    return acc
  }, {} as { [key: string]: number })
}

function calculateMindfulnessPatterns(data: any[]) {
  const mindfulSessions = data.filter(d => d.mindful_minutes)
  return {
    total_sessions: mindfulSessions.length,
    avg_session_length: mindfulSessions.length > 0 ? 
      mindfulSessions.reduce((sum, d) => sum + d.mindful_minutes, 0) / mindfulSessions.length : null,
    consistency_score: mindfulSessions.length / data.length
  }
}

function calculateStressCorrelation(data: any[]) {
  const stressData = data.filter(d => d.stress_level && d.mindful_minutes)
  return {
    stress_mindfulness_correlation: stressData.length,
    avg_stress_with_mindfulness: stressData.length > 0 ? 
      stressData.reduce((sum, d) => sum + d.stress_level, 0) / stressData.length : null
  }
}

function calculateDataTypesAvailable(data: any[]): number {
  const allFields = new Set()
  data.forEach(record => {
    Object.keys(record).forEach(key => {
      if (record[key] !== null && record[key] !== undefined) {
        allFields.add(key)
      }
    })
  })
  return allFields.size
}

function calculateOverallHealthScore(data: any[]): number {
  let totalScore = 0
  let scoredRecords = 0
  
  data.forEach(record => {
    let recordScore = 50 // Base score
    let factors = 0
    
    // Vitals factors
    if (record.average_heartrate && record.average_heartrate >= 60 && record.average_heartrate <= 100) {
      recordScore += 10
      factors++
    }
    if (record.blood_oxygen_saturation && record.blood_oxygen_saturation >= 95) {
      recordScore += 10
      factors++
    }
    
    // Fitness factors
    if (record.steps_count && record.steps_count >= 8000) {
      recordScore += 15
      factors++
    }
    if (record.vo2_max && record.vo2_max >= 35) {
      recordScore += 15
      factors++
    }
    
    // Body composition factors
    if (record.body_mass_index && record.body_mass_index >= 18.5 && record.body_mass_index < 25) {
      recordScore += 10
      factors++
    }
    
    if (factors > 0) {
      totalScore += Math.min(100, recordScore)
      scoredRecords++
    }
  })
  
  return scoredRecords > 0 ? totalScore / scoredRecords : 50
}

function calculateDataRichnessMetrics(data: any[]) {
  const categories = {
    activity: ['steps_count', 'distance_walking_running_meters', 'calories_burned'],
    vitals: ['average_heartrate', 'blood_oxygen_saturation', 'systolic_blood_pressure'],
    body: ['height_cm', 'weight_kg', 'body_mass_index'],
    nutrition: ['dietary_energy_kcal', 'protein_g', 'carbohydrates_g'],
    sleep: ['sleep_duration', 'time_asleep_minutes', 'sleep_quality_score'],
    mental: ['mood_score', 'stress_level', 'mindful_minutes']
  }
  
  const richness = {}
  Object.keys(categories).forEach(category => {
    const fields = categories[category as keyof typeof categories]
    const coverage = fields.filter(field => data.some(d => d[field])).length
    richness[category] = coverage / fields.length
  })
  
  return richness
}

function calculateComprehensiveInsights(data: any[]) {
  return {
    total_data_points: data.length,
    data_completeness: calculateDataCompleteness(data),
    health_categories_covered: Object.keys(calculateDataRichnessMetrics(data)).length,
    data_quality_score: calculateAverageQuality(data),
    temporal_coverage: calculateTemporalCoverage(data)
  }
}

function calculateHealthKitCoverage(data: any[]) {
  const healthkitCategories = [
    'activity', 'vitals', 'body_measurements', 'nutrition', 
    'sleep', 'reproductive_health', 'mental_health', 'clinical'
  ]
  
  let coveredCategories = 0
  
  // Activity
  if (data.some(d => d.steps_count || d.distance_walking_running_meters)) coveredCategories++
  // Vitals  
  if (data.some(d => d.average_heartrate || d.blood_oxygen_saturation)) coveredCategories++
  // Body measurements
  if (data.some(d => d.height_cm || d.weight_kg || d.body_mass_index)) coveredCategories++
  // Nutrition
  if (data.some(d => d.dietary_energy_kcal || d.protein_g)) coveredCategories++
  // Sleep
  if (data.some(d => d.sleep_duration || d.time_asleep_minutes)) coveredCategories++
  // Reproductive health
  if (data.some(d => d.menstrual_flow || d.ovulation_test_result)) coveredCategories++
  // Mental health
  if (data.some(d => d.mood_score || d.stress_level || d.mindful_minutes)) coveredCategories++
  // Clinical
  if (data.some(d => d.clinical_conditions || d.clinical_medications)) coveredCategories++
  
  return {
    categories_covered: coveredCategories,
    total_categories: healthkitCategories.length,
    coverage_percentage: (coveredCategories / healthkitCategories.length) * 100
  }
}

function calculateTemporalCoverage(data: any[]) {
  const dates = data.map(d => new Date(d.created_at || d.processed_at)).filter(d => !isNaN(d.getTime()))
  if (dates.length === 0) return { days_covered: 0 }
  
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
  const daysCovered = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    days_covered: daysCovered,
    start_date: minDate.toISOString().split('T')[0],
    end_date: maxDate.toISOString().split('T')[0]
  }
}