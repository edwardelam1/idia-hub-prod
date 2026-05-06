import type { IndustryNode } from '../types';

export const NONPROFIT_INDUSTRIES: IndustryNode[] = [
  { id: 'quinary.nonprofit', parentId: 'quinary', sector: 'quinary', label: "Non-Profit", naics: '813', gics: '2530', tags: ["mission","donation"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.nonprofit.charity', parentId: 'quinary.nonprofit', sector: 'quinary', label: "Non-Profit — Charity", naics: '813', gics: '2530', tags: ["mission","donation"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.nonprofit.foundation', parentId: 'quinary.nonprofit', sector: 'quinary', label: "Non-Profit — Foundation", naics: '813', gics: '2530', tags: ["mission","donation"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.nonprofit.ngo', parentId: 'quinary.nonprofit', sector: 'quinary', label: "Non-Profit — Ngo", naics: '813', gics: '2530', tags: ["mission","donation"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.nonprofit.religious', parentId: 'quinary.nonprofit', sector: 'quinary', label: "Non-Profit — Religious", naics: '813', gics: '2530', tags: ["mission","donation"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.nonprofit.community_org', parentId: 'quinary.nonprofit', sector: 'quinary', label: "Non-Profit — Community Org", naics: '813', gics: '2530', tags: ["mission","donation"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
];
