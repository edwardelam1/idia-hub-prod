import type { BuyerJurisdiction, BuyerLatency, BuyerRole } from "@/lib/buyer-affinity";

export interface DiagnosticOption {
  key: string;
  label: string;
}

export interface DiagnosticQuestion {
  id: string;
  prompt: string;
  helper?: string;
  options: DiagnosticOption[];
}

export const LEVEL0_POSTURE: DiagnosticQuestion = {
  id: "0.1",
  prompt: "What is the core function of your entity within the ecosystem?",
  helper: "Primary Organizational Posture",
  options: [
    { key: "A", label: "Trading Desk / Quantitative Ingestion / Market Arbitrage" },
    { key: "B", label: "Enterprise Operational Management / Business Intelligence" },
    { key: "C", label: "Compliance Oversight / Legal Governance / Risk Audit" },
    { key: "D", label: "Individual Consumer / Creator / Independent Researcher" },
  ],
};

export const LEVEL0_JURISDICTION: DiagnosticQuestion = {
  id: "0.2",
  prompt: "Which primary regulatory jurisdiction governs your downstream data processing?",
  helper: "Primary Jurisdictional Exposure",
  options: [
    { key: "A", label: "United States (State Privacy Frameworks / FTC Oversight)" },
    { key: "B", label: "Singapore (PDPA Framework / APAC HQ Routing)" },
    { key: "C", label: "India (DPDP Act / Consent Manager Ingestion)" },
    { key: "D", label: "Nigeria / South Africa (NDPA / POPIA Direct Opt-In Frameworks)" },
    { key: "E", label: "UAE (DIFC / ADGM Special Free Zone Frameworks)" },
  ],
};

export const POSTURE_TO_ROLE: Record<string, BuyerRole> = {
  A: "TRADING_DESK",
  B: "ORG_ADMIN",
  C: "COMPLIANCE_OFFICER",
  D: "INDIVIDUAL",
};

export const CHOICE_TO_JURISDICTION: Record<string, BuyerJurisdiction> = {
  A: "USA",
  B: "SGP",
  C: "IND",
  D: "NGA_ZAF",
  E: "UAE",
};

export const LATENCY_FROM_Q1: Record<string, BuyerLatency> = {
  A: "STREAMING",
  B: "STREAMING",
  C: "INTRADAY",
  D: "BATCH",
};

export const LATENCY_FROM_E3: Record<string, BuyerLatency> = {
  A: "INTRADAY",
  B: "STREAMING",
  C: "BATCH",
};

export const LATENCY_FROM_C3: Record<string, BuyerLatency> = {
  A: "INTRADAY",
  B: "BATCH",
  C: "BATCH",
};

export const LATENCY_FROM_I2: Record<string, BuyerLatency> = {
  A: "BATCH",
  B: "INTRADAY",
  C: "STREAMING",
};

export const ROLE_BATTERIES: Record<BuyerRole, { title: string; subtitle: string; questions: DiagnosticQuestion[] }> = {
  TRADING_DESK: {
    title: "Quant & Trading Desk Battery",
    subtitle: "Trading Desk · Feature Feed Stream · MCP API Access",
    questions: [
      {
        id: "Q1",
        prompt: "What is the maximum latency threshold for model feature updates?",
        helper: "Algorithmic Latency & Execution Window",
        options: [
          { key: "A", label: "Sub-millisecond / Microsecond streaming (HFT / Direct Agent Inference)" },
          { key: "B", label: "Sub-second real-time event feeds (Event Arbitrage)" },
          { key: "C", label: "Intraday batch (15–60 min intervals)" },
          { key: "D", label: "End-of-day / Longitudinal backtesting" },
        ],
      },
      {
        id: "Q2",
        prompt: "Which raw signals feed directly into your predictive agents?",
        helper: "Machine-Readable Feature Types",
        options: [
          { key: "A", label: "Real-time token sentiment and order-flow telemetry" },
          { key: "B", label: "De-identified macro consumer spending feeds" },
          { key: "C", label: "Geospatial & mobility foot-traffic indices" },
          { key: "D", label: "Firmographic and B2B growth indicator sets" },
        ],
      },
      {
        id: "Q3",
        prompt: "What level of provenance certification is required for trading input datasets?",
        helper: "Model Decision Lineage Auditing",
        options: [
          { key: "A", label: "Cryptographic source provenance & immutable chain verification" },
          { key: "B", label: "Standard clean-room de-identification certification" },
          { key: "C", label: "Vendor indemnification warranty only" },
        ],
      },
    ],
  },
  ORG_ADMIN: {
    title: "Enterprise Admin & Business Intelligence Battery",
    subtitle: "Organization Admin · BI Bundle Suite · Inventory & Operations",
    questions: [
      {
        id: "E1",
        prompt: "Where does data integration drive business return for your enterprise?",
        helper: "Primary Operational Value Objective",
        options: [
          { key: "A", label: "Competitive market intelligence & pricing elasticity" },
          { key: "B", label: "Supply chain flow, vendor tracking, and logistics optimization" },
          { key: "C", label: "Customer acquisition, audience profiling, and retention modeling" },
          { key: "D", label: "Multi-location retail performance and footprint evaluation" },
        ],
      },
      {
        id: "E2",
        prompt: "What degree of customer or vendor linkage does your tech stack utilize?",
        helper: "Entity Linkage & Customer Data Resolution",
        options: [
          { key: "A", label: "Pseudonymous cohort graphs and segmented behavioral nodes" },
          { key: "B", label: "Deterministic 1:1 entity match (CRM / B2B enrichments)" },
          { key: "C", label: "Fully aggregated macro trends and regional heatmaps" },
        ],
      },
      {
        id: "E3",
        prompt: "What is the required update cadence for operational data syncs?",
        helper: "ERP / Inventory Lifecycle Ingestion",
        options: [
          { key: "A", label: "Daily delta batch syncs via automated webhook/API" },
          { key: "B", label: "Near real-time POS / inventory transaction streaming" },
          { key: "C", label: "Weekly / Monthly executive analytics reports" },
        ],
      },
    ],
  },
  COMPLIANCE_OFFICER: {
    title: "Compliance Officer & Risk Auditor Battery",
    subtitle: "Compliance Dashboard · API Cleanroom · Sovereign Vault",
    questions: [
      {
        id: "C1",
        prompt: "Which compliance mandates represent the highest risk threshold for your organization?",
        helper: "Regulatory Governance Framework",
        options: [
          { key: "A", label: "India DPDP Act (Mandatory registered Consent Manager tripartite flow)" },
          { key: "B", label: "South Africa POPIA / Nigeria NDPA (Strict direct marketing opt-in & DPO rules)" },
          { key: "C", label: "US State & FTC enforcement (Strict de-identification standards)" },
          { key: "D", label: "Singapore PDPA (Cross-border data transfer equivalency)" },
        ],
      },
      {
        id: "C2",
        prompt: "What technical proof is required before a dataset can be cleared for ingestion?",
        helper: "Technical and Organizational Measures (TOMs)",
        options: [
          { key: "A", label: "Audited machine-learning re-identification risk assessment" },
          { key: "B", label: "Consent artifacts and complete consent lifecycle management logs" },
          { key: "C", label: "Mathematical differential privacy / synthetic generation proof" },
          { key: "D", label: "Standard Data Processor contractual indemnification" },
        ],
      },
      {
        id: "C3",
        prompt: "How does your pipeline enforce data minimization and residual identifier destruction?",
        helper: "Retention & Erasure Lifecycle Constraints",
        options: [
          { key: "A", label: "Automated cryptographic shredding upon purpose expiration" },
          { key: "B", label: "Zero-PII storage via local air-gapped vault architecture" },
          { key: "C", label: "Policy-driven quarterly manual audits" },
        ],
      },
    ],
  },
  INDIVIDUAL: {
    title: "Individual & Developer Battery",
    subtitle: "Individual Dashboard · Sovereign Vault · Best Friend Agent",
    questions: [
      {
        id: "I1",
        prompt: "How do you intend to leverage your local data profile?",
        helper: "Personal Data Vault Utilization",
        options: [
          { key: "A", label: "Autonomous personal agent reasoning & contextual optimization" },
          { key: "B", label: "Selective zero-knowledge monetization via data cleanrooms" },
          { key: "C", label: "Private decentralized storage and identity protection" },
        ],
      },
      {
        id: "I2",
        prompt: "What is your sharing tolerance for aggregated analytics?",
        helper: "Ecosystem Sharing Posture",
        options: [
          { key: "A", label: "Strictly air-gapped / Local device storage only" },
          { key: "B", label: "Anonymized aggregate participation with revenue distribution" },
          { key: "C", label: "Verified ecosystem telemetry sharing" },
        ],
      },
    ],
  },
};

export function latencyFromAnswers(role: BuyerRole, answers: Record<string, string>): BuyerLatency {
  switch (role) {
    case "TRADING_DESK":
      return LATENCY_FROM_Q1[answers.Q1] ?? "BATCH";
    case "ORG_ADMIN":
      return LATENCY_FROM_E3[answers.E3] ?? "BATCH";
    case "COMPLIANCE_OFFICER":
      return LATENCY_FROM_C3[answers.C3] ?? "BATCH";
    default:
      return LATENCY_FROM_I2[answers.I2] ?? "BATCH";
  }
}
