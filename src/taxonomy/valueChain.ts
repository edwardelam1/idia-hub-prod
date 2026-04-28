import type { ValueChainStage } from './types';

export interface ValueChainStageSpec {
  id: ValueChainStage;
  label: string;
  kind: 'primary' | 'support';
  description: string;
}

export const VALUE_CHAIN_STAGES: ValueChainStageSpec[] = [
  { id: 'inbound_logistics',  label: 'Inbound Logistics',  kind: 'primary', description: 'Sourcing materials or data.' },
  { id: 'operations',         label: 'Operations',         kind: 'primary', description: 'Core transformation process.' },
  { id: 'outbound_logistics', label: 'Outbound Logistics', kind: 'primary', description: 'Getting product/service to customer.' },
  { id: 'marketing_sales',    label: 'Marketing & Sales',  kind: 'primary', description: 'Generating demand and closing deals.' },
  { id: 'service',            label: 'Service',            kind: 'primary', description: 'Enhancing value post-purchase.' },
  { id: 'infrastructure',     label: 'Infrastructure',     kind: 'support', description: 'Administrative backbone.' },
  { id: 'human_resources',    label: 'Human Resources',    kind: 'support', description: 'Talent engine.' },
  { id: 'technology',         label: 'Technology',         kind: 'support', description: 'Innovation engine.' },
  { id: 'procurement',        label: 'Procurement',        kind: 'support', description: 'Sourcing engine.' },
];
