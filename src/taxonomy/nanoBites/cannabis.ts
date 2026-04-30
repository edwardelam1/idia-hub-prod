import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for cannabis
export const CANNABIS_BITES: NanoBite[] = [
  // tertiary.cannabis.dispensary
  { id: 'can.dsp.1', industryId: 'tertiary.cannabis.dispensary', valueChainStage: 'service', microElement: "Age Gate", task: "Age & ID verification", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'can.dsp.2', industryId: 'tertiary.cannabis.dispensary', valueChainStage: 'operations', microElement: "Limit", task: "Daily-purchase-limit check", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'can.dsp.3', industryId: 'tertiary.cannabis.dispensary', valueChainStage: 'infrastructure', microElement: "Track-Trace", task: "Seed-to-sale trace event", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'can.dsp.4', industryId: 'tertiary.cannabis.dispensary', valueChainStage: 'marketing_sales', microElement: "Patient", task: "Medical-patient registry", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'can.dsp.5', industryId: 'tertiary.cannabis.dispensary', valueChainStage: 'operations', microElement: "Inventory Recon", task: "Daily inventory reconciliation", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  // tertiary.cannabis.cultivation
  { id: 'can.cul.1', industryId: 'tertiary.cannabis.cultivation', valueChainStage: 'operations', microElement: "Plant Tag", task: "Per-plant tag assign", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'can.cul.2', industryId: 'tertiary.cannabis.cultivation', valueChainStage: 'operations', microElement: "Phase", task: "Veg/flower-phase log", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'can.cul.3', industryId: 'tertiary.cannabis.cultivation', valueChainStage: 'operations', microElement: "Harvest", task: "Harvest-batch creation", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'can.cul.4', industryId: 'tertiary.cannabis.cultivation', valueChainStage: 'operations', microElement: "Waste", task: "Waste-disposal log", cadence: 'weekly', automatable: true, requiresTier: 'enterprise' },
  { id: 'can.cul.5', industryId: 'tertiary.cannabis.cultivation', valueChainStage: 'infrastructure', microElement: "Compliance", task: "State-tracking sync", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  // tertiary.cannabis.processing
  { id: 'can.prc.1', industryId: 'tertiary.cannabis.processing', valueChainStage: 'operations', microElement: "Batch", task: "Process-batch record", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'can.prc.2', industryId: 'tertiary.cannabis.processing', valueChainStage: 'outbound_logistics', microElement: "Package", task: "Package & label workflow", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'can.prc.3', industryId: 'tertiary.cannabis.processing', valueChainStage: 'operations', microElement: "Yield", task: "Extraction-yield log", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'can.prc.4', industryId: 'tertiary.cannabis.processing', valueChainStage: 'operations', microElement: "Waste", task: "Process-waste log", cadence: 'weekly', automatable: true, requiresTier: 'enterprise' },
  { id: 'can.prc.5', industryId: 'tertiary.cannabis.processing', valueChainStage: 'infrastructure', microElement: "Compliance", task: "State-tracking sync", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  // tertiary.cannabis.testing_lab
  { id: 'can.lab.1', industryId: 'tertiary.cannabis.testing_lab', valueChainStage: 'operations', microElement: "Sample", task: "Sample chain-of-custody", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'can.lab.2', industryId: 'tertiary.cannabis.testing_lab', valueChainStage: 'operations', microElement: "Test", task: "Potency / pesticide / micro test", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'can.lab.3', industryId: 'tertiary.cannabis.testing_lab', valueChainStage: 'service', microElement: "COA", task: "Certificate-of-analysis issue", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'can.lab.4', industryId: 'tertiary.cannabis.testing_lab', valueChainStage: 'operations', microElement: "Calibration", task: "Instrument calibration log", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'can.lab.5', industryId: 'tertiary.cannabis.testing_lab', valueChainStage: 'infrastructure', microElement: "Compliance", task: "State-tracking sync", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
];
