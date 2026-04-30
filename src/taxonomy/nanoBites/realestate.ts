import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for realestate
export const REALESTATE_BITES: NanoBite[] = [
  // tertiary.realestate.property_management
  { id: 're.pm.1', industryId: 'tertiary.realestate.property_management', valueChainStage: 'marketing_sales', microElement: "Lease", task: "Lease ledger", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 're.pm.2', industryId: 'tertiary.realestate.property_management', valueChainStage: 'operations', microElement: "Work Order", task: "Maintenance work-order", cadence: 'daily', automatable: true },
  { id: 're.pm.3', industryId: 'tertiary.realestate.property_management', valueChainStage: 'marketing_sales', microElement: "Rent", task: "Recurring rent collection", cadence: 'monthly', automatable: true },
  { id: 're.pm.4', industryId: 'tertiary.realestate.property_management', valueChainStage: 'operations', microElement: "Move-in", task: "Move-in inspection", cadence: 'event', automatable: true },
  { id: 're.pm.5', industryId: 'tertiary.realestate.property_management', valueChainStage: 'service', microElement: "Renewal", task: "Lease-renewal workflow", cadence: 'monthly', automatable: true },
  // tertiary.realestate.leasing
  { id: 're.ls.1', industryId: 'tertiary.realestate.leasing', valueChainStage: 'marketing_sales', microElement: "Tour", task: "Property-tour scheduling", cadence: 'daily', automatable: true },
  { id: 're.ls.2', industryId: 'tertiary.realestate.leasing', valueChainStage: 'marketing_sales', microElement: "Application", task: "Rental application + screening", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 're.ls.3', industryId: 'tertiary.realestate.leasing', valueChainStage: 'operations', microElement: "Lease Doc", task: "Lease-doc generation", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 're.ls.4', industryId: 'tertiary.realestate.leasing', valueChainStage: 'marketing_sales', microElement: "Listing", task: "Listing syndication", cadence: 'daily', automatable: true },
  { id: 're.ls.5', industryId: 'tertiary.realestate.leasing', valueChainStage: 'service', microElement: "Move-in", task: "Move-in coordination", cadence: 'event', automatable: true },
  // tertiary.realestate.brokerage
  { id: 're.brk.1', industryId: 'tertiary.realestate.brokerage', valueChainStage: 'marketing_sales', microElement: "Listing", task: "Listing intake (MLS)", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 're.brk.2', industryId: 'tertiary.realestate.brokerage', valueChainStage: 'marketing_sales', microElement: "Showing", task: "Showing scheduling", cadence: 'daily', automatable: true },
  { id: 're.brk.3', industryId: 'tertiary.realestate.brokerage', valueChainStage: 'marketing_sales', microElement: "Offer", task: "Offer/counter workflow", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 're.brk.4', industryId: 'tertiary.realestate.brokerage', valueChainStage: 'operations', microElement: "Commission", task: "Agent-commission split", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 're.brk.5', industryId: 'tertiary.realestate.brokerage', valueChainStage: 'service', microElement: "Closing", task: "Closing-doc package", cadence: 'event', automatable: true, requiresTier: 'pro' },
  // tertiary.realestate.appraisal
  { id: 're.app.1', industryId: 'tertiary.realestate.appraisal', valueChainStage: 'operations', microElement: "Order", task: "Appraisal-order intake", cadence: 'daily', automatable: true },
  { id: 're.app.2', industryId: 'tertiary.realestate.appraisal', valueChainStage: 'operations', microElement: "Comp", task: "Comp pull & analysis", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 're.app.3', industryId: 'tertiary.realestate.appraisal', valueChainStage: 'operations', microElement: "Inspection", task: "Property inspection capture", cadence: 'event', automatable: true },
  { id: 're.app.4', industryId: 'tertiary.realestate.appraisal', valueChainStage: 'service', microElement: "URAR", task: "URAR report generation", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 're.app.5', industryId: 'tertiary.realestate.appraisal', valueChainStage: 'marketing_sales', microElement: "Invoice", task: "Lender-invoice billing", cadence: 'event', automatable: true },
  // tertiary.realestate.title
  { id: 're.ttl.1', industryId: 'tertiary.realestate.title', valueChainStage: 'operations', microElement: "Title Search", task: "Title search workflow", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 're.ttl.2', industryId: 'tertiary.realestate.title', valueChainStage: 'service', microElement: "Commitment", task: "Title commitment issue", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 're.ttl.3', industryId: 'tertiary.realestate.title', valueChainStage: 'operations', microElement: "Escrow", task: "Escrow ledger", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 're.ttl.4', industryId: 'tertiary.realestate.title', valueChainStage: 'service', microElement: "Policy", task: "Title-policy issuance", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 're.ttl.5', industryId: 'tertiary.realestate.title', valueChainStage: 'marketing_sales', microElement: "Closing", task: "Closing-disbursement statement", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
];
