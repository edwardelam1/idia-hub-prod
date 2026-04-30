import type { NanoBite } from '../types';

// Phase 3 — operational nano-bites for financial
export const FINANCIAL_BITES: NanoBite[] = [
  // tertiary.financial.banking
  { id: 'fin.bk.1', industryId: 'tertiary.financial.banking', valueChainStage: 'operations', microElement: "Account Open", task: "New-account opening", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'fin.bk.2', industryId: 'tertiary.financial.banking', valueChainStage: 'marketing_sales', microElement: "KYC", task: "KYC/CIP verification", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.bk.3', industryId: 'tertiary.financial.banking', valueChainStage: 'service', microElement: "Wire", task: "Wire-transfer processing", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.bk.4', industryId: 'tertiary.financial.banking', valueChainStage: 'infrastructure', microElement: "AML", task: "AML transaction monitor", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.bk.5', industryId: 'tertiary.financial.banking', valueChainStage: 'service', microElement: "Statement", task: "Monthly statement generation", cadence: 'monthly', automatable: true },
  // tertiary.financial.credit_union
  { id: 'fin.cu.1', industryId: 'tertiary.financial.credit_union', valueChainStage: 'operations', microElement: "Membership", task: "Membership eligibility check", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'fin.cu.2', industryId: 'tertiary.financial.credit_union', valueChainStage: 'marketing_sales', microElement: "Loan App", task: "Loan application", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'fin.cu.3', industryId: 'tertiary.financial.credit_union', valueChainStage: 'service', microElement: "Share Draft", task: "Share-draft posting", cadence: 'daily', automatable: true },
  { id: 'fin.cu.4', industryId: 'tertiary.financial.credit_union', valueChainStage: 'infrastructure', microElement: "BSA", task: "BSA/AML monitor", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.cu.5', industryId: 'tertiary.financial.credit_union', valueChainStage: 'service', microElement: "Dividend", task: "Quarterly dividend payout", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  // tertiary.financial.investment
  { id: 'fin.inv.1', industryId: 'tertiary.financial.investment', valueChainStage: 'operations', microElement: "Account", task: "Brokerage account open", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.inv.2', industryId: 'tertiary.financial.investment', valueChainStage: 'service', microElement: "Trade Exec", task: "Trade execution capture", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.inv.3', industryId: 'tertiary.financial.investment', valueChainStage: 'marketing_sales', microElement: "Suitability", task: "Suitability questionnaire", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.inv.4', industryId: 'tertiary.financial.investment', valueChainStage: 'infrastructure', microElement: "Compliance", task: "Compliance review log", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.inv.5', industryId: 'tertiary.financial.investment', valueChainStage: 'service', microElement: "Statement", task: "Quarterly performance statement", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  // tertiary.financial.mortgage
  { id: 'fin.mtg.1', industryId: 'tertiary.financial.mortgage', valueChainStage: 'marketing_sales', microElement: "1003", task: "URLA 1003 intake", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'fin.mtg.2', industryId: 'tertiary.financial.mortgage', valueChainStage: 'operations', microElement: "Underwrite", task: "Underwriting decision", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.mtg.3', industryId: 'tertiary.financial.mortgage', valueChainStage: 'operations', microElement: "Doc Pkg", task: "Closing-doc package", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.mtg.4', industryId: 'tertiary.financial.mortgage', valueChainStage: 'service', microElement: "Servicing", task: "Loan servicing posting", cadence: 'monthly', automatable: true, requiresTier: 'pro' },
  { id: 'fin.mtg.5', industryId: 'tertiary.financial.mortgage', valueChainStage: 'infrastructure', microElement: "HMDA", task: "HMDA reporting", cadence: 'monthly', automatable: true, requiresTier: 'enterprise' },
  // tertiary.financial.fintech
  { id: 'fin.ft.1', industryId: 'tertiary.financial.fintech', valueChainStage: 'operations', microElement: "KYC", task: "KYC onboarding", cadence: 'event', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.ft.2', industryId: 'tertiary.financial.fintech', valueChainStage: 'service', microElement: "Ledger", task: "User ledger posting", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  { id: 'fin.ft.3', industryId: 'tertiary.financial.fintech', valueChainStage: 'marketing_sales', microElement: "Onboard", task: "Funnel onboarding", cadence: 'daily', automatable: true },
  { id: 'fin.ft.4', industryId: 'tertiary.financial.fintech', valueChainStage: 'infrastructure', microElement: "Fraud", task: "Fraud-rules engine", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.ft.5', industryId: 'tertiary.financial.fintech', valueChainStage: 'service', microElement: "Webhook", task: "Partner webhook delivery", cadence: 'daily', automatable: true, requiresTier: 'pro' },
  // tertiary.financial.insurance
  { id: 'fin.ins.1', industryId: 'tertiary.financial.insurance', valueChainStage: 'marketing_sales', microElement: "Quote", task: "Underwritten quote", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'fin.ins.2', industryId: 'tertiary.financial.insurance', valueChainStage: 'operations', microElement: "Policy Issue", task: "Policy issuance", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'fin.ins.3', industryId: 'tertiary.financial.insurance', valueChainStage: 'service', microElement: "Claim", task: "First-notice-of-loss intake", cadence: 'event', automatable: true, requiresTier: 'pro' },
  { id: 'fin.ins.4', industryId: 'tertiary.financial.insurance', valueChainStage: 'service', microElement: "Claim Adjust", task: "Claim adjuster workflow", cadence: 'daily', automatable: true, requiresTier: 'enterprise' },
  { id: 'fin.ins.5', industryId: 'tertiary.financial.insurance', valueChainStage: 'marketing_sales', microElement: "Renewal", task: "Renewal billing", cadence: 'monthly', automatable: true },
];
