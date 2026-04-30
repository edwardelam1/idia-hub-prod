import { create } from "zustand";

/**
 * Stub for the Pay App's spatial telemetry store.
 * The full implementation lives in the merchant Pay app; in the Hub
 * we expose a minimal compatible API so imported hooks compile and
 * remain inert (no-op) until the Pay surface is wired up.
 */
export type GearState = "PARK" | "DRIVE" | "REVERSE" | "NEUTRAL" | string;

interface SpatialState {
  activeGear: GearState;
  multiplier: number;
  setGearState: (gear: GearState, multiplier: number) => void;
}

export const useSpatialStore = create<SpatialState>((set) => ({
  activeGear: "PARK",
  multiplier: 1,
  setGearState: (gear, multiplier) => set({ activeGear: gear, multiplier }),
}));