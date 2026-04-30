import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for nonprofit
export const NONPROFIT_BITES: NanoBite[] = [
  // quinary.nonprofit.charity
  { id: 'np.ch.1', industryId: 'quinary.nonprofit.charity', valueChainStage: 'marketing_sales', microElement: "Donation", task: "Donation intake & receipt", cadence: 'daily', automatable: true },
  { id: 'np.ch.2', industryId: 'quinary.nonprofit.charity', valueChainStage: 'operations', microElement: "Donor", task: "Donor record mgmt", cadence: 'daily', automatable: true },
  { id: 'np.ch.3', industryId: 'quinary.nonprofit.charity', valueChainStage: 'marketing_sales', microElement: "Campaign", task: "Campaign tracking", cadence: 'weekly', automatable: true },
  { id: 'np.ch.4', industryId: 'quinary.nonprofit.charity', valueChainStage: 'service', microElement: "Acknowledge", task: "Tax-acknowledgement letter", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'np.ch.5', industryId: 'quinary.nonprofit.charity', valueChainStage: 'operations', microElement: "Volunteer", task: "Volunteer hours log", cadence: 'weekly', automatable: true },
  // quinary.nonprofit.foundation
  { id: 'np.fo.1', industryId: 'quinary.nonprofit.foundation', valueChainStage: 'marketing_sales', microElement: "Grant App", task: "Grant-application intake", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'np.fo.2', industryId: 'quinary.nonprofit.foundation', valueChainStage: 'service', microElement: "Disbursement", task: "Grant disbursement", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'np.fo.3', industryId: 'quinary.nonprofit.foundation', valueChainStage: 'operations', microElement: "Reporting", task: "Grantee progress report", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'np.fo.4', industryId: 'quinary.nonprofit.foundation', valueChainStage: 'infrastructure', microElement: "990", task: "990 reporting prep", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  { id: 'np.fo.5', industryId: 'quinary.nonprofit.foundation', valueChainStage: 'operations', microElement: "Board", task: "Board-meeting minutes", cadence: 'monthly', automatable: true },
  // quinary.nonprofit.ngo
  { id: 'np.ng.1', industryId: 'quinary.nonprofit.ngo', valueChainStage: 'operations', microElement: "Program", task: "Program-tracking log", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'np.ng.2', industryId: 'quinary.nonprofit.ngo', valueChainStage: 'marketing_sales', microElement: "Funding", task: "Funder reporting", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'np.ng.3', industryId: 'quinary.nonprofit.ngo', valueChainStage: 'outbound_logistics', microElement: "Distribution", task: "Aid-distribution log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'np.ng.4', industryId: 'quinary.nonprofit.ngo', valueChainStage: 'operations', microElement: "Field Staff", task: "Field-staff timesheets", cadence: 'weekly', automatable: true },
  { id: 'np.ng.5', industryId: 'quinary.nonprofit.ngo', valueChainStage: 'infrastructure', microElement: "Compliance", task: "Donor-compliance audit", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // quinary.nonprofit.religious
  { id: 'np.rel.1', industryId: 'quinary.nonprofit.religious', valueChainStage: 'marketing_sales', microElement: "Tithe", task: "Tithe & offering ledger", cadence: 'weekly', automatable: true },
  { id: 'np.rel.2', industryId: 'quinary.nonprofit.religious', valueChainStage: 'operations', microElement: "Member", task: "Member directory", cadence: 'daily', automatable: true },
  { id: 'np.rel.3', industryId: 'quinary.nonprofit.religious', valueChainStage: 'operations', microElement: "Service", task: "Service-attendance count", cadence: 'weekly', automatable: true },
  { id: 'np.rel.4', industryId: 'quinary.nonprofit.religious', valueChainStage: 'service', microElement: "Pastoral", task: "Pastoral-care log", cadence: 'weekly', automatable: true },
  { id: 'np.rel.5', industryId: 'quinary.nonprofit.religious', valueChainStage: 'service', microElement: "Statement", task: "Annual giving statement", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  // quinary.nonprofit.community_org
  { id: 'np.cm.1', industryId: 'quinary.nonprofit.community_org', valueChainStage: 'marketing_sales', microElement: "Membership", task: "Membership dues billing", cadence: 'monthly', automatable: true },
  { id: 'np.cm.2', industryId: 'quinary.nonprofit.community_org', valueChainStage: 'operations', microElement: "Event", task: "Event registration", cadence: 'daily', automatable: true },
  { id: 'np.cm.3', industryId: 'quinary.nonprofit.community_org', valueChainStage: 'operations', microElement: "Volunteer", task: "Volunteer scheduling", cadence: 'weekly', automatable: true },
  { id: 'np.cm.4', industryId: 'quinary.nonprofit.community_org', valueChainStage: 'marketing_sales', microElement: "Sponsor", task: "Sponsor-pipeline tracking", cadence: 'monthly', automatable: true },
  { id: 'np.cm.5', industryId: 'quinary.nonprofit.community_org', valueChainStage: 'service', microElement: "Newsletter", task: "Member newsletter blast", cadence: 'monthly', automatable: true },
];
