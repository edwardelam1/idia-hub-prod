import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for personal
export const PERSONAL_BITES: NanoBite[] = [
  // quinary.personal.salon
  { id: 'per.sal.1', industryId: 'quinary.personal.salon', valueChainStage: 'operations', microElement: "Booking", task: "Stylist booking calendar", cadence: 'daily', automatable: true },
  { id: 'per.sal.2', industryId: 'quinary.personal.salon', valueChainStage: 'operations', microElement: "Chair Time", task: "Chair-time tracking", cadence: 'daily', automatable: true },
  { id: 'per.sal.3', industryId: 'quinary.personal.salon', valueChainStage: 'marketing_sales', microElement: "Tip Out", task: "Stylist tip-out split", cadence: 'event', automatable: true },
  { id: 'per.sal.4', industryId: 'quinary.personal.salon', valueChainStage: 'marketing_sales', microElement: "Retail Sale", task: "Retail product attach", cadence: 'event', automatable: true },
  { id: 'per.sal.5', industryId: 'quinary.personal.salon', valueChainStage: 'service', microElement: "Rebook", task: "Auto-rebook reminder", cadence: 'monthly', automatable: true },
  // quinary.personal.barbershop
  { id: 'per.barb.1', industryId: 'quinary.personal.barbershop', valueChainStage: 'operations', microElement: "Walk-in Q", task: "Walk-in queue", cadence: 'daily', automatable: true },
  { id: 'per.barb.2', industryId: 'quinary.personal.barbershop', valueChainStage: 'operations', microElement: "Chair Time", task: "Chair-time tracking", cadence: 'daily', automatable: true },
  { id: 'per.barb.3', industryId: 'quinary.personal.barbershop', valueChainStage: 'marketing_sales', microElement: "Membership", task: "Cuts-club membership", cadence: 'monthly', automatable: true },
  { id: 'per.barb.4', industryId: 'quinary.personal.barbershop', valueChainStage: 'marketing_sales', microElement: "Tip Out", task: "Barber tip-out", cadence: 'event', automatable: true },
  { id: 'per.barb.5', industryId: 'quinary.personal.barbershop', valueChainStage: 'service', microElement: "Loyalty", task: "Visit loyalty stamp", cadence: 'event', automatable: true },
  // quinary.personal.tattoo
  { id: 'per.tat.1', industryId: 'quinary.personal.tattoo', valueChainStage: 'operations', microElement: "Booking", task: "Artist booking + deposit", cadence: 'event', automatable: true },
  { id: 'per.tat.2', industryId: 'quinary.personal.tattoo', valueChainStage: 'marketing_sales', microElement: "Deposit", task: "Non-refundable deposit", cadence: 'event', automatable: true },
  { id: 'per.tat.3', industryId: 'quinary.personal.tattoo', valueChainStage: 'infrastructure', microElement: "Consent", task: "Liability waiver capture", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'per.tat.4', industryId: 'quinary.personal.tattoo', valueChainStage: 'operations', microElement: "Aftercare", task: "Aftercare instructions", cadence: 'event', automatable: true },
  { id: 'per.tat.5', industryId: 'quinary.personal.tattoo', valueChainStage: 'marketing_sales', microElement: "Booth Rent", task: "Artist booth-rent split", cadence: 'weekly', automatable: true },
  // quinary.personal.dry_cleaning
  { id: 'per.dc.1', industryId: 'quinary.personal.dry_cleaning', valueChainStage: 'inbound_logistics', microElement: "Intake Tag", task: "Garment intake & RFID tag", cadence: 'daily', automatable: true },
  { id: 'per.dc.2', industryId: 'quinary.personal.dry_cleaning', valueChainStage: 'operations', microElement: "Plant Route", task: "Plant routing slip", cadence: 'daily', automatable: true },
  { id: 'per.dc.3', industryId: 'quinary.personal.dry_cleaning', valueChainStage: 'outbound_logistics', microElement: "Pickup", task: "Pickup-ready notification", cadence: 'event', automatable: true },
  { id: 'per.dc.4', industryId: 'quinary.personal.dry_cleaning', valueChainStage: 'marketing_sales', microElement: "Subscription", task: "Monthly cleaning plan", cadence: 'monthly', automatable: true },
  { id: 'per.dc.5', industryId: 'quinary.personal.dry_cleaning', valueChainStage: 'service', microElement: "Lost Claim", task: "Lost-garment claim", cadence: 'event', automatable: true },
  // quinary.personal.tailoring
  { id: 'per.tail.1', industryId: 'quinary.personal.tailoring', valueChainStage: 'operations', microElement: "Measure", task: "Measurement capture", cadence: 'event', automatable: true },
  { id: 'per.tail.2', industryId: 'quinary.personal.tailoring', valueChainStage: 'operations', microElement: "Job Card", task: "Job-card lifecycle", cadence: 'daily', automatable: true },
  { id: 'per.tail.3', industryId: 'quinary.personal.tailoring', valueChainStage: 'marketing_sales', microElement: "Quote", task: "Alteration quote", cadence: 'event', automatable: true },
  { id: 'per.tail.4', industryId: 'quinary.personal.tailoring', valueChainStage: 'service', microElement: "Fitting", task: "Fitting appointment", cadence: 'event', automatable: true },
  { id: 'per.tail.5', industryId: 'quinary.personal.tailoring', valueChainStage: 'outbound_logistics', microElement: "Pickup", task: "Ready-for-pickup alert", cadence: 'event', automatable: true },
];
