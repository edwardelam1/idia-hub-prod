import type { IndustryNode } from '../types';

export const MARINE_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.marine', parentId: 'tertiary', sector: 'tertiary', label: "Marine & Maritime", naics: '4831', gics: '2030', tags: ["logistics","marine"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.marine.shipping', parentId: 'tertiary.marine', sector: 'tertiary', label: "Marine & Maritime — Shipping", naics: '4831', gics: '2030', tags: ["logistics","marine"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.marine.port_operations', parentId: 'tertiary.marine', sector: 'tertiary', label: "Marine & Maritime — Port Operations", naics: '4831', gics: '2030', tags: ["logistics","marine"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.marine.boat_sales', parentId: 'tertiary.marine', sector: 'tertiary', label: "Marine & Maritime — Boat Sales", naics: '4831', gics: '2030', tags: ["logistics","marine"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.marine.marina', parentId: 'tertiary.marine', sector: 'tertiary', label: "Marine & Maritime — Marina", naics: '4831', gics: '2030', tags: ["logistics","marine"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.marine.commercial_fishing', parentId: 'tertiary.marine', sector: 'tertiary', label: "Marine & Maritime — Commercial Fishing", naics: '4831', gics: '2030', tags: ["logistics","marine"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
];
