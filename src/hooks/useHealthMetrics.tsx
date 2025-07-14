import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthMetric {
  id: string;
  step_count: number | null;
  user_id: string | null;
  recorded_at: string | null;
  created_at: string | null;
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
      // Get recent health metrics from raw_health_data with valid step counts only
      const { data: metrics, error: metricsError } = await supabase
        .from('raw_health_data')
        .select('id, step_count, recorded_at, created_at, user_id')
        .not('step_count', 'is', null)
        .gt('step_count', 0)
        .order('created_at', { ascending: false })
        .limit(50);

      if (metricsError) throw metricsError;

      // Get total count of valid records
      const { count: totalCount, error: countError } = await supabase
        .from('raw_health_data')
        .select('*', { count: 'exact', head: true })
        .not('step_count', 'is', null)
        .gt('step_count', 0);

      if (countError) throw countError;

      // Calculate today's records with valid step counts
      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount, error: todayError } = await supabase
        .from('raw_health_data')
        .select('*', { count: 'exact', head: true })
        .not('step_count', 'is', null)
        .gt('step_count', 0)
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      if (todayError) throw todayError;

      // Calculate average steps from step-related metrics
      const stepMetrics = metrics?.filter(m => m.step_count !== null) || [];
      const averageSteps = stepMetrics.length > 0 
        ? Math.round(stepMetrics.reduce((sum, m) => sum + (m.step_count || 0), 0) / stepMetrics.length)
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

    // Set up real-time subscription for raw_health_data
    const channel = supabase
      .channel('raw-health-data-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'raw_health_data'
        },
        () => {
          console.log('Raw health data updated, refetching...');
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