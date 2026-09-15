import { SECTOR_VALUES } from "./sectorValues.ts";

/**
 * Deterministic bundle pricing anchored to Best Friend AI chat cost.
 *
 * synapse-controller.calculateDynamicFee charges:
 *   feeCR (one chat / one query) = ceil(1 * SECTOR_VALUES[sector] * buyerWeight)
 *
 * One Best Friend chat surfaces at most MAX_OMNI_ROWS (500) rows of context,
 * so a bundle is priced as "how many chats would it take to see this dataset".
 */
export const CHAT_ROW_WINDOW = 500;

/**
 * Size bands. Purely a descriptive label for the catalogue — never a price input.
 */
export const SIZE_BANDS: Array<{ tier: string; minRecords: number }> = [
  { tier: "Enterprise", minRecords: 1000 },
  { tier: "Professional", minRecords: 250 },
  { tier: "Analyst", minRecords: 0 },
];

export function resolveSizeLabel(recordCount: number): string {
  const n = Math.max(0, Math.floor(recordCount ?? 0));
  return SIZE_BANDS.find((b) => n >= b.minRecords)?.tier ?? "Analyst";
}


/** Map a bundle category (e.g. "health.biometric") to a sector pricing key. */
export function resolveSectorKey(category: string): string {
  const root = (category ?? "").split(".")[0]?.toLowerCase() ?? "general";
  if (root in SECTOR_VALUES) return root;
  // Domain roots map onto the value-chain sectors used by synapse-controller.
  switch (root) {
    case "health":
    case "lifestyle":
      return "quinary";
    case "business":
      return "tertiary";
    default:
      return "general";
  }
}

export interface BundlePriceInput {
  recordCount: number;
  category: string;
  tier: string;
  avgQualityScore?: number;
  buyerWeight?: number;
}

export interface BundlePriceResult {
  price: number;
  chatEquivalents: number;
  perChatFeeCR: number;
  sectorKey: string;
  tierMultiplier: number;
  qualityFactor: number;
}

export function calculateBundlePrice(input: BundlePriceInput): BundlePriceResult {
  const recordCount = Math.max(0, Math.floor(input.recordCount ?? 0));
  const sectorKey = resolveSectorKey(input.category);
  const sectorValue = SECTOR_VALUES[sectorKey] ?? 1.0;
  const buyerWeight = input.buyerWeight ?? 1.0;

  // Identical formula to synapse-controller.calculateDynamicFee.
  const perChatFeeCR = Math.ceil(1 * sectorValue * buyerWeight);

  const chatEquivalents = Math.max(1, Math.ceil(recordCount / CHAT_ROW_WINDOW));
  const tierMultiplier = TIER_MULTIPLIERS[input.tier] ?? 1.0;

  const quality = Math.min(1, Math.max(0, Number(input.avgQualityScore ?? 0.8)));
  const qualityFactor = 0.75 + quality * 0.25;

  const price = Math.max(
    1,
    Math.ceil(chatEquivalents * perChatFeeCR * tierMultiplier * qualityFactor),
  );

  return { price, chatEquivalents, perChatFeeCR, sectorKey, tierMultiplier, qualityFactor };
}
