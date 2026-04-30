import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for fitness
export const FITNESS_BITES: NanoBite[] = [
  // tertiary.fitness.gym
  { id: 'fit.gym.1', industryId: 'tertiary.fitness.gym', valueChainStage: 'operations', microElement: "Check-in", task: "Member check-in (kiosk)", cadence: 'daily', automatable: true },
  { id: 'fit.gym.2', industryId: 'tertiary.fitness.gym', valueChainStage: 'marketing_sales', microElement: "Membership", task: "Recurring membership billing", cadence: 'monthly', automatable: true },
  { id: 'fit.gym.3', industryId: 'tertiary.fitness.gym', valueChainStage: 'operations', microElement: "Class Roster", task: "Class roster", cadence: 'daily', automatable: true },
  { id: 'fit.gym.4', industryId: 'tertiary.fitness.gym', valueChainStage: 'service', microElement: "Personal Train", task: "PT session billing", cadence: 'event', automatable: true },
  { id: 'fit.gym.5', industryId: 'tertiary.fitness.gym', valueChainStage: 'operations', microElement: "Equipment PM", task: "Equipment maintenance log", cadence: 'weekly', automatable: true },
  // tertiary.fitness.yoga_studio
  { id: 'fit.yoga.1', industryId: 'tertiary.fitness.yoga_studio', valueChainStage: 'operations', microElement: "Class Roster", task: "Class roster", cadence: 'daily', automatable: true },
  { id: 'fit.yoga.2', industryId: 'tertiary.fitness.yoga_studio', valueChainStage: 'marketing_sales', microElement: "Class Pack", task: "Class-pack punch card", cadence: 'monthly', automatable: true },
  { id: 'fit.yoga.3', industryId: 'tertiary.fitness.yoga_studio', valueChainStage: 'operations', microElement: "Mat Hold", task: "Mat reservation", cadence: 'event', automatable: true },
  { id: 'fit.yoga.4', industryId: 'tertiary.fitness.yoga_studio', valueChainStage: 'service', microElement: "Waitlist", task: "Class waitlist promote", cadence: 'event', automatable: true },
  { id: 'fit.yoga.5', industryId: 'tertiary.fitness.yoga_studio', valueChainStage: 'marketing_sales', microElement: "Membership", task: "Unlimited membership", cadence: 'monthly', automatable: true },
  // tertiary.fitness.spa
  { id: 'fit.spa.1', industryId: 'tertiary.fitness.spa', valueChainStage: 'operations', microElement: "Booking", task: "Treatment booking", cadence: 'daily', automatable: true },
  { id: 'fit.spa.2', industryId: 'tertiary.fitness.spa', valueChainStage: 'operations', microElement: "Room Turn", task: "Room turnover schedule", cadence: 'daily', automatable: true },
  { id: 'fit.spa.3', industryId: 'tertiary.fitness.spa', valueChainStage: 'marketing_sales', microElement: "Gift Card", task: "Gift-card sale", cadence: 'event', automatable: true },
  { id: 'fit.spa.4', industryId: 'tertiary.fitness.spa', valueChainStage: 'marketing_sales', microElement: "Tip Out", task: "Therapist tip-out", cadence: 'event', automatable: true },
  { id: 'fit.spa.5', industryId: 'tertiary.fitness.spa', valueChainStage: 'service', microElement: "Rebook", task: "Treatment rebook", cadence: 'monthly', automatable: true },
  // tertiary.fitness.martial_arts
  { id: 'fit.ma.1', industryId: 'tertiary.fitness.martial_arts', valueChainStage: 'operations', microElement: "Belt Test", task: "Belt test scheduling", cadence: 'monthly', automatable: true },
  { id: 'fit.ma.2', industryId: 'tertiary.fitness.martial_arts', valueChainStage: 'marketing_sales', microElement: "Tuition", task: "Recurring tuition billing", cadence: 'monthly', automatable: true },
  { id: 'fit.ma.3', industryId: 'tertiary.fitness.martial_arts', valueChainStage: 'operations', microElement: "Class Roster", task: "Class roster", cadence: 'daily', automatable: true },
  { id: 'fit.ma.4', industryId: 'tertiary.fitness.martial_arts', valueChainStage: 'operations', microElement: "Attendance", task: "Attendance streak", cadence: 'daily', automatable: true },
  { id: 'fit.ma.5', industryId: 'tertiary.fitness.martial_arts', valueChainStage: 'marketing_sales', microElement: "Pro Shop", task: "Pro-shop attach", cadence: 'event', automatable: true },
  // tertiary.fitness.swimming
  { id: 'fit.swim.1', industryId: 'tertiary.fitness.swimming', valueChainStage: 'operations', microElement: "Lane Book", task: "Lane reservation", cadence: 'daily', automatable: true },
  { id: 'fit.swim.2', industryId: 'tertiary.fitness.swimming', valueChainStage: 'operations', microElement: "Lesson", task: "Swim lesson roster", cadence: 'weekly', automatable: true },
  { id: 'fit.swim.3', industryId: 'tertiary.fitness.swimming', valueChainStage: 'infrastructure', microElement: "Chem Log", task: "Pool chemistry log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'fit.swim.4', industryId: 'tertiary.fitness.swimming', valueChainStage: 'marketing_sales', microElement: "Membership", task: "Monthly membership", cadence: 'monthly', automatable: true },
  { id: 'fit.swim.5', industryId: 'tertiary.fitness.swimming', valueChainStage: 'service', microElement: "Lifeguard", task: "Lifeguard rotation", cadence: 'daily', automatable: true },
  // tertiary.fitness.crossfit
  { id: 'fit.cf.1', industryId: 'tertiary.fitness.crossfit', valueChainStage: 'operations', microElement: "WOD", task: "Daily WOD posting", cadence: 'daily', automatable: true },
  { id: 'fit.cf.2', industryId: 'tertiary.fitness.crossfit', valueChainStage: 'operations', microElement: "Class Roster", task: "Class roster cap", cadence: 'daily', automatable: true },
  { id: 'fit.cf.3', industryId: 'tertiary.fitness.crossfit', valueChainStage: 'marketing_sales', microElement: "Membership", task: "Recurring membership billing", cadence: 'monthly', automatable: true },
  { id: 'fit.cf.4', industryId: 'tertiary.fitness.crossfit', valueChainStage: 'service', microElement: "PR Log", task: "Member PR log", cadence: 'event', automatable: true },
  { id: 'fit.cf.5', industryId: 'tertiary.fitness.crossfit', valueChainStage: 'marketing_sales', microElement: "On-ramp", task: "On-ramp series sale", cadence: 'event', automatable: true },
];
