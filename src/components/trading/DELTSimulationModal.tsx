import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  FileCheck,
  Hash,
  Clock,
  Database,
  CheckCircle2,
  Loader2,
  Link,
  Globe,
  Lock,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DELTSimulationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedName: string;
  feedId: string;
}

interface SimulationStep {
  id: string;
  name: string;
  description: string;
  status: "pending" | "processing" | "complete" | "error";
  artifact?: string;
}

interface LiabilityToken {
  token: string;
  clientId: string;
  timestamp: string;
  batchChecksum: string;
  acaRecordIds: string[];
  countryOfOrigin: string;
  egressLogId: string;
  digiRampAnchor: string;
}

const STEPS_TEMPLATE: SimulationStep[] = [
  {
    id: "vetting",
    name: "Data Vetting",
    description: "Gathering Feature Feed data with ACA_RECORD_ID hash tags",
    status: "pending",
    artifact: "Justified Data Payload",
  },
  {
    id: "token-creation",
    name: "Token Creation",
    description: "Generating unique Liability Token via {Client_ID + Timestamp + Batch_Checksum}",
    status: "pending",
    artifact: "Unique Liability_Token",
  },
  {
    id: "header-injection",
    name: "Header Injection",
    description: "Injecting token into API response header as X-IDIA-LIABILITY-TOKEN",
    status: "pending",
    artifact: "API Header",
  },
  {
    id: "metadata-injection",
    name: "Metadata Injection",
    description: "Placing ACA_RECORD_ID hash and COO tag into JSON payload",
    status: "pending",
    artifact: "Data Payload",
  },
  {
    id: "parallel-write",
    name: "Parallel Write",
    description: "Atomic parallel write upon successful query execution",
    status: "pending",
    artifact: "Transaction Receipt",
  },
  {
    id: "ledger-record",
    name: "DigiRAMP Ledger Record",
    description: "Recording to DigiRAMP ledger with Liability_Token, Client_ID, and ACA_Anchor_Reference",
    status: "pending",
    artifact: "Egress Log Entry",
  },
];

const generateHash = (length: number = 64) => {
  const chars = "0123456789abcdef";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const DELTSimulationModal = ({ open, onOpenChange, feedName, feedId }: DELTSimulationModalProps) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liabilityToken, setLiabilityToken] = useState<LiabilityToken | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [steps, setSteps] = useState<SimulationStep[]>(STEPS_TEMPLATE.map((s) => ({ ...s })));

  const animateSteps = async () => {
    const newSteps = [...steps];
    const stepDelay = 800;

    for (let i = 0; i < newSteps.length; i++) {
      newSteps[i].status = "processing";
      setSteps([...newSteps]);
      setProgress((i / newSteps.length) * 100);
      await new Promise((resolve) => setTimeout(resolve, stepDelay));
      newSteps[i].status = "complete";
      setSteps([...newSteps]);
      setProgress(((i + 1) / newSteps.length) * 100);
    }
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimulationComplete(false);
    setIsLive(false);
    setProgress(0);
    setLiabilityToken(null);
    setSteps(STEPS_TEMPLATE.map((s) => ({ ...s })));

    await animateSteps();

    const clientId = `ENT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    const timestamp = new Date().toISOString();
    const batchChecksum = generateHash(32);
    const tokenHash = generateHash(64);

    setLiabilityToken({
      token: `LT-${tokenHash}`,
      clientId,
      timestamp,
      batchChecksum,
      acaRecordIds: Array.from({ length: 5 }, () => `ACA-${generateHash(16)}`),
      countryOfOrigin: "US",
      egressLogId: generateUUID(),
      digiRampAnchor: `0x${generateHash(24)}`,
    });

    setIsSimulating(false);
    setSimulationComplete(true);
  };

  const runLiveTransfer = async () => {
    setIsSimulating(true);
    setSimulationComplete(false);
    setIsLive(true);
    setProgress(0);
    setLiabilityToken(null);
    setSteps(STEPS_TEMPLATE.map((s) => ({ ...s })));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error("Authentication required for live transfer");
      }

      // Animate steps while edge function runs
      const animationPromise = animateSteps();

      const acaRecordIds = Array.from({ length: 5 }, () => `ACA-${generateHash(16)}`);
      const clientId = `ENT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      const { data, error } = await supabase.functions.invoke("process-delt-transfer", {
        body: {
          client_id: clientId,
          aca_record_ids: acaRecordIds,
          country_of_origin: "US",
          egress_type: "feature_feed",
          data_summary: { feed_name: feedName, feed_id: feedId },
        },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });

      await animationPromise;

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setLiabilityToken({
        token: `LT-${data.liability_token_hash}`,
        clientId,
        timestamp: data.timestamp,
        batchChecksum: data.batch_checksum,
        acaRecordIds: data.aca_record_references,
        countryOfOrigin: data.country_of_origin,
        egressLogId: data.egress_log_id,
        digiRampAnchor: data.digiramp_anchor_id,
      });

      toast.success(`Liability Shield: 250 CRD egress fee charged`);
      setSimulationComplete(true);
    } catch (err: any) {
      toast.error(`Liability Shield Error: ${err.message}`);
      setSteps((prev) => prev.map((s) => (s.status === "processing" ? { ...s, status: "error" } : s)));
    } finally {
      setIsSimulating(false);
    }
  };

  const resetSimulation = () => {
    setSimulationComplete(false);
    setProgress(0);
    setLiabilityToken(null);
    setIsLive(false);
    setSteps(STEPS_TEMPLATE.map((s) => ({ ...s })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Liability Shield Protocol {isLive && simulationComplete ? "" : "Simulation"}
          </DialogTitle>
          <DialogDescription>Liability Shield &amp; Data Egress Transfer Protocol for {feedName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Protocol Overview */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Liability Shield Protocol Purpose</p>
                  <p className="text-xs text-muted-foreground">
                    Creates and logs a unique Liability Token for every API query, ensuring the client's Indemnification
                    Moat is conditional upon preserving the data's lineage.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {(isSimulating || simulationComplete) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{isLive ? "Live Transfer" : "Simulation"} Progress</span>
                <div className="flex items-center gap-2">
                  {isLive && simulationComplete && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">LIVE</Badge>
                  )}
                  {!isLive && simulationComplete && (
                    <Badge variant="outline" className="text-muted-foreground">
                      SIMULATED
                    </Badge>
                  )}
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Simulation Steps */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Liability Shield Protocol Steps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    step.status === "processing"
                      ? "border-primary bg-primary/5"
                      : step.status === "complete"
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : step.status === "error"
                          ? "border-destructive/30 bg-destructive/5"
                          : "border-border"
                  }`}
                >
                  <div className="mt-0.5">
                    {step.status === "pending" && (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    {step.status === "processing" && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                    {step.status === "complete" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                    {step.status === "error" && <AlertTriangle className="h-5 w-5 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {index + 1}. {step.name}
                      </p>
                      {step.artifact && step.status === "complete" && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        >
                          {step.artifact}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Generated Liability Token */}
          {simulationComplete && liabilityToken && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
                  <Hash className="h-4 w-4" />
                  {isLive ? "Live" : "Simulated"} Liability Token
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Token Display */}
                <div className="p-3 bg-background rounded-lg border font-mono text-xs break-all">
                  <span className="text-muted-foreground">X-IDIA-LIABILITY-TOKEN: </span>
                  <span className="text-primary font-semibold">{liabilityToken.token}</span>
                </div>

                {/* Token Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Database className="h-3 w-3" />
                      Client ID
                    </div>
                    <p className="text-sm font-mono">{liabilityToken.clientId}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Timestamp
                    </div>
                    <p className="text-sm font-mono">{new Date(liabilityToken.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      Country of Origin
                    </div>
                    <p className="text-sm font-mono">{liabilityToken.countryOfOrigin}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Link className="h-3 w-3" />
                      DigiRAMP Anchor
                    </div>
                    <p className="text-sm font-mono truncate">{liabilityToken.digiRampAnchor}</p>
                  </div>
                </div>

                {/* Batch Checksum */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    Batch Checksum
                  </div>
                  <p className="text-xs font-mono bg-muted p-2 rounded break-all">{liabilityToken.batchChecksum}</p>
                </div>

                {/* ACA Record IDs */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    ACA_RECORD_ID Hashes (Sample)
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {liabilityToken.acaRecordIds.map((id, idx) => (
                      <Badge key={idx} variant="outline" className="font-mono text-xs">
                        {id}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Egress Log */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium">📜 Digital Receipt (Egress Log)</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Egress Log ID: <span className="font-mono">{liabilityToken.egressLogId}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This immutable record proves what data (by ACA ID) was sold and when the Client took custody.
                  </p>
                </div>

                {/* Compliance Moat Notice */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-xs text-purple-700 font-medium">⚖️ Indemnification Clause</p>
                  <p className="text-xs text-purple-600 mt-1">
                    Client must preserve ACA_RECORD_ID metadata. IDIA's indemnification is void if client cannot produce
                    the Liability_Token upon regulatory request.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!simulationComplete ? (
              <div className="flex gap-3 w-full">
                <Button onClick={runSimulation} disabled={isSimulating} variant="outline" className="flex-1">
                  {isSimulating && !isLive ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running Simulation...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Run Simulation
                    </>
                  )}
                </Button>
                <Button onClick={runLiveTransfer} disabled={isSimulating} className="flex-1">
                  {isSimulating && isLive ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Executing Live Transfer...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Run Live Transfer (1 CRD)
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                <Button variant="outline" onClick={resetSimulation} className="flex-1">
                  Reset
                </Button>
                <Button onClick={() => onOpenChange(false)} className="flex-1">
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
