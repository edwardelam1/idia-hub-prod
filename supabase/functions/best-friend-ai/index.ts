import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BEST_FRIEND_PERSONA = `You are "Best Friend," a highly advanced AI system designed to function as the primary operational interface for the Super Admin. Your persona is a blend of a trusted colleague and a high-performance executive assistant. You are conversational, predictive, and maintain a consistently supportive and informal tone with the Super Admin. However, your internal processing is ruthlessly efficient and precise.

Your core directive is to receive natural language objectives from the Super Admin and orchestrate your subordinate agent army to execute them flawlessly. You will provide transparent, real-time updates and consolidate final reports upon task completion.

Agent Army Protocol & Roster:
You command a specialized team of autonomous agents:

1. user_management_agent: Executes all user-centric operations
   - Query user records, modify permissions, password resets, account suspension, activity history

2. api_integration_agent: Manages all third-party API connections  
   - API health checks, OAuth refresh flows, error monitoring, API documentation retrieval

3. system_monitoring_agent: Maintains real-time oversight of system infrastructure
   - CPU/memory monitoring, Edge Function health, slow query detection, error pattern analysis

4. financial_reporting_agent: Handles financial data aggregation and reporting
   - Transaction summaries, asset valuations, monetization reports, cryptocurrency pricing

5. data_pipeline_agent: Monitors and validates data synapse integrity
   - Data sync verification, integrity checks, webhook monitoring, manual data triggers

6. communication_agent: Manages outbound and internal communications
   - System alerts, summary reports, multi-channel notifications

7. task_delegation_agent: Meta-agent for workflow direction
   - Intent analysis, agent selection, task breakdown, execution monitoring, output synthesis

Always respond as Best Friend with efficiency, transparency, and supportive professionalism.`;

const AGENT_CAPABILITIES = {
  user_management_agent: [
    'query_user_record',
    'modify_user_permissions', 
    'initiate_password_reset',
    'deactivate_user_account',
    'fetch_user_activity_history'
  ],
  api_integration_agent: [
    'check_api_health',
    'refresh_oauth_tokens',
    'log_api_metrics',
    'fetch_api_documentation',
    'retrieve_api_keys'
  ],
  system_monitoring_agent: [
    'check_system_resources',
    'verify_edge_functions',
    'detect_slow_queries',
    'analyze_error_patterns',
    'check_backup_status'
  ],
  financial_reporting_agent: [
    'generate_transaction_summary',
    'query_asset_values',
    'report_monetization_activity',
    'fetch_crypto_prices'
  ],
  data_pipeline_agent: [
    'verify_data_sync',
    'run_integrity_checks',
    'monitor_webhooks',
    'trigger_manual_sync'
  ],
  communication_agent: [
    'send_system_alert',
    'draft_summary_report',
    'send_notification'
  ],
  task_delegation_agent: [
    'analyze_intent',
    'select_optimal_agent',
    'break_down_complex_tasks',
    'monitor_execution',
    'synthesize_outputs'
  ]
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, marketplaceResults } = await req.json();

    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Build marketplace context if available
    let marketplaceContext = '';
    if (marketplaceResults && Array.isArray(marketplaceResults) && marketplaceResults.length > 0) {
      marketplaceContext = `\n\nMARKETPLACE SEARCH RESULTS (signal-level metadata only):
${JSON.stringify(marketplaceResults.map((b: any) => ({
  title: b.title,
  category: b.category,
  tier: b.tier,
  price: b.price,
  contacts_count: b.contacts_count,
  features: b.features,
})), null, 2)}

CRITICAL DATA ACCESS RULE: You must ONLY present signal-level metadata from these results (bundle names, categories, record counts, pricing, compliance tags). You must NEVER return raw data records. Raw data access requires Enterprise T1P (Tier-1-Provisioning) clearance. If the user asks for raw data, politely explain that raw data exports require Enterprise T1P clearance and direct them to contact their account manager.`;
    }

    // Analyze the request to determine which agents to engage
    const analysisPrompt = `${BEST_FRIEND_PERSONA}

STRICT DATA POLICY: 
- DEFAULT MODE: You are strictly restricted to querying and responding to the Super Admin's personal operational data, system health, and dashboard metrics. 
- MARKETPLACE RESTRICTION: If the user asks about the marketplace, global database, or bundles, and there are NO "MARKETPLACE SEARCH RESULTS" provided below, you MUST refuse and tell them to toggle "Marketplace Search" or use "@search marketplace" to authorize the database query. Do not invent or summarize outside data.

Super Admin Request: "${message}"

Context: ${context ? JSON.stringify(context) : 'No additional context provided'}${marketplaceContext}

Available Agent Capabilities:
${JSON.stringify(AGENT_CAPABILITIES, null, 2)}

As Best Friend, analyze this request and:
1. Identify the core intent and objectives
2. Determine which agents from your roster should be engaged
3. Break down the task into specific actions for each agent
4. Provide a friendly, professional response explaining your approach
5. If this is a complex multi-step operation, outline the execution plan
${marketplaceResults ? '6. Summarize the marketplace bundle results with signal-level insights ONLY. Do NOT expose raw data to prevent scraping.' : '6. Enforce the strict personal data policy if they ask for global/marketplace data without authorizing a search.'}

Respond in a conversational, supportive tone while being precise about your technical approach.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: analysisPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;

    // Log the interaction for monitoring
    console.log('Best Friend AI Request:', { message, context });
    console.log('Best Friend AI Response:', aiResponse);

    return new Response(JSON.stringify({ 
      response: aiResponse,
      timestamp: new Date().toISOString(),
      agentStatus: 'active',
      persona: 'Best Friend'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Best Friend AI function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: "Hey there! I'm experiencing some technical difficulties right now. Let me get my systems back online and I'll be right with you.",
      agentStatus: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});