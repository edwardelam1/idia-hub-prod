import type { IndustryNode } from '../types';

export const AGRICULTURE_INDUSTRIES: IndustryNode[] = [
  { id: 'primary.agriculture', parentId: 'primary', sector: 'primary', label: "Agriculture", naics: '111', gics: '301020', tags: ["perishable","seasonal"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.agriculture.farming', parentId: 'primary.agriculture', sector: 'primary', label: "Agriculture — Farming", naics: '111', gics: '301020', tags: ["perishable","seasonal"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.agriculture.ranching', parentId: 'primary.agriculture', sector: 'primary', label: "Agriculture — Ranching", naics: '111', gics: '301020', tags: ["perishable","seasonal"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.agriculture.aquaculture', parentId: 'primary.agriculture', sector: 'primary', label: "Agriculture — Aquaculture", naics: '111', gics: '301020', tags: ["perishable","seasonal"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.agriculture.greenhouse', parentId: 'primary.agriculture', sector: 'primary', label: "Agriculture — Greenhouse", naics: '111', gics: '301020', tags: ["perishable","seasonal"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.agriculture.equipment_rental', parentId: 'primary.agriculture', sector: 'primary', label: "Agriculture — Equipment Rental", naics: '111', gics: '301020', tags: ["perishable","seasonal"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
];
