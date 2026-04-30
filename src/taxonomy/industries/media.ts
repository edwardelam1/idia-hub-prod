import type { IndustryNode } from '../types';

export const MEDIA_INDUSTRIES: IndustryNode[] = [
  { id: 'quaternary.media', parentId: 'quaternary', sector: 'quaternary', label: "Media & Publishing", naics: '511', gics: '5020', tags: ["content","audience"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'quaternary.media.print_media', parentId: 'quaternary.media', sector: 'quaternary', label: "Media & Publishing — Print Media", naics: '511', gics: '5020', tags: ["content","audience"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'quaternary.media.broadcasting', parentId: 'quaternary.media', sector: 'quaternary', label: "Media & Publishing — Broadcasting", naics: '511', gics: '5020', tags: ["content","audience"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'quaternary.media.streaming', parentId: 'quaternary.media', sector: 'quaternary', label: "Media & Publishing — Streaming", naics: '511', gics: '5020', tags: ["content","audience"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'quaternary.media.podcasting', parentId: 'quaternary.media', sector: 'quaternary', label: "Media & Publishing — Podcasting", naics: '511', gics: '5020', tags: ["content","audience"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
  { id: 'quaternary.media.news', parentId: 'quaternary.media', sector: 'quaternary', label: "Media & Publishing — News", naics: '511', gics: '5020', tags: ["content","audience"], defaultProductionMethod: 'batch', defaultArchetype: 'mid_market' },
];
