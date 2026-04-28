import type { NanoBite } from '../types';
export const QSR_BITES: NanoBite[] = [
  { id: 'qsr.ops.line',  industryId: 'tertiary.qsr', valueChainStage: 'operations',        microElement: 'Line Speed',  task: 'Drive-thru line speed audit', cadence: 'daily', automatable: true },
  { id: 'qsr.ops.batch', industryId: 'tertiary.qsr', valueChainStage: 'operations',        microElement: 'Batch Timing',task: 'Batch production timing', cadence: 'daily', automatable: true },
  { id: 'qsr.in.sku',    industryId: 'tertiary.qsr', valueChainStage: 'inbound_logistics', microElement: 'SKU Scan',    task: 'SKU scan on delivery', cadence: 'daily', automatable: true },
];
