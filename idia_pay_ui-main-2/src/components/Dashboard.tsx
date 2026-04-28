import { useState, useEffect } from "react";
import { PayAppBlueprint } from "@/lib/provisioning-engine";
import { DynamicModuleLoader } from "@/lib/module-registry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutonomicWrapper } from "@/components/ui/AutonomicWrapper";
import { useAutonomicEngine } from "@/hooks/useAutonomicEngine";
import { useReconnectionSyncer } from "@/hooks/useReconnectionSyncer";
import { useEventPublisher } from "@/hooks/useEventPublisher";
import { LogOut, Settings, Bell, TrendingUp, Shield } from "lucide-react";

interface SovereignDashboardProps {
  blueprint: PayAppBlueprint;
  onWipeDevice: () => void;
}

export const Dashboard = ({ blueprint, onWipeDevice }: SovereignDashboardProps) => {
  const activeModules = [...blueprint.modules.default, ...blueprint.modules.custom];
  const [activeModuleId, setActiveModuleId] = useState(activeModules[0]?.id || "");
  const [bhiScore] = useState(0.92);

  // 1. Boot the Autonomic Spatial Engine & Edge Resilience
  useAutonomicEngine();
  useReconnectionSyncer();
  const { emitEvent } = useEventPublisher();

  // 2. Shell Lifecycle Audit
  useEffect(() => {
    console.info(
      `[BEGIN: Dashboard.Mount] ContextID: ${blueprint.provisioningCode} | Client: ${blueprint.clientOrganization}`,
    );

    if (activeModules.length === 0) {
      console.error(
        `[END: Dashboard.Mount] CRITICAL FAILURE. Offset: ModuleIngestion | Reason: Zero modules in blueprint.`,
      );
    } else {
      console.info(`[END: Dashboard.Mount] SUCCESS. Shell synchronized with ${activeModules.length} modules.`);
    }
  }, [blueprint, activeModules.length]);

  // 3. Module Transition Logic with Event Provenance
  const handleModuleSwitch = async (id: string) => {
    console.info(`[BEGIN: Dashboard.handleModuleSwitch] TargetID: ${id}`);
    try {
      // Log the transition as a behavioral event for the Digital Twin
      await emitEvent("FEATURE_ACCESSED", { moduleId: id }, `nav-${id}-${Date.now()}`);

      setActiveModuleId(id);
      console.info(`[END: Dashboard.handleModuleSwitch] DOM State Transition SUCCESS.`);
    } catch (error) {
      console.error(`[END: Dashboard.handleModuleSwitch] CRITICAL FAILURE. Offset: TransitionRouter | Reason:`, error);
    }
  };

  // 4. Secure Terminal De-provisioning
  const handleUncoupleTerminal = async () => {
    console.info("[BEGIN: Dashboard.handleUncoupleTerminal] Initiating secure wipe sequence.");
    try {
      // Final event etch before device wipe
      await emitEvent("SHIFT_ENDED", { terminalId: blueprint.provisioningCode }, `wipe-${Date.now()}`);

      console.info("[STATUS: Dashboard.handleUncoupleTerminal] Provenance anchored. Executing wipe callback.");
      onWipeDevice();
      console.info("[END: Dashboard.handleUncoupleTerminal] Handshake SUCCESS.");
    } catch (error) {
      console.error(`[END: Dashboard.handleUncoupleTerminal] CRITICAL FAILURE. Offset: WipeSequence | Reason:`, error);
    }
  };

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-card/50 backdrop-blur-sm flex flex-col flex-shrink-0">
        <div className="p-4 border-b">
          <h1 className="text-sm font-bold text-foreground truncate">{blueprint.clientOrganization}</h1>
          <div className="flex items-center space-x-1 mt-1">
            {blueprint.verticals.map((v, i) => (
              <span key={i} className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                {v}
                {i < blueprint.verticals.length - 1 ? " • " : ""}
              </span>
            ))}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {activeModules.map((mod) => (
            <Button
              key={mod.id}
              variant={activeModuleId === mod.id ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => handleModuleSwitch(mod.id)}
            >
              {mod.name}
            </Button>
          ))}
        </nav>

        <div className="p-3 border-t space-y-2">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3 text-success" />
            <span>IDIA Liability Shield</span>
            <span className="ml-auto inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
          </div>
          <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleUncoupleTerminal}>
            <LogOut className="w-3 h-3 mr-1" />
            Uncouple Terminal
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">BHI™</span>
            <span className="text-xs font-bold text-foreground">{(bhiScore * 100).toFixed(1)}%</span>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-[10px] font-mono py-0 h-5">
              {blueprint.provisioningCode}
            </Badge>

            {/* Autonomic Engine Target: The Settings Toggle */}
            <AutonomicWrapper>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.dispatchEvent(new CustomEvent("navigate-to-settings"))}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </AutonomicWrapper>

            <Button variant="ghost" size="icon" className="h-7 w-7 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-destructive rounded-full text-[8px] text-destructive-foreground flex items-center justify-center font-bold">
                3
              </span>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto min-h-0">
          <DynamicModuleLoader
            moduleId={activeModuleId}
            props={{
              businessHealthIndex: bhiScore,
              provisioningCode: blueprint.provisioningCode,
            }}
          />
        </div>
      </main>
    </div>
  );
};
