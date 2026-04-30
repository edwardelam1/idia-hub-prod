import type { IndustryNode } from '../types';

export const PET_INDUSTRIES: IndustryNode[] = [
  { id: 'quinary.pet', parentId: 'quinary', sector: 'quinary', label: "Pet Services", naics: '8129', gics: '253020', tags: ["service","animal"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.pet.pet_store', parentId: 'quinary.pet', sector: 'quinary', label: "Pet Services — Pet Store", naics: '8129', gics: '253020', tags: ["service","animal"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.pet.grooming', parentId: 'quinary.pet', sector: 'quinary', label: "Pet Services — Grooming", naics: '8129', gics: '253020', tags: ["service","animal"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.pet.boarding', parentId: 'quinary.pet', sector: 'quinary', label: "Pet Services — Boarding", naics: '8129', gics: '253020', tags: ["service","animal"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.pet.training', parentId: 'quinary.pet', sector: 'quinary', label: "Pet Services — Training", naics: '8129', gics: '253020', tags: ["service","animal"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quinary.pet.pet_daycare', parentId: 'quinary.pet', sector: 'quinary', label: "Pet Services — Pet Daycare", naics: '8129', gics: '253020', tags: ["service","animal"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
];
