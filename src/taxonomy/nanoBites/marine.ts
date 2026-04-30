import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for marine
export const MARINE_BITES: NanoBite[] = [
  // tertiary.marine.shipping
  { id: 'mar.shp.1', industryId: 'tertiary.marine.shipping', valueChainStage: 'outbound_logistics', microElement: "BOL", task: "Bill-of-lading creation", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mar.shp.2', industryId: 'tertiary.marine.shipping', valueChainStage: 'operations', microElement: "Container", task: "Container-track ingest", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mar.shp.3', industryId: 'tertiary.marine.shipping', valueChainStage: 'infrastructure', microElement: "Customs", task: "Customs filing", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'mar.shp.4', industryId: 'tertiary.marine.shipping', valueChainStage: 'marketing_sales', microElement: "Freight", task: "Freight quote", cadence: 'event', automatable: true },
  { id: 'mar.shp.5', industryId: 'tertiary.marine.shipping', valueChainStage: 'service', microElement: "Demurrage", task: "Demurrage tracking", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  // tertiary.marine.port_operations
  { id: 'mar.prt.1', industryId: 'tertiary.marine.port_operations', valueChainStage: 'operations', microElement: "Berth", task: "Berth allocation", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mar.prt.2', industryId: 'tertiary.marine.port_operations', valueChainStage: 'operations', microElement: "Crane Move", task: "Crane-move count", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mar.prt.3', industryId: 'tertiary.marine.port_operations', valueChainStage: 'outbound_logistics', microElement: "Yard", task: "Yard-stack mgmt", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'mar.prt.4', industryId: 'tertiary.marine.port_operations', valueChainStage: 'service', microElement: "Gate", task: "Gate-in/gate-out scan", cadence: 'daily', automatable: true },
  { id: 'mar.prt.5', industryId: 'tertiary.marine.port_operations', valueChainStage: 'infrastructure', microElement: "HSE", task: "Port HSE log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  // tertiary.marine.boat_sales
  { id: 'mar.bs.1', industryId: 'tertiary.marine.boat_sales', valueChainStage: 'marketing_sales', microElement: "Lead", task: "Lead intake", cadence: 'daily', automatable: true },
  { id: 'mar.bs.2', industryId: 'tertiary.marine.boat_sales', valueChainStage: 'operations', microElement: "HIN", task: "HIN decode & inventory", cadence: 'event', automatable: true },
  { id: 'mar.bs.3', industryId: 'tertiary.marine.boat_sales', valueChainStage: 'marketing_sales', microElement: "Finance", task: "Marine-finance application", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'mar.bs.4', industryId: 'tertiary.marine.boat_sales', valueChainStage: 'service', microElement: "Trade In", task: "Trade-in survey", cadence: 'event', automatable: true },
  { id: 'mar.bs.5', industryId: 'tertiary.marine.boat_sales', valueChainStage: 'operations', microElement: "Rigging", task: "Pre-delivery rigging", cadence: 'event', automatable: true },
  // tertiary.marine.marina
  { id: 'mar.mar.1', industryId: 'tertiary.marine.marina', valueChainStage: 'operations', microElement: "Slip", task: "Slip assignment", cadence: 'daily', automatable: true },
  { id: 'mar.mar.2', industryId: 'tertiary.marine.marina', valueChainStage: 'marketing_sales', microElement: "Slip Rent", task: "Slip-rental contract", cadence: 'monthly', automatable: true },
  { id: 'mar.mar.3', industryId: 'tertiary.marine.marina', valueChainStage: 'operations', microElement: "Fuel Dock", task: "Fuel-dock dispense", cadence: 'daily', automatable: true },
  { id: 'mar.mar.4', industryId: 'tertiary.marine.marina', valueChainStage: 'operations', microElement: "Pump Out", task: "Pump-out log", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'mar.mar.5', industryId: 'tertiary.marine.marina', valueChainStage: 'service', microElement: "Service Yard", task: "Service-yard work order", cadence: 'event', automatable: true },
  // tertiary.marine.commercial_fishing
  { id: 'mar.fsh.1', industryId: 'tertiary.marine.commercial_fishing', valueChainStage: 'operations', microElement: "Catch Log", task: "Catch-log entry", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'mar.fsh.2', industryId: 'tertiary.marine.commercial_fishing', valueChainStage: 'outbound_logistics', microElement: "Offload", task: "Offload ticket", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'mar.fsh.3', industryId: 'tertiary.marine.commercial_fishing', valueChainStage: 'infrastructure', microElement: "Quota", task: "Quota balance log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'mar.fsh.4', industryId: 'tertiary.marine.commercial_fishing', valueChainStage: 'operations', microElement: "Crew Share", task: "Crew-share calculation", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'mar.fsh.5', industryId: 'tertiary.marine.commercial_fishing', valueChainStage: 'service', microElement: "VMS", task: "Vessel-monitoring ping", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
];
