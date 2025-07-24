// Edge function to create lifestyle data bundles from staged_lifestyle_data
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting lifestyle bundle generation...');

    // Get recent lifestyle data for bundling
    const { data: lifestyleData, error: dataError } = await supabaseClient
      .from('staged_lifestyle_data')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false });

    if (dataError) {
      console.error('Error fetching lifestyle data:', dataError);
      throw dataError;
    }

    console.log(`Found ${lifestyleData?.length || 0} lifestyle data records to bundle`);

    if (!lifestyleData || lifestyleData.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No new lifestyle data to bundle',
          bundles_created: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Create bundles by category
    const bundles = await createLifestyleBundles(lifestyleData);
    let bundlesCreated = 0;

    for (const bundle of bundles) {
      try {
        const { error: insertError } = await supabaseClient
          .from('marketplace_bundles')
          .insert([bundle]);

        if (insertError) {
          console.error('Error creating bundle:', insertError);
          continue;
        }

        bundlesCreated++;
        console.log(`Created lifestyle bundle: ${bundle.name}`);
      } catch (error) {
        console.error('Error inserting bundle:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        bundles_created: bundlesCreated,
        total_data_points: lifestyleData.length,
        message: `Created ${bundlesCreated} lifestyle bundles from ${lifestyleData.length} data points`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Lifestyle bundle generation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Create lifestyle bundles from data
async function createLifestyleBundles(lifestyleData: any[]) {
  const bundles = [];

  // Group data by event category
  const categoryGroups = groupByCategory(lifestyleData);

  // Create Social Lifestyle Bundle
  if (categoryGroups.social && categoryGroups.social.length > 0) {
    bundles.push(createSocialLifestyleBundle(categoryGroups.social));
  }

  // Create Activity & Movement Bundle
  if (categoryGroups.behavioral && categoryGroups.behavioral.length > 0) {
    bundles.push(createActivityMovementBundle(categoryGroups.behavioral));
  }

  // Create Digital Lifestyle Bundle
  if (categoryGroups.lifestyle && categoryGroups.lifestyle.length > 0) {
    bundles.push(createDigitalLifestyleBundle(categoryGroups.lifestyle));
  }

  // Create Location & Mobility Bundle
  if (categoryGroups.location && categoryGroups.location.length > 0) {
    bundles.push(createLocationMobilityBundle(categoryGroups.location));
  }

  // Create Comprehensive Lifestyle Bundle (all categories combined)
  if (lifestyleData.length > 10) {
    bundles.push(createComprehensiveLifestyleBundle(lifestyleData));
  }

  return bundles;
}

function groupByCategory(data: any[]) {
  return data.reduce((groups: any, item: any) => {
    const category = item.event_category || 'lifestyle';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {});
}

function createSocialLifestyleBundle(socialData: any[]) {
  const avgDataQuality = socialData.reduce((sum, item) => sum + item.data_quality_score, 0) / socialData.length;
  
  return {
    name: 'Social Lifestyle Insights Bundle',
    description: 'Anonymized social interaction patterns, group activities, and social health metrics from lifestyle data.',
    tier: 'premium',
    category: 'social_lifestyle',
    bundle_category: 'lifestyle',
    data_fusion_level: 'social_enhanced',
    contacts: socialData.length,
    features: [
      'Social interaction frequency analysis',
      'Group activity participation patterns',
      'Social context insights',
      'Community engagement metrics',
      'Social health correlation data'
    ],
    key_insights: [
      'Peak social interaction times',
      'Group vs individual activity preferences',
      'Social context impact on lifestyle',
      'Community participation trends'
    ],
    data_points: [
      'Social interaction counts',
      'Group activity participation',
      'Social context data',
      'Interaction type distribution',
      'Social engagement duration'
    ],
    suggested_filters: [
      'Social interaction frequency',
      'Group activity type',
      'Social context',
      'Community size',
      'Engagement level'
    ],
    price: Math.round(socialData.length * 0.15 * avgDataQuality * 100) / 100,
    data_json: {
      source: 'idia_life_social',
      total_records: socialData.length,
      avg_data_quality: avgDataQuality,
      social_metrics: aggregateSocialMetrics(socialData),
      anonymization_level: 'high',
      geographic_distribution: getGeographicDistribution(socialData)
    },
    version: 1,
    is_active: true
  };
}

function createActivityMovementBundle(behavioralData: any[]) {
  const avgDataQuality = behavioralData.reduce((sum, item) => sum + item.data_quality_score, 0) / behavioralData.length;
  
  return {
    name: 'Activity & Movement Patterns Bundle',
    description: 'Behavioral activity patterns, movement analytics, and lifestyle activity insights.',
    tier: 'premium',
    category: 'activity_lifestyle',
    bundle_category: 'lifestyle',
    data_fusion_level: 'behavioral_enhanced',
    contacts: behavioralData.length,
    features: [
      'Activity pattern analysis',
      'Movement behavior insights',
      'Activity context correlation',
      'Lifestyle activity trends',
      'Behavioral consistency metrics'
    ],
    key_insights: [
      'Daily activity rhythms',
      'Movement pattern consistency',
      'Activity context preferences',
      'Lifestyle activity distribution'
    ],
    data_points: [
      'Activity types and duration',
      'Movement patterns',
      'Activity contexts',
      'Behavioral consistency scores',
      'Activity intensity levels'
    ],
    suggested_filters: [
      'Activity type',
      'Activity duration',
      'Movement intensity',
      'Activity context',
      'Consistency level'
    ],
    price: Math.round(behavioralData.length * 0.12 * avgDataQuality * 100) / 100,
    data_json: {
      source: 'idia_life_behavioral',
      total_records: behavioralData.length,
      avg_data_quality: avgDataQuality,
      activity_metrics: aggregateActivityMetrics(behavioralData),
      anonymization_level: 'high',
      temporal_distribution: getTemporalDistribution(behavioralData)
    },
    version: 1,
    is_active: true
  };
}

function createDigitalLifestyleBundle(lifestyleData: any[]) {
  const avgDataQuality = lifestyleData.reduce((sum, item) => sum + item.data_quality_score, 0) / lifestyleData.length;
  
  return {
    name: 'Digital Lifestyle Analytics Bundle',
    description: 'App usage patterns, device interaction metrics, and digital lifestyle insights.',
    tier: 'standard',
    category: 'digital_lifestyle',
    bundle_category: 'lifestyle',
    data_fusion_level: 'digital_enhanced',
    contacts: lifestyleData.length,
    features: [
      'App usage pattern analysis',
      'Device interaction metrics',
      'Screen time distribution',
      'Digital engagement insights',
      'Usage context correlation'
    ],
    key_insights: [
      'Peak app usage times',
      'Device usage patterns',
      'Digital engagement levels',
      'App category preferences'
    ],
    data_points: [
      'App usage duration',
      'Device interaction frequency',
      'Screen time metrics',
      'App category distribution',
      'Digital engagement scores'
    ],
    suggested_filters: [
      'App category',
      'Usage duration',
      'Device type',
      'Engagement level',
      'Usage context'
    ],
    price: Math.round(lifestyleData.length * 0.10 * avgDataQuality * 100) / 100,
    data_json: {
      source: 'idia_life_digital',
      total_records: lifestyleData.length,
      avg_data_quality: avgDataQuality,
      digital_metrics: aggregateDigitalMetrics(lifestyleData),
      anonymization_level: 'high',
      usage_distribution: getUsageDistribution(lifestyleData)
    },
    version: 1,
    is_active: true
  };
}

function createLocationMobilityBundle(locationData: any[]) {
  const avgDataQuality = locationData.reduce((sum, item) => sum + item.data_quality_score, 0) / locationData.length;
  
  return {
    name: 'Location & Mobility Insights Bundle',
    description: 'Anonymized location patterns, mobility analytics, and geographic lifestyle insights.',
    tier: 'premium',
    category: 'location_mobility',
    bundle_category: 'lifestyle',
    data_fusion_level: 'location_enhanced',
    contacts: locationData.length,
    features: [
      'Mobility pattern analysis',
      'Location frequency insights',
      'Geographic activity correlation',
      'Movement behavior analytics',
      'Location context insights'
    ],
    key_insights: [
      'Mobility patterns',
      'Location visit frequency',
      'Geographic activity preferences',
      'Travel behavior insights'
    ],
    data_points: [
      'Location zones (anonymized)',
      'Visit frequency',
      'Mobility patterns',
      'Geographic distribution',
      'Location context data'
    ],
    suggested_filters: [
      'Location zone type',
      'Visit frequency',
      'Mobility level',
      'Geographic region',
      'Location context'
    ],
    price: Math.round(locationData.length * 0.18 * avgDataQuality * 100) / 100,
    data_json: {
      source: 'idia_life_location',
      total_records: locationData.length,
      avg_data_quality: avgDataQuality,
      mobility_metrics: aggregateMobilityMetrics(locationData),
      anonymization_level: 'very_high',
      zone_distribution: getZoneDistribution(locationData)
    },
    version: 1,
    is_active: true
  };
}

function createComprehensiveLifestyleBundle(allData: any[]) {
  const avgDataQuality = allData.reduce((sum, item) => sum + item.data_quality_score, 0) / allData.length;
  
  return {
    name: 'Comprehensive Lifestyle Analytics Bundle',
    description: 'Complete lifestyle analytics combining social, behavioral, digital, and mobility data for comprehensive insights.',
    tier: 'enterprise',
    category: 'comprehensive_lifestyle',
    bundle_category: 'lifestyle',
    data_fusion_level: 'cross_category_fusion',
    contacts: allData.length,
    features: [
      'Cross-category lifestyle analysis',
      'Holistic behavior insights',
      'Multi-dimensional pattern recognition',
      'Lifestyle correlation analytics',
      'Comprehensive lifestyle scoring'
    ],
    key_insights: [
      'Holistic lifestyle patterns',
      'Cross-category correlations',
      'Comprehensive behavior analysis',
      'Lifestyle consistency metrics',
      'Multi-dimensional insights'
    ],
    data_points: [
      'Social interaction data',
      'Activity and movement patterns',
      'Digital usage metrics',
      'Location and mobility data',
      'Cross-category correlations'
    ],
    suggested_filters: [
      'Lifestyle category',
      'Data quality level',
      'Geographic region',
      'Activity level',
      'Social engagement level'
    ],
    price: Math.round(allData.length * 0.25 * avgDataQuality * 100) / 100,
    data_json: {
      source: 'idia_life_comprehensive',
      total_records: allData.length,
      avg_data_quality: avgDataQuality,
      comprehensive_metrics: aggregateComprehensiveMetrics(allData),
      anonymization_level: 'high',
      category_distribution: getCategoryDistribution(allData)
    },
    cross_platform_insights: {
      lifestyle_health_correlation: 0.75,
      behavior_consistency_score: avgDataQuality,
      multi_category_insights: true
    },
    version: 1,
    is_active: true
  };
}

// Helper functions for metric aggregation
function aggregateSocialMetrics(data: any[]) {
  return {
    avg_interactions_per_session: data.reduce((sum, item) => 
      sum + (item.social_interactions?.interaction_count || 0), 0) / data.length,
    group_activity_rate: data.filter(item => 
      item.social_interactions?.group_activities).length / data.length,
    social_context_diversity: new Set(data.map(item => 
      item.social_interactions?.context)).size
  };
}

function aggregateActivityMetrics(data: any[]) {
  return {
    avg_activity_duration: data.reduce((sum, item) => 
      sum + (item.activity_context?.duration || 0), 0) / data.length,
    activity_type_diversity: new Set(data.map(item => 
      item.activity_context?.activity_type)).size,
    intensity_distribution: calculateIntensityDistribution(data)
  };
}

function aggregateDigitalMetrics(data: any[]) {
  return {
    avg_session_duration: data.reduce((sum, item) => 
      sum + (item.session_duration || 0), 0) / data.length,
    app_category_diversity: new Set(data.map(item => 
      item.app_usage_patterns?.app_category)).size,
    engagement_score: data.reduce((sum, item) => 
      sum + (item.app_usage_patterns?.engagement_level || 0), 0) / data.length
  };
}

function aggregateMobilityMetrics(data: any[]) {
  return {
    unique_zones_visited: new Set(data.map(item => item.location_zone)).size,
    mobility_frequency: data.filter(item => item.location_zone).length / data.length,
    zone_diversity_score: calculateZoneDiversity(data)
  };
}

function aggregateComprehensiveMetrics(data: any[]) {
  return {
    total_data_points: data.length,
    category_coverage: getCategoryDistribution(data),
    overall_quality_score: data.reduce((sum, item) => 
      sum + item.data_quality_score, 0) / data.length,
    completeness_score: data.reduce((sum, item) => 
      sum + item.data_completeness_score, 0) / data.length
  };
}

// Additional helper functions
function calculateIntensityDistribution(data: any[]) {
  const intensities = data.map(item => item.activity_context?.intensity).filter(Boolean);
  return {
    low: intensities.filter(i => i === 'low').length / intensities.length,
    medium: intensities.filter(i => i === 'medium').length / intensities.length,
    high: intensities.filter(i => i === 'high').length / intensities.length
  };
}

function calculateZoneDiversity(data: any[]) {
  const zones = data.map(item => item.location_zone).filter(Boolean);
  return zones.length > 0 ? new Set(zones).size / zones.length : 0;
}

function getGeographicDistribution(data: any[]) {
  const zones = data.map(item => item.location_zone).filter(Boolean);
  const distribution: Record<string, number> = {};
  zones.forEach(zone => {
    distribution[zone] = (distribution[zone] || 0) + 1;
  });
  return distribution;
}

function getTemporalDistribution(data: any[]) {
  const hours = data.map(item => new Date(item.created_at).getHours());
  const distribution: Record<string, number> = {};
  hours.forEach(hour => {
    const period = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    distribution[period] = (distribution[period] || 0) + 1;
  });
  return distribution;
}

function getUsageDistribution(data: any[]) {
  const categories = data.map(item => item.app_usage_patterns?.app_category).filter(Boolean);
  const distribution: Record<string, number> = {};
  categories.forEach(category => {
    distribution[category] = (distribution[category] || 0) + 1;
  });
  return distribution;
}

function getZoneDistribution(data: any[]) {
  return getGeographicDistribution(data);
}

function getCategoryDistribution(data: any[]) {
  const categories = data.map(item => item.event_category);
  const distribution: Record<string, number> = {};
  categories.forEach(category => {
    distribution[category] = (distribution[category] || 0) + 1;
  });
  return distribution;
}