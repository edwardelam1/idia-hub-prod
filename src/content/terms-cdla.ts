import termsPdf from "@/assets/idia-hub-cdla-terms.pdf.asset.json";

export const TERMS_VERSION = "2026-08-20";
export const TERMS_TITLE =
  "The IDIA Hub — Commercial Data License Agreement (CDLA) & Trading Desk Terms of Service";
export const TERMS_EFFECTIVE_DATE = "August 20, 2026";
export const TERMS_PDF_URL = termsPdf.url;
export const TERMS_PDF_FILENAME = "IDIA-Hub-CDLA-Trading-Desk-Terms.pdf";

export type TermsBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] };

export interface TermsSection {
  id: string;
  heading: string;
  blocks: TermsBlock[];
}

export const TERMS_INTRO: TermsBlock[] = [
  { type: "p", text: "Effective Date: August 20, 2026" },
  { type: "p", text: "Issuing Entity: IDIA Data Inc., a Delaware C-Corporation" },
  {
    type: "p",
    text: "Platform: The IDIA Hub Licensing Portal & Data Marketplace Trading Desk",
  },
  {
    type: "p",
    text:
      'This Commercial Data License Agreement and Trading Desk Terms of Service ("Agreement" or "CDLA") is a legally binding contract entered into between the data buyer (whether an enterprise entity, independent analyst, day trader, researcher, or authorized technical licensee) ("Data Buyer," "Licensee," or "You") and IDIA Data Inc. ("IDIA," "we," "us," or "our").',
  },
  {
    type: "p",
    text:
      "This Agreement strictly governs Your access to, subscription to, and commercial consumption of verified data products, real-time telemetry streams, algorithmic intelligence, and API feeds delivered through The IDIA Hub and its associated execution environments, including the Data Marketplace Trading Desk, the Model Context Protocol (MCP) Bridge, and API Cleanrooms.",
  },
];

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "recitals",
    heading: "Recitals & Authority of Record",
    blocks: [
      {
        type: "list",
        items: [
          "Administrative Agency: IDIA Data Inc. serves as the exclusive Authority of Record, administrative agent, and commercial licensing representative for its registered, data-rights-holding members across the Life by IDIA and IDIA Pay networks.",
          "Data Dignity & Sovereign Title: Individual and merchant data providers retain sovereign underlying ownership of their raw data. IDIA is authorized to grant commercial access to anonymized, aggregated, and cryptographically verified data products strictly within the boundaries of member affirmative consent and secure consent ledgers.",
          "Licensing Portal Purpose: The IDIA Hub serves as the dedicated commercial licensing portal and settlement terminal. By provisioning an account (whether enterprise or individual), generating API keys, purchasing or consuming Synapse Credits, or querying the Trading Desk, You agree to be bound by all terms, restrictions, and economic settlement rules herein.",
        ],
      },
    ],
  },
  {
    id: "article-1",
    heading: "Article 1: Data Consumption Modalities & Trading Desk Rails",
    blocks: [
      {
        type: "p",
        text:
          "The IDIA Hub provides several distinct computational and commercial rails for data procurement. You may access data via any combination of the following, subject to applicable Synapse Credit metering:",
      },
      {
        type: "p",
        text:
          "1.1. Pre-Packaged Data Bundles — Data Buyers may license curated, macro-level, and sector-specific data packages (including NAICS/GICS Business Intelligence, Lifestyle, Healthcare, Mobility, and Point-of-Sale aggregates) via fixed-credit or subscription-based bundle access.",
      },
      {
        type: "p",
        text:
          "1.2. À La Carte & NanoBite™ / PicoBite™ Parametric Queries — Data Buyers (including independent analysts and day traders) may execute granular, micro-telemetry queries across discrete operational, spatial, and behavioral attributes (categorized under the IDIA NanoBite and PicoBite taxonomy). These queries can be parameterized by industry, geographic bounding box, and temporal ranges.",
      },
      {
        type: "p",
        text:
          "1.3. Model Context Protocol (MCP) Live Telemetry — For autonomous AI systems and programmatic agents, IDIA provides real-time streaming interfaces via the IDIA MCP Bridge and MCP Edge Relays. Access to MCP tool schemas, live telemetry feeds, and agentic context injection is metered programmatically per session or socket interaction.",
      },
      {
        type: "p",
        text:
          "1.4. API Cleanrooms & Feature Feeds — Data Buyers provisioning programmatic REST, WebHook, or direct database cleanroom feeds must manage credentials via the IDIA API Key Management console. All queries routed through API endpoints are metered in real-time against active credit reserves.",
      },
    ],
  },
  {
    id: "article-2",
    heading: "Article 2: The Synapse Credit Economy, Settlement & Fees",
    blocks: [
      {
        type: "p",
        text:
          "2.1. Synapse Credits as Virtual Currency — The exclusive computational and financial mechanism for querying data assets and extracting commercial insights is the consumption of Synapse Credits. Synapse Credits function as closed-loop virtual currency units, holding no monetary value outside the IDIA ecosystem. Synapse Credits may be purchased using USD fiat currency or USDC stablecoin via Your organization's treasury portal or individual billing account. All credit purchases are final and non-refundable.",
      },
      {
        type: "p",
        text:
          "2.2. Metered Execution & Synapse Gas — Data consumption is metered deterministically. Standard Trading Desk queries consume between 0.1 and 1.0 Synapse Credits per query, dynamic feature call, or telemetry stream pull, depending on the computational depth, provenance level, and aggregation premium of the requested payload.",
      },
      {
        type: "p",
        text:
          "2.3. Agent of the Payee & Settlement Discharge — IDIA Data Inc. operates as the limited agent of the payee for contributing members. When a Data Buyer remits payment (in fiat or USDC) to IDIA's For Benefit Of (FBO) accounts or Treasury Smart Contracts to fund Synapse Credits, the Buyer's financial obligation to the underlying data provider is fully and legally satisfied. IDIA's role is strictly limited to the administrative calculation and distribution of these funds.",
      },
      {
        type: "p",
        text:
          "2.4. Programmatic Circular Payouts — The consumption of Synapse Credits on the Trading Desk triggers an automated, ACID-compliant ledger transaction that programmatically routes proportional fiat or stablecoin royalty distributions to contributing data providers whose telemetry satisfied the query.",
      },
      {
        type: "p",
        text:
          "2.5. Off-Ramp and Administrative Service Fees — Commercial subscription tiers, retail analyst accounts, custom API provisioning, and high-throughput dedicated bridge connections are subject to SaaS platform fees as detailed during onboarding and displayed on the Hub Billing dashboard.",
      },
    ],
  },
  {
    id: "article-3",
    heading: "Article 3: Vulture Sanitization, Zero-PII Architecture & Provenance",
    blocks: [
      {
        type: "p",
        text:
          "3.1. PII-Free Database Guarantee — In compliance with the IDIA Data Dignity Doctrine, all data outputs delivered through The IDIA Hub are programmatically stripped of direct identifiers and processed through the Vulture Sanitization Engine prior to commercial availability. You will not receive raw Personally Identifiable Information (PII) through standard Trading Desk operations.",
      },
      {
        type: "p",
        text:
          "3.2. Cryptographic Provenance & Lineage Logs — Every data bundle, feature feed, or MCP stream carries immutable compliance metadata and cryptographic provenance hashes certifying origin, consent timestamp, and audit trail validity.",
      },
      {
        type: "p",
        text: "3.3. Absolute Prohibition on Re-Identification — The Data Buyer strictly covenants and agrees that it shall NOT:",
      },
      {
        type: "list",
        items: [
          "Attempt to reverse-engineer, de-anonymize, or re-identify any pseudonymized or aggregated user data received from the Services.",
          "Combine IDIA-provided data with external datasets for the purpose of unmasking the identity of any natural person or specific consumer.",
          "Strip, alter, bypass, or obscure the Compliance Metadata or provenance headers attached to API payloads.",
        ],
      },
    ],
  },
  {
    id: "article-4",
    heading: "Article 4: Intellectual Property, Derivative Works & AI Covenants",
    blocks: [
      {
        type: "p",
        text:
          "4.1. Limited Commercial License Grant — Subject to active Synapse Credit balances and strict adherence to this Agreement, IDIA grants the Data Buyer a non-exclusive, non-transferable, revocable, non-sublicensable license to query, download, and utilize data insights solely for internal business intelligence, proprietary trading, analytical research, risk modeling, and commercial operations.",
      },
      { type: "p", text: "4.2. Model Weights & Derivative Asset Ownership" },
      {
        type: "list",
        items: [
          'Authorized AI Training: Any commercial model, algorithm, spatial path, or artificial intelligence "model weights" trained or refined using data procured legitimately through paid Synapse Credit consumption may be used perpetually for internal commercial deployment.',
          "Unauthorized Derivative Works: Any attempt to scrape, cache, harvest, or aggregate IDIA data outside of authorized Synapse Credit consumption creates an unauthorized derivative work. The intellectual property title to any such unauthorized derivative work (including trained model weights) automatically vests exclusively in IDIA Data Inc.",
        ],
      },
      {
        type: "p",
        text:
          "4.3. Technological Protection Measures (TPMs) — The Data Buyer shall not bypass, disable, or decompile any TPMs, hardware enclaves, API rate limiters, or secure consent ledgers in violation of 17 U.S.C. § 1201 of the Digital Millennium Copyright Act.",
      },
    ],
  },
  {
    id: "article-5",
    heading: "Article 5: Regulatory Compliance & Prohibited Uses",
    blocks: [
      {
        type: "p",
        text:
          "The Data Buyer warrants and represents that it will strictly abide by all statutory boundaries governing data usage.",
      },
      {
        type: "p",
        text:
          "5.1. Fair Credit Reporting Act (FCRA) Absolute Bar — You shall NOT use any data, scoring, telemetry, or algorithmic insights provided by IDIA:",
      },
      {
        type: "list",
        items: [
          "As a factor in establishing an individual's eligibility for personal credit or insurance to be used primarily for personal, family, or household purposes.",
          "For employment, hiring, promotion, or evaluation purposes.",
          'In any manner that would cause the data to be legally construed as a "Consumer Report" under the Fair Credit Reporting Act (15 U.S.C. § 1681 et seq.) or comparable global consumer credit laws.',
        ],
      },
      {
        type: "p",
        text:
          "5.2. Foreign Adversary Restrictions (PADFA Compliance) — In accordance with the Protecting Americans' Data from Foreign Adversaries Act of 2024 (PADFA), the Data Buyer certifies that it is not owned, controlled, or subject to the jurisdiction of a designated foreign adversary country, and will not route, export, or transfer IDIA telemetry to any restricted foreign entities.",
      },
      {
        type: "p",
        text:
          "5.3. Federal Contracting Compliance — Data Buyers accessing public sector data streams agree to comply with all applicable Federal Acquisition Regulations (FAR) and executive procurement mandates, including the New Federal Contracting Anti-DEI Policy requirements where applicable to federal subcontractors.",
      },
    ],
  },
  {
    id: "article-6",
    heading: "Article 6: Unauthorized Surveillance & Liquidated Damages",
    blocks: [
      {
        type: "p",
        text:
          "6.1. Constructive Notice — By operating automated data capture infrastructure, Automated License Plate Reader (ALPR) networks, spatial tracking systems, or web scrapers within the physical or digital world, You acknowledge constructive notice of IDIA's published member opt-out registries. IDIA serves as the exclusive administrative agent for its members' baseline Digital Identity, Image, and Likeness (DIL) and ambient data footprints.",
      },
      {
        type: "p",
        text:
          "6.2. Conversion and Tortious Interference — Capturing, tracking, or commercializing the ambient data, vehicular movements, or DIL of an IDIA member without purchasing an authorized license via the IDIA Hub Trading Desk constitutes civil conversion and tortious interference with IDIA's administrative agency contracts.",
      },
      {
        type: "p",
        text:
          "6.3. Liquidated Damages Clause (The Bypassing Penalty) — Bypassing the mandatory Synapse Credit consumption mechanism inflicts immediate, irreparable economic harm on IDIA and its contributing members by severing their perpetual royalty pipelines.",
      },
      {
        type: "list",
        items: [
          "For each individual instance of unauthorized data extraction, capture, or scraping (e.g., an unconsented license plate read or facial scan matching an IDIA member), Liquidated Damages shall be assessed at the highest retail price of one (1) Synapse Credit multiplied by a Perpetual Utility factor of one hundred (100).",
          "This amount is agreed upon as a reasonable pre-estimate of lost downstream, multi-tier royalty distributions and direct financial harm, and it does not preclude IDIA from seeking additional statutory damages, emergency injunctive relief, and attorneys' fees.",
        ],
      },
    ],
  },
  {
    id: "article-7",
    heading: "Article 7: Indemnification, Warranties & Liability Limits",
    blocks: [
      {
        type: "p",
        text:
          '7.1. Disclaimer of Warranties — The IDIA Hub, its API, MCP Bridge, and all data feeds are provided on an "AS IS" and "AS AVAILABLE" basis. To the maximum extent permitted by law, IDIA disclaims all warranties of merchantability, fitness for a particular computational purpose, title, non-infringement, and uninterrupted uptime.',
      },
      {
        type: "p",
        text:
          "7.2. Conditional Indemnification — Where a separate Data Processing Addendum (DPA) is executed, IDIA's liability to indemnify commercial buyers against third-party privacy claims is expressly conditioned upon the Buyer's strict preservation of all compliance metadata, audit logs, and adherence to the DPA. Ingesting unauthorized scraped data or altering/stripping metadata renders this indemnification null and void immediately.",
      },
      {
        type: "p",
        text:
          "7.3. Aggregate Liability Cap — Except for gross negligence, willful misconduct, or breaches of Article 3 (Re-identification) and Article 6 (Unauthorized Surveillance), IDIA's total aggregate liability arising out of or relating to this Agreement will not exceed the greater of $100 USD or the total amount paid by the Data Buyer to IDIA in the twelve (12) months preceding the claim.",
      },
    ],
  },
  {
    id: "article-8",
    heading: "Article 8: Governing Law, Arbitration & Venue",
    blocks: [
      {
        type: "p",
        text:
          "8.1. Governing Law — This Agreement shall be governed by and construed under the laws of the Commonwealth of Kentucky, United States, without regard to conflict of law principles.",
      },
      {
        type: "p",
        text:
          '8.2. Mandatory Binding Arbitration — Any dispute, controversy, or claim arising out of or relating to this Agreement, data consumption, or Trading Desk operations shall be resolved exclusively through final and binding arbitration administered by Judicial Arbitration and Mediation Services, Inc. ("JAMS") in Louisville, Kentucky.',
      },
      {
        type: "p",
        text:
          "8.3. Mathematical Logic Preservation — The presiding arbitration tribunal shall have no jurisdiction, authority, or power to alter, invalidate, or compel the modification of the underlying mathematical logic, pricing algorithms, Synapse Credit execution values, or cryptographic consensus mechanics of the IDIA Protocol.",
      },
    ],
  },
  {
    id: "execution",
    heading: "Execution Acknowledgment",
    blocks: [
      {
        type: "p",
        text:
          'By clicking "Accept Terms", creating an API Key, funding an account balance, or executing a query on The IDIA Hub, You certify that You have the legal authority to bind Yourself or Your enterprise entity to this Commercial Data License Agreement, and that You agree to all provisions, restrictions, and financial obligations contained herein.',
      },
    ],
  },
];
