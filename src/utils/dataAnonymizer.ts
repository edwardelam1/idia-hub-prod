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
    name: bundle.name.replace(/[A-Z][a-z]+ [A-Z][a-z]+/g, 'Anonymous Contacts'),
    description: bundle.description.replace(/[A-Z][a-z]+ [A-Z][a-z]+/g, 'professionals'),
  };
};

export const getMaskedDataWarning = () => 
  "🔒 Data is anonymized for privacy. Full contact details available after purchase.";
