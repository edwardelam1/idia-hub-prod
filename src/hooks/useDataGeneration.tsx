import { useState, useEffect } from 'react';

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
}

export const useDataGeneration = (bundle: Bundle | null, bundleId?: string): UseDataGenerationReturn => {
  const [dataRecords, setDataRecords] = useState<DataRecord[]>([]);
  const [tableHeaders, setTableHeaders] = useState<string[]>([]);
  const [headerToKeyMapping, setHeaderToKeyMapping] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!bundle || !bundleId) return;
    
    // All mock data removed - awaiting real data from IDIA Synapse pipeline
    setDataRecords([]);
    setTableHeaders([]);
    setHeaderToKeyMapping({});
  }, [bundle, bundleId]);

  return { dataRecords, tableHeaders, headerToKeyMapping };
};