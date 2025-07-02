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

export const useSecurityEvents = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [agentStatus, setAgentStatus] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      setSecurityEvents(data || []);
      
      // Calculate agent status
      const agentStats: { [key: string]: string } = {};
      const agents = ['crazy_sentinel', 'crazy_oracle', 'crazy_hunter', 'crazy_guardian', 
                     'crazy_gatekeeper', 'crazy_shield', 'crazy_mirror', 'crazy_insight'];
      
      agents.forEach(agent => {
        const recentEvents = data?.filter(e => 
          e.agent_name === agent && 
          new Date(e.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
        ) || [];
        
        const hasHighSeverity = recentEvents.some(e => ['high', 'critical'].includes(e.severity));
        agentStats[agent] = hasHighSeverity ? 'alert' : recentEvents.length > 0 ? 'active' : 'idle';
      });
      
      setAgentStatus(agentStats);
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

  return {
    securityEvents,
    agentStatus,
    isLoading,
    error,
    refetch: fetchSecurityEvents
  };
};