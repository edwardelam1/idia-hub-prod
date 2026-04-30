import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for funeral
export const FUNERAL_BITES: NanoBite[] = [
  // quinary.funeral.funeral_home
  { id: 'fun.home.1', industryId: 'quinary.funeral.funeral_home', valueChainStage: 'operations', microElement: "Case File", task: "Decedent case file", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'fun.home.2', industryId: 'quinary.funeral.funeral_home', valueChainStage: 'infrastructure', microElement: "Permit", task: "Disposition permit", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'fun.home.3', industryId: 'quinary.funeral.funeral_home', valueChainStage: 'operations', microElement: "Service Plan", task: "Service plan & schedule", cadence: 'event', automatable: true },
  { id: 'fun.home.4', industryId: 'quinary.funeral.funeral_home', valueChainStage: 'marketing_sales', microElement: "Pre-Need", task: "Pre-need contract", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'fun.home.5', industryId: 'quinary.funeral.funeral_home', valueChainStage: 'service', microElement: "Aftercare", task: "Family aftercare", cadence: 'monthly', automatable: true },
  // quinary.funeral.cemetery
  { id: 'fun.cem.1', industryId: 'quinary.funeral.cemetery', valueChainStage: 'operations', microElement: "Plot Map", task: "Plot inventory & map", cadence: 'daily', automatable: true },
  { id: 'fun.cem.2', industryId: 'quinary.funeral.cemetery', valueChainStage: 'marketing_sales', microElement: "Plot Sale", task: "Plot sale contract", cadence: 'event', automatable: true },
  { id: 'fun.cem.3', industryId: 'quinary.funeral.cemetery', valueChainStage: 'operations', microElement: "Burial", task: "Burial schedule", cadence: 'daily', automatable: true },
  { id: 'fun.cem.4', industryId: 'quinary.funeral.cemetery', valueChainStage: 'service', microElement: "Maintenance", task: "Grounds maintenance log", cadence: 'weekly', automatable: true },
  { id: 'fun.cem.5', industryId: 'quinary.funeral.cemetery', valueChainStage: 'infrastructure', microElement: "Deed", task: "Deed of interment", cadence: 'event', automatable: true, requiresTier: 'pro' },
  // quinary.funeral.cremation
  { id: 'fun.crem.1', industryId: 'quinary.funeral.cremation', valueChainStage: 'operations', microElement: "Crem Log", task: "Cremation chain-of-custody", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'fun.crem.2', industryId: 'quinary.funeral.cremation', valueChainStage: 'infrastructure', microElement: "ID Verify", task: "Body identification verify", cadence: 'event', automatable: false, requiresTier: 'enterprise' },
  { id: 'fun.crem.3', industryId: 'quinary.funeral.cremation', valueChainStage: 'operations', microElement: "Retort Cycle", task: "Retort cycle log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'fun.crem.4', industryId: 'quinary.funeral.cremation', valueChainStage: 'service', microElement: "Urn Return", task: "Urn return to family", cadence: 'event', automatable: true },
  { id: 'fun.crem.5', industryId: 'quinary.funeral.cremation', valueChainStage: 'infrastructure', microElement: "Permit", task: "Cremation permit", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  // quinary.funeral.memorial
  { id: 'fun.mem.1', industryId: 'quinary.funeral.memorial', valueChainStage: 'operations', microElement: "Service Plan", task: "Memorial service plan", cadence: 'event', automatable: true },
  { id: 'fun.mem.2', industryId: 'quinary.funeral.memorial', valueChainStage: 'marketing_sales', microElement: "Tribute", task: "Online tribute page", cadence: 'event', automatable: true },
  { id: 'fun.mem.3', industryId: 'quinary.funeral.memorial', valueChainStage: 'outbound_logistics', microElement: "Live Stream", task: "Service live-stream", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'fun.mem.4', industryId: 'quinary.funeral.memorial', valueChainStage: 'service', microElement: "Guest Book", task: "Digital guest book", cadence: 'event', automatable: true },
  { id: 'fun.mem.5', industryId: 'quinary.funeral.memorial', valueChainStage: 'service', microElement: "Acknowledge", task: "Acknowledgement cards", cadence: 'event', automatable: true },
];
