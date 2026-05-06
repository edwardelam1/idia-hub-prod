import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for construction-extended
export const CONSTRUCTION_EXTENDED_BITES: NanoBite[] = [
  // secondary.construction.general_contractor
  { id: 'con.gc.1', industryId: 'secondary.construction.general_contractor', valueChainStage: 'operations', microElement: "Job Cost", task: "Job-cost ledger", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'con.gc.2', industryId: 'secondary.construction.general_contractor', valueChainStage: 'marketing_sales', microElement: "Change Order", task: "Change-order workflow", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'con.gc.3', industryId: 'secondary.construction.general_contractor', valueChainStage: 'infrastructure', microElement: "Permit", task: "Permit tracking", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'con.gc.4', industryId: 'secondary.construction.general_contractor', valueChainStage: 'operations', microElement: "Daily Log", task: "Daily superintendent log", cadence: 'daily', automatable: true },
  { id: 'con.gc.5', industryId: 'secondary.construction.general_contractor', valueChainStage: 'marketing_sales', microElement: "Lien", task: "Lien-waiver collection", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // secondary.construction.electrical
  { id: 'con.el.1', industryId: 'secondary.construction.electrical', valueChainStage: 'operations', microElement: "Job Cost", task: "Job-cost ledger", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'con.el.2', industryId: 'secondary.construction.electrical', valueChainStage: 'operations', microElement: "Service Call", task: "Service-call dispatch", cadence: 'daily', automatable: true },
  { id: 'con.el.3', industryId: 'secondary.construction.electrical', valueChainStage: 'procurement', microElement: "Wire Pull", task: "Wire-pull material list", cadence: 'event', automatable: true },
  { id: 'con.el.4', industryId: 'secondary.construction.electrical', valueChainStage: 'infrastructure', microElement: "Permit", task: "Electrical permit", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'con.el.5', industryId: 'secondary.construction.electrical', valueChainStage: 'service', microElement: "Inspection", task: "Final inspection sign-off", cadence: 'event', automatable: true },
  // secondary.construction.plumbing
  { id: 'con.pl.1', industryId: 'secondary.construction.plumbing', valueChainStage: 'operations', microElement: "Service Call", task: "Service-call dispatch", cadence: 'daily', automatable: true },
  { id: 'con.pl.2', industryId: 'secondary.construction.plumbing', valueChainStage: 'operations', microElement: "Job Cost", task: "Job-cost ledger", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'con.pl.3', industryId: 'secondary.construction.plumbing', valueChainStage: 'marketing_sales', microElement: "Quote", task: "On-site quote", cadence: 'event', automatable: true },
  { id: 'con.pl.4', industryId: 'secondary.construction.plumbing', valueChainStage: 'infrastructure', microElement: "Permit", task: "Plumbing permit", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'con.pl.5', industryId: 'secondary.construction.plumbing', valueChainStage: 'service', microElement: "Warranty", task: "Warranty callback", cadence: 'event', automatable: true },
  // secondary.construction.hvac
  { id: 'con.hv.1', industryId: 'secondary.construction.hvac', valueChainStage: 'operations', microElement: "Service Call", task: "Service-call dispatch", cadence: 'daily', automatable: true },
  { id: 'con.hv.2', industryId: 'secondary.construction.hvac', valueChainStage: 'marketing_sales', microElement: "Maintenance Plan", task: "Annual maintenance plan", cadence: 'monthly', automatable: true },
  { id: 'con.hv.3', industryId: 'secondary.construction.hvac', valueChainStage: 'procurement', microElement: "Equipment", task: "Equipment proposal", cadence: 'event', automatable: true },
  { id: 'con.hv.4', industryId: 'secondary.construction.hvac', valueChainStage: 'infrastructure', microElement: "Refrig Log", task: "Refrigerant handling log", cadence: 'weekly', automatable: true, requiresTier: 'enterprise' },
  { id: 'con.hv.5', industryId: 'secondary.construction.hvac', valueChainStage: 'operations', microElement: "Job Cost", task: "Job-cost ledger", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  // secondary.construction.landscaping
  { id: 'con.ls.1', industryId: 'secondary.construction.landscaping', valueChainStage: 'operations', microElement: "Route", task: "Crew-route schedule", cadence: 'daily', automatable: true },
  { id: 'con.ls.2', industryId: 'secondary.construction.landscaping', valueChainStage: 'marketing_sales', microElement: "Recurring", task: "Recurring service contract", cadence: 'monthly', automatable: true },
  { id: 'con.ls.3', industryId: 'secondary.construction.landscaping', valueChainStage: 'operations', microElement: "Job Cost", task: "Job-cost ledger", cadence: 'daily', automatable: true },
  { id: 'con.ls.4', industryId: 'secondary.construction.landscaping', valueChainStage: 'procurement', microElement: "Material", task: "Plant-material take-off", cadence: 'event', automatable: true },
  { id: 'con.ls.5', industryId: 'secondary.construction.landscaping', valueChainStage: 'service', microElement: "Photo Proof", task: "Before/after photo proof", cadence: 'event', automatable: true },
  // secondary.construction.roofing
  { id: 'con.rf.1', industryId: 'secondary.construction.roofing', valueChainStage: 'marketing_sales', microElement: "Inspection", task: "Roof inspection report", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'con.rf.2', industryId: 'secondary.construction.roofing', valueChainStage: 'marketing_sales', microElement: "Insurance", task: "Insurance-claim packet", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'con.rf.3', industryId: 'secondary.construction.roofing', valueChainStage: 'operations', microElement: "Job Cost", task: "Job-cost ledger", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'con.rf.4', industryId: 'secondary.construction.roofing', valueChainStage: 'infrastructure', microElement: "Permit", task: "Roofing permit", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'con.rf.5', industryId: 'secondary.construction.roofing', valueChainStage: 'service', microElement: "Warranty", task: "Manufacturer warranty file", cadence: 'event', automatable: true },
];
