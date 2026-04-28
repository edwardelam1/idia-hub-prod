import { ReactNode, CSSProperties, memo } from "react";
import { useSpatialStore } from "@/store/useSpatialStore";

interface AutonomicWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * Hardware-accelerated wrapper. Subscribes to ONLY `targetMultiplier`
 * via a Zustand selector — no other state change in the app will cause
 * this component (or its parent) to re-render.
 *
 * The transform/will-change combo keeps the child on the GPU compositor
 * layer (no layout, no paint).
 */
export const AutonomicWrapper = memo(function AutonomicWrapper({
  children,
  className,
}: AutonomicWrapperProps) {
  const targetMultiplier = useSpatialStore((s) => s.targetMultiplier);

  const style: CSSProperties = {
    display: "inline-block",
    transform: `scale(${targetMultiplier})`,
    transformOrigin: "center",
    transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    willChange: "transform",
    backfaceVisibility: "hidden",
  };

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
});
