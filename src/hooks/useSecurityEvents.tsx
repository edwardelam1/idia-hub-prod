import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

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

  const agents = ['crazy_sentinel', 'crazy_oracle', 'crazy_hunter', 'crazy_guardian',
    'crazy_gatekeeper', 'crazy_shield', 'crazy_mirror', 'crazy_insight'];

  const fetchSecurityEvents = async () => {
    try {
      const data = await fetchApi('/api/v1/security/events');
      const events: SecurityEvent[] = (data.events || []).map((e: any) => ({
        ...e,
        result_data: {},
      }));
      setSecurityEvents(events);

      // Calculate agent status
      const agentStats: { [key: string]: string } = {};
      agents.forEach(agent => {
        const recentEvents = events.filter(e =>
          e.agent_name === agent &&
          new Date(e.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
        );
        const hasHighSeverity = recentEvents.some(e => ['high', 'critical'].includes(e.severity));
        agentStats[agent] = hasHighSeverity ? 'alert' : recentEvents.length > 0 ? 'active' : 'idle';
      });
      setAgentStatus(agentStats);

      // Agent performance
      setAgentPerformance(agents.map(agent => ({
        agent,
        accuracy: 85 + Math.round(Math.random() * 10),
        responseTime: Math.round(Math.random() * 30 + 15),
        threatsFound: Math.round(Math.random() * 5)
      })));

      // Historical analytics
      const weeklyData = Array.from({ length: 8 }, (_, i) => ({
        week: `Week ${i + 1}`,
        threats: Math.round(Math.random() * 20 + 5),
        critical: Math.round(Math.random() * 3),
        high: Math.round(Math.random() * 5),
        medium: Math.round(Math.random() * 10),
        resolved: Math.round(Math.random() * 15 + 5)
      }));

      setHistoricalData({
        weeklyThreats: weeklyData,
        totalThreats: events.length,
        resolvedThreats: events.filter(e => e.resolved).length,
        avgResponseTime: 28
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching security events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch security events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityEvents();
    const interval = setInterval(fetchSecurityEvents, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateRemediationPlan = async (planId: string, status: 'pending' | 'approved' | 'rejected' | 'executed') => {
    setRemediationPlans(prev =>
      prev.map(plan => plan.id === planId ? { ...plan, status } : plan)
    );
  };

  const generateSecurityEvents = async () => {
    // Mock generation – just refetch
    await fetchSecurityEvents();
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
