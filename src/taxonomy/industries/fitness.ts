import type { IndustryNode } from '../types';

export const FITNESS_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.fitness', parentId: 'tertiary', sector: 'tertiary', label: "Fitness & Wellness", naics: '7139', gics: '253020', tags: ["service","membership"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.fitness.gym', parentId: 'tertiary.fitness', sector: 'tertiary', label: "Fitness & Wellness — Gym", naics: '7139', gics: '253020', tags: ["service","membership"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.fitness.yoga_studio', parentId: 'tertiary.fitness', sector: 'tertiary', label: "Fitness & Wellness — Yoga Studio", naics: '7139', gics: '253020', tags: ["service","membership"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.fitness.spa', parentId: 'tertiary.fitness', sector: 'tertiary', label: "Fitness & Wellness — Spa", naics: '7139', gics: '253020', tags: ["service","membership"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.fitness.martial_arts', parentId: 'tertiary.fitness', sector: 'tertiary', label: "Fitness & Wellness — Martial Arts", naics: '7139', gics: '253020', tags: ["service","membership"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.fitness.swimming', parentId: 'tertiary.fitness', sector: 'tertiary', label: "Fitness & Wellness — Swimming", naics: '7139', gics: '253020', tags: ["service","membership"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.fitness.crossfit', parentId: 'tertiary.fitness', sector: 'tertiary', label: "Fitness & Wellness — Crossfit", naics: '7139', gics: '253020', tags: ["service","membership"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
];
