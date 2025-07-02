
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
    console.log('Setting up real-time pipeline activity monitoring...');
    
    // Listen to health_metrics for new health data
    const healthDataChannel = supabase
      .channel('pipeline-health-data')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_metrics'
        },
        (payload) => {
          console.log('New health data received:', payload);
          setActivities(prev => [...prev.slice(-49), {
            id: payload.new.id.toString(),
            type: 'health_data_received',
            timestamp: payload.new.created_at,
            details: {
              stepCount: payload.new.step_count,
              recordedAt: payload.new.recorded_at,
              userId: payload.new.user_id || 'anonymous'
            }
          }]);
          setIsActive(true);
          setTimeout(() => setIsActive(false), 2000);
        }
      )
      .subscribe();

    // Listen to marketplace_bundles for new bundle creation
    const bundlesChannel = supabase
      .channel('pipeline-bundles')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_bundles'
        },
        (payload) => {
          console.log('New bundle created:', payload);
          setActivities(prev => [...prev.slice(-49), {
            id: payload.new.bundle_id,
            type: 'bundle_created',
            timestamp: payload.new.created_at,
            details: {
              title: payload.new.title,
              category: payload.new.category,
              contactsCount: payload.new.contacts_count
            }
          }]);
          setIsActive(true);
          setTimeout(() => setIsActive(false), 3000);
        }
      )
      .subscribe();

    // Listen to data_processing_queue for processing status
    const queueChannel = supabase
      .channel('pipeline-queue')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'data_processing_queue'
        },
        (payload) => {
          console.log('Processing queue updated:', payload);
          if (payload.new.processing_status === 'completed') {
            setIsActive(true);
            setTimeout(() => setIsActive(false), 1000);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up pipeline activity subscriptions');
      supabase.removeChannel(healthDataChannel);
      supabase.removeChannel(bundlesChannel);
      supabase.removeChannel(queueChannel);
    };
  }, []);

  return {
    activities: activities.slice(-10), // Keep last 10 activities
    isActive,
    activityCount: activities.length
  };
};
