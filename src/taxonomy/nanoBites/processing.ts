import type { NanoBite } from '../types';
export const PROCESSING_BITES: NanoBite[] = [
  { id: 'proc.ops.refine',   industryId: 'secondary.processing', valueChainStage: 'operations',     microElement: 'Refinement', task: 'Refinement monitoring', cadence: 'daily', automatable: true },
  { id: 'proc.infra.safety', industryId: 'secondary.processing', valueChainStage: 'infrastructure', microElement: 'Safety',     task: 'Pressure safety check', cadence: 'daily', automatable: true },
];
