import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PipelineActivityMonitor } from "./PipelineActivityMonitor";
import {
  Activity,
  ShieldCheck,
  Network,
  Store,
  Wallet,
  ArrowRight,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  Database,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const SystemHealthDashboard = () => {
  const navigate = useNavigate();

  // The 5 core stages of the IDIA Circle of Life
  const pipelineStages = [
    {
      id: "ingest",
      name: "Ingestion Link",
      engine: "apple-health-sync",
      icon: Activity,
      status: "Operational",
      desc: "Raw Bio-Tether & ACA Hash",
    },
    {
      id: "stage",
      name: "Validation Shield",
      engine: "life-pii-bridge",
      icon: ShieldCheck,
      status: "Operational",
      desc: "Anonymization & Staging",
    },
    {
      id: "synapse",
      name: "Synapse Engine",
      engine: "idia-synapse",
      icon: Network,
      status: "Operational",
      desc: "Valuation & Routing",
    },
    {
      id: "market",
      name: "University Library",
      engine: "process-data-sale",
      icon: Store,
      status: "Operational",
      desc: "AI / Enterprise Catalog",
    },
    {
      id: "settle",
      name: "Atomic Settlement",
      engine: "credit-user-wallet",
      icon: Wallet,
      status: "Operational",
      desc: "Fiat Royalty Split (10/30/60)",
    },
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
            <h2 className="text-2xl font-bold">The Circle of Life Map</h2>
            <p className="text-muted-foreground">Real-time monitoring of the sovereign data pipeline</p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync Ledger
        </Button>
      </div>

      {/* The Visual Pipeline Map */}
      <div className="py-6 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[800px] gap-2">
          {pipelineStages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <div key={stage.id} className="flex items-center flex-1">
                <Card className="w-full relative overflow-hidden border-2 border-green-500/20">
                  <div className="absolute top-0 right-0 p-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <CardHeader className="pb-2">
                    <Icon className="h-6 w-6 text-primary mb-2" />
                    <CardTitle className="text-md">{stage.name}</CardTitle>
                    <CardDescription className="text-xs font-mono">{stage.engine}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{stage.desc}</p>
                  </CardContent>
                </Card>
                {index < pipelineStages.length - 1 && (
                  <div className="flex-shrink-0 px-2">
                    <ArrowRight className="h-6 w-6 text-muted-foreground animate-pulse" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline Volume Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ACA Records Secured</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active Sync</div>
            <p className="text-xs text-muted-foreground">Cryptographic proofs generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Market Staging</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Processing</div>
            <p className="text-xs text-muted-foreground">Ready for Synapse Valuation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DELT Transfers</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Monitoring</div>
            <p className="text-xs text-muted-foreground">Egress liability tokens minted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fiat Royalties Settled</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ledger Active</div>
            <p className="text-xs text-muted-foreground">10/30/60 Split executions</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Activity Monitor (The Feed) */}
      <PipelineActivityMonitor />
    </div>
  );
};

export default SystemHealthDashboard;
