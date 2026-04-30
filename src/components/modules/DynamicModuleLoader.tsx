import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { resolveModule } from "@/lib/module-registry";

/**
 * DynamicModuleLoader — given a merchant's vertical ID and the NanoBite IDs
 * unlocked in their blueprint, looks up the correct top-level component in the
 * ComponentRegistry and injects `activeBites` so the chassis can self-configure.
 */
interface DynamicModuleLoaderProps {
  verticalId: string;
  activeBites?: string[];
}

export const DynamicModuleLoader = ({ verticalId, activeBites = [] }: DynamicModuleLoaderProps) => {
  const Module = resolveModule(verticalId);

  if (!Module) {
    console.warn(`[DynamicModuleLoader] No component registered for vertical "${verticalId}".`);
    return (
      <Card className="p-6 flex items-center gap-3 text-sm text-muted-foreground">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <span>
          No Pay App module registered for vertical{" "}
          <code className="font-mono text-xs">{verticalId}</code>.
        </span>
      </Card>
    );
  }

  return <Module verticalId={verticalId} activeBites={activeBites} />;
};

export default DynamicModuleLoader;