/**
 * Spatial Telemetry constants and validators for the IDIA Pay shell.
 * Bridges hardware signals (UWB / LiDAR / IMU) to ledger-grade event validation.
 * Kept separate from `production.ts` (which models fixed/variable cost economics).
 */

export const TELEMETRY_CONSTANTS = {
  /** Speed of light in m/s — basis for ToF distance: d = (c · Δt) / 2 */
  LIGHT_SPEED: 299_792_458,
  /** UWB band (GHz) used by DW3000-class radios for sub-decimeter ranging */
  UWB_FREQUENCY_RANGE: [6.35, 6.75] as const,
  /** Minimum IMU sampling rate (Hz) for high-velocity / surgical accuracy */
  IMU_SAMPLING_RATE_MIN: 200,
} as const;

export interface SpatialSignal {
  /** Estimated positional uncertainty (meters). < 0.01 = sub-cm confidence. */
  uncertainty: number;
  /** Optional ToF round-trip delta (seconds) for distance derivation. */
  deltaT?: number;
  /** Optional source tag for tracing. */
  source?: 'uwb' | 'lidar' | 'imu';
}

export interface SpatialValidationResult {
  ok: boolean;
  confidence: 'Success' | 'Divergence';
  derivedDistanceMeters?: number;
}

/** d = c · Δt / 2 — ToF range derivation. */
export function derivedDistance(deltaT: number): number {
  return (TELEMETRY_CONSTANTS.LIGHT_SPEED * deltaT) / 2;
}

/**
 * Validates a spatial event before IDIA Pay settlement.
 * Prevents "Mathematical Drift" in the ledger.
 */
export function validateSpatialEvent(rawSignal: SpatialSignal): SpatialValidationResult {
  console.log('[IDIA_PAY_VALIDATOR]: STARTING Signal Verification...', rawSignal.source ?? 'unknown');
  const ok = rawSignal.uncertainty < 0.01;
  const confidence: SpatialValidationResult['confidence'] = ok ? 'Success' : 'Divergence';
  const derivedDistanceMeters =
    typeof rawSignal.deltaT === 'number' ? derivedDistance(rawSignal.deltaT) : undefined;
  console.log(`[IDIA_PAY_VALIDATOR]: ENDING Verification with Result: ${confidence}`);
  return { ok, confidence, derivedDistanceMeters };
}