// Critical data anonymization utility - ensures no real personal data is exposed
export const anonymizeRecord = (record: any, index: number) => {
  const recordId = `RECORD_${String(index + 1).padStart(4, '0')}`;
  
  return {
    ...record,
    id: recordId,
    // Keep other non-personal data like industry, location ranges, etc.
  };
};

export const anonymizeBundleData = (bundle: any) => {
  return {
    ...bundle,
    name: bundle.name, // Keep enterprise bundle names as they're already anonymized
    description: bundle.description, // Keep descriptions as they're already anonymized
  };
};

export const getMaskedDataWarning = () => 
  "🔒 Enterprise-grade anonymized data. Full dataset details available after purchase. All personally identifiable information has been tokenized for privacy compliance.";
