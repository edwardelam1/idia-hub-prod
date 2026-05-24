type SectorId = 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary';

interface TaxonomyNode {
  id: string;
  label: string;
  parentId?: string;
  sector: SectorId;
  naics?: string;
  gics?: string;
  tags: string[];
  meta?: Record<string, unknown>;
}

export const SECTORS: TaxonomyNode[] = [
  {
    id: 'primary',
    label: 'Primary — Extraction & Harvesting',
    sector: 'primary',
    tags: ['extraction', 'raw_materials', 'asset_intensive'],
    meta: { description: 'Direct retrieval of raw materials from earth or biological systems.' },
  },
  {
    id: 'secondary',
    label: 'Secondary — Transformation & Construction',
    sector: 'secondary',
    tags: ['manufacturing', 'processing', 'construction'],
    meta: { description: 'Transforms raw materials into finished goods.' },
  },
  {
    id: 'tertiary',
    label: 'Tertiary — Services',
    sector: 'tertiary',
    tags: ['retail', 'hospitality', 'banking', 'transport'],
    meta: { description: 'Direct service delivery to consumers and businesses.' },
  },
  {
    id: 'quaternary',
    label: 'Quaternary — Knowledge & Information',
    sector: 'quaternary',
    tags: ['saas', 'r_and_d', 'consulting', 'creator'],
    meta: { description: 'Intellectual and knowledge-based value creation.' },
  },
  {
    id: 'quinary',
    label: 'Quinary — Strategy & Policy',
    sector: 'quinary',
    tags: ['executive', 'policy', 'governance'],
    meta: { description: 'High-level decisioning and policy shaping.' },
  },
];