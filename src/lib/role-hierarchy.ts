/**
 * Protocol authority ranking. Lower number = higher authority.
 *
 *   csuite      (Hub platform)   -> 0
 *   org_admin   (business)       -> 1
 *   team_lead   (business)       -> 2
 *   team_member (business)       -> 3
 */

export type PlatformRole = "csuite" | "analyst" | "professional";
export type BusinessRole = "org_admin" | "team_lead" | "team_member";
export type AnyRole = PlatformRole | BusinessRole | string | null | undefined;

export const BUSINESS_ROLES: BusinessRole[] = ["org_admin", "team_lead", "team_member"];
export const PLATFORM_ROLES: PlatformRole[] = ["csuite", "analyst", "professional"];

export const ROLE_LABELS: Record<string, string> = {
  csuite: "C-Suite",
  analyst: "Analyst",
  professional: "Professional",
  org_admin: "Org Admin",
  team_lead: "Team Lead",
  team_member: "Team Member",
};

/**
 * Normalize legacy/PascalCase strings to canonical snake_case.
 * Defensive — DB migration already cleaned the rows, but UI may receive
 * cached or external values.
 */
export function normalizeRole(raw: AnyRole): string {
  if (!raw) return "team_member";
  const r = String(raw).trim().toLowerCase().replace(/\s+/g, "_");
  if (r === "owner" || r === "org_admin" || r === "organization_admin") return "org_admin";
  if (r === "manager" || r === "team_lead") return "team_lead";
  if (r === "employee" || r === "team_member") return "team_member";
  if (r === "csuite" || r === "c_suite") return "csuite";
  if (r === "analyst") return "analyst";
  if (r === "professional") return "professional";
  return r;
}

export function authorityRank(role: AnyRole): number {
  switch (normalizeRole(role)) {
    case "csuite":
      return 0;
    case "org_admin":
      return 1;
    case "team_lead":
      return 2;
    case "team_member":
      return 3;
    case "analyst":
      return 4;
    case "professional":
      return 5;
    default:
      return 99;
  }
}

export function roleLabel(role: AnyRole): string {
  return ROLE_LABELS[normalizeRole(role)] ?? String(role ?? "");
}

/**
 * Hierarchical sort: authority ASC, then name ASC.
 */
export function sortByAuthority<T extends { role?: AnyRole; platform_role?: AnyRole; name?: string | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const ra = authorityRank(a.platform_role ?? a.role);
    const rb = authorityRank(b.platform_role ?? b.role);
    if (ra !== rb) return ra - rb;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}