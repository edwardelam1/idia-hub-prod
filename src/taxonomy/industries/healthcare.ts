import type { IndustryNode } from '../types';

export const HEALTHCARE_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.healthcare', parentId: 'tertiary', sector: 'tertiary', label: "Healthcare", naics: '621', gics: '3510', tags: ["regulated","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.healthcare.clinic', parentId: 'tertiary.healthcare', sector: 'tertiary', label: "Healthcare — Clinic", naics: '621', gics: '3510', tags: ["regulated","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.healthcare.hospital', parentId: 'tertiary.healthcare', sector: 'tertiary', label: "Healthcare — Hospital", naics: '621', gics: '3510', tags: ["regulated","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.healthcare.pharmacy', parentId: 'tertiary.healthcare', sector: 'tertiary', label: "Healthcare — Pharmacy", naics: '621', gics: '3510', tags: ["regulated","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.healthcare.dental', parentId: 'tertiary.healthcare', sector: 'tertiary', label: "Healthcare — Dental", naics: '621', gics: '3510', tags: ["regulated","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.healthcare.optometry', parentId: 'tertiary.healthcare', sector: 'tertiary', label: "Healthcare — Optometry", naics: '621', gics: '3510', tags: ["regulated","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.healthcare.veterinary', parentId: 'tertiary.healthcare', sector: 'tertiary', label: "Healthcare — Veterinary", naics: '621', gics: '3510', tags: ["regulated","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.healthcare.mental_health', parentId: 'tertiary.healthcare', sector: 'tertiary', label: "Healthcare — Mental Health", naics: '621', gics: '3510', tags: ["regulated","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.healthcare.rehabilitation', parentId: 'tertiary.healthcare', sector: 'tertiary', label: "Healthcare — Rehabilitation", naics: '621', gics: '3510', tags: ["regulated","service"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
];
