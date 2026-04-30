import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for telecom
export const TELECOM_BITES: NanoBite[] = [
  // quaternary.telecom.isp
  { id: 'tel.isp.1', industryId: 'quaternary.telecom.isp', valueChainStage: 'marketing_sales', microElement: "Subscription", task: "Recurring service billing", cadence: 'monthly', automatable: true },
  { id: 'tel.isp.2', industryId: 'quaternary.telecom.isp', valueChainStage: 'service', microElement: "Provisioning", task: "Service provisioning", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'tel.isp.3', industryId: 'quaternary.telecom.isp', valueChainStage: 'operations', microElement: "OSS", task: "OSS topology sync", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'tel.isp.4', industryId: 'quaternary.telecom.isp', valueChainStage: 'service', microElement: "Trouble Ticket", task: "Trouble-ticket dispatch", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'tel.isp.5', industryId: 'quaternary.telecom.isp', valueChainStage: 'infrastructure', microElement: "SLA", task: "SLA credit calculation", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // quaternary.telecom.mobile_carrier
  { id: 'tel.mb.1', industryId: 'quaternary.telecom.mobile_carrier', valueChainStage: 'marketing_sales', microElement: "Activation", task: "SIM/eSIM activation", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'tel.mb.2', industryId: 'quaternary.telecom.mobile_carrier', valueChainStage: 'marketing_sales', microElement: "Plan", task: "Plan-change billing", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'tel.mb.3', industryId: 'quaternary.telecom.mobile_carrier', valueChainStage: 'service', microElement: "Roaming", task: "Roaming-charge log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'tel.mb.4', industryId: 'quaternary.telecom.mobile_carrier', valueChainStage: 'operations', microElement: "Number Port", task: "Number-port workflow", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'tel.mb.5', industryId: 'quaternary.telecom.mobile_carrier', valueChainStage: 'infrastructure', microElement: "LERG", task: "LERG compliance log", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // quaternary.telecom.cable
  { id: 'tel.cb.1', industryId: 'quaternary.telecom.cable', valueChainStage: 'marketing_sales', microElement: "Subscription", task: "TV/Internet bundle billing", cadence: 'monthly', automatable: true },
  { id: 'tel.cb.2', industryId: 'quaternary.telecom.cable', valueChainStage: 'service', microElement: "Install", task: "Install-truck-roll dispatch", cadence: 'daily', automatable: true },
  { id: 'tel.cb.3', industryId: 'quaternary.telecom.cable', valueChainStage: 'service', microElement: "Outage", task: "Outage ticket", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'tel.cb.4', industryId: 'quaternary.telecom.cable', valueChainStage: 'operations', microElement: "STB", task: "STB inventory tracking", cadence: 'daily', automatable: true },
  { id: 'tel.cb.5', industryId: 'quaternary.telecom.cable', valueChainStage: 'marketing_sales', microElement: "Upgrade", task: "Service upgrade upsell", cadence: 'event', automatable: true },
  // quaternary.telecom.satellite
  { id: 'tel.sat.1', industryId: 'quaternary.telecom.satellite', valueChainStage: 'marketing_sales', microElement: "Subscription", task: "Satellite-service billing", cadence: 'monthly', automatable: true },
  { id: 'tel.sat.2', industryId: 'quaternary.telecom.satellite', valueChainStage: 'service', microElement: "Install", task: "Dish install dispatch", cadence: 'event', automatable: true },
  { id: 'tel.sat.3', industryId: 'quaternary.telecom.satellite', valueChainStage: 'service', microElement: "Outage", task: "Signal-outage ticket", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'tel.sat.4', industryId: 'quaternary.telecom.satellite', valueChainStage: 'operations', microElement: "Beam Plan", task: "Beam-capacity planning", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'tel.sat.5', industryId: 'quaternary.telecom.satellite', valueChainStage: 'infrastructure', microElement: "FCC Log", task: "Satellite FCC compliance", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // quaternary.telecom.data_centers
  { id: 'tel.dc.1', industryId: 'quaternary.telecom.data_centers', valueChainStage: 'operations', microElement: "Rack/Stack", task: "Rack-stack work order", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'tel.dc.2', industryId: 'quaternary.telecom.data_centers', valueChainStage: 'marketing_sales', microElement: "Cross-Connect", task: "Cross-connect billing", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'tel.dc.3', industryId: 'quaternary.telecom.data_centers', valueChainStage: 'service', microElement: "Smart Hands", task: "Smart-hands ticket", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'tel.dc.4', industryId: 'quaternary.telecom.data_centers', valueChainStage: 'infrastructure', microElement: "PUE", task: "Power & PUE telemetry", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'tel.dc.5', industryId: 'quaternary.telecom.data_centers', valueChainStage: 'infrastructure', microElement: "SLA", task: "Uptime SLA report", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
];
