import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for professional
export const PROFESSIONAL_BITES: NanoBite[] = [
  // quaternary.professional.legal
  { id: 'pro.legal.1', industryId: 'quaternary.professional.legal', valueChainStage: 'operations', microElement: "Time Entry", task: "Billable hours capture", cadence: 'daily', automatable: true },
  { id: 'pro.legal.2', industryId: 'quaternary.professional.legal', valueChainStage: 'marketing_sales', microElement: "Retainer", task: "Trust retainer ledger", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'pro.legal.3', industryId: 'quaternary.professional.legal', valueChainStage: 'infrastructure', microElement: "Conflict Check", task: "New-matter conflict check", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'pro.legal.4', industryId: 'quaternary.professional.legal', valueChainStage: 'service', microElement: "Doc Mgmt", task: "Matter document index", cadence: 'daily', automatable: true },
  { id: 'pro.legal.5', industryId: 'quaternary.professional.legal', valueChainStage: 'marketing_sales', microElement: "Invoice", task: "Monthly trust-draw invoice", cadence: 'monthly', automatable: true },
  // quaternary.professional.accounting
  { id: 'pro.acct.1', industryId: 'quaternary.professional.accounting', valueChainStage: 'operations', microElement: "Time Entry", task: "Engagement time entry", cadence: 'daily', automatable: true },
  { id: 'pro.acct.2', industryId: 'quaternary.professional.accounting', valueChainStage: 'operations', microElement: "Workpaper", task: "Workpaper review log", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'pro.acct.3', industryId: 'quaternary.professional.accounting', valueChainStage: 'marketing_sales', microElement: "Engagement", task: "Engagement letter", cadence: 'event', automatable: true },
  { id: 'pro.acct.4', industryId: 'quaternary.professional.accounting', valueChainStage: 'service', microElement: "Tax Return", task: "Return e-file status", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'pro.acct.5', industryId: 'quaternary.professional.accounting', valueChainStage: 'marketing_sales', microElement: "Invoice", task: "Engagement invoice", cadence: 'monthly', automatable: true },
  // quaternary.professional.consulting
  { id: 'pro.cons.1', industryId: 'quaternary.professional.consulting', valueChainStage: 'operations', microElement: "Time Entry", task: "Project time capture", cadence: 'daily', automatable: true },
  { id: 'pro.cons.2', industryId: 'quaternary.professional.consulting', valueChainStage: 'marketing_sales', microElement: "SOW", task: "SOW & milestone", cadence: 'event', automatable: true },
  { id: 'pro.cons.3', industryId: 'quaternary.professional.consulting', valueChainStage: 'service', microElement: "Deliverable", task: "Deliverable acceptance", cadence: 'event', automatable: true },
  { id: 'pro.cons.4', industryId: 'quaternary.professional.consulting', valueChainStage: 'marketing_sales', microElement: "Retainer", task: "Recurring retainer billing", cadence: 'monthly', automatable: true },
  { id: 'pro.cons.5', industryId: 'quaternary.professional.consulting', valueChainStage: 'operations', microElement: "Utilization", task: "Consultant utilization %", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  // quaternary.professional.marketing_agency
  { id: 'pro.mkt.1', industryId: 'quaternary.professional.marketing_agency', valueChainStage: 'operations', microElement: "Campaign", task: "Campaign brief & assets", cadence: 'daily', automatable: true },
  { id: 'pro.mkt.2', industryId: 'quaternary.professional.marketing_agency', valueChainStage: 'marketing_sales', microElement: "Media Plan", task: "Media plan & buy", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'pro.mkt.3', industryId: 'quaternary.professional.marketing_agency', valueChainStage: 'service', microElement: "Reporting", task: "Performance report", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'pro.mkt.4', industryId: 'quaternary.professional.marketing_agency', valueChainStage: 'operations', microElement: "Time Entry", task: "Creative time capture", cadence: 'daily', automatable: true },
  { id: 'pro.mkt.5', industryId: 'quaternary.professional.marketing_agency', valueChainStage: 'marketing_sales', microElement: "Retainer", task: "Monthly retainer billing", cadence: 'monthly', automatable: true },
  // quaternary.professional.architecture
  { id: 'pro.arch.1', industryId: 'quaternary.professional.architecture', valueChainStage: 'operations', microElement: "Phase Bill", task: "Phase-based billing", cadence: 'event', automatable: true },
  { id: 'pro.arch.2', industryId: 'quaternary.professional.architecture', valueChainStage: 'operations', microElement: "Drawing Set", task: "Drawing-set version log", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'pro.arch.3', industryId: 'quaternary.professional.architecture', valueChainStage: 'service', microElement: "Submittal", task: "Submittal review log", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'pro.arch.4', industryId: 'quaternary.professional.architecture', valueChainStage: 'operations', microElement: "Time Entry", task: "Designer time entry", cadence: 'daily', automatable: true },
  { id: 'pro.arch.5', industryId: 'quaternary.professional.architecture', valueChainStage: 'marketing_sales', microElement: "Invoice", task: "Project invoice", cadence: 'monthly', automatable: true },
];
