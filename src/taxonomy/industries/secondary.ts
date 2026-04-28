import type { IndustryNode } from '../types';

export const SECONDARY_INDUSTRIES: IndustryNode[] = [
  { id: 'secondary.manufacturing.industrial', parentId: 'secondary', sector: 'secondary', label: 'Manufacturing — Industrial Goods', naics: '333', gics: '20',   tags: ['b2b','machinery'],          defaultProductionMethod: 'assembly_line',   defaultArchetype: 'mid_market'  },
  { id: 'secondary.manufacturing.consumer',   parentId: 'secondary', sector: 'secondary', label: 'Manufacturing — Consumer Goods',   naics: '315', gics: '25',   tags: ['b2c','apparel','cpg'],      defaultProductionMethod: 'assembly_line',   defaultArchetype: 'mass_market' },
  { id: 'secondary.processing',               parentId: 'secondary', sector: 'secondary', label: 'Processing (Refining, Food)',      naics: '311',               tags: ['refinement','continuous'],  defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
  { id: 'secondary.construction',             parentId: 'secondary', sector: 'secondary', label: 'Construction',                     naics: '23',  gics: '2010', tags: ['project_based','physical'], defaultProductionMethod: 'job_shop',        defaultArchetype: 'boutique'    },
];
