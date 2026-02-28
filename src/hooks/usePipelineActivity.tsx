import { useState, useEffect } from 'react';

interface PipelineActivity {
  id: string;
  type: 'health_data_received' | 'data_processed' | 'bundle_created' | 'user_connected';
  timestamp: string;
  details: any;
}

export const usePipelineActivity = () => {
  const [activities, setActivities] = useState<PipelineActivity[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Simulate periodic pipeline activity for UI demonstration
    const interval = setInterval(() => {
      const types: PipelineActivity['type'][] = ['health_data_received', 'data_processed', 'bundle_created', 'user_connected'];
      const randomType = types[Math.floor(Math.random() * types.length)];

      setActivities(prev => [...prev.slice(-49), {
        id: crypto.randomUUID(),
        type: randomType,
        timestamp: new Date().toISOString(),
        details: { source: 'mock_pipeline' }
      }]);
      setIsActive(true);
      setTimeout(() => setIsActive(false), 2000);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return {
    activities: activities.slice(-10),
    isActive,
    activityCount: activities.length
  };
};
