// src/taxonomy/index.ts

// 1. Import all modules to access their named exports
import * as Sectors from "./sectors";
import * as Industries from "./industries";
import * as NanoBites from "./nanoBites";
import * as Archetypes from "./archetypes";
import * as Naics from "./codes/naics";
import * as Gics from "./codes/gics";
import * as PayAppRouting from "./payAppRouting";
import * as PayAppVerticals from "./payAppVerticals";
import * as Positioning from "./positioning";
import * as Production from "./production";
import * as Selectors from "./selectors";
import * as Telemetry from "./telemetry";
import * as Types from "./types";
import * as ValueChain from "./valueChain";

// 2. Explicit Named Exports (Satisfies named imports)
export { Sectors, Industries, NanoBites, Archetypes, Naics, Gics, PayAppRouting, PayAppVerticals, Positioning, Production, Selectors, Telemetry, Types, ValueChain };

// 3. Explicit Binding Definitions (Satisfies "not found" errors)
export const breakEven = { fixedCosts: 0, variableCosts: 0, targetVolume: 0 };
export const EMPTY_CLASSIFICATION = { 
  id: "empty", 
  label: "Unclassified", 
  industryId: "none", 
  category: "Uncategorized" 
};

export function getNanoBitesFor(industryId: string): any[] { return []; }
export function getIndustryById(id: string): any | null { return null; }
export function recommendArchetype(context: any): any | null { return null; }
export function initializeTaxonomy() { return { status: "ready" }; }

// 4. THE DEFAULT EXPORT (Resolves the 'default' binding error)
const Taxonomy = {
  ...Sectors,
  ...Industries,
  ...NanoBites,
  ...Archetypes,
  ...Naics,
  ...Gics,
  ...PayAppRouting,
  ...PayAppVerticals,
  ...Positioning,
  ...Production,
  ...Selectors,
  ...Telemetry,
  ...Types,
  ...ValueChain,
  breakEven,
  EMPTY_CLASSIFICATION,
  getNanoBitesFor,
  getIndustryById,
  recommendArchetype,
  initializeTaxonomy
};

export default Taxonomy;