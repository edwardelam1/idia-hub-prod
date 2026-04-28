import type { PositioningSpec } from './types';

export const POSITIONING_SPECS: PositioningSpec[] = [
  { archetype: 'boutique',    variety: 'high',   volume: 'low',    leadTime: 'long',   pricing: 'premium', staffing: 'Specialized experts',                  recommendedProduction: 'job_shop' },
  { archetype: 'mid_market',  variety: 'medium', volume: 'medium', leadTime: 'medium', pricing: 'mid',     staffing: 'Mixed specialists and generalists',    recommendedProduction: 'batch' },
  { archetype: 'mass_market', variety: 'low',    volume: 'high',   leadTime: 'short',  pricing: 'low',     staffing: 'Cross-trained entry-level staff',      recommendedProduction: 'assembly_line' },
];
