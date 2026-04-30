import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for events
export const EVENTS_BITES: NanoBite[] = [
  // quinary.events.wedding_planning
  { id: 'evt.wd.1', industryId: 'quinary.events.wedding_planning', valueChainStage: 'marketing_sales', microElement: "Inquiry", task: "Inquiry & consult booking", cadence: 'event', automatable: true },
  { id: 'evt.wd.2', industryId: 'quinary.events.wedding_planning', valueChainStage: 'marketing_sales', microElement: "Contract", task: "Contract & deposit", cadence: 'event', automatable: true },
  { id: 'evt.wd.3', industryId: 'quinary.events.wedding_planning', valueChainStage: 'operations', microElement: "Vendor", task: "Vendor coordination board", cadence: 'weekly', automatable: true },
  { id: 'evt.wd.4', industryId: 'quinary.events.wedding_planning', valueChainStage: 'operations', microElement: "Run Sheet", task: "Day-of run sheet", cadence: 'event', automatable: true },
  { id: 'evt.wd.5', industryId: 'quinary.events.wedding_planning', valueChainStage: 'service', microElement: "Final Walk", task: "Final-walk-through", cadence: 'event', automatable: true },
  // quinary.events.corporate_events
  { id: 'evt.cp.1', industryId: 'quinary.events.corporate_events', valueChainStage: 'marketing_sales', microElement: "Quote", task: "Event quote", cadence: 'event', automatable: true },
  { id: 'evt.cp.2', industryId: 'quinary.events.corporate_events', valueChainStage: 'operations', microElement: "BEO", task: "Banquet-event order", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'evt.cp.3', industryId: 'quinary.events.corporate_events', valueChainStage: 'operations', microElement: "AV", task: "AV-needs schedule", cadence: 'event', automatable: true },
  { id: 'evt.cp.4', industryId: 'quinary.events.corporate_events', valueChainStage: 'marketing_sales', microElement: "Invoice", task: "Final invoicing", cadence: 'event', automatable: true },
  { id: 'evt.cp.5', industryId: 'quinary.events.corporate_events', valueChainStage: 'service', microElement: "Survey", task: "Post-event survey", cadence: 'event', automatable: true },
  // quinary.events.concerts
  { id: 'evt.cn.1', industryId: 'quinary.events.concerts', valueChainStage: 'marketing_sales', microElement: "Ticket", task: "Tiered ticket sale", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'evt.cn.2', industryId: 'quinary.events.concerts', valueChainStage: 'marketing_sales', microElement: "VIP", task: "VIP package upsell", cadence: 'event', automatable: true },
  { id: 'evt.cn.3', industryId: 'quinary.events.concerts', valueChainStage: 'operations', microElement: "Show Settle", task: "Show-settlement statement", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'evt.cn.4', industryId: 'quinary.events.concerts', valueChainStage: 'service', microElement: "Will Call", task: "Will-call check-in", cadence: 'event', automatable: true },
  { id: 'evt.cn.5', industryId: 'quinary.events.concerts', valueChainStage: 'operations', microElement: "Stage", task: "Stage call schedule", cadence: 'event', automatable: true },
  // quinary.events.festivals
  { id: 'evt.ft.1', industryId: 'quinary.events.festivals', valueChainStage: 'marketing_sales', microElement: "Wristband", task: "Wristband activation", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'evt.ft.2', industryId: 'quinary.events.festivals', valueChainStage: 'operations', microElement: "Vendor Booth", task: "Vendor-booth assignment", cadence: 'event', automatable: true },
  { id: 'evt.ft.3', industryId: 'quinary.events.festivals', valueChainStage: 'operations', microElement: "Lineup", task: "Lineup schedule", cadence: 'daily', automatable: true },
  { id: 'evt.ft.4', industryId: 'quinary.events.festivals', valueChainStage: 'service', microElement: "Cashless", task: "Cashless top-up", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'evt.ft.5', industryId: 'quinary.events.festivals', valueChainStage: 'infrastructure', microElement: "Permit", task: "City-permit log", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  // quinary.events.conventions
  { id: 'evt.cv.1', industryId: 'quinary.events.conventions', valueChainStage: 'marketing_sales', microElement: "Registration", task: "Attendee registration", cadence: 'daily', automatable: true },
  { id: 'evt.cv.2', industryId: 'quinary.events.conventions', valueChainStage: 'operations', microElement: "Floor Plan", task: "Exhibitor floor-plan", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'evt.cv.3', industryId: 'quinary.events.conventions', valueChainStage: 'service', microElement: "Badge", task: "Badge print at check-in", cadence: 'event', automatable: true },
  { id: 'evt.cv.4', industryId: 'quinary.events.conventions', valueChainStage: 'marketing_sales', microElement: "Sponsor", task: "Sponsor-contract tracking", cadence: 'monthly', automatable: true },
  { id: 'evt.cv.5', industryId: 'quinary.events.conventions', valueChainStage: 'operations', microElement: "Session", task: "Session scheduling", cadence: 'daily', automatable: true },
];
