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
import { getRoute } from './payAppRouting';

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
  const route = getRoute(subModuleId);
  if (!route) return [];
  return getNanoBitesFor({ industryId: route.industryId });
}

/**
 * Per-sub-module coverage row used by the dev Coverage Panel.
 */
export interface SubModuleCoverageRow {
  subModuleId: string;
  name: string;
  verticalId: string;
  industryId: string;
  industryResolved: boolean;
  moduleCount: number;
  biteCount: number;
}

/**
 * Builds a coverage report for an arbitrary list of sub-module IDs (typically
 * sourced from PayAppBlueprint's `verticalCategories`). Each row reports the
 * number of mounted modules and hydrated nano-bites, plus whether the
 * industryId resolves to a real IndustryNode.
 */
export function getSubModuleCoverage(subModuleIds: string[]): SubModuleCoverageRow[] {
  return subModuleIds.map((id) => {
    const route = getRoute(id);
    if (!route) {
      return {
        subModuleId: id,
        name: id,
        verticalId: '—',
        industryId: '—',
        industryResolved: false,
        moduleCount: 0,
        biteCount: 0,
      };
    }
    const industryResolved = !!getIndustryById(route.industryId);
    const biteCount = getNanoBitesFor({ industryId: route.industryId }).length;
    return {
      subModuleId: route.subModuleId,
      name: route.name,
      verticalId: route.verticalId,
      industryId: route.industryId,
      industryResolved,
      moduleCount: route.components.length,
      biteCount,
    };
  });
}