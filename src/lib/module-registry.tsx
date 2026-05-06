import React, { Suspense, ComponentType } from "react";

// ============================================================================
// IDIA Dynamic Component Registry — Plank-Scale Lazy Mounting
// ============================================================================

const logTrace = (action: string, detail: string) =>
  console.info(`[BEGIN: ModuleRegistry.${action}] ${detail}`);
const logEnd = (action: string, detail: string) =>
  console.info(`[END: ModuleRegistry.${action}] ${detail}`);
const logError = (action: string, error: unknown, contextId: string) =>
  console.error(`[END: ModuleRegistry.${action}] CRITICAL FAILURE. Context ID: ${contextId}`, error);

// Helper: convert named exports into default-export shape for React.lazy
const lazyNamed = <T extends Record<string, any>>(
  loader: () => Promise<T>,
  exportName: keyof T
) =>
  React.lazy(async () => {
    const mod = await loader();
    return { default: mod[exportName] as ComponentType<any> };
  });

// --- Modules ---
const POSModule = lazyNamed(() => import("@/components/modules/POSModule"), "POSModule");
const ReportsModule = lazyNamed(() => import("@/components/modules/ReportsModule"), "ReportsModule");
const InventoryManagement = lazyNamed(() => import("@/components/modules/InventoryManagement"), "InventoryManagement");
const LocalInventory = lazyNamed(() => import("@/components/modules/LocalInventory"), "LocalInventory");
const LocalReports = lazyNamed(() => import("@/components/modules/LocalReports"), "LocalReports");
const MenuManagement = lazyNamed(() => import("@/components/modules/MenuManagement"), "MenuManagement");
const RecipeManagement = lazyNamed(() => import("@/components/modules/RecipeManagement"), "RecipeManagement");
const TeamManagement = lazyNamed(() => import("@/components/modules/TeamManagement"), "TeamManagement");
const TimesheetModule = lazyNamed(() => import("@/components/modules/TimesheetModule"), "TimesheetModule");
const TaxCenter = lazyNamed(() => import("@/components/modules/TaxCenter"), "TaxCenter");
const MarketIntelligence = lazyNamed(() => import("@/components/modules/MarketIntelligence"), "MarketIntelligence");
const AffiliateManagement = lazyNamed(() => import("@/components/modules/AffiliateManagement"), "AffiliateManagement");
const XRManagement = lazyNamed(() => import("@/components/modules/XRManagement"), "XRManagement");
const LiveCheckout = lazyNamed(() => import("@/components/modules/LiveCheckout"), "LiveCheckout");

// --- Warehouse ---
const CommunicationsModule = lazyNamed(() => import("@/components/modules/warehouse/CommunicationsModule"), "CommunicationsModule");
const ReceivingModule = lazyNamed(() => import("@/components/modules/warehouse/ReceivingModule"), "ReceivingModule");
const PutAwayModule = lazyNamed(() => import("@/components/modules/warehouse/PutAwayModule"), "PutAwayModule");
const PickingModule = lazyNamed(() => import("@/components/modules/warehouse/PickingModule"), "PickingModule");
const ShippingModule = lazyNamed(() => import("@/components/modules/warehouse/ShippingModule"), "ShippingModule");
const CountingModule = lazyNamed(() => import("@/components/modules/warehouse/CountingModule"), "CountingModule");
const TruckingModule = lazyNamed(() => import("@/components/modules/warehouse/TruckingModule"), "TruckingModule");

// --- Hospitality Density Modules (taxonomy-driven, no synthetic data) ---
const ThemeParkDashboard = lazyNamed(() => import("@/components/modules/hospitality/ThemeParkDashboard"), "ThemeParkDashboard");
const CMMSWorkOrders = lazyNamed(() => import("@/components/modules/hospitality/CMMSWorkOrders"), "CMMSWorkOrders");
const KDSRouting = lazyNamed(() => import("@/components/modules/hospitality/KDSRouting"), "KDSRouting");
const HousekeepingInventory = lazyNamed(() => import("@/components/modules/hospitality/HousekeepingInventory"), "HousekeepingInventory");
const LifeSafetyCompliance = lazyNamed(() => import("@/components/modules/hospitality/LifeSafetyCompliance"), "LifeSafetyCompliance");

export const ComponentRegistry: Record<string, React.LazyExoticComponent<ComponentType<any>>> = {
  // Default Modules
  "default-pos": POSModule,
  "default-reports": ReportsModule,
  "default-inventory": InventoryManagement,
  "default-local-inventory": LocalInventory,
  "default-local-reports": LocalReports,
  "default-menu": MenuManagement,
  "default-recipes": RecipeManagement,
  "default-team": TeamManagement,
  "default-timesheets": TimesheetModule,
  "default-tax": TaxCenter,
  "default-market-intel": MarketIntelligence,
  "default-affiliates": AffiliateManagement,
  "default-xr": XRManagement,
  "default-communications": CommunicationsModule,

  // Warehouse
  "default-warehouse-receiving": ReceivingModule,
  "default-warehouse-putaway": PutAwayModule,
  "default-warehouse-picking": PickingModule,
  "default-warehouse-shipping": ShippingModule,
  "default-warehouse-counting": CountingModule,
  "default-warehouse-trucking": TruckingModule,

  // Vertical specializations
  "hosp-fine-dining": LiveCheckout,
  "hosp-cafe": LiveCheckout,
  "retail-fashion": POSModule,

  // Hospitality density (5 new operating dashboards)
  "hosp-theme-park-ops": ThemeParkDashboard,
  "hosp-cmms": CMMSWorkOrders,
  "hosp-kds": KDSRouting,
  "hosp-housekeeping-inv": HousekeepingInventory,
  "hosp-life-safety": LifeSafetyCompliance,
};

/**
 * Back-compat shim for the legacy DynamicModuleLoader (verticalId + activeBites
 * surface). Returns the lazy component so callers can render it inside their
 * own <Suspense> boundary.
 */
export const resolveModule = (
  verticalId: string,
): React.LazyExoticComponent<ComponentType<any>> | null => {
  return ComponentRegistry[verticalId] ?? null;
};

interface DynamicModuleLoaderProps {
  moduleId: string;
  props?: Record<string, any>;
}

export const DynamicModuleLoader = ({ moduleId, props = {} }: DynamicModuleLoaderProps) => {
  logTrace("DynamicModuleLoader", `Attempting to mount module ID: ${moduleId}`);

  const Component = ComponentRegistry[moduleId];

  if (!Component) {
    logError("DynamicModuleLoader", new Error("Module unmapped in registry."), moduleId);
    return (
      <div className="p-6 m-4 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive">
        <p className="font-mono text-sm">
          [SYS_ERR] Module '{moduleId}' requested by payload but missing from local registry.
        </p>
      </div>
    );
  }

  logEnd("DynamicModuleLoader", `Successfully mapped ${moduleId} to component tree.`);

  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground font-mono">
          Initializing {moduleId}...
        </div>
      }
    >
      <Component {...props} />
    </Suspense>
  );
};
