import type { IndustryNode } from '../types';

export const SECURITY_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.security', parentId: 'tertiary', sector: 'tertiary', label: "Security Services", naics: '5616', gics: '2020', tags: ["service","protection"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.security.private_security', parentId: 'tertiary.security', sector: 'tertiary', label: "Security Services — Private Security", naics: '5616', gics: '2020', tags: ["service","protection"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.security.alarm_systems', parentId: 'tertiary.security', sector: 'tertiary', label: "Security Services — Alarm Systems", naics: '5616', gics: '2020', tags: ["service","protection"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.security.surveillance', parentId: 'tertiary.security', sector: 'tertiary', label: "Security Services — Surveillance", naics: '5616', gics: '2020', tags: ["service","protection"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
  { id: 'tertiary.security.cybersecurity', parentId: 'tertiary.security', sector: 'tertiary', label: "Security Services — Cybersecurity", naics: '5616', gics: '2020', tags: ["service","protection"], defaultProductionMethod: 'job_shop', defaultArchetype: 'mid_market' },
];
