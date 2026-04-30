import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for government
export const GOVERNMENT_BITES: NanoBite[] = [
  // quaternary.government.municipal
  { id: 'gov.mun.1', industryId: 'quaternary.government.municipal', valueChainStage: 'operations', microElement: "Permit", task: "Permit intake", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'gov.mun.2', industryId: 'quaternary.government.municipal', valueChainStage: 'marketing_sales', microElement: "Tax Bill", task: "Property-tax billing", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  { id: 'gov.mun.3', industryId: 'quaternary.government.municipal', valueChainStage: 'service', microElement: "Service Req", task: "311 service request", cadence: 'daily', automatable: true },
  { id: 'gov.mun.4', industryId: 'quaternary.government.municipal', valueChainStage: 'operations', microElement: "Inspection", task: "Inspection scheduling", cadence: 'daily', automatable: true },
  { id: 'gov.mun.5', industryId: 'quaternary.government.municipal', valueChainStage: 'infrastructure', microElement: "Public Record", task: "Public-record FOIA log", cadence: 'weekly', automatable: true, requiresTier: 'enterprise' },
  // quaternary.government.federal
  { id: 'gov.fed.1', industryId: 'quaternary.government.federal', valueChainStage: 'operations', microElement: "Case Mgmt", task: "Case-management intake", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'gov.fed.2', industryId: 'quaternary.government.federal', valueChainStage: 'service', microElement: "Benefit", task: "Benefits adjudication", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'gov.fed.3', industryId: 'quaternary.government.federal', valueChainStage: 'marketing_sales', microElement: "Grant", task: "Grant-award workflow", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'gov.fed.4', industryId: 'quaternary.government.federal', valueChainStage: 'infrastructure', microElement: "FISMA", task: "FISMA audit log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'gov.fed.5', industryId: 'quaternary.government.federal', valueChainStage: 'service', microElement: "Citizen Comm", task: "Citizen communication", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  // quaternary.government.courts
  { id: 'gov.ct.1', industryId: 'quaternary.government.courts', valueChainStage: 'operations', microElement: "Filing", task: "E-filing intake", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'gov.ct.2', industryId: 'quaternary.government.courts', valueChainStage: 'operations', microElement: "Docket", task: "Docket-calendar mgmt", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'gov.ct.3', industryId: 'quaternary.government.courts', valueChainStage: 'service', microElement: "Hearing", task: "Hearing scheduling", cadence: 'daily', automatable: true },
  { id: 'gov.ct.4', industryId: 'quaternary.government.courts', valueChainStage: 'marketing_sales', microElement: "Fee", task: "Court-fee collection", cadence: 'daily', automatable: true },
  { id: 'gov.ct.5', industryId: 'quaternary.government.courts', valueChainStage: 'infrastructure', microElement: "Sealed Doc", task: "Sealed-document audit", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  // quaternary.government.dmv
  { id: 'gov.dmv.1', industryId: 'quaternary.government.dmv', valueChainStage: 'operations', microElement: "Appointment", task: "Appointment booking", cadence: 'daily', automatable: true },
  { id: 'gov.dmv.2', industryId: 'quaternary.government.dmv', valueChainStage: 'operations', microElement: "License", task: "License issuance workflow", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'gov.dmv.3', industryId: 'quaternary.government.dmv', valueChainStage: 'operations', microElement: "Title", task: "Title-transfer workflow", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'gov.dmv.4', industryId: 'quaternary.government.dmv', valueChainStage: 'marketing_sales', microElement: "Fee", task: "DMV-fee collection", cadence: 'daily', automatable: true },
  { id: 'gov.dmv.5', industryId: 'quaternary.government.dmv', valueChainStage: 'infrastructure', microElement: "REAL ID", task: "REAL ID document audit", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  // quaternary.government.parks_recreation
  { id: 'gov.pk.1', industryId: 'quaternary.government.parks_recreation', valueChainStage: 'operations', microElement: "Reservation", task: "Site/shelter reservation", cadence: 'daily', automatable: true },
  { id: 'gov.pk.2', industryId: 'quaternary.government.parks_recreation', valueChainStage: 'marketing_sales', microElement: "Permit", task: "Special-event permit", cadence: 'event', automatable: true },
  { id: 'gov.pk.3', industryId: 'quaternary.government.parks_recreation', valueChainStage: 'operations', microElement: "Program", task: "Program registration", cadence: 'weekly', automatable: true },
  { id: 'gov.pk.4', industryId: 'quaternary.government.parks_recreation', valueChainStage: 'service', microElement: "Maintenance", task: "Grounds maintenance ticket", cadence: 'daily', automatable: true },
  { id: 'gov.pk.5', industryId: 'quaternary.government.parks_recreation', valueChainStage: 'marketing_sales', microElement: "Pass", task: "Annual pass sale", cadence: 'monthly', automatable: true },
];
