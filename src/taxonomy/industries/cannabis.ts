import type { IndustryNode } from '../types';

export const CANNABIS_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.cannabis', parentId: 'tertiary', sector: 'tertiary', label: "Cannabis", naics: '4539', gics: '3020', tags: ["regulated","controlled"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'tertiary.cannabis.dispensary', parentId: 'tertiary.cannabis', sector: 'tertiary', label: "Cannabis — Dispensary", naics: '4539', gics: '3020', tags: ["regulated","controlled"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'tertiary.cannabis.cultivation', parentId: 'tertiary.cannabis', sector: 'tertiary', label: "Cannabis — Cultivation", naics: '4539', gics: '3020', tags: ["regulated","controlled"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'tertiary.cannabis.processing', parentId: 'tertiary.cannabis', sector: 'tertiary', label: "Cannabis — Processing", naics: '4539', gics: '3020', tags: ["regulated","controlled"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'tertiary.cannabis.testing_lab', parentId: 'tertiary.cannabis', sector: 'tertiary', label: "Cannabis — Testing Lab", naics: '4539', gics: '3020', tags: ["regulated","controlled"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
];
