import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for pet
export const PET_BITES: NanoBite[] = [
  // quinary.pet.pet_store
  { id: 'pet.store.1', industryId: 'quinary.pet.pet_store', valueChainStage: 'operations', microElement: "Live Animal", task: "Live-animal intake & care log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'pet.store.2', industryId: 'quinary.pet.pet_store', valueChainStage: 'inbound_logistics', microElement: "Feed Receive", task: "Bulk feed receiving", cadence: 'weekly', automatable: true },
  { id: 'pet.store.3', industryId: 'quinary.pet.pet_store', valueChainStage: 'marketing_sales', microElement: "Loyalty", task: "Pet-parent loyalty", cadence: 'monthly', automatable: true },
  { id: 'pet.store.4', industryId: 'quinary.pet.pet_store', valueChainStage: 'operations', microElement: "Adoption", task: "Adoption screening", cadence: 'event', automatable: true },
  { id: 'pet.store.5', industryId: 'quinary.pet.pet_store', valueChainStage: 'service', microElement: "Recall", task: "Product recall notice", cadence: 'event', automatable: true, requiresTier: 'pro' },
  // quinary.pet.grooming
  { id: 'pet.groom.1', industryId: 'quinary.pet.grooming', valueChainStage: 'operations', microElement: "Booking", task: "Groomer booking", cadence: 'daily', automatable: true },
  { id: 'pet.groom.2', industryId: 'quinary.pet.grooming', valueChainStage: 'service', microElement: "Vax Check", task: "Vaccination verification", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'pet.groom.3', industryId: 'quinary.pet.grooming', valueChainStage: 'operations', microElement: "Service Card", task: "Cut-card history", cadence: 'event', automatable: true },
  { id: 'pet.groom.4', industryId: 'quinary.pet.grooming', valueChainStage: 'marketing_sales', microElement: "Add-on", task: "Bath add-on attach", cadence: 'event', automatable: true },
  { id: 'pet.groom.5', industryId: 'quinary.pet.grooming', valueChainStage: 'service', microElement: "Rebook", task: "6-week rebook", cadence: 'monthly', automatable: true },
  // quinary.pet.boarding
  { id: 'pet.board.1', industryId: 'quinary.pet.boarding', valueChainStage: 'operations', microElement: "Kennel", task: "Kennel assignment", cadence: 'daily', automatable: true },
  { id: 'pet.board.2', industryId: 'quinary.pet.boarding', valueChainStage: 'operations', microElement: "Feed Log", task: "Feeding log per pet", cadence: 'daily', automatable: true },
  { id: 'pet.board.3', industryId: 'quinary.pet.boarding', valueChainStage: 'service', microElement: "Vax Check", task: "Vaccination verification", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'pet.board.4', industryId: 'quinary.pet.boarding', valueChainStage: 'operations', microElement: "Med Admin", task: "Medication administration log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'pet.board.5', industryId: 'quinary.pet.boarding', valueChainStage: 'service', microElement: "Daily Report", task: "Daily report card", cadence: 'daily', automatable: true },
  // quinary.pet.training
  { id: 'pet.train.1', industryId: 'quinary.pet.training', valueChainStage: 'operations', microElement: "Class Roster", task: "Class roster", cadence: 'weekly', automatable: true },
  { id: 'pet.train.2', industryId: 'quinary.pet.training', valueChainStage: 'marketing_sales', microElement: "Package", task: "Multi-session package", cadence: 'event', automatable: true },
  { id: 'pet.train.3', industryId: 'quinary.pet.training', valueChainStage: 'service', microElement: "Progress", task: "Progress report", cadence: 'weekly', automatable: true },
  { id: 'pet.train.4', industryId: 'quinary.pet.training', valueChainStage: 'service', microElement: "Vax Check", task: "Vaccination verification", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'pet.train.5', industryId: 'quinary.pet.training', valueChainStage: 'marketing_sales', microElement: "Renewal", task: "Package renewal", cadence: 'monthly', automatable: true },
  // quinary.pet.pet_daycare
  { id: 'pet.dc.1', industryId: 'quinary.pet.pet_daycare', valueChainStage: 'operations', microElement: "Check-in", task: "Daily check-in", cadence: 'daily', automatable: true },
  { id: 'pet.dc.2', industryId: 'quinary.pet.pet_daycare', valueChainStage: 'operations', microElement: "Play Group", task: "Play-group assignment", cadence: 'daily', automatable: true },
  { id: 'pet.dc.3', industryId: 'quinary.pet.pet_daycare', valueChainStage: 'service', microElement: "Vax Check", task: "Vaccination verification", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'pet.dc.4', industryId: 'quinary.pet.pet_daycare', valueChainStage: 'marketing_sales', microElement: "Pkg Card", task: "Day-pack punch card", cadence: 'monthly', automatable: true },
  { id: 'pet.dc.5', industryId: 'quinary.pet.pet_daycare', valueChainStage: 'service', microElement: "Incident", task: "Incident report", cadence: 'event', automatable: true, requiresTier: 'pro' },
];
