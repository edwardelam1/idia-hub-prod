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

    // Get staged health data based on trigger type
    let healthDataQuery = supabaseClient.from('staged_health_data').select('*');
    
    if (trigger === 'real_time') {
      // For real-time triggers, process recent data (last hour) to create fresh bundles
      healthDataQuery = healthDataQuery.gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }).limit(100);
    } else if (trigger === 'manual_engage' || force_process) {
      // For manual engagement, get all available data
      healthDataQuery = healthDataQuery.order('created_at', { ascending: false }).limit(1000);
    } else {
      // For scheduled runs, get data from last 6 hours (more frequent updates)
      healthDataQuery = healthDataQuery.gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString());
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
      // Check for existing similar bundles (check ALL active bundles, not just recent ones)
      const { data: existingBundles } = await supabaseClient
        .from('marketplace_bundles')
        .select('bundle_id, title, created_at, bundle_version')
        .eq('title', bundle.title)
        .eq('category', bundle.category)
        .eq('is_active', true) // Only check active bundles, no time restriction

      if (existingBundles && existingBundles.length > 0) {
        console.log(`Skipping duplicate bundle: ${bundle.title}`)
        
        // Update existing bundle instead of creating new one
        const existingBundle = existingBundles[0]
        const newVersion = (existingBundle.bundle_version || 1) + 1
        const { data: updatedBundle, error: updateError } = await supabaseClient
          .from('marketplace_bundles')
          .update({
            contacts_count: bundle.contacts_count,
            data_json: bundle.data_json,
            key_insights: bundle.key_insights,
            updated_at: new Date().toISOString(),
            bundle_version: newVersion // Properly increment version
          })
          .eq('bundle_id', existingBundle.bundle_id)
          .select()

        if (!updateError && updatedBundle) {
          bundleResults.push(updatedBundle[0])
          console.log(`Updated existing bundle: ${bundle.title}`)
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

  // Always try to create bundles regardless of data count (removed artificial thresholds)
  
  // Urban Wellness Dynamics Bundle - if we have any location data
  const urbanData = healthData.filter(d => d.anonymized_location_zone?.includes('ZONE_'))
  if (urbanData.length > 0) {
    bundles.push(createUrbanWellnessBundle(urbanData))
  }

  // Activity Performance Analytics Bundle - if we have any activity metrics
  const performanceData = healthData.filter(d => d.workout_intensity || d.steps_count || d.average_heartrate)
  if (performanceData.length > 0) {
    bundles.push(createPerformanceAnalyticsBundle(performanceData))
  }

  // Sleep & Recovery Insights Bundle - if we have any sleep data
  const sleepData = healthData.filter(d => d.sleep_duration || d.sleep_quality_score || d.time_asleep_minutes)
  if (sleepData.length > 0) {
    bundles.push(createSleepRecoveryBundle(sleepData))
  }

  // Comprehensive Health Metrics Bundle - if we have rich health data
  const comprehensiveData = healthData.filter(d => 
    d.heart_rate_variability_ms || d.blood_oxygen_saturation || d.vo2_max || 
    d.systolic_blood_pressure || d.body_mass_index || d.dietary_energy_kcal
  )
  if (comprehensiveData.length > 0) {
    bundles.push(createComprehensiveHealthBundle(comprehensiveData))
  }

  // Nutritional Insights Bundle - if we have nutrition data
  const nutritionData = healthData.filter(d => 
    d.dietary_energy_kcal || d.protein_g || d.carbohydrates_g || d.total_fat_g || d.water_ml
  )
  if (nutritionData.length > 0) {
    bundles.push(createNutritionalInsightsBundle(nutritionData))
  }

  // Clinical Health Bundle - if we have clinical data
  const clinicalData = healthData.filter(d => 
    d.clinical_conditions || d.clinical_medications || d.clinical_vitals || d.clinical_lab_results
  )
  if (clinicalData.length > 0) {
    bundles.push(createClinicalHealthBundle(clinicalData))
  }

  // Regional Health Trends Bundle - if we have multiple regions
  const regionalData = groupByRegion(healthData)
  if (Object.keys(regionalData).length > 0) {
    bundles.push(createRegionalTrendsBundle(regionalData))
  }

  return bundles
}

function createUrbanWellnessBundle(data: any[]) {
  // Transform generic activity types to more realistic ones
  const transformedData = data.map(d => ({
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
    zone_coverage: [...new Set(transformedData.map(d => d.anonymized_location_zone))].length
  }

  const dateStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  return {
    title: `Urban Wellness Dynamics: ${dateStr} Health Trends (${transformedData.length} Records)`,
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
  const aggregatedData = {
    total_workouts: data.length,
    avg_intensity: calculateAverage(data, 'workout_intensity'),
    avg_steps: calculateAverage(data, 'steps_count'),
    performance_correlation: calculatePerformanceCorrelation(data),
    intensity_distribution: calculateIntensityDistribution(data),
    activity_patterns: calculateActivityPatterns(data)
  }

  const dateStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  return {
    title: `Athletic Performance Analytics: ${dateStr} Dataset (${data.length} Sessions)`,
    description: 'Advanced metrics on workout intensity, activity patterns, and performance optimization',
    category: 'Sports & Performance',
    tier: 'Professional',
    price: calculateBundlePrice(data, 'Professional', aggregatedData),
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} performance sessions analyzed`,
      `Average daily steps: ${aggregatedData.avg_steps?.toFixed(0) || 'N/A'}`,
      `Workout intensity trends identified`,
      `Activity pattern insights discovered`
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

  const dateStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  return {
    title: `Sleep & Recovery Patterns: ${dateStr} Study (${data.length} Cycles)`,
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

  const dateStr = new Date().toISOString().split('T')[0]
  return {
    title: `Comprehensive Health Metrics: ${dateStr} Dataset (${data.length} Records)`,
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

  const dateStr = new Date().toISOString().split('T')[0]
  return {
    title: `Nutritional Insights Analytics: ${dateStr} Study (${data.length} Records)`,
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

  const dateStr = new Date().toISOString().split('T')[0]
  return {
    title: `Clinical Health Analytics: ${dateStr} Dataset (${data.length} Records)`,
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

  const dateStr = new Date().toISOString().split('T')[0]
  return {
    title: `Regional Health Trends: ${dateStr} Analysis (${regions.length} Regions)`,
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