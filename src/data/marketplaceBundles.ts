// src/data/marketplaceBundles.ts

export const industries = [
  'Venture Capital & Private Equity', 
  'SaaS & Technology', 
  'Commercial Real Estate', 
  'Consumer Packaged Goods', 
  'Academic & Research',
  'Health & Fitness'
]; // <-- Added the closing bracket here

export const enterpriseOperationsBundle = {
  id: "bundle-enterprise-ops-risk",
  name: "Enterprise Operations & Risk Matrix",
  description: "A continuous, anonymized stream of physical infrastructure health, liability interception, and human capital execution.",
  pricePerRecord: 0.85,
  vertical: "Commercial Real Estate", // Aligned with the industries array
  includedNanoBites: [
    "nb-ops-life-safety",
    "nb-ops-cmms",
    "nb-ops-housekeeping",
    "nb-ops-kds-routing" // Ensure KDS routing is included
  ]
};

// We place the new bundle inside the array so the Hub's frontend Marketplace maps and displays it.
// As the Synapse pipeline comes online, this array will be populated dynamically.
export const marketplaceBundles: any[] = [
  enterpriseOperationsBundle
];