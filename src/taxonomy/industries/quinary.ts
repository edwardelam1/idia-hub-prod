import type { IndustryNode } from '../types';

export const QUINARY_INDUSTRIES: IndustryNode[] = [
  { id: 'quinary.executive', parentId: 'quinary', sector: 'quinary', label: 'Executive Leadership (C-Suite)', tags: ['executive','fortune_500'], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.policy',    parentId: 'quinary', sector: 'quinary', label: 'Policy & Government',            tags: ['governance','policy'],     defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
];
