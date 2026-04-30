import type { IndustryNode } from '../types';

export const MINING_INDUSTRIES: IndustryNode[] = [
  { id: 'primary.mining', parentId: 'primary', sector: 'primary', label: "Mining & Extraction", naics: '212', gics: '15', tags: ["extractive","heavy"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.mining.mining', parentId: 'primary.mining', sector: 'primary', label: "Mining & Extraction — Mining", naics: '212', gics: '15', tags: ["extractive","heavy"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.mining.quarrying', parentId: 'primary.mining', sector: 'primary', label: "Mining & Extraction — Quarrying", naics: '212', gics: '15', tags: ["extractive","heavy"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.mining.drilling', parentId: 'primary.mining', sector: 'primary', label: "Mining & Extraction — Drilling", naics: '212', gics: '15', tags: ["extractive","heavy"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'primary.mining.refining', parentId: 'primary.mining', sector: 'primary', label: "Mining & Extraction — Refining", naics: '212', gics: '15', tags: ["extractive","heavy"], defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
];
