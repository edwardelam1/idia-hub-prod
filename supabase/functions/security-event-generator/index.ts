import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SECURITY_SCENARIOS = [
  {
    agent: 'crazy_sentinel',
    action: 'anomaly_detection_scan',
    data: { unusual_traffic_pattern: true, data_access_spike: 150 },
    context: { time_window: '5_minutes', baseline_deviation: 2.5 }
  },
  {
    agent: 'crazy_hunter',
    action: 'threat_hunting_scan',
    data: { suspicious_login_patterns: true, ip_geolocation_anomaly: true },
    context: { scan_depth: 'deep', threat_intelligence_feeds: 5 }
  },
  {
    agent: 'crazy_gatekeeper',
    action: 'access_control_audit',
    data: { permission_escalation_attempt: true, user_privilege_change: 'elevated' },
    context: { access_level: 'admin', resource_sensitivity: 'high' }
  },
  {
    agent: 'crazy_shield',
    action: 'data_exfiltration_check',
    data: { large_data_transfer: true, external_endpoint: 'suspicious' },
    context: { data_classification: 'confidential', transfer_volume: '500MB' }
  },
  {
    agent: 'crazy_mirror',
    action: 'ai_attack_detection',
    data: { prompt_injection_attempt: true, model_query_anomaly: true },
    context: { model_endpoint: 'health_data_ai', attack_sophistication: 'medium' }
  },
  {
    agent: 'crazy_oracle',
    action: 'predictive_threat_analysis',
    data: { vulnerability_scan_results: 'medium_risk', patch_status: 'pending' },
    context: { forecast_horizon: '24_hours', confidence_level: 0.85 }
  },
  {
    agent: 'crazy_guardian',
    action: 'incident_response_coordination',
    data: { multi_vector_attack: true, systems_affected: 3 },
    context: { response_level: 'automated', escalation_threshold: 'high' }
  },
  {
    agent: 'crazy_insight',
    action: 'security_explanation_request',
    data: { complex_incident: true, stakeholder_level: 'executive' },
    context: { technical_depth: 'business_focused', urgency: 'high' }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Security Event Generator: Starting automated security simulation');

    // Generate 1-3 random security events
    const numberOfEvents = Math.floor(Math.random() * 3) + 1;
    const generatedEvents = [];

    for (let i = 0; i < numberOfEvents; i++) {
      const scenario = SECURITY_SCENARIOS[Math.floor(Math.random() * SECURITY_SCENARIOS.length)];
      
      try {
        // Call the crazy-8-security function
        const { data: securityResponse, error } = await supabaseClient.functions.invoke('crazy-8-security', {
          body: {
            agent: scenario.agent,
            action: scenario.action,
            data: scenario.data,
            context: scenario.context
          }
        });

        if (error) {
          console.error('Error calling security agent:', error);
          continue;
        }

        generatedEvents.push({
          agent: scenario.agent,
          action: scenario.action,
          response: securityResponse
        });

        // Generate remediation plan for high severity events
        if (securityResponse?.result?.threat_severity === 'high' || 
            securityResponse?.result?.risk_level === 'high' ||
            securityResponse?.result?.priority_level === 'high') {
          
          await generateRemediationPlan(supabaseClient, scenario.agent, securityResponse);
        }

        // Small delay between events
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (eventError) {
        console.error('Error generating security event:', eventError);
        continue;
      }
    }

    console.log(`Security Event Generator: Generated ${generatedEvents.length} security events`);

    return new Response(JSON.stringify({
      success: true,
      events_generated: generatedEvents.length,
      events: generatedEvents,
      timestamp: new Date().toISOString(),
      message: 'Security events generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in security event generator:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateRemediationPlan(supabaseClient: any, agent: string, securityResponse: any) {
  try {
    // Get the latest security event for this agent
    const { data: events } = await supabaseClient
      .from('security_events')
      .select('id')
      .eq('agent_name', agent)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (!events || events.length === 0) return;

    const remediationPlan = {
      security_event_id: events[0].id,
      title: generateRemediationTitle(agent, securityResponse),
      agent_name: agent,
      severity: securityResponse.result?.threat_severity || securityResponse.result?.risk_level || 'medium',
      explanation: generateRemediationExplanation(securityResponse),
      actions: generateRemediationActions(agent, securityResponse)
    };

    await supabaseClient
      .from('remediation_plans')
      .insert(remediationPlan);

    console.log(`Generated remediation plan for ${agent}`);
  } catch (error) {
    console.error('Error generating remediation plan:', error);
  }
}

function generateRemediationTitle(agent: string, response: any): string {
  const agentName = agent.replace('crazy_', '').replace('_', ' ');
  const titles = [
    `Automated Response Plan - ${agentName}`,
    `Security Incident Remediation - ${agentName}`,
    `Threat Mitigation Strategy - ${agentName}`,
    `Risk Response Protocol - ${agentName}`
  ];
  return titles[Math.floor(Math.random() * titles.length)];
}

function generateRemediationExplanation(response: any): string {
  const explanations = [
    "Multi-layered security response initiated based on threat analysis.",
    "Automated containment procedures activated for identified security risk.",
    "Comprehensive remediation strategy deployed to neutralize threat vector.",
    "Proactive security measures implemented to prevent escalation."
  ];
  return explanations[Math.floor(Math.random() * explanations.length)];
}

function generateRemediationActions(agent: string, response: any): string[] {
  const baseActions = [
    "Isolate affected systems",
    "Collect forensic evidence", 
    "Update security policies",
    "Notify security team"
  ];

  const agentSpecificActions: { [key: string]: string[] } = {
    crazy_sentinel: ["Recalibrate anomaly thresholds", "Update baseline patterns"],
    crazy_hunter: ["Deploy additional monitoring", "Activate threat feeds"],
    crazy_gatekeeper: ["Review access permissions", "Enforce MFA"],
    crazy_shield: ["Block data egress", "Audit data flows"],
    crazy_mirror: ["Update AI defense models", "Retrain detection algorithms"],
    crazy_oracle: ["Update threat predictions", "Refresh forecast models"],
    crazy_guardian: ["Coordinate response teams", "Execute containment"],
    crazy_insight: ["Generate incident report", "Brief stakeholders"]
  };

  return [
    ...baseActions.slice(0, 2),
    ...(agentSpecificActions[agent] || []).slice(0, 2)
  ];
}