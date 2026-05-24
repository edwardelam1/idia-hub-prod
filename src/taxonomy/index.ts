// src/taxonomy/index.ts

// 1. Export all named members
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

// 2. Import everything to create the default object
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

// 3. Define the aggregate default export
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
  ...ValueChain
};

export default Taxonomy;