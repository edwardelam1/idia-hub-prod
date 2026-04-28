import type { NanoBite } from '../types';
export const SAAS_BITES: NanoBite[] = [
  { id: 'saas.growth.ops.ship',      industryId: 'quaternary.saas.growth',     valueChainStage: 'operations',      microElement: 'Release Cycle',    task: 'Ship weekly product release', cadence: 'weekly',  automatable: true  },
  { id: 'saas.growth.mkt.outreach',  industryId: 'quaternary.saas.growth',     valueChainStage: 'marketing_sales', microElement: 'Founder Sales',    task: 'Founder-led outbound', cadence: 'daily', automatable: false },
  { id: 'saas.mid.svc.cs',           industryId: 'quaternary.saas.midmarket',  valueChainStage: 'service',         microElement: 'Customer Success', task: 'Reduce churn via QBRs', cadence: 'monthly', automatable: false },
  { id: 'saas.ent.ops.revops',       industryId: 'quaternary.saas.enterprise', valueChainStage: 'operations',      microElement: 'RevOps',           task: 'Bridge data silos', cadence: 'weekly', automatable: true },
];
