/**
 * Sector pricing multipliers used by synapse-controller to derive
 * dynamic per-query fees. Unseeded sectors fall back to 1.0 in the caller.
 */
export const SECTOR_VALUES: Record<string, number> = {
  general: 1.0,
  primary: 1.0,
  secondary: 1.2,
  tertiary: 1.5,
  quaternary: 2.0,
  quinary: 2.5,
};