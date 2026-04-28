import React from "react";
import { useEventPublisher, type FinancialEventType } from "@/hooks/useEventPublisher";
import { AutonomicWrapper } from "./AutonomicWrapper";

interface ControlActionProps {
  label: string;
  actionType: FinancialEventType;
  payload: any;
  className?: string;
}

/**
 * High-performance interactive button for the 'Control' interface.
 * Logs immutable financial events using native Web Crypto for ID generation.
 * Follows the LAW: Plank-scale granularity with beginning and ending messages.
 */
export const ControlAction: React.FC<ControlActionProps> = ({ label, actionType, payload, className }) => {
  const { emitEvent } = useEventPublisher();

  const handleInteraction = async () => {
    // 1. Generate the Beacon ID using Native Web Crypto (No external 'uuid' module needed)
    // [BEGIN: UUID_GENERATION]
    const beaconId = crypto.randomUUID();
    // [END: UUID_GENERATION]

    console.info(`[BEGIN: Interaction.Click] Label: ${label} | Beacon: ${beaconId}`);

    try {
      console.info(`[BEGIN: Interaction.EmitEvent] Type: ${actionType}`);

      // 2. Emit the Immutable Financial Event
      await emitEvent(actionType, payload, beaconId);

      console.info(`[STATUS: Interaction.Success] Action ${actionType} logged to Glass Box.`);
      console.info(`[END: Interaction.EmitEvent]`);
    } catch (err) {
      // Granular error handling to the lowest level
      console.error(
        `[CRITICAL FAILURE: Interaction.Click] Offset: UI_Wire | Reason: ${
          err instanceof Error ? err.message : "Unknown execution stall"
        }`,
      );
    } finally {
      console.info(`[END: Interaction.Click] UI sequence complete for Beacon: ${beaconId}`);
    }
  };

  return (
    <AutonomicWrapper>
      <button
        onClick={handleInteraction}
        className={`px-6 py-3 rounded-lg font-bold transition-all active:scale-95 ${className}`}
      >
        {label}
      </button>
    </AutonomicWrapper>
  );
};
