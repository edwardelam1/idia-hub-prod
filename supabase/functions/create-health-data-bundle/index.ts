
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

    console.log('Starting nightly health data bundle creation...')

    // Get new staged health data from the last 24 hours
    const { data: healthData, error: dataError } = await supabaseClient
      .from('staged_health_data')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (dataError) {
      console.error('Error fetching health data:', dataError)
      throw dataError
    }

    if (!healthData || healthData.length === 0) {
      console.log('No new health data to process')
      return new Response(
        JSON.stringify({ message: 'No new data to bundle' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing ${healthData.length} health records`)

    // Generate bundles by category
    const bundles = await generateHealthBundles(healthData)

    // Insert bundles into marketplace
    const bundleResults = []
    for (const bundle of bundles) {
      const { data: newBundle, error: bundleError } = await supabaseClient
        .from('marketplace_bundles')
        .insert(bundle)
        .select()

      if (bundleError) {
        console.error('Error creating bundle:', bundleError)
        continue
      }

      bundleResults.push(newBundle[0])

      // Log bundle generation
      await supabaseClient
        .from('bundle_generation_logs')
        .insert({
          bundle_id: newBundle[0].bundle_id,
          generation_type: 'nightly',
          data_source_count: healthData.length,
          quality_metrics: {
            avg_quality_score: calculateAverageQuality(healthData),
            data_completeness: calculateDataCompleteness(healthData),
            geographic_coverage: calculateGeographicCoverage(healthData)
          }
        })
    }

    console.log(`Successfully created ${bundleResults.length} bundles`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        bundlesCreated: bundleResults.length,
        bundles: bundleResults.map(b => ({ id: b.bundle_id, title: b.title }))
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
  if (urbanData.length > 100) {
    bundles.push(createUrbanWellnessBundle(urbanData))
  }

  // Activity Performance Analytics Bundle
  const performanceData = healthData.filter(d => d.workout_intensity && d.recovery_score)
  if (performanceData.length > 50) {
    bundles.push(createPerformanceAnalyticsBundle(performanceData))
  }

  // Sleep & Recovery Insights Bundle
  const sleepData = healthData.filter(d => d.sleep_duration && d.sleep_quality_score)
  if (sleepData.length > 75) {
    bundles.push(createSleepRecoveryBundle(sleepData))
  }

  // Regional Health Trends Bundle
  const regionalData = groupByRegion(healthData)
  if (Object.keys(regionalData).length > 3) {
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

  return {
    title: `Urban Wellness Dynamics: Aggregated Activity & Health Trends`,
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
    avg_recovery: calculateAverage(data, 'recovery_score'),
    performance_correlation: calculatePerformanceCorrelation(data),
    intensity_distribution: calculateIntensityDistribution(data),
    recovery_patterns: calculateRecoveryPatterns(data)
  }

  return {
    title: 'Athletic Performance & Recovery Analytics',
    description: 'Advanced metrics on workout intensity, recovery patterns, and performance optimization',
    category: 'Sports & Performance',
    tier: 'Professional',
    price: Math.floor(Math.random() * 2000) + 1500,
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} performance sessions analyzed`,
      `Intensity-Recovery correlation: ${aggregatedData.performance_correlation?.toFixed(2)}`,
      `Optimal recovery patterns identified`,
      `Peak performance indicators mapped`
    ],
    features: ['Performance Metrics', 'Recovery Analysis', 'Correlation Studies', 'Optimization Insights'],
    suggested_filters: ['Intensity Range', 'Recovery Score', 'Activity Duration', 'Performance Tier']
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
    title: 'Sleep Quality & Recovery Patterns Study',
    description: 'Comprehensive analysis of sleep patterns, quality metrics, and recovery correlations',
    category: 'Health & Wellness',
    tier: 'Professional',
    price: Math.floor(Math.random() * 1800) + 1200,
    contacts_count: data.length,
    data_json: aggregatedData,
    key_insights: [
      `${data.length} sleep cycles analyzed`,
      `Average sleep quality: ${aggregatedData.avg_sleep_quality?.toFixed(1)}/10`,
      `Sleep-performance correlation identified`,
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

  return {
    title: 'Regional Health & Wellness Trends Analysis',
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
  const values = data.map(d => d[field]).filter(v => v !== null && v !== undefined)
  return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : null
}

function calculateStressDistribution(data: any[]) {
  const stressLevels = data.map(d => d.stress_level).filter(s => s !== null)
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
  // Simple correlation between intensity and recovery
  const pairs = data.map(d => [d.workout_intensity, d.recovery_score]).filter(p => p[0] && p[1])
  if (pairs.length < 2) return 0
  
  const n = pairs.length
  const sumX = pairs.reduce((sum, p) => sum + p[0], 0)
  const sumY = pairs.reduce((sum, p) => sum + p[1], 0)
  const sumXY = pairs.reduce((sum, p) => sum + p[0] * p[1], 0)
  const sumX2 = pairs.reduce((sum, p) => sum + p[0] * p[0], 0)
  const sumY2 = pairs.reduce((sum, p) => sum + p[1] * p[1], 0)
  
  const correlation = (n * sumXY - sumX * sumY) / Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  return isNaN(correlation) ? 0 : correlation
}

function calculateIntensityDistribution(data: any[]) {
  const intensities = data.map(d => d.workout_intensity).filter(i => i !== null)
  return {
    low: intensities.filter(i => i <= 30).length,
    moderate: intensities.filter(i => i > 30 && i <= 70).length,
    high: intensities.filter(i => i > 70).length
  }
}

function calculateRecoveryPatterns(data: any[]) {
  const recoveryScores = data.map(d => d.recovery_score).filter(r => r !== null)
  return {
    poor: recoveryScores.filter(r => r <= 30).length,
    fair: recoveryScores.filter(r => r > 30 && r <= 70).length,
    excellent: recoveryScores.filter(r => r > 70).length
  }
}

function calculateSleepActivityCorrelation(data: any[]): number {
  const pairs = data.map(d => [d.sleep_quality_score, d.workout_intensity]).filter(p => p[0] && p[1])
  if (pairs.length < 2) return 0
  
  // Simple correlation calculation
  const n = pairs.length
  const sumX = pairs.reduce((sum, p) => sum + p[0], 0)
  const sumY = pairs.reduce((sum, p) => sum + p[1], 0)
  const correlation = sumX / n / (sumY / n)
  return Math.min(Math.max(correlation, -1), 1)
}

function calculateSleepQualityDistribution(data: any[]) {
  const qualities = data.map(d => d.sleep_quality_score).filter(q => q !== null)
  return {
    poor: qualities.filter(q => q <= 3).length,
    fair: qualities.filter(q => q > 3 && q <= 7).length,
    excellent: qualities.filter(q => q > 7).length
  }
}

function calculateRecoveryInsights(data: any[]) {
  return {
    avg_recovery_time: calculateAverage(data, 'recovery_score'),
    sleep_recovery_correlation: calculateSleepActivityCorrelation(data),
    optimal_sleep_duration: calculateOptimalSleepDuration(data)
  }
}

function calculateOptimalSleepDuration(data: any[]): number | null {
  const sleepData = data.filter(d => d.sleep_duration && d.sleep_quality_score)
  if (sleepData.length === 0) return null
  
  // Find sleep duration that correlates with highest quality scores
  const optimalRange = sleepData
    .filter(d => d.sleep_quality_score >= 8)
    .map(d => d.sleep_duration)
  
  return optimalRange.length > 0 ? 
    optimalRange.reduce((sum, dur) => sum + dur, 0) / optimalRange.length : null
}

function calculateRegionalComparisons(regionalData: any) {
  const comparisons: { [key: string]: any } = {}
  
  Object.entries(regionalData).forEach(([region, data]: [string, any]) => {
    comparisons[region] = {
      activity_count: data.length,
      avg_intensity: calculateAverage(data, 'workout_intensity'),
      avg_sleep_quality: calculateAverage(data, 'sleep_quality_score'),
      dominant_activity: getMostCommonActivity(data)
    }
  })
  
  return comparisons
}

function calculateTrendAnalysis(regionalData: any) {
  // Simplified trend analysis
  return {
    growth_regions: Object.keys(regionalData).filter(region => regionalData[region].length > 50),
    emerging_activities: getEmergingActivities(regionalData),
    health_indicators: getHealthIndicators(regionalData)
  }
}

function calculateDemographicInsights(regionalData: any) {
  return {
    region_diversity: Object.keys(regionalData).length,
    activity_diversity: calculateActivityDiversity(regionalData),
    health_score_variance: calculateHealthScoreVariance(regionalData)
  }
}

function getMostCommonActivity(data: any[]): string {
  const activities: { [key: string]: number } = {}
  data.forEach(d => {
    activities[d.activity_type] = (activities[d.activity_type] || 0) + 1
  })
  
  return Object.entries(activities).reduce((a, b) => activities[a[0]] > activities[b[0]] ? a : b)[0] || 'Unknown'
}

function getEmergingActivities(regionalData: any): string[] {
  const allActivities = new Set<string>()
  Object.values(regionalData).forEach((data: any) => {
    data.forEach((d: any) => allActivities.add(d.activity_type))
  })
  return Array.from(allActivities).slice(0, 5)
}

function getHealthIndicators(regionalData: any) {
  const allData = Object.values(regionalData).flat()
  return {
    avg_wellness_score: calculateAverage(allData, 'data_quality_score'),
    activity_participation: allData.length,
    health_engagement: calculateAverage(allData, 'workout_intensity')
  }
}

function calculateActivityDiversity(regionalData: any): number {
  const allActivities = new Set<string>()
  Object.values(regionalData).forEach((data: any) => {
    data.forEach((d: any) => allActivities.add(d.activity_type))
  })
  return allActivities.size
}

function calculateHealthScoreVariance(regionalData: any): number {
  const allScores = Object.values(regionalData)
    .flat()
    .map((d: any) => d.data_quality_score)
    .filter(s => s !== null)
  
  if (allScores.length === 0) return 0
  
  const mean = allScores.reduce((sum, score) => sum + score, 0) / allScores.length
  const variance = allScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / allScores.length
  return variance
}

function calculateAverageQuality(data: any[]): number {
  return calculateAverage(data, 'data_quality_score') || 0
}

function calculateDataCompleteness(data: any[]): number {
  const totalFields = 15 // Number of health data fields we track
  const completeness = data.map(d => {
    let filledFields = 0
    if (d.average_heartrate) filledFields++
    if (d.sleep_duration) filledFields++
    if (d.workout_intensity) filledFields++
    if (d.recovery_score) filledFields++
    if (d.steps_count) filledFields++
    if (d.stress_level) filledFields++
    if (d.elevation_gain_meters) filledFields++
    if (d.distance_meters) filledFields++
    if (d.duration_seconds) filledFields++
    if (d.calories_burned) filledFields++
    if (d.sleep_quality_score) filledFields++
    if (d.resting_heart_rate) filledFields++
    if (d.max_heartrate) filledFields++
    if (d.average_speed_mps) filledFields++
    if (d.anonymized_location_zone) filledFields++
    
    return filledFields / totalFields
  })
  
  return completeness.reduce((sum, comp) => sum + comp, 0) / completeness.length
}

function calculateGeographicCoverage(data: any[]): number {
  const uniqueZones = new Set(data.map(d => d.anonymized_location_zone).filter(zone => zone))
  return uniqueZones.size
}
