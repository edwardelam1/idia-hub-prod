import type { IndustryNode } from '../types';

export const TERTIARY_INDUSTRIES: IndustryNode[] = [
  { id: 'tertiary.retail.boutique', parentId: 'tertiary', sector: 'tertiary', label: 'Retail — Boutique',     naics: '4481',   gics: '2550',   tags: ['boutique','mto','high_margin'],     defaultProductionMethod: 'job_shop',        defaultArchetype: 'boutique',    description: 'Custom, low-volume, high-margin retail.' },
  { id: 'tertiary.retail.mass',     parentId: 'tertiary', sector: 'tertiary', label: 'Retail — Mass Market',  naics: '452',    gics: '2550',   tags: ['mass_market','mts','high_volume'],  defaultProductionMethod: 'assembly_line',   defaultArchetype: 'mass_market' },
  {
    id: 'tertiary.hospitality',
    parentId: 'tertiary',
    sector: 'tertiary',
    label: 'Hospitality',
    naics: '721',
    gics: '253010',
    tags: ['service', 'perishable', 'high_touch', 'spatial_dependent'],
    defaultProductionMethod: 'job_shop',
    defaultArchetype: 'mid_market',
    meta: {
      benchmarks: ['Ritz-Carlton', 'Omni Hotels', 'Drury Hotels'],
      tech_stack: ['Agilysys', 'Mews', 'QSR Automations'],
      telemetry_focus: ['Guest Flow', 'Dwell Time', 'Speed of Service'],
      hardware_layer: ['LiDAR (SPAD)', 'UWB DW3000', 'IMU Wearables'],
      math_layer: ['Quaternions', 'Kalman Filter', 'Particle Filter (AMCL)'],
    },
  },
  { id: 'tertiary.qsr',             parentId: 'tertiary', sector: 'tertiary', label: 'QSR (Quick-Service)',   naics: '722513',                 tags: ['qsr','high_velocity'],              defaultProductionMethod: 'batch',           defaultArchetype: 'mass_market' },
  { id: 'tertiary.banking',         parentId: 'tertiary', sector: 'tertiary', label: 'Banking & Financial',   naics: '522',    gics: '40',     tags: ['regulated','service'],              defaultProductionMethod: 'assembly_line',   defaultArchetype: 'mid_market'  },
  { id: 'tertiary.transport',       parentId: 'tertiary', sector: 'tertiary', label: 'Transportation & Logistics', naics: '484', gics: '2030', tags: ['logistics','fleet'],               defaultProductionMethod: 'continuous_flow', defaultArchetype: 'mass_market' },
];
