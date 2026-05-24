// src/taxonomy/index.ts

// Explicit imports for the registry assembly
import { SECTORS } from "./sectors";
import { ALL_INDUSTRIES } from "./industries";
import { ALL_NANO_BITES } from "./nanoBites";
import { REVENUE_ARCHETYPES } from "./archetypes";

// Explicit exports for application consumers
//export { SECTORS } from "./sectors";
//export { ALL_INDUSTRIES } from "./industries";
//export { ALL_NANO_BITES } from "./nanoBites";
//export { REVENUE_ARCHETYPES } from "./archetypes";

// Explicitly export other critical modules
//export { NAICS } from "./codes/naics";
//export { GICS } from "./codes/gics";
//export { initializeTaxonomy };

/**
 * Master Assembly of the Business Taxonomy Engine.
 * Single source of truth consumed by the IDIA Pay App Builder.
 */
function initializeTaxonomy() {
  console.log("[IDIA_TAXONOMY_CORE]: BEGIN - Assembly Execution");

  try {
    const registry = {
      sectors: SECTORS,
      industries: ALL_INDUSTRIES,
      nanoBites: ALL_NANO_BITES,
      archetypes: REVENUE_ARCHETYPES,
    };

    if (!registry.sectors || !registry.industries) {
      throw new Error("Registry hydration failed: Missing core taxonomy data.");
    }

    console.log(
      `[IDIA_TAXONOMY_CORE]: SUCCESS - Assembly complete. Verticals Hydrated: ` +
        `${registry.sectors.length} sectors, ${registry.industries.length} industries, ${registry.nanoBites.length} nano-bites.`,
    );

    return registry;
  } catch (error) {
    console.error("[IDIA_TAXONOMY_CORE]: FAILURE - Assembly stalling detected.", error);
    throw error;
  }
}
