import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for healthcare
export const HEALTHCARE_BITES: NanoBite[] = [
  // tertiary.healthcare.clinic
  { id: 'hc.clin.1', industryId: 'tertiary.healthcare.clinic', valueChainStage: 'operations', microElement: "Appointment", task: "Schedule patient appointment", cadence: 'daily', automatable: true },
  { id: 'hc.clin.2', industryId: 'tertiary.healthcare.clinic', valueChainStage: 'service', microElement: "Intake Form", task: "Digital intake & consent", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'hc.clin.3', industryId: 'tertiary.healthcare.clinic', valueChainStage: 'marketing_sales', microElement: "Copay Collect", task: "Collect copay at check-in", cadence: 'event', automatable: true },
  { id: 'hc.clin.4', industryId: 'tertiary.healthcare.clinic', valueChainStage: 'infrastructure', microElement: "HIPAA Log", task: "Access audit log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'hc.clin.5', industryId: 'tertiary.healthcare.clinic', valueChainStage: 'service', microElement: "Follow-up", task: "Post-visit follow-up message", cadence: 'event', automatable: true },
  // tertiary.healthcare.hospital
  { id: 'hc.hosp.1', industryId: 'tertiary.healthcare.hospital', valueChainStage: 'operations', microElement: "Bed Mgmt", task: "Bed assignment & turnover", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'hc.hosp.2', industryId: 'tertiary.healthcare.hospital', valueChainStage: 'operations', microElement: "Triage", task: "ED triage acuity scoring", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'hc.hosp.3', industryId: 'tertiary.healthcare.hospital', valueChainStage: 'procurement', microElement: "Med Supply", task: "Med-surg PAR replenishment", cadence: 'daily', automatable: true },
  { id: 'hc.hosp.4', industryId: 'tertiary.healthcare.hospital', valueChainStage: 'infrastructure', microElement: "HIPAA Log", task: "Access audit log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'hc.hosp.5', industryId: 'tertiary.healthcare.hospital', valueChainStage: 'service', microElement: "Discharge", task: "Discharge plan & summary", cadence: 'event', automatable: true, requiresTier: 'pro' },
  // tertiary.healthcare.pharmacy
  { id: 'hc.pharm.1', industryId: 'tertiary.healthcare.pharmacy', valueChainStage: 'operations', microElement: "E-Rx", task: "E-prescription intake", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'hc.pharm.2', industryId: 'tertiary.healthcare.pharmacy', valueChainStage: 'operations', microElement: "Fill Verify", task: "Pharmacist fill verification", cadence: 'event', automatable: false, requiresTier: 'pro' },
  { id: 'hc.pharm.3', industryId: 'tertiary.healthcare.pharmacy', valueChainStage: 'inbound_logistics', microElement: "DEA Log", task: "Controlled-substance count", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'hc.pharm.4', industryId: 'tertiary.healthcare.pharmacy', valueChainStage: 'marketing_sales', microElement: "Insurance Adj", task: "Insurance adjudication", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'hc.pharm.5', industryId: 'tertiary.healthcare.pharmacy', valueChainStage: 'service', microElement: "Counsel", task: "Patient counsel acknowledgement", cadence: 'event', automatable: true },
  // tertiary.healthcare.dental
  { id: 'hc.dent.1', industryId: 'tertiary.healthcare.dental', valueChainStage: 'operations', microElement: "Chair Time", task: "Chair scheduling", cadence: 'daily', automatable: true },
  { id: 'hc.dent.2', industryId: 'tertiary.healthcare.dental', valueChainStage: 'operations', microElement: "Imaging", task: "Intra-oral imaging capture", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'hc.dent.3', industryId: 'tertiary.healthcare.dental', valueChainStage: 'marketing_sales', microElement: "Treatment Plan", task: "Treatment plan & estimate", cadence: 'event', automatable: true },
  { id: 'hc.dent.4', industryId: 'tertiary.healthcare.dental', valueChainStage: 'infrastructure', microElement: "HIPAA Log", task: "Access audit log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'hc.dent.5', industryId: 'tertiary.healthcare.dental', valueChainStage: 'service', microElement: "Recall", task: "6-mo recall reminder", cadence: 'monthly', automatable: true },
  // tertiary.healthcare.optometry
  { id: 'hc.opto.1', industryId: 'tertiary.healthcare.optometry', valueChainStage: 'operations', microElement: "Refraction", task: "Refraction exam capture", cadence: 'event', automatable: true },
  { id: 'hc.opto.2', industryId: 'tertiary.healthcare.optometry', valueChainStage: 'marketing_sales', microElement: "Frame Pick", task: "Frame selection & quote", cadence: 'event', automatable: true },
  { id: 'hc.opto.3', industryId: 'tertiary.healthcare.optometry', valueChainStage: 'outbound_logistics', microElement: "Lab Order", task: "Lens lab order", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'hc.opto.4', industryId: 'tertiary.healthcare.optometry', valueChainStage: 'service', microElement: "Dispense", task: "Frame dispense & fit", cadence: 'event', automatable: false },
  { id: 'hc.opto.5', industryId: 'tertiary.healthcare.optometry', valueChainStage: 'service', microElement: "Recall", task: "Annual exam recall", cadence: 'monthly', automatable: true },
  // tertiary.healthcare.veterinary
  { id: 'hc.vet.1', industryId: 'tertiary.healthcare.veterinary', valueChainStage: 'operations', microElement: "Visit", task: "Patient visit & SOAP", cadence: 'event', automatable: true },
  { id: 'hc.vet.2', industryId: 'tertiary.healthcare.veterinary', valueChainStage: 'operations', microElement: "Vax Schedule", task: "Vaccination schedule", cadence: 'monthly', automatable: true },
  { id: 'hc.vet.3', industryId: 'tertiary.healthcare.veterinary', valueChainStage: 'procurement', microElement: "Pharmacy", task: "In-house pharmacy fill", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'hc.vet.4', industryId: 'tertiary.healthcare.veterinary', valueChainStage: 'service', microElement: "Boarding", task: "Boarding intake", cadence: 'event', automatable: true },
  { id: 'hc.vet.5', industryId: 'tertiary.healthcare.veterinary', valueChainStage: 'service', microElement: "Reminder", task: "Wellness reminder", cadence: 'monthly', automatable: true },
  // tertiary.healthcare.mental_health
  { id: 'hc.mh.1', industryId: 'tertiary.healthcare.mental_health', valueChainStage: 'operations', microElement: "Session", task: "Session scheduling", cadence: 'daily', automatable: true },
  { id: 'hc.mh.2', industryId: 'tertiary.healthcare.mental_health', valueChainStage: 'service', microElement: "Telehealth", task: "Encrypted telehealth session", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'hc.mh.3', industryId: 'tertiary.healthcare.mental_health', valueChainStage: 'marketing_sales', microElement: "Insurance Bill", task: "Behavioral-health billing", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'hc.mh.4', industryId: 'tertiary.healthcare.mental_health', valueChainStage: 'infrastructure', microElement: "HIPAA Log", task: "Access audit log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'hc.mh.5', industryId: 'tertiary.healthcare.mental_health', valueChainStage: 'service', microElement: "No-Show", task: "No-show fee policy", cadence: 'event', automatable: true },
  // tertiary.healthcare.rehabilitation
  { id: 'hc.rehab.1', industryId: 'tertiary.healthcare.rehabilitation', valueChainStage: 'operations', microElement: "Plan of Care", task: "POC documentation", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'hc.rehab.2', industryId: 'tertiary.healthcare.rehabilitation', valueChainStage: 'operations', microElement: "Visit Auth", task: "Insurance visit-auth tracking", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'hc.rehab.3', industryId: 'tertiary.healthcare.rehabilitation', valueChainStage: 'service', microElement: "Outcome", task: "Functional outcome score", cadence: 'weekly', automatable: true },
  { id: 'hc.rehab.4', industryId: 'tertiary.healthcare.rehabilitation', valueChainStage: 'marketing_sales', microElement: "Copay Collect", task: "Per-visit copay", cadence: 'event', automatable: true },
  { id: 'hc.rehab.5', industryId: 'tertiary.healthcare.rehabilitation', valueChainStage: 'infrastructure', microElement: "HIPAA Log", task: "Access audit log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
];
