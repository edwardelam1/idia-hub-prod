import type { IndustryNode } from '../types';

export const CONSTRUCTION_INDUSTRIES: IndustryNode[] = [
  { id: 'secondary.construction.general_contractor', parentId: 'secondary.construction', sector: 'secondary', label: "Construction — General Contractor", naics: '23', gics: '2010', tags: ["project","contract"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'secondary.construction.electrical', parentId: 'secondary.construction', sector: 'secondary', label: "Construction — Electrical", naics: '23', gics: '2010', tags: ["project","contract"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'secondary.construction.plumbing', parentId: 'secondary.construction', sector: 'secondary', label: "Construction — Plumbing", naics: '23', gics: '2010', tags: ["project","contract"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'secondary.construction.hvac', parentId: 'secondary.construction', sector: 'secondary', label: "Construction — Hvac", naics: '23', gics: '2010', tags: ["project","contract"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'secondary.construction.landscaping', parentId: 'secondary.construction', sector: 'secondary', label: "Construction — Landscaping", naics: '23', gics: '2010', tags: ["project","contract"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'secondary.construction.roofing', parentId: 'secondary.construction', sector: 'secondary', label: "Construction — Roofing", naics: '23', gics: '2010', tags: ["project","contract"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
];
