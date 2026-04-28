import type { NanoBite } from '../types';
export const HOSPITALITY_BITES: NanoBite[] = [
  { id: 'hosp.ops.greet', industryId: 'tertiary.hospitality', valueChainStage: 'service',    microElement: 'Front of House', task: 'Customer greeting protocol', cadence: 'daily', automatable: false },
  { id: 'hosp.ops.turn',  industryId: 'tertiary.hospitality', valueChainStage: 'operations', microElement: 'Housekeeping',   task: 'Room turn cycle', cadence: 'daily', automatable: false },
];
