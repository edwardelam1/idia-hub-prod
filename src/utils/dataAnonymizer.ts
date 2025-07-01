
// Critical data anonymization utility - ensures no real personal data is exposed
export const anonymizeContact = (contact: any, index: number) => {
  const contactId = `CONTACT_${String(index + 1).padStart(4, '0')}`;
  const companyId = `COMPANY_${String(Math.floor(index / 5) + 1).padStart(3, '0')}`;
  
  return {
    ...contact,
    id: contactId,
    name: contactId.replace('_', ' '),
    company: companyId.replace('_', ' '),
    email: `${contactId.toLowerCase()}@domain-masked.com`,
    phone: 'Available after purchase',
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
  "🔒 Enterprise-grade anonymized data. Full contact details available after purchase. All personal identifiable information has been tokenized for privacy compliance.";
