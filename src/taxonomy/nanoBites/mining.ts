import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for mining
export const MINING_BITES: NanoBite[] = [
  // primary.mining.mining
  { id: 'min.mine.1', industryId: 'primary.mining.mining', valueChainStage: 'operations', microElement: "Extraction", task: "Extraction-volume log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'min.mine.2', industryId: 'primary.mining.mining', valueChainStage: 'operations', microElement: "Haul Cycle", task: "Haul-cycle time", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'min.mine.3', industryId: 'primary.mining.mining', valueChainStage: 'operations', microElement: "Assay", task: "Assay sampling result", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'min.mine.4', industryId: 'primary.mining.mining', valueChainStage: 'infrastructure', microElement: "HSE", task: "MSHA incident log", cadence: 'weekly', automatable: true, requiresTier: 'enterprise' },
  { id: 'min.mine.5', industryId: 'primary.mining.mining', valueChainStage: 'outbound_logistics', microElement: "Stockpile", task: "Stockpile balance", cadence: 'daily', automatable: true },
  // primary.mining.quarrying
  { id: 'min.qry.1', industryId: 'primary.mining.quarrying', valueChainStage: 'operations', microElement: "Blast Plan", task: "Blast-plan log", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'min.qry.2', industryId: 'primary.mining.quarrying', valueChainStage: 'operations', microElement: "Crusher", task: "Crusher throughput", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'min.qry.3', industryId: 'primary.mining.quarrying', valueChainStage: 'outbound_logistics', microElement: "Truck Out", task: "Truck-out scale ticket", cadence: 'daily', automatable: true },
  { id: 'min.qry.4', industryId: 'primary.mining.quarrying', valueChainStage: 'operations', microElement: "Stockpile", task: "Stockpile survey", cadence: 'weekly', automatable: true },
  { id: 'min.qry.5', industryId: 'primary.mining.quarrying', valueChainStage: 'infrastructure', microElement: "Permit", task: "Reclamation bond log", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // primary.mining.drilling
  { id: 'min.drl.1', industryId: 'primary.mining.drilling', valueChainStage: 'operations', microElement: "Drill Log", task: "Drill-progress log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'min.drl.2', industryId: 'primary.mining.drilling', valueChainStage: 'operations', microElement: "Mud Report", task: "Daily mud report", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'min.drl.3', industryId: 'primary.mining.drilling', valueChainStage: 'service', microElement: "BHA", task: "BHA assembly record", cadence: 'event', automatable: true },
  { id: 'min.drl.4', industryId: 'primary.mining.drilling', valueChainStage: 'infrastructure', microElement: "HSE", task: "HSE incident log", cadence: 'weekly', automatable: true, requiresTier: 'enterprise' },
  { id: 'min.drl.5', industryId: 'primary.mining.drilling', valueChainStage: 'procurement', microElement: "Bit Use", task: "Drill-bit usage", cadence: 'event', automatable: true },
  // primary.mining.refining
  { id: 'min.ref.1', industryId: 'primary.mining.refining', valueChainStage: 'operations', microElement: "Throughput", task: "Refinery throughput", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'min.ref.2', industryId: 'primary.mining.refining', valueChainStage: 'operations', microElement: "Yield", task: "Recovery yield %", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'min.ref.3', industryId: 'primary.mining.refining', valueChainStage: 'operations', microElement: "Furnace", task: "Furnace temp log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'min.ref.4', industryId: 'primary.mining.refining', valueChainStage: 'outbound_logistics', microElement: "Bullion", task: "Bullion pour record", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'min.ref.5', industryId: 'primary.mining.refining', valueChainStage: 'infrastructure', microElement: "Emissions", task: "Emissions monitoring", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
];
