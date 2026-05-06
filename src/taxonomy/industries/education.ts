import type { IndustryNode } from '../types';

export const EDUCATION_INDUSTRIES: IndustryNode[] = [
  { id: 'quaternary.education', parentId: 'quaternary', sector: 'quaternary', label: "Education", naics: '611', gics: '2530', tags: ["service","knowledge"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'quaternary.education.k_12_school', parentId: 'quaternary.education', sector: 'quaternary', label: "Education — K 12 School", naics: '611', gics: '2530', tags: ["service","knowledge"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'quaternary.education.university', parentId: 'quaternary.education', sector: 'quaternary', label: "Education — University", naics: '611', gics: '2530', tags: ["service","knowledge"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'quaternary.education.tutoring_center', parentId: 'quaternary.education', sector: 'quaternary', label: "Education — Tutoring Center", naics: '611', gics: '2530', tags: ["service","knowledge"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'quaternary.education.vocational', parentId: 'quaternary.education', sector: 'quaternary', label: "Education — Vocational", naics: '611', gics: '2530', tags: ["service","knowledge"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'quaternary.education.daycare', parentId: 'quaternary.education', sector: 'quaternary', label: "Education — Daycare", naics: '611', gics: '2530', tags: ["service","knowledge"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'quaternary.education.online_learning', parentId: 'quaternary.education', sector: 'quaternary', label: "Education — Online Learning", naics: '611', gics: '2530', tags: ["service","knowledge"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
];
