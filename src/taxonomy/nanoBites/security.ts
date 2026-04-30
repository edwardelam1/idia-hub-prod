import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for security
export const SECURITY_BITES: NanoBite[] = [
  // tertiary.security.private_security
  { id: 'sec.pr.1', industryId: 'tertiary.security.private_security', valueChainStage: 'operations', microElement: "Post Order", task: "Guard post-order", cadence: 'daily', automatable: true },
  { id: 'sec.pr.2', industryId: 'tertiary.security.private_security', valueChainStage: 'operations', microElement: "Tour", task: "Guard-tour scan log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'sec.pr.3', industryId: 'tertiary.security.private_security', valueChainStage: 'service', microElement: "Incident", task: "Incident report", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'sec.pr.4', industryId: 'tertiary.security.private_security', valueChainStage: 'marketing_sales', microElement: "Contract", task: "Site-contract billing", cadence: 'monthly', automatable: true },
  { id: 'sec.pr.5', industryId: 'tertiary.security.private_security', valueChainStage: 'operations', microElement: "Schedule", task: "Guard-schedule mgmt", cadence: 'weekly', automatable: true },
  // tertiary.security.alarm_systems
  { id: 'sec.al.1', industryId: 'tertiary.security.alarm_systems', valueChainStage: 'service', microElement: "Install", task: "Alarm-install dispatch", cadence: 'event', automatable: true },
  { id: 'sec.al.2', industryId: 'tertiary.security.alarm_systems', valueChainStage: 'service', microElement: "Monitoring", task: "Monitoring-event log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'sec.al.3', industryId: 'tertiary.security.alarm_systems', valueChainStage: 'marketing_sales', microElement: "RMR", task: "Recurring monitoring-revenue billing", cadence: 'monthly', automatable: true },
  { id: 'sec.al.4', industryId: 'tertiary.security.alarm_systems', valueChainStage: 'service', microElement: "False Alarm", task: "False-alarm ticket", cadence: 'event', automatable: true },
  { id: 'sec.al.5', industryId: 'tertiary.security.alarm_systems', valueChainStage: 'operations', microElement: "Inspection", task: "System inspection", cadence: 'monthly', automatable: true },
  // tertiary.security.surveillance
  { id: 'sec.sv.1', industryId: 'tertiary.security.surveillance', valueChainStage: 'operations', microElement: "Camera", task: "Camera-health monitor", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'sec.sv.2', industryId: 'tertiary.security.surveillance', valueChainStage: 'service', microElement: "Footage", task: "Footage-pull request", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'sec.sv.3', industryId: 'tertiary.security.surveillance', valueChainStage: 'service', microElement: "Install", task: "Install/repair dispatch", cadence: 'event', automatable: true },
  { id: 'sec.sv.4', industryId: 'tertiary.security.surveillance', valueChainStage: 'marketing_sales', microElement: "Service Plan", task: "Service-plan billing", cadence: 'monthly', automatable: true },
  { id: 'sec.sv.5', industryId: 'tertiary.security.surveillance', valueChainStage: 'infrastructure', microElement: "Retention", task: "Footage-retention policy", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  // tertiary.security.cybersecurity
  { id: 'sec.cy.1', industryId: 'tertiary.security.cybersecurity', valueChainStage: 'service', microElement: "Incident", task: "Incident-response ticket", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'sec.cy.2', industryId: 'tertiary.security.cybersecurity', valueChainStage: 'operations', microElement: "SOC", task: "SOC alert triage", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'sec.cy.3', industryId: 'tertiary.security.cybersecurity', valueChainStage: 'marketing_sales', microElement: "MSSP", task: "MSSP recurring billing", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'sec.cy.4', industryId: 'tertiary.security.cybersecurity', valueChainStage: 'service', microElement: "Pen Test", task: "Pen-test engagement", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'sec.cy.5', industryId: 'tertiary.security.cybersecurity', valueChainStage: 'infrastructure', microElement: "Compliance", task: "Compliance audit log", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
];
