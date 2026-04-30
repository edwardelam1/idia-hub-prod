import type { IndustryNode } from '../types';

export const EVENTS_INDUSTRIES: IndustryNode[] = [
  { id: 'quinary.events', parentId: 'quinary', sector: 'quinary', label: "Event Services", naics: '7139', gics: '253020', tags: ["service","project"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'quinary.events.wedding_planning', parentId: 'quinary.events', sector: 'quinary', label: "Event Services — Wedding Planning", naics: '7139', gics: '253020', tags: ["service","project"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'quinary.events.corporate_events', parentId: 'quinary.events', sector: 'quinary', label: "Event Services — Corporate Events", naics: '7139', gics: '253020', tags: ["service","project"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'quinary.events.concerts', parentId: 'quinary.events', sector: 'quinary', label: "Event Services — Concerts", naics: '7139', gics: '253020', tags: ["service","project"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'quinary.events.festivals', parentId: 'quinary.events', sector: 'quinary', label: "Event Services — Festivals", naics: '7139', gics: '253020', tags: ["service","project"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'quinary.events.conventions', parentId: 'quinary.events', sector: 'quinary', label: "Event Services — Conventions", naics: '7139', gics: '253020', tags: ["service","project"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
];
