import type { IndustryNode } from '../types';

export const REALESTATE_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.realestate', parentId: 'tertiary', sector: 'tertiary', label: "Real Estate", naics: '531', gics: '60', tags: ["service","property"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.realestate.property_management', parentId: 'tertiary.realestate', sector: 'tertiary', label: "Real Estate — Property Management", naics: '531', gics: '60', tags: ["service","property"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.realestate.leasing', parentId: 'tertiary.realestate', sector: 'tertiary', label: "Real Estate — Leasing", naics: '531', gics: '60', tags: ["service","property"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.realestate.brokerage', parentId: 'tertiary.realestate', sector: 'tertiary', label: "Real Estate — Brokerage", naics: '531', gics: '60', tags: ["service","property"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.realestate.appraisal', parentId: 'tertiary.realestate', sector: 'tertiary', label: "Real Estate — Appraisal", naics: '531', gics: '60', tags: ["service","property"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.realestate.title', parentId: 'tertiary.realestate', sector: 'tertiary', label: "Real Estate — Title", naics: '531', gics: '60', tags: ["service","property"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
];
