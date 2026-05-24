// src/taxonomy/index.ts

// 1. Direct Re-exports (Prevents circularity by avoiding namespace imports)
export { SECTORS } from "./sectors";
export { ALL_INDUSTRIES } from "./industries";
export { ALL_NANO_BITES } from "./nanoBites";
export { REVENUE_ARCHETYPES } from "./archetypes";
export { NAICS_CODES } from "./codes/naics";
export { GICS_CODES } from "./codes/gics";
// Add other explicit exports here, referencing the specific variables

// 2. Assembly / Stubs
export const breakEven = { fixedCosts: 0, variableCosts: 0, targetVolume: 0 };
export const initializeTaxonomy = () => ({ status: "ready" });

// 3. The Only Default Export
// This acts as a wrapper. It does not import the whole tree as a namespace.
const Taxonomy = {
  breakEven,
  initializeTaxonomy
};

export default Taxonomy;