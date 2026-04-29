export * from './types';
export * from './sectors';
export * from './industries';
export * from './archetypes';
export * from './positioning';
export * from './production';
export * from './valueChain';
export * from './nanoBites';
export * from './selectors';
export * from './telemetry';
export { NAICS } from './codes/naics';
export { GICS } from './codes/gics';

import { SECTORS } from './sectors';
import { ALL_INDUSTRIES } from './industries';
import { ALL_NANO_BITES } from './nanoBites';
import { REVENUE_ARCHETYPES } from './archetypes';

/**
 * Master Assembly of the Business Taxonomy Engine.
 * Single source of truth consumed by the IDIA Pay App Builder.
 */
export const initializeTaxonomy = () => {
  console.log('[IDIA_TAXONOMY_CORE]: STARTING Engine Assembly...');
  const registry = {
    sectors: SECTORS,
    industries: ALL_INDUSTRIES,
    nanoBites: ALL_NANO_BITES,
    archetypes: REVENUE_ARCHETYPES,
  };
  console.log(
    `[IDIA_TAXONOMY_CORE]: SUCCESS - Assembly complete. Verticals Hydrated: ` +
      `${registry.sectors.length} sectors, ${registry.industries.length} industries, ${registry.nanoBites.length} nano-bites.`,
  );
  return registry;
};