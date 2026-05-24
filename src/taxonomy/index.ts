// src/taxonomy/index.ts

// 1. Namespace Imports (The "Total List" Pattern)
import * as Sectors from "./sectors";
import * as Industries from "./industries";
import * as NanoBites from "./nanoBites";
import * as Archetypes from "./archetypes";
import * as Naics from "./codes/naics";
import * as Gics from "./codes/gics";

// 2. Export the namespaces so consumers have full access to everything
export { Sectors, Industries, NanoBites, Archetypes, Naics, Gics };

// 3. Functional Accessors (Stubbed for direct consumption)
export const getIndustryById = (id: string) => 
  Industries.ALL_INDUSTRIES.find((i) => i.id === id);

export const getNanoBitesFor = (industryId: string) => 
  NanoBites.ALL_NANO_BITES.filter((bite) => bite.industryId === industryId);

export const recommendArchetype = (context: any) => 
  Archetypes.REVENUE_ARCHETYPES[0];

// 4. Master Assembly
export function initializeTaxonomy() {
  console.info("[IDIA_TAXONOMY_CORE]: BEGIN - Assembly Execution");

  const registry = {
    sectors: Sectors.SECTORS,
    industries: Industries.ALL_INDUSTRIES,
    nanoBites: NanoBites.ALL_NANO_BITES,
    archetypes: Archetypes.REVENUE_ARCHETYPES,
    naics: Naics.NAICS,
    gics: Gics.GICS,
  };

  if (!registry.sectors || !registry.industries) {
    throw new Error("[IDIA_TAXONOMY_CORE]: Registry hydration failed.");
  }

  return registry;
}