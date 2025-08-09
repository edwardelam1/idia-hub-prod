import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bundle, DataRecord } from '@/types/marketplace';
import { transformActivityType, transformDeviceType, getRealisticActivityTypes, getRealisticDeviceTypes } from '@/utils/dataTransformations';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!bundle && !bundleId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let currentBundle = bundle;

        // If we only have bundleId, fetch bundle from database
        if (!currentBundle && bundleId) {
          console.log('Fetching bundle data for ID:', bundleId);
          const { data: bundleData, error: bundleError } = await supabase
            .from('marketplace_bundles')
            .select('*')
            .eq('bundle_id', bundleId)
            .single();

          if (bundleError) {
            console.error('Error fetching bundle:', bundleError);
            throw bundleError;
          }

          currentBundle = bundleData as any;
        }

        if (!currentBundle) {
          throw new Error('No bundle data available');
        }

        console.log('Processing bundle:', (currentBundle as any).title || currentBundle.name);
        console.log('Bundle data preview:', JSON.stringify((currentBundle as any).data_json || currentBundle.dataJson).substring(0, 200));

        // Always fetch fresh data from staged_health_data to ensure accuracy
        console.log('Fetching ALL available records from staged_health_data...');
        let query = supabase.from('staged_health_data').select('*');

        // Apply filtering based on what data actually exists
        query = query.not('steps_count', 'is', null).order('created_at', { ascending: false });

        // Get tier limit but ensure minimum of 1000 records for Professional tier and above
        const tierLimits = {
          'Essential': 100,
          'Analyst': 500,
          'Professional': 2000,
          'Enterprise': 5000
        };
        const limit = tierLimits[currentBundle.tier as keyof typeof tierLimits] || 2000;
        query = query.limit(limit);

        const { data: healthData, error: healthError } = await query;

        if (healthError) {
          console.error('Error fetching health data:', healthError);
          throw healthError;
        }

        if (!healthData || healthData.length === 0) {
          console.log('No live health data available');
          setError('No health data available. Please connect a real health data source to see your activity.');
          setDataRecords([]);
          setTableHeaders([]);
          setHeaderToKeyMapping({});
          setLoading(false);
          return;
        }

        console.log(`✅ Found ${healthData.length} records with step data!`);
        console.log(`Steps range: ${Math.min(...healthData.map(r => r.steps_count || 0))} - ${Math.max(...healthData.map(r => r.steps_count || 0))}`);
        console.log(`Average steps: ${Math.round(healthData.reduce((sum, r) => sum + (r.steps_count || 0), 0) / healthData.length)}`);

        // Transform health data to display format with all available fields
        const records: DataRecord[] = healthData.map((record, index) => ({
          id: record.id || `record-${index}`,
          activity_type: transformActivityType(record.activity_type || 'Daily Activity'),
          steps_count: record.steps_count || 0,
          duration_minutes: record.duration_seconds ? Math.round(record.duration_seconds / 60) : null,
          distance_km: record.distance_meters ? (record.distance_meters / 1000).toFixed(2) : null,
          avg_heart_rate: record.average_heartrate || null,
          max_heart_rate: record.max_heartrate || null,
          calories_burned: record.calories_burned || null,
          location_zone: record.anonymized_location_zone || 'ZONE_UNKNOWN',
          device_type: transformDeviceType(record.device_type || 'iPhone'),
          data_quality: record.data_quality_score ? Math.round(record.data_quality_score * 100) : 85,
          processed_date: record.processed_at ? new Date(record.processed_at).toLocaleDateString() : new Date().toLocaleDateString(),
          sleep_duration: record.sleep_duration ? Math.round(record.sleep_duration / 60) : null,
          sleep_quality: record.sleep_quality_score || null,
          stress_level: record.stress_level || null,
          recovery_score: record.recovery_score || null
        }));

        // Set up comprehensive table headers
        const headers = [
          'Activity Type',
          'Steps Count',
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
          'Steps Count': 'steps_count',
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

        setDataRecords(records);
        setTableHeaders(headers);
        setHeaderToKeyMapping(mapping);

      } catch (err: any) {
        console.error('Error in useDataGeneration:', err);
        setError(err.message || 'Failed to fetch data');
        
        // No fallback data generation - show error state
        console.log('Error loading health data - no live data available');
        setDataRecords([]);
        setTableHeaders([]);
        setHeaderToKeyMapping({});
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bundle, bundleId]);

  return { dataRecords, tableHeaders, headerToKeyMapping, loading, error };
};

// REMOVED: No sample data generation - only live data is allowed