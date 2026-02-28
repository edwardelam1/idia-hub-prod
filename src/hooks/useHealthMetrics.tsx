import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

interface HealthMetric {
  id: string;
  step_count: number | null;
  user_id: string | null;
  recorded_at: string | null;
  created_at: string | null;
  raw_payload: any;
  device_type: string | null;
}

interface HealthStats {
  totalRecords: number;
  todayRecords: number;
  averageSteps: number;
  lastActivity: string | null;
  dataTypes: string[];
  comprehensiveScore: number;
}

export const useHealthMetrics = () => {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [healthStats, setHealthStats] = useState<HealthStats>({
    totalRecords: 0,
    todayRecords: 0,
    averageSteps: 0,
    lastActivity: null,
    dataTypes: [],
    comprehensiveScore: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthMetrics = async () => {
    try {
      setIsLoading(true);
      const data = await fetchApi('/api/v1/health/metrics');

      setHealthStats({
        totalRecords: data.total_records || 0,
        todayRecords: data.today_records || 0,
        averageSteps: data.average_steps || 0,
        lastActivity: data.last_activity || null,
        dataTypes: data.data_types || [],
        comprehensiveScore: data.comprehensive_score || 0
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
    const interval = setInterval(fetchHealthMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return { healthMetrics, healthStats, isLoading, error, refetch: fetchHealthMetrics };
};
