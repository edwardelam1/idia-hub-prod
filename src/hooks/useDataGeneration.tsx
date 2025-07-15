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
          console.log('No staged health data found, generating sample data');
          const sampleData = generateSampleData(currentBundle, 50);
          setDataRecords(sampleData);
          
          const headers = [
            'Activity Type',
            'Steps Count',
            'Date Processed',
            'Device',
            'Data Quality (%)'
          ];
          
          const mapping = {
            'Activity Type': 'activity_type',
            'Steps Count': 'steps_count',
            'Date Processed': 'processed_date',
            'Device': 'device_type',
            'Data Quality (%)': 'data_quality'
          };
          
          setTableHeaders(headers);
          setHeaderToKeyMapping(mapping);
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
        
        // Fallback: Generate sample data
        if (bundle || bundleId) {
          console.log('Generating sample data as fallback');
          const fallbackBundle = bundle || { 
            bundle_id: 'sample', 
            id: 'sample', 
            name: 'Sample Data', 
            category: 'Health', 
            tier: 'Standard',
            contacts: 100,
            features: []
          } as Bundle;
          const sampleData = generateSampleData(fallbackBundle, 25);
          setDataRecords(sampleData);
          
          const headers = [
            'Activity Type',
            'Steps Count',
            'Date Processed',
            'Device',
            'Data Quality (%)'
          ];
          
          const mapping = {
            'Activity Type': 'activity_type',
            'Steps Count': 'steps_count',
            'Date Processed': 'processed_date',
            'Device': 'device_type',
            'Data Quality (%)': 'data_quality'
          };
          
          setTableHeaders(headers);
          setHeaderToKeyMapping(mapping);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bundle, bundleId]);

  return { dataRecords, tableHeaders, headerToKeyMapping, loading, error };
};

// Generate sample data when no real data exists (for demo purposes)
const generateSampleData = (bundle: Bundle, limit: number): DataRecord[] => {
  const activities = getRealisticActivityTypes();
  const devices = getRealisticDeviceTypes();
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