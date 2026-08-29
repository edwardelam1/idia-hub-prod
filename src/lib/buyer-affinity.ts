/**
 * Buyer Affinity Engine — canonical category resolution + dynamic valuation.
 *
 * Mirrored verbatim in supabase/functions/_shared/buyer-affinity.ts so the
 * client preview price and the server-charged price never diverge.
 */

export type CanonicalDataCategory =
  | "realtimeSentiment"
  | "consumerTransactions"
  | "geospatialSar"
  | "b2bFirmographics"
  | "identityGraphs"
  | "consentArtifacts";

export type BuyerRole = "TRADING_DESK" | "ORG_ADMIN" | "COMPLIANCE_OFFICER" | "INDIVIDUAL";
export type BuyerJurisdiction = "USA" | "SGP" | "IND" | "NGA_ZAF" | "UAE";
export type BuyerLatency = "STREAMING" | "INTRADAY" | "BATCH";

export interface BuyerProfileVector {
  userId: string;
  role: BuyerRole;
  jurisdiction: BuyerJurisdiction;
  latencyRequirement: BuyerLatency;
  weights: Record<CanonicalDataCategory, number>;
}

export const CATEGORY_LABELS: Record<CanonicalDataCategory, string> = {
  realtimeSentiment: "Real-Time Sentiment & Market Telemetry",
  consumerTransactions: "De-Identified Consumer Transactions",
  geospatialSar: "Geospatial Mobility & Foot Traffic",
  b2bFirmographics: "B2B Firmographic & Intent Telemetry",
  identityGraphs: "Identity & Audience Graphs",
  consentArtifacts: "Consent-Artifacted / Certified Datasets",
};

/**
 * Maps any platform module, nanoBite code, sector or bundle prefix to a
 * canonical category key. Exhaustive by keyword, deterministic fallback.
 */
export function resolveCanonicalCategory(sourceKey: string): CanonicalDataCategory {
  const normalized = (sourceKey ?? "").toLowerCase();

  if (
    normalized.includes("sentiment") ||
    normalized.includes("crypto") ||
    normalized.includes("token") ||
    normalized.includes("feed") ||
    normalized.includes("ticker") ||
    normalized.includes("trading") ||
    normalized.includes("market") ||
    normalized.includes("orderflow") ||
    normalized.includes("quaternary")
  ) {
    return "realtimeSentiment";
  }
  if (
    normalized.includes("pos") ||
    normalized.includes("transaction") ||
    normalized.includes("receipt") ||
    normalized.includes("payment") ||
    normalized.includes("spend") ||
    normalized.includes("lifestyle") ||
    normalized.includes("health") ||
    normalized.includes("biometric") ||
    normalized.includes("fitness") ||
    normalized.includes("quinary")
  ) {
    return "consumerTransactions";
  }
  if (
    normalized.includes("geo") ||
    normalized.includes("mobility") ||
    normalized.includes("sar") ||
    normalized.includes("traffic") ||
    normalized.includes("spatial") ||
    normalized.includes("location") ||
    normalized.includes("logistics") ||
    normalized.includes("travel")
  ) {
    return "geospatialSar";
  }
  if (
    normalized.includes("b2b") ||
    normalized.includes("firmographic") ||
    normalized.includes("business") ||
    normalized.includes("inventory") ||
    normalized.includes("procurement") ||
    normalized.includes("supplier") ||
    normalized.includes("tax") ||
    normalized.includes("tertiary") ||
    normalized.includes("secondary")
  ) {
    return "b2bFirmographics";
  }
  if (
    normalized.includes("identity") ||
    normalized.includes("audience") ||
    normalized.includes("graph") ||
    normalized.includes("crm") ||
    normalized.includes("contact") ||
    normalized.includes("cohort") ||
    normalized.includes("social")
  ) {
    return "identityGraphs";
  }
  if (
    normalized.includes("compliance") ||
    normalized.includes("optin") ||
    normalized.includes("opt-in") ||
    normalized.includes("consent") ||
    normalized.includes("vault") ||
    normalized.includes("cleanroom") ||
    normalized.includes("governance") ||
    normalized.includes("audit")
  ) {
    return "consentArtifacts";
  }

  return "consumerTransactions";
}

export interface RelevanceBreakdown {
  baseWeight: number;
  jurisdictionFactor: number;
  latencyFactor: number;
}

/** Calculates dynamic dataset relevance multiplier W in [0.10, 1.00]. */
export function calculateDatasetRelevance(
  buyer: BuyerProfileVector,
  category: CanonicalDataCategory,
  datasetJurisdiction: string = "USA",
  datasetCadence: BuyerLatency = "BATCH",
): { relevance: number; breakdown: RelevanceBreakdown } {
  try {
    const baseWeight = Number(buyer?.weights?.[category] ?? 0.5);
    const jurisdictionFactor = buyer?.jurisdiction === datasetJurisdiction ? 1.2 : 0.85;
    const latencyFactor = buyer?.latencyRequirement === datasetCadence ? 1.15 : 0.9;

    const rawScore = baseWeight * jurisdictionFactor * latencyFactor;
    const relevance = Math.min(Math.max(parseFloat(rawScore.toFixed(4)), 0.1), 1.0);

    return { relevance, breakdown: { baseWeight, jurisdictionFactor, latencyFactor } };
  } catch (error) {
    console.error("[BUYER_AFFINITY:CALC_ERROR] Fallback to 1.0.", error);
    return { relevance: 1.0, breakdown: { baseWeight: 1.0, jurisdictionFactor: 1.0, latencyFactor: 1.0 } };
  }
}
