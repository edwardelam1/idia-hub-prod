import { useState, useEffect } from 'react';
import { Bundle, DataRecord } from '@/types/marketplace';

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
    if (!bundle && !bundleId) {
      setLoading(false);
      return;
    }

    // No Supabase – show empty state until AWS API is connected
    setError('No health data available. Awaiting AWS API integration.');
    setDataRecords([]);
    setTableHeaders([]);
    setHeaderToKeyMapping({});
    setLoading(false);
  }, [bundle, bundleId]);

  return { dataRecords, tableHeaders, headerToKeyMapping, loading, error };
};
