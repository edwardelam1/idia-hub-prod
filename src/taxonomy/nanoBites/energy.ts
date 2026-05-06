import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for energy
export const ENERGY_BITES: NanoBite[] = [
  // primary.energy.solar
  { id: 'en.sol.1', industryId: 'primary.energy.solar', valueChainStage: 'operations', microElement: "Generation", task: "Generation telemetry", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'en.sol.2', industryId: 'primary.energy.solar', valueChainStage: 'marketing_sales', microElement: "PPA", task: "PPA contract billing", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'en.sol.3', industryId: 'primary.energy.solar', valueChainStage: 'service', microElement: "Inverter Alert", task: "Inverter fault alert", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'en.sol.4', industryId: 'primary.energy.solar', valueChainStage: 'operations', microElement: "Site Audit", task: "Site performance audit", cadence: 'monthly', automatable: true },
  { id: 'en.sol.5', industryId: 'primary.energy.solar', valueChainStage: 'infrastructure', microElement: "REC", task: "Renewable-energy-credit log", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // primary.energy.wind
  { id: 'en.wd.1', industryId: 'primary.energy.wind', valueChainStage: 'operations', microElement: "Generation", task: "Turbine generation log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'en.wd.2', industryId: 'primary.energy.wind', valueChainStage: 'operations', microElement: "PM Schedule", task: "Turbine PM schedule", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'en.wd.3', industryId: 'primary.energy.wind', valueChainStage: 'service', microElement: "Curtailment", task: "Grid curtailment event", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'en.wd.4', industryId: 'primary.energy.wind', valueChainStage: 'infrastructure', microElement: "REC", task: "Renewable-energy-credit log", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  { id: 'en.wd.5', industryId: 'primary.energy.wind', valueChainStage: 'operations', microElement: "Wind Forecast", task: "Wind-forecast feed", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  // primary.energy.oil_gas
  { id: 'en.og.1', industryId: 'primary.energy.oil_gas', valueChainStage: 'operations', microElement: "Production", task: "Daily production volume", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'en.og.2', industryId: 'primary.energy.oil_gas', valueChainStage: 'outbound_logistics', microElement: "Run Ticket", task: "Crude run-ticket", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'en.og.3', industryId: 'primary.energy.oil_gas', valueChainStage: 'infrastructure', microElement: "HSE", task: "HSE incident log", cadence: 'weekly', automatable: true, requiresTier: 'enterprise' },
  { id: 'en.og.4', industryId: 'primary.energy.oil_gas', valueChainStage: 'service', microElement: "Royalty", task: "Royalty disbursement", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  { id: 'en.og.5', industryId: 'primary.energy.oil_gas', valueChainStage: 'operations', microElement: "Well Test", task: "Well-test capture", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  // primary.energy.electric_utility
  { id: 'en.el.1', industryId: 'primary.energy.electric_utility', valueChainStage: 'operations', microElement: "Meter Read", task: "AMI meter ingest", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'en.el.2', industryId: 'primary.energy.electric_utility', valueChainStage: 'marketing_sales', microElement: "Billing", task: "Tariff billing run", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  { id: 'en.el.3', industryId: 'primary.energy.electric_utility', valueChainStage: 'service', microElement: "Outage", task: "Outage ticket", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'en.el.4', industryId: 'primary.energy.electric_utility', valueChainStage: 'operations', microElement: "Demand", task: "Demand-response signal", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'en.el.5', industryId: 'primary.energy.electric_utility', valueChainStage: 'infrastructure', microElement: "SAIDI", task: "Reliability index report", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // primary.energy.water_treatment
  { id: 'en.wt.1', industryId: 'primary.energy.water_treatment', valueChainStage: 'operations', microElement: "Plant Run", task: "Plant run-log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'en.wt.2', industryId: 'primary.energy.water_treatment', valueChainStage: 'operations', microElement: "Sample", task: "Compliance sample log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'en.wt.3', industryId: 'primary.energy.water_treatment', valueChainStage: 'operations', microElement: "Chem Dose", task: "Chemical dose log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'en.wt.4', industryId: 'primary.energy.water_treatment', valueChainStage: 'service', microElement: "DBP Test", task: "DBP regulatory report", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  { id: 'en.wt.5', industryId: 'primary.energy.water_treatment', valueChainStage: 'infrastructure', microElement: "SCADA", task: "SCADA telemetry", cadence: 'daily', automatable: true, requiresTier: 'pro' },
];
