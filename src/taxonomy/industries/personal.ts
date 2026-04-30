import type { IndustryNode } from '../types';

export const PERSONAL_INDUSTRIES: IndustryNode[] = [
  { id: 'quinary.personal', parentId: 'quinary', sector: 'quinary', label: "Personal Services", naics: '8121', gics: '253020', tags: ["service","appointment"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.personal.salon', parentId: 'quinary.personal', sector: 'quinary', label: "Personal Services — Salon", naics: '8121', gics: '253020', tags: ["service","appointment"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.personal.barbershop', parentId: 'quinary.personal', sector: 'quinary', label: "Personal Services — Barbershop", naics: '8121', gics: '253020', tags: ["service","appointment"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.personal.tattoo', parentId: 'quinary.personal', sector: 'quinary', label: "Personal Services — Tattoo", naics: '8121', gics: '253020', tags: ["service","appointment"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.personal.dry_cleaning', parentId: 'quinary.personal', sector: 'quinary', label: "Personal Services — Dry Cleaning", naics: '8121', gics: '253020', tags: ["service","appointment"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.personal.tailoring', parentId: 'quinary.personal', sector: 'quinary', label: "Personal Services — Tailoring", naics: '8121', gics: '253020', tags: ["service","appointment"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
];
