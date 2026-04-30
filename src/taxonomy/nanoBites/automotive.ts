import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for automotive
export const AUTOMOTIVE_BITES: NanoBite[] = [
  // tertiary.automotive.dealership
  { id: 'auto.dlr.1', industryId: 'tertiary.automotive.dealership', valueChainStage: 'marketing_sales', microElement: "Lead", task: "Lead intake & assign", cadence: 'daily', automatable: true },
  { id: 'auto.dlr.2', industryId: 'tertiary.automotive.dealership', valueChainStage: 'operations', microElement: "VIN Lookup", task: "VIN decode & inventory", cadence: 'event', automatable: true },
  { id: 'auto.dlr.3', industryId: 'tertiary.automotive.dealership', valueChainStage: 'marketing_sales', microElement: "Deal Jacket", task: "F&I deal-jacket flow", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'auto.dlr.4', industryId: 'tertiary.automotive.dealership', valueChainStage: 'service', microElement: "Trade In", task: "Trade-in appraisal", cadence: 'event', automatable: true },
  { id: 'auto.dlr.5', industryId: 'tertiary.automotive.dealership', valueChainStage: 'operations', microElement: "Reconditioning", task: "Recon work-order", cadence: 'daily', automatable: true },
  // tertiary.automotive.service_center
  { id: 'auto.svc.1', industryId: 'tertiary.automotive.service_center', valueChainStage: 'operations', microElement: "RO", task: "Repair-order open/close", cadence: 'daily', automatable: true },
  { id: 'auto.svc.2', industryId: 'tertiary.automotive.service_center', valueChainStage: 'operations', microElement: "Labor Matrix", task: "Labor-rate matrix", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'auto.svc.3', industryId: 'tertiary.automotive.service_center', valueChainStage: 'procurement', microElement: "Parts Pull", task: "Parts pull from RO", cadence: 'event', automatable: true },
  { id: 'auto.svc.4', industryId: 'tertiary.automotive.service_center', valueChainStage: 'service', microElement: "Inspection", task: "Multi-point inspection", cadence: 'event', automatable: true },
  { id: 'auto.svc.5', industryId: 'tertiary.automotive.service_center', valueChainStage: 'marketing_sales', microElement: "Estimate", task: "Customer-approval estimate", cadence: 'event', automatable: true },
  // tertiary.automotive.parts_store
  { id: 'auto.parts.1', industryId: 'tertiary.automotive.parts_store', valueChainStage: 'operations', microElement: "Catalog", task: "Parts-catalog lookup", cadence: 'daily', automatable: true },
  { id: 'auto.parts.2', industryId: 'tertiary.automotive.parts_store', valueChainStage: 'inbound_logistics', microElement: "Core Return", task: "Core-return tracking", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'auto.parts.3', industryId: 'tertiary.automotive.parts_store', valueChainStage: 'marketing_sales', microElement: "Counter Sale", task: "Counter-sale ticket", cadence: 'daily', automatable: true },
  { id: 'auto.parts.4', industryId: 'tertiary.automotive.parts_store', valueChainStage: 'operations', microElement: "Cycle Count", task: "Bin cycle count", cadence: 'weekly', automatable: true },
  { id: 'auto.parts.5', industryId: 'tertiary.automotive.parts_store', valueChainStage: 'outbound_logistics', microElement: "Hot Shot", task: "Hot-shot delivery dispatch", cadence: 'event', automatable: true },
  // tertiary.automotive.rental
  { id: 'auto.rent.1', industryId: 'tertiary.automotive.rental', valueChainStage: 'operations', microElement: "Reservation", task: "Vehicle reservation", cadence: 'daily', automatable: true },
  { id: 'auto.rent.2', industryId: 'tertiary.automotive.rental', valueChainStage: 'operations', microElement: "Check-out", task: "Vehicle check-out + photos", cadence: 'event', automatable: true },
  { id: 'auto.rent.3', industryId: 'tertiary.automotive.rental', valueChainStage: 'service', microElement: "Damage", task: "Damage claim photos", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'auto.rent.4', industryId: 'tertiary.automotive.rental', valueChainStage: 'marketing_sales', microElement: "Insurance", task: "Loss-damage waiver upsell", cadence: 'event', automatable: true },
  { id: 'auto.rent.5', industryId: 'tertiary.automotive.rental', valueChainStage: 'operations', microElement: "Fleet Rotate", task: "Fleet rotation schedule", cadence: 'weekly', automatable: true },
  // tertiary.automotive.car_wash
  { id: 'auto.wash.1', industryId: 'tertiary.automotive.car_wash', valueChainStage: 'operations', microElement: "Tunnel", task: "Tunnel throughput count", cadence: 'daily', automatable: true },
  { id: 'auto.wash.2', industryId: 'tertiary.automotive.car_wash', valueChainStage: 'marketing_sales', microElement: "Unlimited", task: "Unlimited-wash club billing", cadence: 'monthly', automatable: true },
  { id: 'auto.wash.3', industryId: 'tertiary.automotive.car_wash', valueChainStage: 'operations', microElement: "Detail Bay", task: "Detail bay scheduling", cadence: 'daily', automatable: true },
  { id: 'auto.wash.4', industryId: 'tertiary.automotive.car_wash', valueChainStage: 'operations', microElement: "Chem PAR", task: "Chemical PAR refill", cadence: 'weekly', automatable: true },
  { id: 'auto.wash.5', industryId: 'tertiary.automotive.car_wash', valueChainStage: 'infrastructure', microElement: "Reclaim", task: "Water-reclaim log", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  // tertiary.automotive.fleet_management
  { id: 'auto.fleet.1', industryId: 'tertiary.automotive.fleet_management', valueChainStage: 'operations', microElement: "PM Schedule", task: "Preventive-maintenance schedule", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'auto.fleet.2', industryId: 'tertiary.automotive.fleet_management', valueChainStage: 'operations', microElement: "Telematics", task: "Telematics ingest", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'auto.fleet.3', industryId: 'tertiary.automotive.fleet_management', valueChainStage: 'service', microElement: "Driver Score", task: "Driver-score report", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'auto.fleet.4', industryId: 'tertiary.automotive.fleet_management', valueChainStage: 'procurement', microElement: "Fuel Card", task: "Fuel-card reconciliation", cadence: 'weekly', automatable: true },
  { id: 'auto.fleet.5', industryId: 'tertiary.automotive.fleet_management', valueChainStage: 'infrastructure', microElement: "DOT Log", task: "DOT compliance log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
];
