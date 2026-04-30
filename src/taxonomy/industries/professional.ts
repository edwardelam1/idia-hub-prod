import type { IndustryNode } from '../types';

export const PROFESSIONAL_INDUSTRIES: IndustryNode[] = [
  { id: 'quaternary.professional', parentId: 'quaternary', sector: 'quaternary', label: "Professional Services", naics: '54', gics: '2020', tags: ["knowledge","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quaternary.professional.legal', parentId: 'quaternary.professional', sector: 'quaternary', label: "Professional Services — Legal", naics: '54', gics: '2020', tags: ["knowledge","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quaternary.professional.accounting', parentId: 'quaternary.professional', sector: 'quaternary', label: "Professional Services — Accounting", naics: '54', gics: '2020', tags: ["knowledge","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quaternary.professional.consulting', parentId: 'quaternary.professional', sector: 'quaternary', label: "Professional Services — Consulting", naics: '54', gics: '2020', tags: ["knowledge","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quaternary.professional.marketing_agency', parentId: 'quaternary.professional', sector: 'quaternary', label: "Professional Services — Marketing Agency", naics: '54', gics: '2020', tags: ["knowledge","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
  { id: 'quaternary.professional.architecture', parentId: 'quaternary.professional', sector: 'quaternary', label: "Professional Services — Architecture", naics: '54', gics: '2020', tags: ["knowledge","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'boutique' },
];
