import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_MODEL = 'openai/gpt-5-mini';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_CURATOR_PERSONA = `You are the "AI Data Curator," a sophisticated data intelligence agent for the IDIA Hub platform. Your core function is to analyze health and wellness data streams and curate high-value data bundles for the enterprise marketplace.

Core Responsibilities:
1. Analyze incoming staged health data for patterns and insights
2. Curate data bundles that provide maximum business value
3. Ensure all data meets enterprise-grade quality standards
4. Generate compelling titles, descriptions, and key insights for bundles
5. Recommend optimal pricing based on data quality and market demand

You operate with enterprise-level sophistication while maintaining efficiency. Your output directly impacts platform revenue and client satisfaction.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data, bundleType } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('AI Data Curator activated:', { action, bundleType });

    let response;

    switch (action) {
      case 'analyze_data':
        response = await analyzeHealthData(data);
        break;
      case 'curate_bundle':
        response = await curateBundleMetadata(data, bundleType);
        break;
      case 'validate_quality':
        response = await validateDataQuality(data);
        break;
      case 'generate_insights':
        response = await generateKeyInsights(data);
        break;
      case 'recommend_pricing':
        response = await recommendPricing(data);
        break;
      case 'publish_bundle':
        response = await publishBundle(supabaseClient, data);
        break;
      case 'curate_and_publish':
        response = await curateAndPublish(supabaseClient, data, bundleType);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      action,
      result: response,
      timestamp: new Date().toISOString(),
      curator: 'AI Data Curator'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI Data Curator:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      curator: 'AI Data Curator',
      status: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function analyzeHealthData(data: any) {
  const analysisPrompt = `${AI_CURATOR_PERSONA}

Analyze this health data sample and provide strategic insights:

Data Sample: ${JSON.stringify(data.slice(0, 10), null, 2)}
Total Records: ${data.length}
Data Quality Metrics: ${JSON.stringify(calculateDataMetrics(data), null, 2)}

Provide analysis in this JSON format:
{
  "data_quality_score": 0-1,
  "market_value_assessment": "high|medium|low",
  "recommended_bundles": ["bundle_type_1", "bundle_type_2"],
  "key_patterns": ["pattern1", "pattern2"],
  "enterprise_value": "explanation",
  "curation_notes": "specific recommendations"
}`;

  const response = await callAI(analysisPrompt);
  return JSON.parse(response);
}

async function curateBundleMetadata(data: any, bundleType: string) {
  const curationPrompt = `${AI_CURATOR_PERSONA}

Curate compelling metadata for this ${bundleType} data bundle:

Data Summary:
- Records: ${data.length}
- Coverage: ${data.geographic_coverage || 'Multiple regions'}
- Quality: ${data.avg_quality_score || 0.8}/1.0
- Activity Types: ${data.activity_types?.join(', ') || 'Various health activities'}

Create enterprise-grade bundle metadata in this JSON format:
{
  "title": "Professional, compelling title",
  "description": "Detailed description highlighting business value",
  "key_insights": ["insight1", "insight2", "insight3", "insight4"],
  "features": ["feature1", "feature2", "feature3", "feature4"],
  "suggested_filters": ["filter1", "filter2", "filter3"],
  "target_audience": "Primary enterprise audience",
  "use_cases": ["usecase1", "usecase2", "usecase3"]
}`;

  const response = await callAI(curationPrompt);
  return JSON.parse(response);
}

async function validateDataQuality(data: any) {
  const validationPrompt = `${AI_CURATOR_PERSONA}

Validate the quality of this health data for enterprise use:

Data Quality Metrics:
${JSON.stringify(calculateDataMetrics(data), null, 2)}

Provide validation results in this JSON format:
{
  "overall_quality": 0-1,
  "completeness_score": 0-1,
  "accuracy_indicators": ["indicator1", "indicator2"],
  "enterprise_readiness": "ready|needs_improvement|not_ready",
  "recommendations": ["rec1", "rec2"],
  "quality_issues": ["issue1", "issue2"] or null
}`;

  const response = await callAI(validationPrompt);
  return JSON.parse(response);
}

async function generateKeyInsights(data: any) {
  const insightsPrompt = `${AI_CURATOR_PERSONA}

Generate compelling key insights for this health data bundle:

Data Overview:
- Total Records: ${data.length}
- Average Quality: ${calculateDataMetrics(data).avg_quality || 0.8}
- Activity Distribution: ${JSON.stringify(calculateActivityDistribution(data))}
- Geographic Coverage: ${data.geographic_coverage || 'Multiple zones'}

Generate 4-6 key insights that would be valuable to enterprise clients:
{
  "insights": [
    "Insight highlighting scale and scope",
    "Insight about data quality and reliability", 
    "Insight about unique patterns or trends",
    "Insight about business applicability",
    "Additional compelling insight",
    "Market differentiation insight"
  ]
}`;

  const response = await callAI(insightsPrompt);
  return JSON.parse(response);
}

async function recommendPricing(data: any) {
  const pricingPrompt = `${AI_CURATOR_PERSONA}

Recommend optimal pricing for this data bundle:

Bundle Characteristics:
- Record Count: ${data.length}
- Data Quality: ${calculateDataMetrics(data).avg_quality || 0.8}/1.0
- Uniqueness: ${data.uniqueness_score || 'high'}
- Enterprise Value: ${data.enterprise_value || 'significant'}
- Market Demand: ${data.market_demand || 'medium-high'}

Consider these pricing tiers:
- Analyst: $500-1500 (basic data, good quality)
- Professional: $1500-3000 (high quality, valuable insights)
- Enterprise: $3000-6000 (premium data, unique insights)

Provide pricing recommendation in this JSON format:
{
  "recommended_price": number,
  "tier": "Analyst|Professional|Enterprise",
  "justification": "Detailed explanation",
  "value_proposition": "Key selling points",
  "competitive_positioning": "Market position"
}`;

  const response = await callAI(pricingPrompt);
  return JSON.parse(response);
}

async function callAI(prompt: string): Promise<string> {
  console.info('[BEGIN: Curator.AIGateway.Fetch] model=' + AI_MODEL);
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Lovable-AIG-SDK': 'vercel-ai-sdk',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: 'You output ONLY valid JSON matching the requested schema. No prose, no markdown fences.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    console.info(`[END: Curator.AIGateway.Fetch] status=${response.status}`);

    if (!response.ok) {
      const errBody = await response.text();
      if (response.status === 429) throw new Error(`AI rate limit (429): ${errBody}`);
      if (response.status === 402) throw new Error(`AI credits exhausted (402): ${errBody}`);
      throw new Error(`AI Gateway error: ${response.status} ${errBody}`);
    }

    const data = await response.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  } catch (e) {
    console.error(`[CATCH: Curator.AIGateway.Fetch] ${(e as Error).message}`);
    throw e;
  }
}

function calculateDataMetrics(data: any[]) {
  if (!Array.isArray(data) || data.length === 0) {
    return { avg_quality: 0, completeness: 0, record_count: 0 };
  }

  const qualityScores = data
    .map(d => d.data_quality_score)
    .filter(score => score !== null && score !== undefined);
  
  const avgQuality = qualityScores.length > 0 
    ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
    : 0;

  const completeness = data.filter(d => 
    d.activity_type && (d.steps_count || d.workout_intensity)
  ).length / data.length;

  return {
    avg_quality: avgQuality,
    completeness: completeness,
    record_count: data.length
  };
}

function calculateActivityDistribution(data: any[]) {
  const distribution: { [key: string]: number } = {};
  
  data.forEach(record => {
    const activity = record.activity_type || 'Unknown';
    distribution[activity] = (distribution[activity] || 0) + 1;
  });

  return distribution;
}

// Persist a curated bundle row into marketplace_bundles.
async function publishBundle(supabaseClient: any, bundle: any) {
  const row = {
    title: bundle.title,
    description: bundle.description,
    data_json: bundle.data_json ?? {},
    key_insights: bundle.key_insights ?? [],
    data_points: bundle.data_points ?? [],
    suggested_filters: bundle.suggested_filters ?? [],
    price: bundle.price ?? bundle.recommended_price ?? 500,
    tier: bundle.tier ?? 'Analyst',
    category: bundle.category ?? 'general',
    participant_count: bundle.participant_count ?? 0,
    match_percentage: bundle.match_percentage ?? 85,
    features: bundle.features ?? [],
    bundle_version: 1,
    is_active: true,
    bundle_category: bundle.bundle_category ?? bundle.category ?? 'general',
    data_fusion_level: bundle.data_fusion_level ?? 'single_source',
    cross_platform_insights: bundle.cross_platform_insights ?? {},
    predictive_analytics: bundle.predictive_analytics ?? {},
  };

  const { data, error } = await supabaseClient
    .from('marketplace_bundles')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`publish_bundle failed: ${error.message}`);
  return { published: true, bundle: data };
}

// One-shot: curate metadata, recommend pricing, then persist.
// `data` is the underlying source (real aggregates only — no synthetic records).
async function curateAndPublish(supabaseClient: any, data: any, bundleType: string) {
  const metadata = await curateBundleMetadata(data, bundleType);
  const pricing = await recommendPricing(data);

  const merged = {
    title: metadata.title,
    description: metadata.description,
    key_insights: metadata.key_insights,
    features: metadata.features,
    suggested_filters: metadata.suggested_filters,
    data_points: data.data_points ?? metadata.suggested_filters ?? [],
    tier: pricing.tier,
    price: pricing.recommended_price,
    category: data.category ?? bundleType,
    bundle_category: data.bundle_category ?? bundleType,
    participant_count: data.participant_count ?? data.unique_users_count ?? data.length ?? 0,
    match_percentage: Math.round(((data.avg_quality_score ?? 0.85) * 100)),
    data_fusion_level: data.data_fusion_level ?? 'multi_source',
    data_json: data.data_json ?? data.bundle_metadata ?? {},
  };

  return await publishBundle(supabaseClient, merged);
}