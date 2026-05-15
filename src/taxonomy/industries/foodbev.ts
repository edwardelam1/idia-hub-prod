import type { IndustryNode } from '../types';

export const FOODBEV_INDUSTRIES: IndustryNode[] = [
  { id: 'secondary.foodbev', parentId: 'secondary', sector: 'secondary', label: "Food & Beverage Production", naics: '3121', gics: '3020', tags: ["production","perishable"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'secondary.foodbev.brewery', parentId: 'secondary.foodbev', sector: 'secondary', label: "Food & Beverage Production — Brewery", naics: '3121', gics: '3020', tags: ["production","perishable"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'secondary.foodbev.winery', parentId: 'secondary.foodbev', sector: 'secondary', label: "Food & Beverage Production — Winery", naics: '3121', gics: '3020', tags: ["production","perishable"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'secondary.foodbev.distillery', parentId: 'secondary.foodbev', sector: 'secondary', label: "Food & Beverage Production — Distillery", naics: '3121', gics: '3020', tags: ["production","perishable"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'secondary.foodbev.bakery_production', parentId: 'secondary.foodbev', sector: 'secondary', label: "Food & Beverage Production — Bakery Production", naics: '3121', gics: '3020', tags: ["production","perishable"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
];
