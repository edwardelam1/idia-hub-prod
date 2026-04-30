import type { IndustryNode } from '../types';

export const AVIATION_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.aviation', parentId: 'tertiary', sector: 'tertiary', label: "Aviation", naics: '481', gics: '2030', tags: ["regulated","transport"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mid_market' },
  { id: 'tertiary.aviation.airport', parentId: 'tertiary.aviation', sector: 'tertiary', label: "Aviation — Airport", naics: '481', gics: '2030', tags: ["regulated","transport"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mid_market' },
  { id: 'tertiary.aviation.flight_school', parentId: 'tertiary.aviation', sector: 'tertiary', label: "Aviation — Flight School", naics: '481', gics: '2030', tags: ["regulated","transport"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mid_market' },
  { id: 'tertiary.aviation.charter', parentId: 'tertiary.aviation', sector: 'tertiary', label: "Aviation — Charter", naics: '481', gics: '2030', tags: ["regulated","transport"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mid_market' },
  { id: 'tertiary.aviation.maintenance', parentId: 'tertiary.aviation', sector: 'tertiary', label: "Aviation — Maintenance", naics: '481', gics: '2030', tags: ["regulated","transport"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mid_market' },
  { id: 'tertiary.aviation.air_cargo', parentId: 'tertiary.aviation', sector: 'tertiary', label: "Aviation — Air Cargo", naics: '481', gics: '2030', tags: ["regulated","transport"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mid_market' },
];
