import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PipelineActivityMonitor } from "./PipelineActivityMonitor";
import { usePipelineActivity } from "@/hooks/usePipelineActivity";
import { Activity, ShieldCheck, Network, Library, Wallet, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SystemHealthDashboard = () => {
  const navigate = useNavigate();
  // Pull live counts directly from the active socket feed
  const { activities } = usePipelineActivity();

  // Aggregate live session stats based on the exact pipeline events
  const liveStats = {
    ingestions: activities.filter((a) => a.type === "apple_sync").length,
    staged: activities.filter((a) => a.type === "synapse_staged").length,
    transfers: activities.filter((a) => a.type === "delt_transfer").length,
    settlements: activities.filter((a) => a.type === "royalty_payment").length,
  };

  const pipelineStages = [
    { id: "1", name: "Apple Health Sync", icon: Activity, desc: "Raw Bio-Tether & Hash" },
    { id: "2", name: "Synapse", icon: Network, desc: "Valuation Engine" },
    { id: "3", name: "University Library", icon: Library, desc: "Best Friend AI Catalog" },
    { id: "4", name: "Process DELT Transfer", icon: ShieldCheck, desc: "Data Sale Execution" },
    { id: "5", name: "Royalty Payment", icon: Wallet, desc: "IDIA Life Wallet Drop" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate("/")} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Hub
          </Button>
          <div>
            <h2 className="text-2xl font-bold">The Circle of Life</h2>
            <p className="text-muted-foreground">Live sovereign pipeline monitoring</p>
          </div>
        </div>
      </div>

      {/* The Visual Pipeline Map */}
      <div className="py-6 overflow-x-auto pb-4">
        <div className="flex items-center justify-between min-w-[900px] gap-2">
          {pipelineStages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div key={stage.id} className="flex items-center flex-1">
                <Card className="w-full relative overflow-hidden border border-primary/20">
                  <div className="absolute top-0 right-0 p-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  </div>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <Icon className="h-5 w-5 text-primary mb-1" />
                    <CardTitle className="text-sm">{stage.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-xs text-muted-foreground">{stage.desc}</p>
                  </CardContent>
                </Card>
                {index < pipelineStages.length - 1 && (
                  <div className="flex-shrink-0 px-2">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Session Counters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingestion Events</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{liveStats.ingestions}</div>
            <p className="text-xs text-muted-foreground">Current session syncs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Synapse Valuations</CardTitle>
            <Network className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{liveStats.staged}</div>
            <p className="text-xs text-muted-foreground">Data staged for market</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DELT Executions</CardTitle>
            <ShieldCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{liveStats.transfers}</div>
            <p className="text-xs text-muted-foreground">Liability tokens minted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Royalties Settled</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{liveStats.settlements}</div>
            <p className="text-xs text-muted-foreground">Wallet drops executed</p>
          </CardContent>
        </Card>
      </div>

      {/* The Live Feed */}
      <PipelineActivityMonitor />
    </div>
  );
};

export default SystemHealthDashboard;
