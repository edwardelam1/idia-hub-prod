import type { IndustryNode } from '../types';

export const TRAVEL_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.travel', parentId: 'tertiary', sector: 'tertiary', label: "Travel & Tourism", naics: '5615', gics: '253010', tags: ["service","travel"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.travel.travel_agency', parentId: 'tertiary.travel', sector: 'tertiary', label: "Travel & Tourism — Travel Agency", naics: '5615', gics: '253010', tags: ["service","travel"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.travel.airline', parentId: 'tertiary.travel', sector: 'tertiary', label: "Travel & Tourism — Airline", naics: '5615', gics: '253010', tags: ["service","travel"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.travel.cruise', parentId: 'tertiary.travel', sector: 'tertiary', label: "Travel & Tourism — Cruise", naics: '5615', gics: '253010', tags: ["service","travel"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.travel.tour_operator', parentId: 'tertiary.travel', sector: 'tertiary', label: "Travel & Tourism — Tour Operator", naics: '5615', gics: '253010', tags: ["service","travel"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.travel.resort', parentId: 'tertiary.travel', sector: 'tertiary', label: "Travel & Tourism — Resort", naics: '5615', gics: '253010', tags: ["service","travel"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
];
