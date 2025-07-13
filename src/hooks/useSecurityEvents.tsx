import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  id: string;
  agent_name: string;
  action_type: string;
  result_data: any;
  severity: string;
  timestamp: string;
  resolved: boolean;
}

interface AgentPerformanceData {
  agent: string;
  accuracy: number;
  responseTime: number;
  threatsFound: number;
}

interface RemediationPlan {
  id: string;
  title: string;
  agent_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  explanation: string;
  actions: string[];
  created_at: string;
}

export const useSecurityEvents = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [agentStatus, setAgentStatus] = useState<{ [key: string]: string }>({});
  const [remediationPlans, setRemediationPlans] = useState<RemediationPlan[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformanceData[]>([]);
  const [historicalData, setHistoricalData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityEvents = async () => {
    try {
      // Fetch security events
      const { data: eventsData, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;

      setSecurityEvents(eventsData || []);

      // Fetch remediation plans
      const { data: plansData, error: plansError } = await supabase
        .from('remediation_plans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (plansError) {
        console.warn('Error fetching remediation plans:', plansError);
      } else {
        // Transform the data to match our interface
        const transformedPlans = (plansData || []).map(plan => ({
          ...plan,
          actions: Array.isArray(plan.actions) ? plan.actions.map(String) : [],
          severity: plan.severity as 'low' | 'medium' | 'high' | 'critical',
          status: plan.status as 'pending' | 'approved' | 'rejected' | 'executed'
        }));
        setRemediationPlans(transformedPlans);
      }
      
      // Calculate agent status
      const agentStats: { [key: string]: string } = {};
      const agents = ['crazy_sentinel', 'crazy_oracle', 'crazy_hunter', 'crazy_guardian', 
                     'crazy_gatekeeper', 'crazy_shield', 'crazy_mirror', 'crazy_insight'];
      
      agents.forEach(agent => {
        const recentEvents = eventsData?.filter(e => 
          e.agent_name === agent && 
          new Date(e.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
        ) || [];
        
        const hasHighSeverity = recentEvents.some(e => ['high', 'critical'].includes(e.severity));
        agentStats[agent] = hasHighSeverity ? 'alert' : recentEvents.length > 0 ? 'active' : 'idle';
      });
      
      setAgentStatus(agentStats);

      // Calculate agent performance
      const performanceData = calculateAgentPerformance(eventsData || [], agents);
      setAgentPerformance(performanceData);

      // Calculate historical analytics
      const analytics = calculateHistoricalAnalytics(eventsData || []);
      setHistoricalData(analytics);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching security events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch security events');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAgentPerformance = (events: SecurityEvent[], agents: string[]): AgentPerformanceData[] => {
    return agents.map(agent => {
      const agentEvents = events.filter(e => e.agent_name === agent);
      const totalEvents = agentEvents.length;
      const resolvedEvents = agentEvents.filter(e => e.resolved).length;
      const highSeverityEvents = agentEvents.filter(e => ['high', 'critical'].includes(e.severity)).length;
      
      return {
        agent,
        accuracy: totalEvents > 0 ? Math.round((resolvedEvents / totalEvents) * 100) : 85,
        responseTime: Math.round(Math.random() * 30 + 15), // Simulated response time 15-45 seconds
        threatsFound: highSeverityEvents
      };
    });
  };

  const calculateHistoricalAnalytics = (events: SecurityEvent[]) => {
    const now = new Date();
    const weeklyData = [];
    
    // Generate weekly threat statistics for the last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
      const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
      
      const weekEvents = events.filter(e => {
        const eventDate = new Date(e.timestamp);
        return eventDate >= weekStart && eventDate < weekEnd;
      });
      
      weeklyData.push({
        week: `Week ${8 - i}`,
        threats: weekEvents.length,
        critical: weekEvents.filter(e => e.severity === 'critical').length,
        high: weekEvents.filter(e => e.severity === 'high').length,
        medium: weekEvents.filter(e => e.severity === 'medium').length,
        resolved: weekEvents.filter(e => e.resolved).length
      });
    }

    return {
      weeklyThreats: weeklyData,
      totalThreats: events.length,
      resolvedThreats: events.filter(e => e.resolved).length,
      avgResponseTime: 28 // Simulated average response time
    };
  };

  useEffect(() => {
    fetchSecurityEvents();

    // Set up real-time subscription
    const channel = supabase
      .channel('security-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'security_events'
        },
        () => {
          fetchSecurityEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateRemediationPlan = async (planId: string, status: 'pending' | 'approved' | 'rejected' | 'executed') => {
    try {
      const { error } = await supabase
        .from('remediation_plans')
        .update({ status })
        .eq('id', planId);

      if (error) throw error;

      setRemediationPlans(prev => 
        prev.map(plan => plan.id === planId ? { ...plan, status } : plan)
      );
    } catch (err) {
      console.error('Error updating remediation plan:', err);
    }
  };

  const generateSecurityEvents = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('security-event-generator');
      if (error) throw error;
      
      // Refresh data after generating events
      setTimeout(fetchSecurityEvents, 1000);
      return data;
    } catch (err) {
      console.error('Error generating security events:', err);
      throw err;
    }
  };

  return {
    securityEvents,
    agentStatus,
    remediationPlans,
    agentPerformance,
    historicalData,
    isLoading,
    error,
    refetch: fetchSecurityEvents,
    updateRemediationPlan,
    generateSecurityEvents
  };
};