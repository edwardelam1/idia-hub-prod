import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for agriculture
export const AGRICULTURE_BITES: NanoBite[] = [
  // primary.agriculture.farming
  { id: 'agr.farm.1', industryId: 'primary.agriculture.farming', valueChainStage: 'operations', microElement: "Field Op", task: "Field-operations log", cadence: 'daily', automatable: true },
  { id: 'agr.farm.2', industryId: 'primary.agriculture.farming', valueChainStage: 'operations', microElement: "Yield", task: "Per-field yield log", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'agr.farm.3', industryId: 'primary.agriculture.farming', valueChainStage: 'inbound_logistics', microElement: "Inputs", task: "Seed/fert/chem application", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'agr.farm.4', industryId: 'primary.agriculture.farming', valueChainStage: 'operations', microElement: "Irrigation", task: "Irrigation cycle log", cadence: 'daily', automatable: true },
  { id: 'agr.farm.5', industryId: 'primary.agriculture.farming', valueChainStage: 'outbound_logistics', microElement: "Harvest", task: "Harvest scale ticket", cadence: 'event', automatable: true },
  // primary.agriculture.ranching
  { id: 'agr.rnch.1', industryId: 'primary.agriculture.ranching', valueChainStage: 'operations', microElement: "Headcount", task: "Livestock headcount", cadence: 'daily', automatable: true },
  { id: 'agr.rnch.2', industryId: 'primary.agriculture.ranching', valueChainStage: 'operations', microElement: "Health", task: "Animal health/vax log", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'agr.rnch.3', industryId: 'primary.agriculture.ranching', valueChainStage: 'inbound_logistics', microElement: "Feed", task: "Feed-issue log", cadence: 'daily', automatable: true },
  { id: 'agr.rnch.4', industryId: 'primary.agriculture.ranching', valueChainStage: 'operations', microElement: "Pasture", task: "Pasture rotation", cadence: 'weekly', automatable: true },
  { id: 'agr.rnch.5', industryId: 'primary.agriculture.ranching', valueChainStage: 'outbound_logistics', microElement: "Sale", task: "Auction sale ticket", cadence: 'event', automatable: true },
  // primary.agriculture.aquaculture
  { id: 'agr.aqua.1', industryId: 'primary.agriculture.aquaculture', valueChainStage: 'operations', microElement: "Feed", task: "Feed-conversion log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'agr.aqua.2', industryId: 'primary.agriculture.aquaculture', valueChainStage: 'operations', microElement: "Water QA", task: "Water-quality log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'agr.aqua.3', industryId: 'primary.agriculture.aquaculture', valueChainStage: 'operations', microElement: "Mortality", task: "Mortality log", cadence: 'daily', automatable: true },
  { id: 'agr.aqua.4', industryId: 'primary.agriculture.aquaculture', valueChainStage: 'outbound_logistics', microElement: "Harvest", task: "Harvest schedule", cadence: 'event', automatable: true },
  { id: 'agr.aqua.5', industryId: 'primary.agriculture.aquaculture', valueChainStage: 'infrastructure', microElement: "Permit", task: "Aquaculture permit log", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // primary.agriculture.greenhouse
  { id: 'agr.gh.1', industryId: 'primary.agriculture.greenhouse', valueChainStage: 'operations', microElement: "Climate", task: "Climate setpoint log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'agr.gh.2', industryId: 'primary.agriculture.greenhouse', valueChainStage: 'operations', microElement: "Irrigation", task: "Drip-irrigation cycle", cadence: 'daily', automatable: true },
  { id: 'agr.gh.3', industryId: 'primary.agriculture.greenhouse', valueChainStage: 'operations', microElement: "IPM", task: "IPM scouting log", cadence: 'weekly', automatable: true },
  { id: 'agr.gh.4', industryId: 'primary.agriculture.greenhouse', valueChainStage: 'inbound_logistics', microElement: "Propagation", task: "Propagation lot", cadence: 'event', automatable: true },
  { id: 'agr.gh.5', industryId: 'primary.agriculture.greenhouse', valueChainStage: 'outbound_logistics', microElement: "Pack Out", task: "Pack-out yield", cadence: 'daily', automatable: true },
  // primary.agriculture.equipment_rental
  { id: 'agr.eqr.1', industryId: 'primary.agriculture.equipment_rental', valueChainStage: 'operations', microElement: "Reservation", task: "Equipment reservation", cadence: 'daily', automatable: true },
  { id: 'agr.eqr.2', industryId: 'primary.agriculture.equipment_rental', valueChainStage: 'operations', microElement: "Check-out", task: "Pre-rental walkaround", cadence: 'event', automatable: true },
  { id: 'agr.eqr.3', industryId: 'primary.agriculture.equipment_rental', valueChainStage: 'service', microElement: "Hour Meter", task: "Hour-meter capture", cadence: 'event', automatable: true },
  { id: 'agr.eqr.4', industryId: 'primary.agriculture.equipment_rental', valueChainStage: 'marketing_sales', microElement: "Damage", task: "Damage waiver upsell", cadence: 'event', automatable: true },
  { id: 'agr.eqr.5', industryId: 'primary.agriculture.equipment_rental', valueChainStage: 'operations', microElement: "PM", task: "Return-PM schedule", cadence: 'weekly', automatable: true },
];
