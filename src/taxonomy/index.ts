// src/taxonomy/index.ts

// 1. Aggressive Named Aggregation (Exports everything found in files)
export * from "./sectors";
export * from "./industries";
export * from "./nanoBites";
export * from "./archetypes";
export * from "./codes/naics";
export * from "./codes/gics";
export * from "./payAppRouting";
export * from "./payAppVerticals";
export * from "./positioning";
export * from "./production";
export * from "./selectors";
export * from "./telemetry";
export * from "./types";
export * from "./valueChain";

// 2. Initialize Function (Required by your app)
export function initializeTaxonomy() {
  console.info("[IDIA_TAXONOMY_CORE]: Registry Ready.");
  return { status: "ready", timestamp: new Date().toISOString() };
}

// 3. Default Export (Satisfies 'default' binding resolution)
// We export the entire namespace as default to allow default imports
import * as Taxonomy from "./selectors";
export default Taxonomy;