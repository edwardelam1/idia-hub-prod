import type { IndustryNode } from '../types';

export const MANUFACTURING_INDUSTRIES: IndustryNode[] = [
  { id: 'secondary.manufacturing', parentId: 'secondary', sector: 'secondary', label: "Manufacturing", naics: '31', gics: '2010', tags: ["production"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'secondary.manufacturing.assembly', parentId: 'secondary.manufacturing', sector: 'secondary', label: "Manufacturing — Assembly", naics: '31', gics: '2010', tags: ["production"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'secondary.manufacturing.processing', parentId: 'secondary.manufacturing', sector: 'secondary', label: "Manufacturing — Processing", naics: '31', gics: '2010', tags: ["production"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'secondary.manufacturing.packaging', parentId: 'secondary.manufacturing', sector: 'secondary', label: "Manufacturing — Packaging", naics: '31', gics: '2010', tags: ["production"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'secondary.manufacturing.quality_control', parentId: 'secondary.manufacturing', sector: 'secondary', label: "Manufacturing — Quality Control", naics: '31', gics: '2010', tags: ["production"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
  { id: 'secondary.manufacturing.textile', parentId: 'secondary.manufacturing', sector: 'secondary', label: "Manufacturing — Textile", naics: '31', gics: '2010', tags: ["production"], defaultProductionMethod: 'assembly_line', defaultArchetype: 'mass_market' },
];
