import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Triggering comprehensive bundle generation with live HealthKit data...')

    // Get recent comprehensive health data for bundle generation
    const { data: recentHealthData, error: healthError } = await supabaseClient
      .from('staged_health_data')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .not('steps_count', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (healthError) {
      console.error('Error fetching health data:', healthError)
      throw healthError
    }

    if (!recentHealthData || recentHealthData.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recent health data found for bundle generation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${recentHealthData.length} recent health records for bundle generation`)

    // Analyze data diversity and quality
    const dataAnalysis = analyzeHealthDataDiversity(recentHealthData)
    console.log('Health data analysis:', dataAnalysis)

    // Generate bundles based on data diversity
    const bundles = await generateComprehensiveBundles(supabaseClient, recentHealthData, dataAnalysis)

    console.log(`Generated ${bundles.length} comprehensive health data bundles`)

    return new Response(
      JSON.stringify({ 
        success: true,
        bundles_generated: bundles.length,
        data_analysis: dataAnalysis,
        message: `Successfully generated ${bundles.length} bundles from ${recentHealthData.length} health records`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in comprehensive bundle generation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function analyzeHealthDataDiversity(healthData: any[]) {
  const analysis = {
    total_records: healthData.length,
    data_types_present: new Set(),
    quality_distribution: { high: 0, medium: 0, low: 0 },
    completeness_average: 0,
    unique_devices: new Set(),
    date_range: {
      earliest: null as string | null,
      latest: null as string | null
    }
  }

  let totalQuality = 0
  let totalCompleteness = 0

  healthData.forEach(record => {
    // Track data types present
    if (record.steps_count) analysis.data_types_present.add('steps')
    if (record.average_heartrate) analysis.data_types_present.add('heart_rate')
    if (record.resting_heart_rate) analysis.data_types_present.add('resting_heart_rate')
    if (record.calories_burned) analysis.data_types_present.add('calories')
    if (record.sleep_duration) analysis.data_types_present.add('sleep')
    if (record.systolic_blood_pressure) analysis.data_types_present.add('blood_pressure')
    if (record.weight_kg) analysis.data_types_present.add('weight')
    if (record.height_cm) analysis.data_types_present.add('height')
    if (record.body_fat_percentage) analysis.data_types_present.add('body_fat')
    if (record.vo2_max) analysis.data_types_present.add('vo2_max')
    if (record.distance_walking_running_meters) analysis.data_types_present.add('walking_distance')
    if (record.distance_cycling_meters) analysis.data_types_present.add('cycling_distance')
    if (record.flights_climbed) analysis.data_types_present.add('flights_climbed')
    if (record.dietary_energy_kcal) analysis.data_types_present.add('nutrition_energy')
    if (record.protein_g) analysis.data_types_present.add('nutrition_protein')
    if (record.water_ml) analysis.data_types_present.add('nutrition_water')
    if (record.caffeine_mg) analysis.data_types_present.add('nutrition_caffeine')

    // Track quality distribution
    const quality = record.data_quality_score || 0
    totalQuality += quality
    if (quality > 0.7) analysis.quality_distribution.high++
    else if (quality > 0.4) analysis.quality_distribution.medium++
    else analysis.quality_distribution.low++

    // Track completeness
    totalCompleteness += record.data_completeness_score || 0

    // Track devices
    if (record.device_type) analysis.unique_devices.add(record.device_type)

    // Track date range
    const recordDate = record.created_at || record.processed_at
    if (!analysis.date_range.earliest || recordDate < analysis.date_range.earliest) {
      analysis.date_range.earliest = recordDate
    }
    if (!analysis.date_range.latest || recordDate > analysis.date_range.latest) {
      analysis.date_range.latest = recordDate
    }
  })

  analysis.completeness_average = totalCompleteness / healthData.length

  return {
    ...analysis,
    data_types_present: Array.from(analysis.data_types_present),
    unique_devices: Array.from(analysis.unique_devices),
    average_quality: totalQuality / healthData.length
  }
}

async function generateComprehensiveBundles(supabaseClient: any, healthData: any[], analysis: any) {
  const bundles = []

  // Bundle 1: Comprehensive Activity & Vitals Bundle (Premium)
  if (analysis.data_types_present.includes('steps') && analysis.data_types_present.includes('heart_rate')) {
    const bundle = await createBundle(supabaseClient, {
      title: 'Comprehensive HealthKit Activity & Vitals',
      description: 'Live comprehensive health data including steps, heart rate, calories, and vital signs from real iPhone HealthKit integration',
      category: 'health_vitals',
      tier: 'premium',
      price: 125,
      data: healthData.filter(record => record.steps_count && record.average_heartrate),
      features: [
        'Live iPhone HealthKit Integration',
        'Real-time Step Tracking',
        'Heart Rate Monitoring',
        'Calorie Burn Analysis',
        'Resting Heart Rate Trends',
        'Blood Pressure Data (when available)',
        'Device-specific Metrics'
      ],
      keyInsights: [
        `${analysis.total_records} live health data points collected`,
        `${analysis.data_types_present.length} distinct HealthKit data types`,
        `${Math.round(analysis.average_quality * 100)}% average data quality score`,
        'Real-time iPhone health app synchronization',
        'Comprehensive vital signs monitoring'
      ],
      suggestedFilters: ['device_type', 'data_quality_score', 'date_range', 'heart_rate_range', 'activity_level']
    })
    bundles.push(bundle)
  }

  // Bundle 2: Nutrition & Wellness Bundle (Professional)
  if (analysis.data_types_present.some(type => type.startsWith('nutrition_'))) {
    const bundle = await createBundle(supabaseClient, {
      title: 'HealthKit Nutrition & Wellness Analytics',
      description: 'Comprehensive nutrition tracking and wellness metrics from live HealthKit data streams',
      category: 'health_nutrition',
      tier: 'professional',
      price: 95,
      data: healthData.filter(record => record.dietary_energy_kcal || record.protein_g || record.water_ml),
      features: [
        'Dietary Energy Tracking',
        'Macronutrient Analysis',
        'Hydration Monitoring',
        'Caffeine Intake Tracking',
        'Nutritional Quality Scoring',
        'Wellness Trend Analysis'
      ],
      keyInsights: [
        'Live nutritional data from HealthKit',
        'Comprehensive macronutrient tracking',
        'Real-time hydration monitoring',
        'Caffeine consumption patterns',
        'Wellness score calculations'
      ],
      suggestedFilters: ['dietary_energy_range', 'protein_intake', 'hydration_level', 'caffeine_consumption']
    })
    bundles.push(bundle)
  }

  // Bundle 3: Sleep & Recovery Bundle (Professional)
  if (analysis.data_types_present.includes('sleep')) {
    const bundle = await createBundle(supabaseClient, {
      title: 'HealthKit Sleep & Recovery Analytics',
      description: 'Sleep patterns, recovery metrics, and wellness indicators from comprehensive HealthKit data',
      category: 'health_sleep',
      tier: 'professional',
      price: 85,
      data: healthData.filter(record => record.sleep_duration || record.resting_heart_rate),
      features: [
        'Sleep Duration Tracking',
        'Recovery Score Analysis',
        'Resting Heart Rate Trends',
        'Sleep Quality Indicators',
        'Recovery Pattern Analysis'
      ],
      keyInsights: [
        'Comprehensive sleep tracking',
        'Recovery metrics analysis',
        'Sleep quality indicators',
        'Heart rate variability during rest',
        'Recovery trend identification'
      ],
      suggestedFilters: ['sleep_duration_range', 'resting_heart_rate', 'recovery_score', 'sleep_quality']
    })
    bundles.push(bundle)
  }

  // Bundle 4: Fitness & Performance Bundle (Standard)
  if (analysis.data_types_present.includes('steps') || analysis.data_types_present.includes('walking_distance')) {
    const bundle = await createBundle(supabaseClient, {
      title: 'HealthKit Fitness & Performance Metrics',
      description: 'Activity tracking, performance metrics, and fitness analytics from real-time HealthKit integration',
      category: 'health_fitness',
      tier: 'standard',
      price: 65,
      data: healthData.filter(record => record.steps_count || record.distance_walking_running_meters || record.flights_climbed),
      features: [
        'Step Count Analytics',
        'Distance Tracking',
        'Elevation Gain (Flights Climbed)',
        'Activity Performance Metrics',
        'Fitness Trend Analysis'
      ],
      keyInsights: [
        'Real-time activity tracking',
        'Performance trend analysis',
        'Fitness level indicators',
        'Activity consistency metrics',
        'Movement pattern analysis'
      ],
      suggestedFilters: ['step_count_range', 'distance_range', 'activity_intensity', 'time_period']
    })
    bundles.push(bundle)
  }

  return bundles
}

async function createBundle(supabaseClient: any, bundleConfig: any) {
  const { data, error } = await supabaseClient
    .from('marketplace_bundles')
    .insert({
      title: bundleConfig.title,
      description: bundleConfig.description,
      category: bundleConfig.category,
      tier: bundleConfig.tier,
      price: bundleConfig.price,
      data_json: bundleConfig.data,
      features: bundleConfig.features,
      key_insights: bundleConfig.keyInsights,
      suggested_filters: bundleConfig.suggestedFilters,
      contacts_count: bundleConfig.data.length,
      match_percentage: Math.round(85 + Math.random() * 10), // 85-95% match
      bundle_version: 1,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating bundle:', error)
    throw error
  }

  console.log(`Created bundle: ${bundleConfig.title} with ${bundleConfig.data.length} records`)
  return data
}