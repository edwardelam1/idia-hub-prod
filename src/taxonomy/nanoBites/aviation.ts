import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for aviation
export const AVIATION_BITES: NanoBite[] = [
  // tertiary.aviation.airport
  { id: 'av.apt.1', industryId: 'tertiary.aviation.airport', valueChainStage: 'operations', microElement: "Gate", task: "Gate assignment", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'av.apt.2', industryId: 'tertiary.aviation.airport', valueChainStage: 'marketing_sales', microElement: "Concession", task: "Concession-rent billing", cadence: 'monthly', automatable: true },
  { id: 'av.apt.3', industryId: 'tertiary.aviation.airport', valueChainStage: 'operations', microElement: "Slot", task: "Slot/landing-fee log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'av.apt.4', industryId: 'tertiary.aviation.airport', valueChainStage: 'service', microElement: "Bag", task: "Bag-handling event", cadence: 'daily', automatable: true },
  { id: 'av.apt.5', industryId: 'tertiary.aviation.airport', valueChainStage: 'infrastructure', microElement: "Security", task: "TSA checkpoint log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  // tertiary.aviation.flight_school
  { id: 'av.fs.1', industryId: 'tertiary.aviation.flight_school', valueChainStage: 'operations', microElement: "Lesson", task: "Lesson scheduling", cadence: 'daily', automatable: true },
  { id: 'av.fs.2', industryId: 'tertiary.aviation.flight_school', valueChainStage: 'operations', microElement: "Logbook", task: "Pilot-logbook sync", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'av.fs.3', industryId: 'tertiary.aviation.flight_school', valueChainStage: 'operations', microElement: "Aircraft Sched", task: "Aircraft scheduling", cadence: 'daily', automatable: true },
  { id: 'av.fs.4', industryId: 'tertiary.aviation.flight_school', valueChainStage: 'marketing_sales', microElement: "Block Time", task: "Block-time package", cadence: 'event', automatable: true },
  { id: 'av.fs.5', industryId: 'tertiary.aviation.flight_school', valueChainStage: 'service', microElement: "Stage Check", task: "Stage-check exam", cadence: 'event', automatable: true, requiresTier: 'pro' },
  // tertiary.aviation.charter
  { id: 'av.ch.1', industryId: 'tertiary.aviation.charter', valueChainStage: 'marketing_sales', microElement: "Quote", task: "Charter quote", cadence: 'event', automatable: true },
  { id: 'av.ch.2', industryId: 'tertiary.aviation.charter', valueChainStage: 'operations', microElement: "Trip Sheet", task: "Trip-sheet generation", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'av.ch.3', industryId: 'tertiary.aviation.charter', valueChainStage: 'operations', microElement: "Crew Pair", task: "Crew pairing", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'av.ch.4', industryId: 'tertiary.aviation.charter', valueChainStage: 'operations', microElement: "Fuel Order", task: "Fuel-order release", cadence: 'event', automatable: true },
  { id: 'av.ch.5', industryId: 'tertiary.aviation.charter', valueChainStage: 'infrastructure', microElement: "Part 135", task: "Part-135 compliance log", cadence: 'weekly', automatable: true, requiresTier: 'enterprise' },
  // tertiary.aviation.maintenance
  { id: 'av.mt.1', industryId: 'tertiary.aviation.maintenance', valueChainStage: 'operations', microElement: "Work Order", task: "MRO work-order", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'av.mt.2', industryId: 'tertiary.aviation.maintenance', valueChainStage: 'inbound_logistics', microElement: "Part Trace", task: "Aviation-part traceability", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'av.mt.3', industryId: 'tertiary.aviation.maintenance', valueChainStage: 'operations', microElement: "AD/SB", task: "AD/SB compliance", cadence: 'weekly', automatable: true, requiresTier: 'enterprise' },
  { id: 'av.mt.4', industryId: 'tertiary.aviation.maintenance', valueChainStage: 'operations', microElement: "Logbook", task: "Aircraft logbook entry", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'av.mt.5', industryId: 'tertiary.aviation.maintenance', valueChainStage: 'service', microElement: "Return", task: "Return-to-service sign-off", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  // tertiary.aviation.air_cargo
  { id: 'av.cg.1', industryId: 'tertiary.aviation.air_cargo', valueChainStage: 'operations', microElement: "AWB", task: "Air-waybill creation", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'av.cg.2', industryId: 'tertiary.aviation.air_cargo', valueChainStage: 'outbound_logistics', microElement: "ULD", task: "ULD build & track", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'av.cg.3', industryId: 'tertiary.aviation.air_cargo', valueChainStage: 'infrastructure', microElement: "Customs", task: "Customs e-filing", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'av.cg.4', industryId: 'tertiary.aviation.air_cargo', valueChainStage: 'operations', microElement: "Dim Weight", task: "Dim-weight capture", cadence: 'daily', automatable: true },
  { id: 'av.cg.5', industryId: 'tertiary.aviation.air_cargo', valueChainStage: 'service', microElement: "Track", task: "Shipment-status push", cadence: 'daily', automatable: true },
];
