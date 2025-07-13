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

    const requestBody = await req.json().catch(() => ({}));
    const { trigger = 'nightly', force_process = false } = requestBody;
    
    console.log(`Starting ${trigger} health data bundle creation...`)

    // Get staged health data based on trigger type
    let healthDataQuery = supabaseClient.from('staged_health_data').select('*');
    
    if (trigger === 'manual_engage' || force_process) {
      // For manual engagement, get all available data
      healthDataQuery = healthDataQuery.order('created_at', { ascending: false }).limit(1000);
    } else {
      // For scheduled runs, get data from last 24 hours
      healthDataQuery = healthDataQuery.gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
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

  // Urban Wellness Dynamics Bundle
  const urbanData = healthData.filter(d => d.anonymized_location_zone?.includes('ZONE_'))
  if (urbanData.length > 5) { // Lower threshold for manual engagement
    bundles.push(createUrbanWellnessBundle(urbanData))
  }

  // Activity Performance Analytics Bundle
  const performanceData = healthData.filter(d => d.workout_intensity && d.steps_count)
  if (performanceData.length > 3) { // Lower threshold
    bundles.push(createPerformanceAnalyticsBundle(performanceData))
  }

  // Sleep & Recovery Insights Bundle
  const sleepData = healthData.filter(d => d.sleep_duration || d.sleep_quality_score)
  if (sleepData.length > 3) { // Lower threshold
    bundles.push(createSleepRecoveryBundle(sleepData))
  }

  // Regional Health Trends Bundle
  const regionalData = groupByRegion(healthData)
  if (Object.keys(regionalData).length > 1) { // Lower threshold
    bundles.push(createRegionalTrendsBundle(regionalData))
  }

  return bundles
}

function createUrbanWellnessBundle(data: any[]) {
  const aggregatedData = {
    total_activities: data.length,
    avg_workout_intensity: calculateAverage(data, 'workout_intensity'),
    avg_steps_per_day: calculateAverage(data, 'steps_count'),
    avg_sleep_quality: calculateAverage(data, 'sleep_quality_score'),
    stress_distribution: calculateStressDistribution(data),
    activity_type_breakdown: calculateActivityBreakdown(data),
    zone_coverage: [...new Set(data.map(d => d.anonymized_location_zone))].length
  }

  const dateStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  return {
    title: `Urban Wellness Dynamics: ${dateStr} Health Trends (${data.length} Records)`,
    description: 'Comprehensive anonymized view of urban population activity and wellness trends',
    category: 'Health & Fitness',
    tier: 'Enterprise',
    price: Math.floor(Math.random() * 3000) + 2000,
    contacts_count: data.length,
    data_json: aggregatedData,
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
    price: Math.floor(Math.random() * 2000) + 1500,
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
    price: Math.floor(Math.random() * 1800) + 1200,
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

function createRegionalTrendsBundle(regionalData: any) {
  const regions = Object.keys(regionalData)
  const totalRecords = Object.values(regionalData).reduce((sum: number, data: any) => sum + data.length, 0)

  const aggregatedData = {
    regions_covered: regions.length,
    total_records: totalRecords,
    regional_comparisons: calculateRegionalComparisons(regionalData),
    trend_analysis: calculateTrendAnalysis(regionalData),
    demographic_insights: calculateDemographicInsights(regionalData)
  }

  const dateStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  return {
    title: `Regional Health Trends: ${dateStr} Analysis (${regions.length} Regions)`,
    description: 'Cross-regional comparison of health trends, activity patterns, and wellness metrics',
    category: 'Market Research',
    tier: 'Enterprise',
    price: Math.floor(Math.random() * 4000) + 3000,
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

// Helper functions
function calculateAverage(data: any[], field: string): number | null {
  const values = data.map(d => d[field]).filter(v => v !== null && v !== undefined && !isNaN(v))
  return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : null
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