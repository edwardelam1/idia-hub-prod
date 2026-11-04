// Per-organization provisioning for the two metered services:
//   - "utility": Identity Verification Utility (billed per verified identity record)
//   - "vulture": The Vulture (billed per intake batch)
// C-suite sets the on/off switch and rate per business; the database resolves the caller's
// organization and rate (resolve_service_access) and writes idempotent charges
// (charge_service_usage). Both RPCs are service-role only.

export type MeteredService = "utility" | "vulture";

export const SERVICE_DEFAULT_RATES: Record<MeteredService, number> = { utility: 2.5, vulture: 50 };

export interface ServiceAccess {
  allowed: boolean;
  isOperator: boolean;
  businessId: string | null;
  businessName: string | null;
  rate: number;
}

export interface ChargeResult {
  status: "charged" | "already_charged" | "no_charge" | "insufficient_credits" | "not_provisioned" | "error";
  amount?: number;
  rate?: number;
  shortfall?: number;
  ledger_entry_id?: string;
  business_id?: string | null;
  error?: string;
}

export const round4 = (v: number) => Math.round(v * 10000) / 10000;

/** Credits owed for `units` uses at `rate` CR each, stored to four decimals. */
export function usageCost(rate: number, units: number): number {
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(units) || units <= 0) return 0;
  return round4(rate * units);
}

/** Normalizes the RETURNS TABLE shape of resolve_service_access (array or single row). */
export function toServiceAccess(raw: unknown): ServiceAccess {
  const row = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null | undefined;
  if (!row || row.allowed !== true) {
    return { allowed: false, isOperator: row?.is_operator === true, businessId: null, businessName: null, rate: 0 };
  }
  const rate = Number(row.rate ?? 0);
  return {
    allowed: true,
    isOperator: row.is_operator === true,
    businessId: (row.business_id as string | null) ?? null,
    businessName: (row.business_name as string | null) ?? null,
    rate: Number.isFinite(rate) && rate > 0 ? round4(rate) : 0,
  };
}

// deno-lint-ignore no-explicit-any
export async function resolveServiceAccess(client: any, userId: string, service: MeteredService, tag: string): Promise<ServiceAccess> {
  console.log(`[PHASE_START: ${tag}.ResolveServiceAccess] service=${service} user=${userId}`);
  const { data, error } = await client.rpc("resolve_service_access", { _user_id: userId, _service: service });
  if (error) {
    console.error(`[PHASE_END: ${tag}.ResolveServiceAccess] failed: ${error.message}`);
    throw new Error(`Service provisioning lookup failed: ${error.message}`);
  }
  const access = toServiceAccess(data);
  console.log(
    `[PHASE_END: ${tag}.ResolveServiceAccess] allowed=${access.allowed} rate=${access.rate} business=${access.businessId ?? "none"} operator=${access.isOperator}`,
  );
  return access;
}

// deno-lint-ignore no-explicit-any
export async function availableCredits(client: any, userId: string, tag: string): Promise<number> {
  console.log(`[PHASE_START: ${tag}.BalanceCheck] user=${userId}`);
  const { data, error } = await client.rpc("get_synapse_balance", { uid: userId });
  if (error) {
    console.error(`[PHASE_END: ${tag}.BalanceCheck] failed: ${error.message}`);
    throw new Error(`Balance lookup failed: ${error.message}`);
  }
  const balance = Number(data ?? 0);
  console.log(`[PHASE_END: ${tag}.BalanceCheck] available=${balance}`);
  return Number.isFinite(balance) ? balance : 0;
}

export async function chargeServiceUsage(
  // deno-lint-ignore no-explicit-any
  client: any,
  args: { userId: string; service: MeteredService; units: number; reference: string; description: string },
  tag: string,
): Promise<ChargeResult> {
  console.log(`[PHASE_START: ${tag}.ChargeServiceUsage] service=${args.service} units=${args.units} ref=${args.reference}`);
  const { data, error } = await client.rpc("charge_service_usage", {
    _user_id: args.userId,
    _service: args.service,
    _units: args.units,
    _reference: args.reference,
    _description: args.description,
  });
  if (error) {
    console.error(`[PHASE_END: ${tag}.ChargeServiceUsage] failed: ${error.message}`);
    return { status: "error", error: error.message };
  }
  const result = (data ?? { status: "error" }) as ChargeResult;
  console.log(`[PHASE_END: ${tag}.ChargeServiceUsage] status=${result.status} amount=${result.amount ?? 0}`);
  return result;
}
