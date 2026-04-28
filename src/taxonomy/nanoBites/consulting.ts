import type { NanoBite } from '../types';
export const CONSULTING_BITES: NanoBite[] = [
  { id: 'consult.infra.inbox',     industryId: 'quaternary.consulting', valueChainStage: 'infrastructure',  microElement: 'Admin',                task: 'Manage filtered inboxes', cadence: 'daily',  automatable: true  },
  { id: 'consult.mkt.ghost',       industryId: 'quaternary.consulting', valueChainStage: 'marketing_sales', microElement: 'Thought Leadership',   task: 'Ghostwrite blog posts', cadence: 'weekly', automatable: false },
  { id: 'consult.ops.framework',   industryId: 'quaternary.consulting', valueChainStage: 'operations',      microElement: 'Project Execution',    task: 'Design analytics framework', cadence: 'event', automatable: false },
  { id: 'consult.tech.automation', industryId: 'quaternary.consulting', valueChainStage: 'technology',      microElement: 'Systems',              task: 'Build Zapier automations', cadence: 'event', automatable: true },
  { id: 'consult.infra.audit',     industryId: 'quaternary.consulting', valueChainStage: 'infrastructure',  microElement: 'Strategic Leadership', task: 'Operational audit', cadence: 'monthly', automatable: false },
];
