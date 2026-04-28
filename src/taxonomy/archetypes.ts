import type { ArchetypeSpec } from './types';

export const REVENUE_ARCHETYPES: ArchetypeSpec[] = [
  { id: 'product',          label: 'Product',            focus: 'Cost-efficiency and volume',             network: 'pipe' },
  { id: 'service',          label: 'Service',            focus: 'Talent management and time-utilization', network: 'pipe' },
  { id: 'shared_assets',    label: 'Shared Assets',      focus: 'Maintenance and capacity utilization',   network: 'platform' },
  { id: 'subscription',     label: 'Subscription',       focus: 'Retention and continuous value',         network: 'pipe' },
  { id: 'lease_rental',     label: 'Lease / Rental',     focus: 'Asset lifecycle management',             network: 'pipe' },
  { id: 'insurance',        label: 'Insurance',          focus: 'Actuarial accuracy and risk pooling',    network: 'pipe' },
  { id: 'reselling',        label: 'Reselling',          focus: 'Inventory turnover and location',        network: 'pipe' },
  { id: 'agency_promotion', label: 'Agency / Promotion', focus: 'Negotiation and industry networks',      network: 'platform' },
];
