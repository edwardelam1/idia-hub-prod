import type { BreakEvenInput, BreakEvenResult, ProductionMethod } from './types';

export interface ProductionMethodSpec {
  id: ProductionMethod;
  label: string;
  description: string;
  fixedCostProfile: 'low' | 'medium' | 'high' | 'very_high';
  variableCostProfile: 'low' | 'medium' | 'high';
}

export const PRODUCTION_METHODS: ProductionMethodSpec[] = [
  { id: 'job_shop',        label: 'Job Shop / Make-to-Order',  description: 'Highly flexible flow; every product unique.',                fixedCostProfile: 'low',       variableCostProfile: 'high'   },
  { id: 'batch',           label: 'Batch Production',          description: 'Moderate variety and volume; setup times between batches.', fixedCostProfile: 'medium',    variableCostProfile: 'medium' },
  { id: 'assembly_line',   label: 'Assembly Line / MTS',       description: 'Highly specialized stations; maximizes throughput.',         fixedCostProfile: 'high',      variableCostProfile: 'low'    },
  { id: 'continuous_flow', label: 'Continuous Flow',           description: 'Process never stops; focus on monitoring & safety.',        fixedCostProfile: 'very_high', variableCostProfile: 'low'    },
];

export function breakEven({ fc, vc, price }: BreakEvenInput): BreakEvenResult {
  const contributionMargin = price - vc;
  if (contributionMargin <= 0) {
    return { qbe: Infinity, contributionMargin, feasible: false };
  }
  return { qbe: fc / contributionMargin, contributionMargin, feasible: true };
}
