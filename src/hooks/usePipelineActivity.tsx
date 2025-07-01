
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PipelineActivity {
  id: string;
  type: 'data_processed' | 'bundle_created' | 'user_connected';
  timestamp: string;
  details: any;
}

export const usePipelineActivity = () => {
  const [activities, setActivities] = useState<PipelineActivity[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    console.log('Setting up real-time pipeline activity monitoring...');
    
    // Listen to staged_health_data for new data processing
    const healthDataChannel = supabase
      .channel('pipeline-health-data')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'staged_health_data'
        },
        (payload) => {
          console.log('New health data processed:', payload);
          setActivities(prev => [...prev.slice(-49), {
            id: payload.new.id,
            type: 'data_processed',
            timestamp: payload.new.created_at,
            details: {
              activityType: payload.new.activity_type,
              qualityScore: payload.new.data_quality_score,
              location: payload.new.anonymized_location_zone
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
