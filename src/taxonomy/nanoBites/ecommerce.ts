import type { NanoBite } from '../types';

// Phase 3a — E-Commerce operational nano-bites
export const ECOMMERCE_BITES: NanoBite[] = [
  { id: 'ec.drop.product', industryId: 'tertiary.ecommerce.dropshipping', valueChainStage: 'procurement', microElement: "Product Import", task: "Auto-import products from supplier feed", cadence: 'daily', automatable: true },
  { id: 'ec.drop.order', industryId: 'tertiary.ecommerce.dropshipping', valueChainStage: 'outbound_logistics', microElement: "Order Forward", task: "Forward order to supplier on payment", cadence: 'event', automatable: true },
  { id: 'ec.drop.track', industryId: 'tertiary.ecommerce.dropshipping', valueChainStage: 'service', microElement: "Tracking Sync", task: "Sync tracking back to customer", cadence: 'event', automatable: true },
  { id: 'ec.drop.margin', industryId: 'tertiary.ecommerce.dropshipping', valueChainStage: 'marketing_sales', microElement: "Margin Rule", task: "Auto-markup pricing rule per supplier", cadence: 'daily', automatable: true },
  { id: 'ec.drop.return', industryId: 'tertiary.ecommerce.dropshipping', valueChainStage: 'service', microElement: "Return Auth", task: "Issue RMA for supplier", cadence: 'event', automatable: true },
  { id: 'ec.mkt.listing', industryId: 'tertiary.ecommerce.marketplace_seller', valueChainStage: 'marketing_sales', microElement: "Listing Sync", task: "Sync listings across Amazon/eBay/Etsy", cadence: 'daily', automatable: true },
  { id: 'ec.mkt.inventory', industryId: 'tertiary.ecommerce.marketplace_seller', valueChainStage: 'operations', microElement: "Inventory Sync", task: "Reconcile inventory across channels", cadence: 'daily', automatable: true },
  { id: 'ec.mkt.fee', industryId: 'tertiary.ecommerce.marketplace_seller', valueChainStage: 'infrastructure', microElement: "Fee Reconcile", task: "Reconcile marketplace fees per order", cadence: 'weekly', automatable: true },
  { id: 'ec.mkt.review', industryId: 'tertiary.ecommerce.marketplace_seller', valueChainStage: 'service', microElement: "Review Mgmt", task: "Aggregate & respond to reviews", cadence: 'daily', automatable: true },
  { id: 'ec.mkt.repricer', industryId: 'tertiary.ecommerce.marketplace_seller', valueChainStage: 'marketing_sales', microElement: "Repricer", task: "Buy-Box repricer engine", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'ec.sub.cycle', industryId: 'tertiary.ecommerce.subscription_box', valueChainStage: 'operations', microElement: "Billing Cycle", task: "Recurring billing cycle run", cadence: 'monthly', automatable: true },
  { id: 'ec.sub.churn', industryId: 'tertiary.ecommerce.subscription_box', valueChainStage: 'service', microElement: "Churn Save", task: "Cancellation save flow", cadence: 'event', automatable: true },
  { id: 'ec.sub.pick', industryId: 'tertiary.ecommerce.subscription_box', valueChainStage: 'outbound_logistics', microElement: "Pick Wave", task: "Monthly box pick wave", cadence: 'monthly', automatable: true },
  { id: 'ec.sub.preference', industryId: 'tertiary.ecommerce.subscription_box', valueChainStage: 'marketing_sales', microElement: "Preference", task: "Subscriber preference profile", cadence: 'monthly', automatable: true },
  { id: 'ec.sub.skip', industryId: 'tertiary.ecommerce.subscription_box', valueChainStage: 'service', microElement: "Skip Pause", task: "Skip / pause subscription", cadence: 'event', automatable: true },
  { id: 'ec.dig.license', industryId: 'tertiary.ecommerce.digital_goods', valueChainStage: 'operations', microElement: "License Key", task: "Issue license key on purchase", cadence: 'event', automatable: true },
  { id: 'ec.dig.download', industryId: 'tertiary.ecommerce.digital_goods', valueChainStage: 'outbound_logistics', microElement: "Download Link", task: "Time-boxed download link", cadence: 'event', automatable: true },
  { id: 'ec.dig.refund', industryId: 'tertiary.ecommerce.digital_goods', valueChainStage: 'service', microElement: "Refund Policy", task: "Digital-goods refund check", cadence: 'event', automatable: true },
  { id: 'ec.dig.tax', industryId: 'tertiary.ecommerce.digital_goods', valueChainStage: 'infrastructure', microElement: "Digital Tax", task: "Per-jurisdiction digital tax (VAT/MOSS)", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'ec.dig.piracy', industryId: 'tertiary.ecommerce.digital_goods', valueChainStage: 'service', microElement: "Anti-Piracy", task: "License-revocation on abuse", cadence: 'event', automatable: true, requiresTier: 'pro' },
];
