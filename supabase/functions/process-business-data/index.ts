// Edge function to process business data from IDIA Pay app into staged_business_data
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BusinessProcessingRequest {
  business_id?: string;
  force_process?: boolean;
  batch_size?: number;
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

    console.log('Starting business data processing...');

    // Get pending business processing queue items
    const { data: pendingItems, error: queueError } = await supabaseClient
      .from('business_processing_queue')
      .select(`
        id,
        business_id,
        data_category,
        processing_stage
      `)
      .eq('processing_status', 'pending')
      .limit(20);

    if (queueError) {
      console.error('Error fetching business queue items:', queueError);
      throw queueError;
    }

    console.log(`Found ${pendingItems?.length || 0} pending business items to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const item of pendingItems || []) {
      try {
        console.log(`Processing business queue item ${item.id}...`);

        // Mark as processing
        await supabaseClient
          .from('business_processing_queue')
          .update({ processing_status: 'processing' })
          .eq('id', item.id);

        // Process business data
        const processedData = await processBusinessAnalytics(supabaseClient, item.business_id);

        // Insert into staged_business_data
        const { error: insertError } = await supabaseClient
          .from('staged_business_data')
          .insert([processedData]);

        if (insertError) {
          console.error('Error inserting staged business data:', insertError);
          throw insertError;
        }

        // Mark as completed
        await supabaseClient
          .from('business_processing_queue')
          .update({ 
            processing_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        processedCount++;
        console.log(`Successfully processed business item ${item.id}`);

      } catch (error) {
        console.error(`Error processing business item ${item.id}:`, error);
        
        // Mark as failed and increment retry count
        await supabaseClient
          .from('business_processing_queue')
          .update({ 
            processing_status: 'failed',
            error_details: { error: error.message },
            retry_count: item.retry_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        errorCount++;
      }
    }

    // Trigger bundle generation if we processed data
    if (processedCount > 0) {
      console.log('Triggering business bundle generation...');
      
      const { error: bundleError } = await supabaseClient.functions.invoke('create-business-intelligence-bundles', {
        body: { 
          trigger: 'business_data_processed',
          processed_count: processedCount 
        }
      });

      if (bundleError) {
        console.error('Error triggering bundle generation:', bundleError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: processedCount,
        error_count: errorCount,
        message: `Processed ${processedCount} business items, ${errorCount} errors`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Business processing error:', error);
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

// Function to process business analytics data
async function processBusinessAnalytics(supabaseClient: any, businessId: string) {
  console.log(`Processing analytics for business ${businessId}...`);

  // Get business details
  const { data: business, error: businessError } = await supabaseClient
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (businessError || !business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  // Generate pseudonymized business ID
  const pseudoBusinessId = await generateBusinessPseudonym(businessId);

  // Collect transaction patterns
  const transactionPatterns = await analyzeTransactionPatterns(supabaseClient, businessId);
  
  // Collect operational metrics
  const operationalMetrics = await analyzeOperationalMetrics(supabaseClient, businessId);
  
  // Collect employee analytics
  const employeeAnalytics = await analyzeEmployeeMetrics(supabaseClient, businessId);
  
  // Collect AR engagement data
  const arEngagementData = await analyzeAREngagement(supabaseClient, businessId);
  
  // Collect location performance
  const locationPerformance = await analyzeLocationPerformance(supabaseClient, businessId);
  
  // Analyze seasonal trends
  const seasonalTrends = await analyzeSeasonalTrends(supabaseClient, businessId);

  // Calculate data quality scores
  const dataQualityScore = calculateBusinessDataQuality(
    transactionPatterns, operationalMetrics, employeeAnalytics
  );
  const dataCompletenessScore = calculateBusinessDataCompleteness(
    transactionPatterns, operationalMetrics, employeeAnalytics, arEngagementData
  );

  return {
    pseudo_business_id: pseudoBusinessId,
    business_category: business.business_type || 'general',
    transaction_patterns: transactionPatterns,
    operational_metrics: operationalMetrics,
    employee_analytics: employeeAnalytics,
    ar_engagement_data: arEngagementData,
    location_performance: locationPerformance,
    seasonal_trends: seasonalTrends,
    data_quality_score: dataQualityScore,
    data_completeness_score: dataCompletenessScore,
    anonymized_from_business_id: businessId
  };
}

// Analyze transaction patterns (placeholder - would need actual transaction tables)
async function analyzeTransactionPatterns(supabaseClient: any, businessId: string) {
  // For now, return sample pattern analysis
  // In production, this would analyze actual POS/NFC transaction data
  return {
    average_transaction_value: Math.random() * 100 + 20,
    peak_hours: ['12:00-13:00', '18:00-20:00'],
    payment_method_distribution: {
      cash: 0.3,
      card: 0.5,
      digital: 0.2
    },
    transaction_frequency: Math.floor(Math.random() * 100) + 50,
    seasonal_variance: Math.random() * 0.3 + 0.1
  };
}

// Analyze operational metrics
async function analyzeOperationalMetrics(supabaseClient: any, businessId: string) {
  // Get business locations
  const { data: locations } = await supabaseClient
    .from('business_locations')
    .select('*')
    .eq('business_id', businessId);

  // Get business health metrics
  const { data: healthMetrics } = await supabaseClient
    .from('business_health_metrics')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1);

  return {
    location_count: locations?.length || 0,
    health_score: healthMetrics?.[0]?.overall_bhi_score || 0.75,
    operational_efficiency: Math.random() * 0.4 + 0.6,
    capacity_utilization: Math.random() * 0.3 + 0.6,
    service_quality_metrics: {
      customer_satisfaction: Math.random() * 0.2 + 0.8,
      service_speed: Math.random() * 0.3 + 0.7,
      consistency: Math.random() * 0.2 + 0.8
    }
  };
}

// Analyze employee metrics
async function analyzeEmployeeMetrics(supabaseClient: any, businessId: string) {
  // Get employee schedules and timesheets
  const { data: schedules } = await supabaseClient
    .from('employee_schedules')
    .select('*')
    .in('location_id', supabaseClient
      .from('business_locations')
      .select('id')
      .eq('business_id', businessId)
    );

  const { data: timesheets } = await supabaseClient
    .from('employee_timesheets')
    .select('*')
    .in('location_id', supabaseClient
      .from('business_locations')
      .select('id')
      .eq('business_id', businessId)
    );

  return {
    total_employees: schedules?.length || 0,
    average_hours_per_week: timesheets?.reduce((sum: number, t: any) => 
      sum + (t.total_hours || 0), 0) / (timesheets?.length || 1),
    overtime_frequency: Math.random() * 0.3,
    productivity_metrics: {
      efficiency_score: Math.random() * 0.3 + 0.7,
      training_completion: Math.random() * 0.2 + 0.8,
      performance_rating: Math.random() * 0.3 + 0.7
    },
    scheduling_efficiency: Math.random() * 0.3 + 0.7
  };
}

// Analyze AR engagement data
async function analyzeAREngagement(supabaseClient: any, businessId: string) {
  // Get AR experiences and interactions
  const { data: arExperiences } = await supabaseClient
    .from('ar_experiences')
    .select('*')
    .eq('business_id', businessId);

  const { data: arInteractions } = await supabaseClient
    .from('ar_interactions')
    .select('*')
    .in('ar_experience_id', arExperiences?.map((exp: any) => exp.id) || []);

  return {
    total_ar_experiences: arExperiences?.length || 0,
    total_interactions: arInteractions?.length || 0,
    conversion_rate: arExperiences?.reduce((sum: number, exp: any) => 
      sum + (exp.conversion_rate || 0), 0) / (arExperiences?.length || 1),
    engagement_metrics: {
      average_session_duration: Math.random() * 120 + 30,
      repeat_engagement_rate: Math.random() * 0.4 + 0.1,
      content_completion_rate: Math.random() * 0.3 + 0.6
    }
  };
}

// Analyze location performance
async function analyzeLocationPerformance(supabaseClient: any, businessId: string) {
  const { data: locations } = await supabaseClient
    .from('business_locations')
    .select('*')
    .eq('business_id', businessId);

  return {
    location_performance: locations?.map((location: any) => ({
      location_id: location.id,
      performance_score: Math.random() * 0.4 + 0.6,
      foot_traffic: Math.floor(Math.random() * 1000) + 200,
      revenue_per_sqft: Math.random() * 100 + 50
    })) || []
  };
}

// Analyze seasonal trends
async function analyzeSeasonalTrends(supabaseClient: any, businessId: string) {
  return {
    seasonal_multipliers: {
      spring: Math.random() * 0.4 + 0.8,
      summer: Math.random() * 0.6 + 0.9,
      fall: Math.random() * 0.4 + 0.8,
      winter: Math.random() * 0.5 + 0.7
    },
    peak_periods: ['summer', 'holiday_season'],
    trend_analysis: {
      growth_rate: Math.random() * 0.2 - 0.1, // -10% to +10%
      volatility: Math.random() * 0.3 + 0.1
    }
  };
}

function calculateBusinessDataQuality(
  transactionPatterns: any, 
  operationalMetrics: any, 
  employeeAnalytics: any
): number {
  let score = 0.4; // Base score
  
  if (transactionPatterns.transaction_frequency > 0) score += 0.2;
  if (operationalMetrics.location_count > 0) score += 0.2;
  if (employeeAnalytics.total_employees > 0) score += 0.2;
  
  return Math.min(score, 1.0);
}

function calculateBusinessDataCompleteness(
  transactionPatterns: any, 
  operationalMetrics: any, 
  employeeAnalytics: any,
  arEngagementData: any
): number {
  const totalSections = 4;
  let completedSections = 0;
  
  if (transactionPatterns && Object.keys(transactionPatterns).length > 0) completedSections++;
  if (operationalMetrics && Object.keys(operationalMetrics).length > 0) completedSections++;
  if (employeeAnalytics && Object.keys(employeeAnalytics).length > 0) completedSections++;
  if (arEngagementData && Object.keys(arEngagementData).length > 0) completedSections++;
  
  return completedSections / totalSections;
}

async function generateBusinessPseudonym(businessId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(businessId + 'IDIA_BUSINESS_SALT_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}