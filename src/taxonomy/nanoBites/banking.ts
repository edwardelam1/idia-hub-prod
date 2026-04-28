import type { NanoBite } from '../types';
export const BANKING_BITES: NanoBite[] = [
  { id: 'bank.infra.kyc',   industryId: 'tertiary.banking', valueChainStage: 'infrastructure', microElement: 'KYC',            task: 'KYC verification', cadence: 'event', automatable: true },
  { id: 'bank.ops.recon',   industryId: 'tertiary.banking', valueChainStage: 'operations',     microElement: 'Reconciliation', task: 'EOD reconciliation', cadence: 'daily', automatable: true },
];
