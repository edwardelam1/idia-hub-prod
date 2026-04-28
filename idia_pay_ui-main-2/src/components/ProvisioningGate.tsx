import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvisioningEngine, PayAppBlueprint } from "@/lib/provisioning-engine";
import { Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProvisioningGateProps {
  onHydrated: (blueprint: PayAppBlueprint) => void;
}

export const ProvisioningGate = ({ onHydrated }: ProvisioningGateProps) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleHydrate = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const blueprint = await ProvisioningEngine.hydrateFromHub(trimmed);
      toast({ title: "Terminal Hydrated", description: `Welcome ${blueprint.clientOrganization}.` });
      onHydrated(blueprint);
    } catch (err: any) {
      toast({
        title: "Provisioning Failed",
        description: err?.message ?? "Unknown error.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setCode("DEMO");
    setLoading(true);
    try {
      const blueprint = await ProvisioningEngine.hydrateFromHub("DEMO");
      onHydrated(blueprint);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Sovereign Terminal Provisioning</CardTitle>
          <CardDescription>
            Enter your IDIA Hub provisioning code to hydrate this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="IDIA-XXXX-XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleHydrate()}
            disabled={loading}
            className="font-mono text-center tracking-wider"
          />
          <Button onClick={handleHydrate} disabled={loading || !code.trim()} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Hydrate Terminal
          </Button>
          <Button onClick={handleDemo} variant="outline" disabled={loading} className="w-full">
            Use Demo Blueprint
          </Button>
          <p className="text-xs text-muted-foreground text-center pt-2">
            All hydration is logged. Unauthorized codes are rejected at the edge.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
