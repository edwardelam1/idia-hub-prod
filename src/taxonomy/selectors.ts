import type {
  Classification,
  IndustryNode,
  NanoBite,
  PositioningArchetype,
  ProductionMethod,
  SectorId,
  ValueChainStage,
} from './types';
import { ALL_INDUSTRIES } from './industries';
import { ALL_NANO_BITES } from './nanoBites';
import { POSITIONING_SPECS } from './positioning';
import { PRODUCTION_METHODS } from './production';

export function getIndustriesBySector(sector: SectorId): IndustryNode[] {
  return ALL_INDUSTRIES.filter((i) => i.sector === sector);
}

export function getIndustryById(id: string): IndustryNode | undefined {
  return ALL_INDUSTRIES.find((i) => i.id === id);
}

export interface NanoBiteFilter {
  industryId?: string;
  stage?: ValueChainStage;
  cadence?: NanoBite['cadence'];
  automatableOnly?: boolean;
}

export function getNanoBitesFor(filter: NanoBiteFilter = {}): NanoBite[] {
  return ALL_NANO_BITES.filter((b) => {
    if (filter.industryId && b.industryId !== filter.industryId) return false;
    if (filter.stage && b.valueChainStage !== filter.stage) return false;
    if (filter.cadence && b.cadence !== filter.cadence) return false;
    if (filter.automatableOnly && !b.automatable) return false;
    return true;
  });
}

/** Recommend a positioning archetype based on margin & volume signals. */
export function recommendArchetype(signals: {
  unitMargin?: number;     // 0–1
  monthlyVolume?: number;
}): PositioningArchetype {
  const margin = signals.unitMargin ?? 0.3;
  const volume = signals.monthlyVolume ?? 1000;
  if (margin >= 0.5 && volume < 500) return 'boutique';
  if (margin <= 0.15 || volume >= 10000) return 'mass_market';
  return 'mid_market';
}

export function recommendedProductionFor(
  archetype: PositioningArchetype,
): ProductionMethod {
  const spec = POSITIONING_SPECS.find((p) => p.archetype === archetype);
  return spec?.recommendedProduction ?? 'batch';
}

export function getProductionMethodSpec(method: ProductionMethod) {
  return PRODUCTION_METHODS.find((p) => p.id === method);
}

/** Serializes the classification for the merchant_blueprint.json `taxonomy` block. */
export function serializeClassification(c: Classification) {
  return {
    sector: c.sector ?? null,
    industry: c.industryId ?? null,
    archetype: c.archetype ?? null,
    productionMethod: c.productionMethod ?? null,
    revenueArchetype: c.revenueArchetype ?? null,
    network: c.network ?? null,
    valueChainStages: c.valueChainStages,
    nanoBites: c.selectedNanoBiteIds,
    breakEven: c.breakEven ?? null,
  };
}

/**
 * Resolve nano-bites for a Pay App sub-module ID (e.g. 'hosp-fine-dining')
 * by routing through PAY_APP_ROUTING → industryId → bites.
 * Returns [] when the sub-module is unmapped.
 */
export function getNanoBitesForSubModule(subModuleId: string): NanoBite[] {
  // Local import to avoid a circular dep at module-init time.
  const { getRoute } = require('./payAppRouting') as typeof import('./payAppRouting');
  const route = getRoute(subModuleId);
  if (!route) return [];
  return getNanoBitesFor({ industryId: route.industryId });
}