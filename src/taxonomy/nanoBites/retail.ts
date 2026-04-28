import type { NanoBite } from '../types';

const boutique: NanoBite[] = [
  { id: 'retail.boutique.ops.consult',     industryId: 'tertiary.retail.boutique', valueChainStage: 'operations',         microElement: 'Client Consultation', task: 'Individual style consultation', cadence: 'event', automatable: false },
  { id: 'retail.boutique.ops.source',      industryId: 'tertiary.retail.boutique', valueChainStage: 'inbound_logistics',  microElement: 'Specialty Sourcing',  task: 'Hand-source materials (plumage, silks)', cadence: 'event', automatable: false },
  { id: 'retail.boutique.ops.fit',         industryId: 'tertiary.retail.boutique', valueChainStage: 'operations',         microElement: 'Custom Sizing',       task: 'Sizing adjustments', cadence: 'event', automatable: false },
  { id: 'retail.boutique.svc.aftercare',   industryId: 'tertiary.retail.boutique', valueChainStage: 'service',            microElement: 'Aftercare',           task: 'Personalized post-sale care', cadence: 'monthly', automatable: false },
  { id: 'retail.boutique.mkt.relationship',industryId: 'tertiary.retail.boutique', valueChainStage: 'marketing_sales',    microElement: 'Relationship Sales',  task: 'VIP outreach & private events', cadence: 'monthly', automatable: false },
];

const mass: NanoBite[] = [
  { id: 'retail.mass.ops.open',     industryId: 'tertiary.retail.mass', valueChainStage: 'operations',         microElement: 'Daily Cycle',     task: 'Opening / closing checklist', cadence: 'daily',  automatable: false },
  { id: 'retail.mass.ops.cash',     industryId: 'tertiary.retail.mass', valueChainStage: 'operations',         microElement: 'Daily Cycle',     task: 'Cash drawer reconciliation', cadence: 'daily',  automatable: true  },
  { id: 'retail.mass.in.deliver',   industryId: 'tertiary.retail.mass', valueChainStage: 'inbound_logistics',  microElement: 'Receiving',       task: 'Verify deliveries', cadence: 'daily', automatable: false },
  { id: 'retail.mass.ops.sku',      industryId: 'tertiary.retail.mass', valueChainStage: 'operations',         microElement: 'Stock Control',   task: 'SKU labeling', cadence: 'weekly', automatable: true },
  { id: 'retail.mass.ops.cycle',    industryId: 'tertiary.retail.mass', valueChainStage: 'operations',         microElement: 'Stock Control',   task: 'Cycle counts', cadence: 'weekly', automatable: false },
  { id: 'retail.mass.mkt.window',   industryId: 'tertiary.retail.mass', valueChainStage: 'marketing_sales',    microElement: 'Visual Merch',    task: 'Refresh window displays', cadence: 'weekly', automatable: false },
  { id: 'retail.mass.svc.return',   industryId: 'tertiary.retail.mass', valueChainStage: 'service',            microElement: 'Returns',         task: 'Process returns / refunds', cadence: 'event', automatable: true },
  { id: 'retail.mass.out.bopis',    industryId: 'tertiary.retail.mass', valueChainStage: 'outbound_logistics', microElement: 'Omnichannel',     task: 'Process online orders for in-store pickup', cadence: 'daily', automatable: true },
];

export const RETAIL_BITES: NanoBite[] = [...boutique, ...mass];