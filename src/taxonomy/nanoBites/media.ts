import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for media
export const MEDIA_BITES: NanoBite[] = [
  // quaternary.media.print_media
  { id: 'med.pr.1', industryId: 'quaternary.media.print_media', valueChainStage: 'marketing_sales', microElement: "Subscription", task: "Subscriber billing", cadence: 'monthly', automatable: true },
  { id: 'med.pr.2', industryId: 'quaternary.media.print_media', valueChainStage: 'marketing_sales', microElement: "Ad Sale", task: "Ad insertion-order", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'med.pr.3', industryId: 'quaternary.media.print_media', valueChainStage: 'operations', microElement: "Press Run", task: "Press-run schedule", cadence: 'weekly', automatable: true },
  { id: 'med.pr.4', industryId: 'quaternary.media.print_media', valueChainStage: 'outbound_logistics', microElement: "Distribution", task: "Carrier distribution route", cadence: 'daily', automatable: true },
  { id: 'med.pr.5', industryId: 'quaternary.media.print_media', valueChainStage: 'service', microElement: "Rate Card", task: "Rate-card management", cadence: 'monthly', automatable: true },
  // quaternary.media.broadcasting
  { id: 'med.br.1', industryId: 'quaternary.media.broadcasting', valueChainStage: 'operations', microElement: "Traffic", task: "Spot-traffic schedule", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'med.br.2', industryId: 'quaternary.media.broadcasting', valueChainStage: 'marketing_sales', microElement: "Ad Sale", task: "Ad-spot sale", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'med.br.3', industryId: 'quaternary.media.broadcasting', valueChainStage: 'service', microElement: "Affidavit", task: "Run affidavit", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  { id: 'med.br.4', industryId: 'quaternary.media.broadcasting', valueChainStage: 'infrastructure', microElement: "FCC Log", task: "FCC compliance log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'med.br.5', industryId: 'quaternary.media.broadcasting', valueChainStage: 'operations', microElement: "Programming", task: "Programming schedule", cadence: 'weekly', automatable: true },
  // quaternary.media.streaming
  { id: 'med.st.1', industryId: 'quaternary.media.streaming', valueChainStage: 'marketing_sales', microElement: "Subscription", task: "Subscription billing", cadence: 'monthly', automatable: true },
  { id: 'med.st.2', industryId: 'quaternary.media.streaming', valueChainStage: 'service', microElement: "CDN", task: "CDN delivery telemetry", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'med.st.3', industryId: 'quaternary.media.streaming', valueChainStage: 'marketing_sales', microElement: "Royalty", task: "Per-stream royalty calc", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  { id: 'med.st.4', industryId: 'quaternary.media.streaming', valueChainStage: 'operations', microElement: "Catalog", task: "Content-catalog ingest", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'med.st.5', industryId: 'quaternary.media.streaming', valueChainStage: 'service', microElement: "Churn", task: "Churn-save flow", cadence: 'event', automatable: true },
  // quaternary.media.podcasting
  { id: 'med.pd.1', industryId: 'quaternary.media.podcasting', valueChainStage: 'operations', microElement: "Episode", task: "Episode publish workflow", cadence: 'weekly', automatable: true },
  { id: 'med.pd.2', industryId: 'quaternary.media.podcasting', valueChainStage: 'marketing_sales', microElement: "Ad Insert", task: "Dynamic ad-insert", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'med.pd.3', industryId: 'quaternary.media.podcasting', valueChainStage: 'service', microElement: "Distribution", task: "RSS distribution sync", cadence: 'daily', automatable: true },
  { id: 'med.pd.4', industryId: 'quaternary.media.podcasting', valueChainStage: 'marketing_sales', microElement: "Sponsor", task: "Sponsor-deal pipeline", cadence: 'monthly', automatable: true },
  { id: 'med.pd.5', industryId: 'quaternary.media.podcasting', valueChainStage: 'service', microElement: "Listener", task: "Listener analytics", cadence: 'weekly', automatable: true, requiresTier: 'pro' },
  // quaternary.media.news
  { id: 'med.nw.1', industryId: 'quaternary.media.news', valueChainStage: 'operations', microElement: "Editorial", task: "Editorial-calendar mgmt", cadence: 'daily', automatable: true },
  { id: 'med.nw.2', industryId: 'quaternary.media.news', valueChainStage: 'marketing_sales', microElement: "Subscription", task: "Subscription paywall", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'med.nw.3', industryId: 'quaternary.media.news', valueChainStage: 'marketing_sales', microElement: "Ad Sale", task: "Display-ad sale", cadence: 'event', automatable: true },
  { id: 'med.nw.4', industryId: 'quaternary.media.news', valueChainStage: 'service', microElement: "Newsletter", task: "Newsletter delivery", cadence: 'daily', automatable: true },
  { id: 'med.nw.5', industryId: 'quaternary.media.news', valueChainStage: 'infrastructure', microElement: "CMS", task: "Story CMS publish", cadence: 'daily', automatable: true },
];
