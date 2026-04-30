import type { IndustryNode } from '../types';

export const ENTERTAINMENT_INDUSTRIES: IndustryNode[] = [
  { id: 'quinary.entertainment', parentId: 'quinary', sector: 'quinary', label: "Entertainment", naics: '7139', gics: '253020', tags: ["service","venue"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mass_market' },
  { id: 'quinary.entertainment.cinema', parentId: 'quinary.entertainment', sector: 'quinary', label: "Entertainment — Cinema", naics: '7139', gics: '253020', tags: ["service","venue"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mass_market' },
  { id: 'quinary.entertainment.arcade', parentId: 'quinary.entertainment', sector: 'quinary', label: "Entertainment — Arcade", naics: '7139', gics: '253020', tags: ["service","venue"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mass_market' },
  { id: 'quinary.entertainment.bowling', parentId: 'quinary.entertainment', sector: 'quinary', label: "Entertainment — Bowling", naics: '7139', gics: '253020', tags: ["service","venue"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mass_market' },
  { id: 'quinary.entertainment.concert_venue', parentId: 'quinary.entertainment', sector: 'quinary', label: "Entertainment — Concert Venue", naics: '7139', gics: '253020', tags: ["service","venue"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mass_market' },
  { id: 'quinary.entertainment.museum', parentId: 'quinary.entertainment', sector: 'quinary', label: "Entertainment — Museum", naics: '7139', gics: '253020', tags: ["service","venue"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mass_market' },
  { id: 'quinary.entertainment.casino', parentId: 'quinary.entertainment', sector: 'quinary', label: "Entertainment — Casino", naics: '7139', gics: '253020', tags: ["service","venue"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mass_market' },
];
