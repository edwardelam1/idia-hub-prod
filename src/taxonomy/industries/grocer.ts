import type { IndustryNode } from '../types';

export const GROCER_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.grocer', parentId: 'tertiary', sector: 'tertiary', label: "Grocer", naics: '4451', gics: '301010', tags: ["retail","perishable"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'tertiary.grocer.club_store', parentId: 'tertiary.grocer', sector: 'tertiary', label: "Grocer — Club Store", naics: '4451', gics: '301010', tags: ["retail","perishable"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'tertiary.grocer.marketplace', parentId: 'tertiary.grocer', sector: 'tertiary', label: "Grocer — Marketplace", naics: '4451', gics: '301010', tags: ["retail","perishable"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'tertiary.grocer.super_center', parentId: 'tertiary.grocer', sector: 'tertiary', label: "Grocer — Super Center", naics: '4451', gics: '301010', tags: ["retail","perishable"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'tertiary.grocer.convenience', parentId: 'tertiary.grocer', sector: 'tertiary', label: "Grocer — Convenience", naics: '4451', gics: '301010', tags: ["retail","perishable"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'tertiary.grocer.organic_natural', parentId: 'tertiary.grocer', sector: 'tertiary', label: "Grocer — Organic Natural", naics: '4451', gics: '301010', tags: ["retail","perishable"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'tertiary.grocer.butcher_shop', parentId: 'tertiary.grocer', sector: 'tertiary', label: "Grocer — Butcher Shop", naics: '4451', gics: '301010', tags: ["retail","perishable"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
];
