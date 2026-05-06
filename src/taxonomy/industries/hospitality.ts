import type { IndustryNode } from '../types';

export const HOSPITALITY_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.hospitality.fine_dining', parentId: 'tertiary.hospitality', sector: 'tertiary', label: "Hospitality — Fine Dining", naics: '7211', gics: '253010', tags: ["service","high_touch"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.hospitality.diner', parentId: 'tertiary.hospitality', sector: 'tertiary', label: "Hospitality — Diner", naics: '7211', gics: '253010', tags: ["service","high_touch"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.hospitality.home_services', parentId: 'tertiary.hospitality', sector: 'tertiary', label: "Hospitality — Home Services", naics: '7211', gics: '253010', tags: ["service","high_touch"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.hospitality.theme_park', parentId: 'tertiary.hospitality', sector: 'tertiary', label: "Hospitality — Theme Park", naics: '7211', gics: '253010', tags: ["service","high_touch"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.hospitality.cafe_bakery', parentId: 'tertiary.hospitality', sector: 'tertiary', label: "Hospitality — Cafe Bakery", naics: '7211', gics: '253010', tags: ["service","high_touch"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.hospitality.catering', parentId: 'tertiary.hospitality', sector: 'tertiary', label: "Hospitality — Catering", naics: '7211', gics: '253010', tags: ["service","high_touch"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.hospitality.food_truck', parentId: 'tertiary.hospitality', sector: 'tertiary', label: "Hospitality — Food Truck", naics: '7224', gics: '253010', tags: ["service","mobile"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
];
