import type { NanoBite } from '../types';
export const TRANSPORT_BITES: NanoBite[] = [
  { id: 'tx.ops.dispatch', industryId: 'tertiary.transport', valueChainStage: 'operations',         microElement: 'Dispatch', task: 'Fleet dispatch optimization', cadence: 'daily', automatable: true },
  { id: 'tx.out.proof',    industryId: 'tertiary.transport', valueChainStage: 'outbound_logistics', microElement: 'Delivery', task: 'Proof of delivery capture', cadence: 'event', automatable: true },
];
