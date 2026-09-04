import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SovereignWrapperProps {
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Shared surface for sovereign (Vulture / provenance) panels.
 * Provides the rounded, low-chrome card frame used across the mesh gateway UI.
 */
export function SovereignWrapper({ id, className, children }: SovereignWrapperProps) {
  return (
    <Card
      data-sovereign-id={id}
      className={cn("overflow-hidden rounded-[24px] border-border bg-card shadow-sm", className)}
    >
      {children}
    </Card>
  );
}

export default SovereignWrapper;
