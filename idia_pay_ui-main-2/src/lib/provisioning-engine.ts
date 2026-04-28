import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// IDIA Provisioning Engine — Sovereign Hydration Layer
// ============================================================================

export interface BlueprintModule {
  id: string;
  name: string;
}

export interface PayAppBlueprint {
  provisioningCode: string;
  clientOrganization: string;
  verticals: string[];
  modules: {
    default: BlueprintModule[];
    custom: BlueprintModule[];
  };
  issuedAt: string;
}

const logTrace = (action: string, detail: string) =>
  console.info(`[BEGIN: ProvisioningEngine.${action}] ${detail}`);
const logEnd = (action: string, detail: string) =>
  console.info(`[END: ProvisioningEngine.${action}] ${detail}`);
const logError = (action: string, contextId: string, error: unknown) =>
  console.error(`[END: ProvisioningEngine.${action}] CRITICAL FAILURE. Context ID: ${contextId}`, error);

// Local seed blueprint — used as fallback until the Hub table is provisioned.
const SEED_BLUEPRINT: PayAppBlueprint = {
  provisioningCode: "IDIA-2026-DEMO01",
  clientOrganization: "IDIA Demo Terminal",
  verticals: ["Hospitality", "Retail"],
  modules: {
    default: [
      { id: "default-pos", name: "Point of Sale" },
      { id: "default-reports", name: "Reports" },
      { id: "default-inventory", name: "Inventory" },
      { id: "default-team", name: "Team" },
      { id: "default-menu", name: "Menu" },
      { id: "default-recipes", name: "Recipes" },
      { id: "default-timesheets", name: "Timesheets" },
      { id: "default-tax", name: "Tax Center" },
    ],
    custom: [
      { id: "role-owner", name: "Owner Console" },
      { id: "role-manager", name: "Manager Console" },
      { id: "role-employee", name: "Employee Console" },
      { id: "role-warehouse", name: "Warehouse Console" },
    ],
  },
  issuedAt: new Date().toISOString(),
};

export class ProvisioningEngine {
  static readonly STORAGE_KEY = "idia_blueprint_v1";

  static async hydrateFromHub(provisioningCode: string): Promise<PayAppBlueprint> {
    logTrace("hydrateFromHub", `Requesting edge sync for code: ${provisioningCode}`);

    try {
      // Offset 1: Attempt remote query. Table may not exist yet — gracefully fall through.
      try {
        const { data, error } = await (supabase as any)
          .from("device_provisioning_blueprints")
          .select("payload")
          .eq("code", provisioningCode)
          .maybeSingle();

        if (!error && data?.payload) {
          const blueprint = data.payload as PayAppBlueprint;
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(blueprint));
          logEnd("hydrateFromHub", `Hydration successful from Hub for ${provisioningCode}.`);
          return blueprint;
        }
        console.info(`[ProvisioningEngine.hydrateFromHub] Remote payload unavailable; falling back to seed.`);
      } catch (remoteErr) {
        console.info(`[ProvisioningEngine.hydrateFromHub] Hub table unreachable; using seed blueprint.`, remoteErr);
      }

      // Offset 2: Local seed fallback (demo / dev)
      if (provisioningCode === SEED_BLUEPRINT.provisioningCode || provisioningCode === "DEMO") {
        const blueprint = { ...SEED_BLUEPRINT, provisioningCode };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(blueprint));
        logEnd("hydrateFromHub", `Hydration successful from local seed.`);
        return blueprint;
      }

      throw new Error("Invalid provisioning code or unauthorized terminal.");
    } catch (error) {
      logError("hydrateFromHub", provisioningCode, error);
      throw error;
    }
  }

  static loadCached(): PayAppBlueprint | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PayAppBlueprint;
    } catch (err) {
      console.error("[ProvisioningEngine.loadCached] Cache parse failure", err);
      return null;
    }
  }

  static wipeDevice(): void {
    logTrace("wipeDevice", "Operator initiated terminal uncoupling.");
    localStorage.removeItem(this.STORAGE_KEY);
    logEnd("wipeDevice", "Local blueprint cache cleared.");
  }
}
