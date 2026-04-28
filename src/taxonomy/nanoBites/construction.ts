import type { NanoBite } from '../types';
export const CONSTRUCTION_BITES: NanoBite[] = [
  { id: 'construct.in.material',  industryId: 'secondary.construction', valueChainStage: 'inbound_logistics', microElement: 'Material Sourcing', task: 'Material Sourced milestone', cadence: 'event', automatable: false },
  { id: 'construct.ops.consult',  industryId: 'secondary.construction', valueChainStage: 'operations',        microElement: 'Consultation',      task: 'Consultation Complete milestone', cadence: 'event', automatable: false },
  { id: 'construct.svc.warranty', industryId: 'secondary.construction', valueChainStage: 'service',           microElement: 'Warranty',          task: 'Warranty management', cadence: 'event', automatable: true },
];
