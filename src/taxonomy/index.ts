// src/taxonomy/index.ts
// Explicit named exports — no wildcards, no defaults.

// Data
export { SECTORS } from "./sectors";
export {
  ALL_INDUSTRIES,
  PRIMARY_INDUSTRIES,
  SECONDARY_INDUSTRIES,
  TERTIARY_INDUSTRIES,
  QUATERNARY_INDUSTRIES,
  QUINARY_INDUSTRIES,
} from "./industries";
export { ALL_NANO_BITES } from "./nanoBites";
export { REVENUE_ARCHETYPES } from "./archetypes";
export { NAICS as NAICS_CODES } from "./codes/naics";
export { GICS as GICS_CODES } from "./codes/gics";
export { PRODUCTION_METHODS, breakEven } from "./production";

// Value exports from types (constants)
export { EMPTY_CLASSIFICATION } from "./types";

// Type exports
export type {
  NanoBite,
  IndustryNode,
  ArchetypeSpec,
  ProductionMethod,
  Classification,
  BreakEvenInput,
  BreakEvenResult,
  PositioningArchetype,
  PositioningSpec,
  ValueChainStage,
  SectorId,
  Cadence,
  NetworkModel,
  RevenueArchetype,
  TaxonomyNode,
} from "./types";

// Selectors (explicit, no star)
export {
  getIndustriesBySector,
  getIndustryById,
  getNanoBitesFor,
  getNanoBitesForSubModule,
  getProductionMethodSpec,
  getSubModuleCoverage,
  recommendArchetype,
  recommendedProductionFor,
  serializeClassification,
} from "./selectors";
export type { NanoBiteFilter, SubModuleCoverageRow } from "./selectors";

// Telemetry init shim — re-exported under a stable name even though the
// underlying module only ships validators. Components import it for boot-time
// no-op initialization; keep the surface here so callers don't break.
import { TELEMETRY_CONSTANTS } from "./telemetry";
export function initializeTaxonomy(): void {
  // Touch the constants so tree-shaking keeps telemetry available, but do
  // not perform any side effects at import time.
  void TELEMETRY_CONSTANTS;
}