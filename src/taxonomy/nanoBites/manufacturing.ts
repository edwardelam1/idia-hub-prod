import type { NanoBite } from '../types';
export const MANUFACTURING_BITES: NanoBite[] = [
  { id: 'mfg.ind.in.vendor',    industryId: 'secondary.manufacturing.industrial', valueChainStage: 'inbound_logistics',  microElement: 'Procurement',     task: 'Vendor contract negotiation', cadence: 'event', automatable: false },
  { id: 'mfg.ind.ops.qc',       industryId: 'secondary.manufacturing.industrial', valueChainStage: 'operations',         microElement: 'Quality',         task: 'QC testing', cadence: 'daily', automatable: true },
  { id: 'mfg.ind.out.ship',     industryId: 'secondary.manufacturing.industrial', valueChainStage: 'outbound_logistics', microElement: 'Fulfillment',     task: 'Order fulfillment', cadence: 'daily', automatable: true },
  { id: 'mfg.con.ops.batch',    industryId: 'secondary.manufacturing.consumer',   valueChainStage: 'operations',         microElement: 'Batch Cycle',     task: 'Batch cycle completion', cadence: 'daily', automatable: true },
  { id: 'mfg.con.mkt.brand',    industryId: 'secondary.manufacturing.consumer',   valueChainStage: 'marketing_sales',    microElement: 'Brand',           task: 'Mass-market campaign', cadence: 'monthly', automatable: false },
];
