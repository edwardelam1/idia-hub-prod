import { useCallback, useState } from 'react';
import {
  EMPTY_CLASSIFICATION,
  breakEven,
  getNanoBitesFor,
  recommendArchetype,
  recommendedProductionFor,
  type BreakEvenInput,
  type Classification,
  type NanoBite,
  type PositioningArchetype,
  type ValueChainStage,
} from '@/taxonomy';

/**
 * Hook to hydrate App Builder components with Sector-specific logic.
 * Includes granular logging to prevent silent stalling during
 * Planck-scale task injection.
 */
export const useBusinessTaxonomy = (businessId: string) => {
  const [classification, setClassification] = useState<Classification>(EMPTY_CLASSIFICATION);
  const [loading, setLoading] = useState(false);

  const hydrateNanoBites = useCallback(
    async (stage: ValueChainStage): Promise<NanoBite[]> => {
      console.log(`[IDIA_CORE_OP]: STARTING Nano-Bite hydration for Stage: ${stage} | Business: ${businessId}`);
      setLoading(true);
      try {
        const bites = getNanoBitesFor({
          industryId: classification.industryId,
          stage,
        });
        console.log(`[IDIA_CORE_OP]: SUCCESS - Retrieved ${bites.length} task atoms.`);
        return bites;
      } catch (error) {
        console.error(`[IDIA_CORE_OP]: FATAL ERROR during Nano-Bite hydration:`, error);
        throw error;
      } finally {
        setLoading(false);
        console.log(`[IDIA_CORE_OP]: ENDING Nano-Bite hydration process.`);
      }
    },
    [businessId, classification.industryId],
  );

  const recommendedArchetype = useCallback(
    (signals: { unitMargin?: number; monthlyVolume?: number } = {}): PositioningArchetype =>
      recommendArchetype(signals),
    [],
  );

  const breakEvenFor = useCallback((input: BreakEvenInput) => breakEven(input), []);

  return {
    classification,
    setClassification,
    hydrateNanoBites,
    recommendedArchetype,
    recommendedProductionFor,
    breakEvenFor,
    loading,
  };
};
