import type { NanoBite } from '../types';
export const PRIMARY_BITES: NanoBite[] = [
  { id: 'extract.ops.drill',    industryId: 'primary.extractive',   valueChainStage: 'operations',     microElement: 'Drilling',     task: 'Drilling fluids management', cadence: 'daily',  automatable: true  },
  { id: 'extract.infra.remed',  industryId: 'primary.extractive',   valueChainStage: 'infrastructure', microElement: 'Compliance',   task: 'Environmental remediation', cadence: 'monthly', automatable: false },
  { id: 'agri.ops.soil',        industryId: 'primary.agricultural', valueChainStage: 'operations',     microElement: 'Soil Mgmt',    task: 'Soil nutrient analysis', cadence: 'weekly', automatable: true  },
  { id: 'agri.ops.irrigation',  industryId: 'primary.agricultural', valueChainStage: 'operations',     microElement: 'Irrigation',   task: 'Irrigation scheduling', cadence: 'daily',  automatable: true  },
  { id: 'genetic.ops.hatchery', industryId: 'primary.genetic',      valueChainStage: 'operations',     microElement: 'Hatchery',     task: 'Hatchery maintenance', cadence: 'daily',  automatable: false },
  { id: 'harvest.ops.trawl',    industryId: 'primary.harvesting',   valueChainStage: 'operations',     microElement: 'Harvesting',   task: 'Trawling maneuvers', cadence: 'daily', automatable: false },
];
