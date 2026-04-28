import type { NanoBite } from '../types';
export const CREATOR_BITES: NanoBite[] = [
  { id: 'creator.audience.ops.calendar',  industryId: 'quaternary.creator.audience_owned',    valueChainStage: 'operations',         microElement: 'Content Calendar',   task: 'Plan editorial calendar', cadence: 'weekly', automatable: true },
  { id: 'creator.audience.svc.community', industryId: 'quaternary.creator.audience_owned',    valueChainStage: 'service',            microElement: 'Community',          task: 'Moderate Discord', cadence: 'daily', automatable: false },
  { id: 'creator.expert.ops.course',      industryId: 'quaternary.creator.expert',            valueChainStage: 'operations',         microElement: 'Course Production',  task: 'Record course modules', cadence: 'weekly', automatable: false },
  { id: 'creator.product.out.fulfill',    industryId: 'quaternary.creator.product',           valueChainStage: 'outbound_logistics', microElement: 'Merch Fulfillment',  task: 'Ship merch / drops', cadence: 'event', automatable: true },
  { id: 'creator.algo.ops.posting',       industryId: 'quaternary.creator.algorithm_native',  valueChainStage: 'operations',         microElement: 'Posting Cadence',    task: 'Hit posting cadence', cadence: 'daily', automatable: true },
  { id: 'creator.journalist.ops.research',industryId: 'quaternary.creator.hybrid_journalist', valueChainStage: 'operations',         microElement: 'Investigation',      task: 'Source / verify reporting', cadence: 'weekly', automatable: false },
  { id: 'creator.faceless.ops.persona',   industryId: 'quaternary.creator.faceless_virtual',  valueChainStage: 'operations',         microElement: 'Persona Mgmt',       task: 'Maintain persona continuity', cadence: 'weekly', automatable: false },
];
