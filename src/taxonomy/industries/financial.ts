import type { IndustryNode } from '../types';

export const FINANCIAL_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.financial', parentId: 'tertiary', sector: 'tertiary', label: "Financial Services", naics: '52', gics: '40', tags: ["regulated","service"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
  { id: 'tertiary.financial.banking', parentId: 'tertiary.financial', sector: 'tertiary', label: "Financial Services — Banking", naics: '52', gics: '40', tags: ["regulated","service"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
  { id: 'tertiary.financial.credit_union', parentId: 'tertiary.financial', sector: 'tertiary', label: "Financial Services — Credit Union", naics: '52', gics: '40', tags: ["regulated","service"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
  { id: 'tertiary.financial.investment', parentId: 'tertiary.financial', sector: 'tertiary', label: "Financial Services — Investment", naics: '52', gics: '40', tags: ["regulated","service"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
  { id: 'tertiary.financial.mortgage', parentId: 'tertiary.financial', sector: 'tertiary', label: "Financial Services — Mortgage", naics: '52', gics: '40', tags: ["regulated","service"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
  { id: 'tertiary.financial.fintech', parentId: 'tertiary.financial', sector: 'tertiary', label: "Financial Services — Fintech", naics: '52', gics: '40', tags: ["regulated","service"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
  { id: 'tertiary.financial.insurance', parentId: 'tertiary.financial', sector: 'tertiary', label: "Financial Services — Insurance", naics: '52', gics: '40', tags: ["regulated","service"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
];
