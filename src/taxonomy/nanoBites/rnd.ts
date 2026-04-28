import type { NanoBite } from '../types';
export const RND_BITES: NanoBite[] = [
  { id: 'rnd.tech.experiment', industryId: 'quaternary.rnd', valueChainStage: 'technology',     microElement: 'Experiments', task: 'Run experiment cycle', cadence: 'weekly', automatable: false },
  { id: 'rnd.infra.grant',     industryId: 'quaternary.rnd', valueChainStage: 'infrastructure', microElement: 'Grants',      task: 'Grant compliance reporting', cadence: 'monthly', automatable: false },
];
