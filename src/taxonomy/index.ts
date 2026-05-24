// src/taxonomy/index.ts

// 1. Namespace Imports
import * as Sectors from "./sectors";
import * as Industries from "./industries";
import * as NanoBites from "./nanoBites";
import * as Archetypes from "./archetypes";
import * as Naics from "./codes/naics";
import * as Gics from "./codes/gics";

// 2. Explicit exports for application consumers
export { Sectors, Industries, NanoBites, Archetypes, Naics, Gics };

// 3. Fallback / Empty State Constants
export const EMPTY_CLASSIFICATION = {
  id: "empty",
  label: "Unclassified",
  industryId: "none",
  category: "Uncategorized"
};

// 4. Functional Accessors
export const getIndustryById = (id: string) => 
  Industries.ALL_INDUSTRIES.find((i) => i.id === id) || null;

export const getNanoBitesFor = (industryId: string) => 
  NanoBites.ALL_NANO_BITES.filter((bite) => bite.industryId === industryId);

export const recommendArchetype = (context: any) => 
  Archetypes.REVENUE_ARCHETYPES[0];

// 5. Master Assembly
export function initializeTaxonomy() {
  console.info("[IDIA_TAXONOMY_CORE]: BEGIN - Assembly Execution");

  const registry = {
    sectors: Sectors.SECTORS,
    industries: Industries.ALL_INDUSTRIES,
    nanoBites: NanoBites.ALL_NANO_BITES,
    archetypes: Archetypes.REVENUE_ARCHETYPES,
    naics: Naics.NAICS,
    gics: Gics.GICS,
    empty: EMPTY_CLASSIFICATION
  };

  if (!registry.sectors || !registry.industries) {
    throw new Error("[IDIA_TAXONOMY_CORE]: Registry hydration failed.");
  }

  return registry;
}