import type { NanoBite } from '../types';
export const QUINARY_BITES: NanoBite[] = [
  { id: 'exec.infra.audit',    industryId: 'quinary.executive', valueChainStage: 'infrastructure', microElement: 'Audit',  task: 'Operational audit approval', cadence: 'monthly', automatable: false },
  { id: 'policy.infra.review', industryId: 'quinary.policy',    valueChainStage: 'infrastructure', microElement: 'Policy', task: 'Policy review cycle', cadence: 'monthly', automatable: false },
];
