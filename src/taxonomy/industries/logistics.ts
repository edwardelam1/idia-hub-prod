import type { IndustryNode } from '../types';

export const LOGISTICS_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.logistics', parentId: 'tertiary', sector: 'tertiary', label: "Logistics", naics: '484', gics: '2030', tags: ["logistics","fleet"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.logistics.transportation', parentId: 'tertiary.logistics', sector: 'tertiary', label: "Logistics — Transportation", naics: '484', gics: '2030', tags: ["logistics","fleet"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.logistics.cross_docking', parentId: 'tertiary.logistics', sector: 'tertiary', label: "Logistics — Cross Docking", naics: '484', gics: '2030', tags: ["logistics","fleet"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.logistics.trucking', parentId: 'tertiary.logistics', sector: 'tertiary', label: "Logistics — Trucking", naics: '484', gics: '2030', tags: ["logistics","fleet"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.logistics.warehousing', parentId: 'tertiary.logistics', sector: 'tertiary', label: "Logistics — Warehousing", naics: '484', gics: '2030', tags: ["logistics","fleet"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.logistics.last_mile', parentId: 'tertiary.logistics', sector: 'tertiary', label: "Logistics — Last Mile", naics: '484', gics: '2030', tags: ["logistics","fleet"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'tertiary.logistics.cold_chain', parentId: 'tertiary.logistics', sector: 'tertiary', label: "Logistics — Cold Chain", naics: '484', gics: '2030', tags: ["logistics","fleet"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
];
