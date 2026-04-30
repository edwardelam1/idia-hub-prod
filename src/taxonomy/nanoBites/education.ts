import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for education
export const EDUCATION_BITES: NanoBite[] = [
  // quaternary.education.k_12_school
  { id: 'edu.k12.1', industryId: 'quaternary.education.k_12_school', valueChainStage: 'operations', microElement: "Attendance", task: "Daily attendance roll", cadence: 'daily', automatable: true },
  { id: 'edu.k12.2', industryId: 'quaternary.education.k_12_school', valueChainStage: 'marketing_sales', microElement: "Tuition", task: "Tuition billing", cadence: 'monthly', automatable: true },
  { id: 'edu.k12.3', industryId: 'quaternary.education.k_12_school', valueChainStage: 'operations', microElement: "Gradebook", task: "Gradebook posting", cadence: 'weekly', automatable: true },
  { id: 'edu.k12.4', industryId: 'quaternary.education.k_12_school', valueChainStage: 'service', microElement: "Parent Comm", task: "Parent communication", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'edu.k12.5', industryId: 'quaternary.education.k_12_school', valueChainStage: 'infrastructure', microElement: "FERPA", task: "FERPA access log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  // quaternary.education.university
  { id: 'edu.uni.1', industryId: 'quaternary.education.university', valueChainStage: 'operations', microElement: "Enrollment", task: "Course enrollment", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'edu.uni.2', industryId: 'quaternary.education.university', valueChainStage: 'marketing_sales', microElement: "Bursar", task: "Bursar billing", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'edu.uni.3', industryId: 'quaternary.education.university', valueChainStage: 'operations', microElement: "Gradebook", task: "Gradebook + transcript", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'edu.uni.4', industryId: 'quaternary.education.university', valueChainStage: 'service', microElement: "Aid", task: "Financial-aid disbursement", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  { id: 'edu.uni.5', industryId: 'quaternary.education.university', valueChainStage: 'infrastructure', microElement: "FERPA", task: "FERPA access log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  // quaternary.education.tutoring_center
  { id: 'edu.tut.1', industryId: 'quaternary.education.tutoring_center', valueChainStage: 'operations', microElement: "Booking", task: "Tutor booking", cadence: 'daily', automatable: true },
  { id: 'edu.tut.2', industryId: 'quaternary.education.tutoring_center', valueChainStage: 'marketing_sales', microElement: "Package", task: "Session-pack billing", cadence: 'monthly', automatable: true },
  { id: 'edu.tut.3', industryId: 'quaternary.education.tutoring_center', valueChainStage: 'service', microElement: "Progress", task: "Progress report to parent", cadence: 'monthly', automatable: true },
  { id: 'edu.tut.4', industryId: 'quaternary.education.tutoring_center', valueChainStage: 'operations', microElement: "Tutor Pay", task: "Tutor-pay calculation", cadence: 'weekly', automatable: true },
  { id: 'edu.tut.5', industryId: 'quaternary.education.tutoring_center', valueChainStage: 'service', microElement: "Reschedule", task: "Reschedule policy", cadence: 'event', automatable: true },
  // quaternary.education.vocational
  { id: 'edu.voc.1', industryId: 'quaternary.education.vocational', valueChainStage: 'operations', microElement: "Enrollment", task: "Cohort enrollment", cadence: 'event', automatable: true },
  { id: 'edu.voc.2', industryId: 'quaternary.education.vocational', valueChainStage: 'marketing_sales', microElement: "Tuition", task: "Tuition payment plan", cadence: 'monthly', automatable: true },
  { id: 'edu.voc.3', industryId: 'quaternary.education.vocational', valueChainStage: 'operations', microElement: "Lab Sched", task: "Lab-time scheduling", cadence: 'daily', automatable: true },
  { id: 'edu.voc.4', industryId: 'quaternary.education.vocational', valueChainStage: 'service', microElement: "Cert", task: "Certification awarded", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'edu.voc.5', industryId: 'quaternary.education.vocational', valueChainStage: 'service', microElement: "Placement", task: "Job-placement tracking", cadence: 'monthly', automatable: true },
  // quaternary.education.daycare
  { id: 'edu.dc.1', industryId: 'quaternary.education.daycare', valueChainStage: 'operations', microElement: "Check-in", task: "Child sign-in/out", cadence: 'daily', automatable: true },
  { id: 'edu.dc.2', industryId: 'quaternary.education.daycare', valueChainStage: 'operations', microElement: "Daily Sheet", task: "Daily-activity sheet", cadence: 'daily', automatable: true },
  { id: 'edu.dc.3', industryId: 'quaternary.education.daycare', valueChainStage: 'marketing_sales', microElement: "Tuition", task: "Weekly tuition billing", cadence: 'weekly', automatable: true },
  { id: 'edu.dc.4', industryId: 'quaternary.education.daycare', valueChainStage: 'service', microElement: "Incident", task: "Incident/owie report", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'edu.dc.5', industryId: 'quaternary.education.daycare', valueChainStage: 'infrastructure', microElement: "Ratio", task: "Child:staff ratio audit", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  // quaternary.education.online_learning
  { id: 'edu.on.1', industryId: 'quaternary.education.online_learning', valueChainStage: 'marketing_sales', microElement: "Subscription", task: "Course-subscription billing", cadence: 'monthly', automatable: true },
  { id: 'edu.on.2', industryId: 'quaternary.education.online_learning', valueChainStage: 'operations', microElement: "Cohort", task: "Cohort scheduling", cadence: 'weekly', automatable: true },
  { id: 'edu.on.3', industryId: 'quaternary.education.online_learning', valueChainStage: 'service', microElement: "Engagement", task: "Engagement & completion %", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'edu.on.4', industryId: 'quaternary.education.online_learning', valueChainStage: 'service', microElement: "Cert", task: "Certificate issuance", cadence: 'event', automatable: true },
  { id: 'edu.on.5', industryId: 'quaternary.education.online_learning', valueChainStage: 'operations', microElement: "Catalog", task: "Course-catalog publish", cadence: 'weekly', automatable: true },
];
