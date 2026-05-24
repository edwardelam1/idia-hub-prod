// src/taxonomy/index.ts

// Explicit imports for the registry assembly
import { SECTORS } from "./sectors";
import { ALL_INDUSTRIES } from "./industries";
import { ALL_NANO_BITES } from "./nanoBites";
import { REVENUE_ARCHETYPES } from "./archetypes";
import { NAICS } from "./codes/naics";
import { GICS } from "./codes/gics";

// Explicit exports for application consumers
export { SECTORS, ALL_INDUSTRIES, ALL_NANO_BITES, REVENUE_ARCHETYPES, NAICS, GICS };

/**
 * Accessor for NanoBite definitions
 * Filters the master list by industry identifier.
 */
export function getNanoBitesFor(industryId: string) {
  if (!ALL_NANO_BITES) {
    console.warn("[IDIA_TAXONOMY_CORE]: Warning - Attempted to access NanoBites before hydration.");
    return [];
  }
  return ALL_NANO_BITES.filter((bite) => bite.industryId === industryId);
}

/**
 * Master Assembly of the Business Taxonomy Engine.
 * Single source of truth consumed by the IDIA Pay App Builder.
 */
export function initializeTaxonomy() {
  console.log("[IDIA_TAXONOMY_CORE]: BEGIN - Assembly Execution");

  try {
    const registry = {
      sectors: SECTORS,
      industries: ALL_INDUSTRIES,
      nanoBites: ALL_NANO_BITES,
      archetypes: REVENUE_ARCHETYPES,
      naics: NAICS,
      gics: GICS,
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
