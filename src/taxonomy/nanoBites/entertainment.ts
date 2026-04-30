import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for entertainment
export const ENTERTAINMENT_BITES: NanoBite[] = [
  // quinary.entertainment.cinema
  { id: 'ent.cin.1', industryId: 'quinary.entertainment.cinema', valueChainStage: 'operations', microElement: "Showtime", task: "Showtime-grid mgmt", cadence: 'daily', automatable: true },
  { id: 'ent.cin.2', industryId: 'quinary.entertainment.cinema', valueChainStage: 'marketing_sales', microElement: "Ticket", task: "Online ticket sale", cadence: 'daily', automatable: true },
  { id: 'ent.cin.3', industryId: 'quinary.entertainment.cinema', valueChainStage: 'marketing_sales', microElement: "Concession", task: "Concession attach", cadence: 'daily', automatable: true },
  { id: 'ent.cin.4', industryId: 'quinary.entertainment.cinema', valueChainStage: 'operations', microElement: "Booth", task: "Projection-booth schedule", cadence: 'daily', automatable: true },
  { id: 'ent.cin.5', industryId: 'quinary.entertainment.cinema', valueChainStage: 'marketing_sales', microElement: "Loyalty", task: "Reward-program tier", cadence: 'monthly', automatable: true },
  // quinary.entertainment.arcade
  { id: 'ent.arc.1', industryId: 'quinary.entertainment.arcade', valueChainStage: 'operations', microElement: "Card Top-up", task: "Game-card top-up", cadence: 'daily', automatable: true },
  { id: 'ent.arc.2', industryId: 'quinary.entertainment.arcade', valueChainStage: 'operations', microElement: "Machine", task: "Machine cash-out", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'ent.arc.3', industryId: 'quinary.entertainment.arcade', valueChainStage: 'marketing_sales', microElement: "Birthday", task: "Birthday-party booking", cadence: 'event', automatable: true },
  { id: 'ent.arc.4', industryId: 'quinary.entertainment.arcade', valueChainStage: 'service', microElement: "Prize", task: "Prize-redemption ledger", cadence: 'daily', automatable: true },
  { id: 'ent.arc.5', industryId: 'quinary.entertainment.arcade', valueChainStage: 'operations', microElement: "Maintenance", task: "Machine maintenance log", cadence: 'weekly', automatable: true },
  // quinary.entertainment.bowling
  { id: 'ent.bw.1', industryId: 'quinary.entertainment.bowling', valueChainStage: 'operations', microElement: "Lane Book", task: "Lane reservation", cadence: 'daily', automatable: true },
  { id: 'ent.bw.2', industryId: 'quinary.entertainment.bowling', valueChainStage: 'marketing_sales', microElement: "League", task: "League registration", cadence: 'weekly', automatable: true },
  { id: 'ent.bw.3', industryId: 'quinary.entertainment.bowling', valueChainStage: 'marketing_sales', microElement: "Snack Bar", task: "Snack-bar tab", cadence: 'daily', automatable: true },
  { id: 'ent.bw.4', industryId: 'quinary.entertainment.bowling', valueChainStage: 'operations', microElement: "Shoe Rent", task: "Shoe-rental tracking", cadence: 'daily', automatable: true },
  { id: 'ent.bw.5', industryId: 'quinary.entertainment.bowling', valueChainStage: 'marketing_sales', microElement: "Party", task: "Party-package booking", cadence: 'event', automatable: true },
  // quinary.entertainment.concert_venue
  { id: 'ent.cv.1', industryId: 'quinary.entertainment.concert_venue', valueChainStage: 'marketing_sales', microElement: "Ticket", task: "Ticket sale & assigned seat", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'ent.cv.2', industryId: 'quinary.entertainment.concert_venue', valueChainStage: 'operations', microElement: "Show Settle", task: "Show-settlement statement", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'ent.cv.3', industryId: 'quinary.entertainment.concert_venue', valueChainStage: 'marketing_sales', microElement: "Merch", task: "Artist-merch split", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'ent.cv.4', industryId: 'quinary.entertainment.concert_venue', valueChainStage: 'service', microElement: "Will Call", task: "Will-call check-in", cadence: 'event', automatable: true },
  { id: 'ent.cv.5', industryId: 'quinary.entertainment.concert_venue', valueChainStage: 'operations', microElement: "Stagehand", task: "Stagehand scheduling", cadence: 'event', automatable: true },
  // quinary.entertainment.museum
  { id: 'ent.mu.1', industryId: 'quinary.entertainment.museum', valueChainStage: 'marketing_sales', microElement: "Admission", task: "Admission ticketing", cadence: 'daily', automatable: true },
  { id: 'ent.mu.2', industryId: 'quinary.entertainment.museum', valueChainStage: 'marketing_sales', microElement: "Membership", task: "Membership billing", cadence: 'monthly', automatable: true },
  { id: 'ent.mu.3', industryId: 'quinary.entertainment.museum', valueChainStage: 'operations', microElement: "Exhibit", task: "Exhibit-rotation schedule", cadence: 'monthly', automatable: true },
  { id: 'ent.mu.4', industryId: 'quinary.entertainment.museum', valueChainStage: 'marketing_sales', microElement: "Group", task: "Group/school booking", cadence: 'event', automatable: true },
  { id: 'ent.mu.5', industryId: 'quinary.entertainment.museum', valueChainStage: 'service', microElement: "Donor", task: "Donor-cultivation log", cadence: 'monthly', automatable: true },
  // quinary.entertainment.casino
  { id: 'ent.cas.1', industryId: 'quinary.entertainment.casino', valueChainStage: 'operations', microElement: "Table Drop", task: "Table-drop count", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'ent.cas.2', industryId: 'quinary.entertainment.casino', valueChainStage: 'service', microElement: "Player Card", task: "Player-card play tracking", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'ent.cas.3', industryId: 'quinary.entertainment.casino', valueChainStage: 'marketing_sales', microElement: "Comp", task: "Comp-issue ledger", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'ent.cas.4', industryId: 'quinary.entertainment.casino', valueChainStage: 'infrastructure', microElement: "Title 31", task: "Title-31 / SAR log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'ent.cas.5', industryId: 'quinary.entertainment.casino', valueChainStage: 'operations', microElement: "Slot Hold", task: "Slot hold% report", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
];
