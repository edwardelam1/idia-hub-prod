// src/taxonomy/index.ts

// 1. Aggressive Named Export: Export all named members
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

// 2. Satisfy missing binding requirements 
// (These prevent the "Importing binding name not found" crashes)
export const breakEven = { fixedCosts: 0, variableCosts: 0, targetVolume: 0 };
export const EMPTY_CLASSIFICATION = { 
  id: "empty", 
  label: "Unclassified", 
  industryId: "none", 
  category: "Uncategorized" 
};

// 3. Interface Stubs
export function getNanoBitesFor(industryId: string): any[] { return []; }
export function getIndustryById(id: string): any | null { return null; }
export function recommendArchetype(context: any): any | null { return null; }

export function initializeTaxonomy() {
  return { status: "ready" };
}