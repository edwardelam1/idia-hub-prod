import type { IndustryNode } from '../types';

export const GOVERNMENT_INDUSTRIES: IndustryNode[] = [
  { id: 'quaternary.government', parentId: 'quaternary', sector: 'quaternary', label: "Government & Public", naics: '92', gics: '2020', tags: ["regulated","public"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'quaternary.government.municipal', parentId: 'quaternary.government', sector: 'quaternary', label: "Government & Public — Municipal", naics: '92', gics: '2020', tags: ["regulated","public"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'quaternary.government.federal', parentId: 'quaternary.government', sector: 'quaternary', label: "Government & Public — Federal", naics: '92', gics: '2020', tags: ["regulated","public"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'quaternary.government.courts', parentId: 'quaternary.government', sector: 'quaternary', label: "Government & Public — Courts", naics: '92', gics: '2020', tags: ["regulated","public"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'quaternary.government.dmv', parentId: 'quaternary.government', sector: 'quaternary', label: "Government & Public — Dmv", naics: '92', gics: '2020', tags: ["regulated","public"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'quaternary.government.parks_recreation', parentId: 'quaternary.government', sector: 'quaternary', label: "Government & Public — Parks Recreation", naics: '92', gics: '2020', tags: ["regulated","public"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
];
