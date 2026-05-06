import type { IndustryNode } from '../types';

export const RETAIL_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.retail', parentId: 'tertiary', sector: 'tertiary', label: "Retail", naics: '44', gics: '2550', tags: ["retail"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
  { id: 'tertiary.retail.fashion_apparel', parentId: 'tertiary.retail', sector: 'tertiary', label: "Retail — Fashion Apparel", naics: '44', gics: '2550', tags: ["retail"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
  { id: 'tertiary.retail.electronics', parentId: 'tertiary.retail', sector: 'tertiary', label: "Retail — Electronics", naics: '44', gics: '2550', tags: ["retail"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
  { id: 'tertiary.retail.furniture', parentId: 'tertiary.retail', sector: 'tertiary', label: "Retail — Furniture", naics: '44', gics: '2550', tags: ["retail"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
  { id: 'tertiary.retail.jewelry', parentId: 'tertiary.retail', sector: 'tertiary', label: "Retail — Jewelry", naics: '44', gics: '2550', tags: ["retail"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
  { id: 'tertiary.retail.sporting_goods', parentId: 'tertiary.retail', sector: 'tertiary', label: "Retail — Sporting Goods", naics: '44', gics: '2550', tags: ["retail"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
  { id: 'tertiary.retail.beauty_cosmetics', parentId: 'tertiary.retail', sector: 'tertiary', label: "Retail — Beauty Cosmetics", naics: '44', gics: '2550', tags: ["retail"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mid_market' },
];
