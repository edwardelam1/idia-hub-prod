import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DataRecord {
  id: string;
  [key: string]: any;
}

interface Bundle {
  id: number;
  name: string;
  tier: string;
  contacts: number;
  features: string[];
  category: string;
  description: string;
}

interface UseDataGenerationReturn {
  dataRecords: DataRecord[];
  tableHeaders: string[];
  headerToKeyMapping: { [key: string]: string };
  loading: boolean;
  error: string | null;
}

export const useDataGeneration = (bundle: Bundle | null, bundleId?: string): UseDataGenerationReturn => {
  const [dataRecords, setDataRecords] = useState<DataRecord[]>([]);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const [headerToKeyMapping, setHeaderToKeyMapping] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bundle || !bundleId) return;
    
    const fetchHealthData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch staged health data based on bundle category and tier
        let query = supabase.from('staged_health_data').select('*');
        
        // Apply filters based on bundle category
        if (bundle.category === 'Fitness & Sports') {
          query = query.in('activity_type', ['Run', 'Bike', 'Swim', 'TrailRun', 'Hike']);
        } else if (bundle.category === 'Wellness & Recovery') {
          query = query.not('sleep_duration', 'is', null);
        } else if (bundle.category === 'Urban Mobility') {
          query = query.in('activity_type', ['Walk', 'Run', 'Bike']);
        }
        
        // Limit data based on tier
        const tierLimits = {
          'Essential': 50,
          'Professional': 200,
          'Enterprise': 1000
        };
        const limit = tierLimits[bundle.tier as keyof typeof tierLimits] || 100;
        query = query.limit(limit);
        
        const { data, error: queryError } = await query;
        
        if (queryError) {
          console.error('Error fetching health data:', queryError);
          setError('Failed to load data');
          return;
        }
        
        if (!data || data.length === 0) {
          // Generate sample data structure for demo when no real data exists
          const sampleData = generateSampleData(bundle, limit);
          setDataRecords(sampleData);
        } else {
          // Transform real data into display format
          const transformedData = data.map((record, index) => ({
            id: record.id || `record-${index}`,
            activity_type: record.activity_type,
            duration_minutes: record.duration_seconds ? Math.round(record.duration_seconds / 60) : null,
            distance_km: record.distance_meters ? (record.distance_meters / 1000).toFixed(2) : null,
            avg_heart_rate: record.average_heartrate,
            max_heart_rate: record.max_heartrate,
            calories_burned: record.calories_burned,
            location_zone: record.anonymized_location_zone,
            device_type: record.device_type,
            data_quality: record.data_quality_score ? Math.round(record.data_quality_score * 100) : null,
            processed_date: record.processed_at ? new Date(record.processed_at).toLocaleDateString() : null
          }));
          setDataRecords(transformedData);
        }
        
        // Set up table headers and mapping
        const headers = [
          'Activity Type',
          'Duration (min)',
          'Distance (km)',
          'Avg Heart Rate',
          'Max Heart Rate',
          'Calories',
          'Location Zone',
          'Device',
          'Data Quality (%)',
          'Date Processed'
        ];
        
        const mapping = {
          'Activity Type': 'activity_type',
          'Duration (min)': 'duration_minutes',
          'Distance (km)': 'distance_km',
          'Avg Heart Rate': 'avg_heart_rate',
          'Max Heart Rate': 'max_heart_rate',
          'Calories': 'calories_burned',
          'Location Zone': 'location_zone',
          'Device': 'device_type',
          'Data Quality (%)': 'data_quality',
          'Date Processed': 'processed_date'
        };
        
        setTableHeaders(headers);
        setHeaderToKeyMapping(mapping);
        
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHealthData();
  }, [bundle, bundleId]);

  return { dataRecords, tableHeaders, headerToKeyMapping, loading, error };
};

// Generate sample data when no real data exists (for demo purposes)
const generateSampleData = (bundle: Bundle, limit: number): DataRecord[] => {
  const activities = ['Run', 'Bike', 'Walk', 'Swim', 'Hike', 'TrailRun'];
  const devices = ['iPhone', 'Apple Watch', 'Garmin', 'Fitbit', 'Strava'];
  const zones = ['ZONE_A1B2C3D4', 'ZONE_E5F6G7H8', 'ZONE_I9J0K1L2'];
  
  return Array.from({ length: Math.min(limit, 25) }, (_, i) => ({
    id: `sample-${i + 1}`,
    activity_type: activities[Math.floor(Math.random() * activities.length)],
    duration_minutes: Math.floor(Math.random() * 120) + 15,
    distance_km: (Math.random() * 15 + 1).toFixed(2),
    avg_heart_rate: Math.floor(Math.random() * 60) + 120,
    max_heart_rate: Math.floor(Math.random() * 40) + 160,
    calories_burned: Math.floor(Math.random() * 800) + 200,
    location_zone: zones[Math.floor(Math.random() * zones.length)],
    device_type: devices[Math.floor(Math.random() * devices.length)],
    data_quality: Math.floor(Math.random() * 30) + 70,
    processed_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
  }));
};