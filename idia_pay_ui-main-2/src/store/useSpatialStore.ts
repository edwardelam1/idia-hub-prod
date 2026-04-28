import { create } from "zustand";

export type GearState = "clienteling" | "standard" | "velocity";

interface SpatialState {
  activeGear: GearState;
  targetMultiplier: number;
  setGearState: (gear: GearState, multiplier: number) => void;
}

/**
 * Atomic spatial store. Components must subscribe via selectors
 * (e.g. `useSpatialStore(s => s.targetMultiplier)`) to ensure only
 * the consuming component re-renders — no global reconciliation.
 */
export const useSpatialStore = create<SpatialState>((set) => ({
  activeGear: "standard",
  targetMultiplier: 1.0,
  setGearState: (gear, multiplier) =>
    set({ activeGear: gear, targetMultiplier: multiplier }),
}));
