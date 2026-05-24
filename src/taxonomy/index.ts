// src/taxonomy/index.ts

// 1. Explicit Named Exports only (No star exports)
export { SECTORS } from "./sectors";
export { ALL_INDUSTRIES, PRIMARY_INDUSTRIES, SECONDARY_INDUSTRIES, TERTIARY_INDUSTRIES, QUATERNARY_INDUSTRIES, QUINARY_INDUSTRIES } from "./industries";
export { ALL_NANO_BITES } from "./nanoBites";
export { REVENUE_ARCHETYPES } from "./archetypes";
export { NAICS as NAICS_CODES } from "./codes/naics";
export { GICS as GICS_CODES } from "./codes/gics";
export { PRODUCTION_METHODS, breakEven } from "./production";

// 2. Types
export type { NanoBite, IndustryNode, ArchetypeSpec, ProductionMethod } from "./types";

// 3. Selectors and Utils
export * from "./selectors";
export { initializeTaxonomy } from "./telemetry";

// STOP HERE. Do not add `export default`. 
// If your components import Taxonomy from "@/taxonomy", change them 
// to use named imports: import { ALL_NANO_BITES } from "@/taxonomy";