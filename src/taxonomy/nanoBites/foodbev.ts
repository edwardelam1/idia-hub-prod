import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for foodbev
export const FOODBEV_BITES: NanoBite[] = [
  // secondary.foodbev.brewery
  { id: 'fb.br.1', industryId: 'secondary.foodbev.brewery', valueChainStage: 'operations', microElement: "Brew Day", task: "Brew-day batch sheet", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'fb.br.2', industryId: 'secondary.foodbev.brewery', valueChainStage: 'operations', microElement: "Tank Mgmt", task: "Fermenter-tank schedule", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'fb.br.3', industryId: 'secondary.foodbev.brewery', valueChainStage: 'operations', microElement: "QA", task: "In-process QA (gravity, pH)", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'fb.br.4', industryId: 'secondary.foodbev.brewery', valueChainStage: 'outbound_logistics', microElement: "Keg", task: "Keg fill & track", cadence: 'daily', automatable: true },
  { id: 'fb.br.5', industryId: 'secondary.foodbev.brewery', valueChainStage: 'infrastructure', microElement: "Excise", task: "TTB excise reporting", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // secondary.foodbev.winery
  { id: 'fb.wn.1', industryId: 'secondary.foodbev.winery', valueChainStage: 'operations', microElement: "Harvest", task: "Harvest intake & crush", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'fb.wn.2', industryId: 'secondary.foodbev.winery', valueChainStage: 'operations', microElement: "Tank Mgmt", task: "Tank/barrel mgmt", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'fb.wn.3', industryId: 'secondary.foodbev.winery', valueChainStage: 'operations', microElement: "Bottling", task: "Bottling-line run", cadence: 'event', automatable: true },
  { id: 'fb.wn.4', industryId: 'secondary.foodbev.winery', valueChainStage: 'marketing_sales', microElement: "Club", task: "Wine-club shipment", cadence: 'monthly', automatable: true },
  { id: 'fb.wn.5', industryId: 'secondary.foodbev.winery', valueChainStage: 'infrastructure', microElement: "Excise", task: "TTB excise reporting", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // secondary.foodbev.distillery
  { id: 'fb.dl.1', industryId: 'secondary.foodbev.distillery', valueChainStage: 'operations', microElement: "Mash", task: "Mash & ferment log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'fb.dl.2', industryId: 'secondary.foodbev.distillery', valueChainStage: 'operations', microElement: "Still Run", task: "Distillation run-log", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'fb.dl.3', industryId: 'secondary.foodbev.distillery', valueChainStage: 'operations', microElement: "Barrel", task: "Barrel-aging inventory", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'fb.dl.4', industryId: 'secondary.foodbev.distillery', valueChainStage: 'outbound_logistics', microElement: "Bottling", task: "Bottling-line run", cadence: 'event', automatable: true },
  { id: 'fb.dl.5', industryId: 'secondary.foodbev.distillery', valueChainStage: 'infrastructure', microElement: "Excise", task: "TTB excise reporting", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // secondary.foodbev.bakery_production
  { id: 'fb.bk.1', industryId: 'secondary.foodbev.bakery_production', valueChainStage: 'operations', microElement: "Production", task: "Daily production run", cadence: 'daily', automatable: true },
  { id: 'fb.bk.2', industryId: 'secondary.foodbev.bakery_production', valueChainStage: 'inbound_logistics', microElement: "Ingredient", task: "Ingredient lot trace", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'fb.bk.3', industryId: 'secondary.foodbev.bakery_production', valueChainStage: 'operations', microElement: "Allergen", task: "Allergen-control log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'fb.bk.4', industryId: 'secondary.foodbev.bakery_production', valueChainStage: 'outbound_logistics', microElement: "Wholesale", task: "Wholesale-route delivery", cadence: 'daily', automatable: true },
  { id: 'fb.bk.5', industryId: 'secondary.foodbev.bakery_production', valueChainStage: 'service', microElement: "Recall", task: "Lot-recall workflow", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
];
