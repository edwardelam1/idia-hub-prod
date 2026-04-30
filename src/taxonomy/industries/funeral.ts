import type { IndustryNode } from '../types';

export const FUNERAL_INDUSTRIES: IndustryNode[] = [
  { id: 'quinary.funeral', parentId: 'quinary', sector: 'quinary', label: "Funeral Services", naics: '8122', gics: '253020', tags: ["service","sensitive"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.funeral.funeral_home', parentId: 'quinary.funeral', sector: 'quinary', label: "Funeral Services — Funeral Home", naics: '8122', gics: '253020', tags: ["service","sensitive"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.funeral.cemetery', parentId: 'quinary.funeral', sector: 'quinary', label: "Funeral Services — Cemetery", naics: '8122', gics: '253020', tags: ["service","sensitive"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.funeral.cremation', parentId: 'quinary.funeral', sector: 'quinary', label: "Funeral Services — Cremation", naics: '8122', gics: '253020', tags: ["service","sensitive"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.funeral.memorial', parentId: 'quinary.funeral', sector: 'quinary', label: "Funeral Services — Memorial", naics: '8122', gics: '253020', tags: ["service","sensitive"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
];
