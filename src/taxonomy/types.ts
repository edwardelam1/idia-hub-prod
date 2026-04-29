/**
 * Business Taxonomy Engine — core types
 * Isotropic shape: every node and bite shares one record type so any
 * component consuming TaxonomyNode[] or NanoBite[] works across every vertical.
 */

export type SectorId =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'quaternary'
  | 'quinary';

export type ValueChainStage =
  // Primary activities (Porter)
  | 'inbound_logistics'
  | 'operations'
  | 'outbound_logistics'
  | 'marketing_sales'
  | 'service'
  // Support activities
  | 'infrastructure'
  | 'human_resources'
  | 'technology'
  | 'procurement';

export type ProductionMethod =
  | 'job_shop'
  | 'batch'
  | 'assembly_line'
  | 'continuous_flow';

export type RevenueArchetype =
  | 'product'
  | 'service'
  | 'shared_assets'
  | 'subscription'
  | 'lease_rental'
  | 'insurance'
  | 'reselling'
  | 'agency_promotion';

export type NetworkModel = 'pipe' | 'platform';

export type PositioningArchetype = 'boutique' | 'mid_market' | 'mass_market';

export type Cadence = 'daily' | 'weekly' | 'monthly' | 'event';

export interface TaxonomyNode {
  id: string;            // stable slug, e.g. "secondary.manufacturing.apparel.boutique"
  label: string;
  parentId?: string;
  sector: SectorId;
  naics?: string;
  gics?: string;
  tags: string[];
  meta?: Record<string, unknown>;
}

export interface IndustryNode extends TaxonomyNode {
  defaultProductionMethod?: ProductionMethod;
  defaultArchetype?: PositioningArchetype;
  description?: string;
}

export interface NanoBite {
  id: string;
  industryId: string;
  valueChainStage: ValueChainStage;
  microElement: string;     // "Stock Control"
  task: string;             // "SKU labeling"
  cadence: Cadence;
  automatable: boolean;
  /** Optional gating tier for IDIA Pay feature unlocks. Additive, non-breaking. */
  requiresTier?: 'basic' | 'pro' | 'enterprise';
}

export interface PositioningSpec {
  archetype: PositioningArchetype;
  variety: 'high' | 'medium' | 'low';
  volume: 'low' | 'medium' | 'high';
  leadTime: 'short' | 'medium' | 'long';
  pricing: 'premium' | 'mid' | 'low';
  staffing: string;
  recommendedProduction: ProductionMethod;
}

export interface ArchetypeSpec {
  id: RevenueArchetype;
  label: string;
  focus: string;
  network: NetworkModel;
}

export interface BreakEvenInput {
  fc: number;     // fixed cost
  vc: number;     // variable cost per unit
  price: number;  // price per unit
}

export interface BreakEvenResult {
  qbe: number;          // break-even quantity
  contributionMargin: number;
  feasible: boolean;
}

export interface Classification {
  sector?: SectorId;
  industryId?: string;
  archetype?: PositioningArchetype;
  productionMethod?: ProductionMethod;
  revenueArchetype?: RevenueArchetype;
  network?: NetworkModel;
  valueChainStages: ValueChainStage[];
  selectedNanoBiteIds: string[];
  breakEven?: BreakEvenInput & { qbe?: number };
}

export const EMPTY_CLASSIFICATION: Classification = {
  valueChainStages: [],
  selectedNanoBiteIds: [],
};