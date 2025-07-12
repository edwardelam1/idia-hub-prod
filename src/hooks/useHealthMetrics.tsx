import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthMetric {
  id: string;
  metric_type: string;
  metric_value: number;
  user_id: string;
  recorded_date: string;
  source_data_ids: string[] | null;
  created_at: string | null;
  unit: string;
}

interface HealthStats {
  totalRecords: number;
  todayRecords: number;
  averageSteps: number;
  lastActivity: string | null;
}

export const useHealthMetrics = () => {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [healthStats, setHealthStats] = useState<HealthStats>({
    totalRecords: 0,
    todayRecords: 0,
    averageSteps: 0,
    lastActivity: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthMetrics = async () => {
    try {
      // Get recent health metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('health_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (metricsError) throw metricsError;

      // Get total count
      const { count: totalCount, error: countError } = await supabase
        .from('health_metrics')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Calculate today's records
      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount, error: todayError } = await supabase
        .from('health_metrics')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      if (todayError) throw todayError;

      // Calculate average steps from step-related metrics
      const stepMetrics = metrics?.filter(m => m.metric_type === 'steps' && m.metric_value !== null) || [];
      const averageSteps = stepMetrics.length > 0 
        ? Math.round(stepMetrics.reduce((sum, m) => sum + m.metric_value, 0) / stepMetrics.length)
        : 0;

      const lastActivity = metrics?.[0]?.created_at || null;

      setHealthMetrics(metrics || []);
      setHealthStats({
        totalRecords: totalCount || 0,
        todayRecords: todayCount || 0,
        averageSteps,
        lastActivity
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching health metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch health metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthMetrics();

    // Set up real-time subscription
    const channel = supabase
      .channel('health-metrics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'health_metrics'
        },
        () => {
          fetchHealthMetrics(); // Refetch data when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    healthMetrics,
    healthStats,
    isLoading,
    error,
    refetch: fetchHealthMetrics
  };
};