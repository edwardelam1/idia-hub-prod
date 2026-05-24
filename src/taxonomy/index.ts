// src/taxonomy/index.ts

// 1. Explicit Named Exports with Aliasing (Fixes the binding name mismatches)
export { NAICS as NAICS_CODES } from "./codes/naics";
export { GICS as GICS_CODES } from "./codes/gics";

// 2. Direct Re-exports for everything else
export * from "./sectors";
export * from "./industries";
export * from "./nanoBites";
export * from "./archetypes";
export * from "./payAppRouting";
export * from "./payAppVerticals";
export * from "./positioning";
export * from "./production";
export * from "./selectors";
export * from "./telemetry";
export * from "./types";
export * from "./valueChain";

// 3. Mandatory Assembly for Default Export
import * as Sectors from "./sectors";
import * as Industries from "./industries";
import * as NanoBites from "./nanoBites";
import * as Archetypes from "./archetypes";
import * as Production from "./production";
import * as Selectors from "./selectors";
import { NAICS as NAICS_CODES } from "./codes/naics";
import { GICS as GICS_CODES } from "./codes/gics";

export function initializeTaxonomy() { 
  return { status: "ready", timestamp: new Date().toISOString() }; 
}

const Taxonomy = {
  ...Sectors,
  ...Industries,
  ...NanoBites,
  ...Archetypes,
  ...Production,
  ...Selectors,
  NAICS_CODES,
  GICS_CODES,
  initializeTaxonomy
};

export default Taxonomy;