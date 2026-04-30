import type { ComponentType } from "react";
import { POSModule } from "@/components/modules/POSModule";

/**
 * ComponentRegistry — maps a Pay App vertical ID (from PayAppBlueprint) to the
 * top-level React component that acts as the merchant's primary surface.
 *
 * The POSModule is the universal dynamic chassis for all transactional
 * verticals; it inspects the injected `activeBites` payload from the
 * DynamicModuleLoader to render vertical-specific telemetry overlays. Modal
 * sub-components like LiveCheckout MUST NOT be registered here.
 */
export interface ModuleProps {
  activeBites?: string[];
  verticalId?: string;
}

export const ComponentRegistry: Record<string, ComponentType<ModuleProps>> = {
  // Vertical specializations mapped to the dynamic POS chassis
  "hosp-fine-dining": POSModule,
  "hosp-cafe": POSModule,
  "hosp-nightclub": POSModule,
  "hosp-entertainment": POSModule,
  "hosp-hotel": POSModule,
  "retail-fashion": POSModule,
  "retail-mass": POSModule,
  "qsr-standard": POSModule,
};

export const resolveModule = (verticalId: string): ComponentType<ModuleProps> | null => {
  return ComponentRegistry[verticalId] ?? null;
};