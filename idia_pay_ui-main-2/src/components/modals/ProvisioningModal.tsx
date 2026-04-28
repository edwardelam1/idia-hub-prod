import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, Smartphone, Shield, Copy, RefreshCw, 
  CheckCircle2, Clock, AlertTriangle, UserPlus
} from "lucide-react";
import { toast } from "sonner";

interface ProvisioningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProvisioningModal = ({ isOpen, onClose }: ProvisioningModalProps) => {
  const [newCode, setNewCode] = useState("");
  const [salesAgentId, setSalesAgentId] = useState("");

  // Mock provisioned devices
  const provisionedDevices = [
    { id: "DEV-001", code: "IDIA-2024-A1B2C3", status: "active", location: "Downtown", provisionedAt: "2024-12-15", salesAgent: "SA-1001" },
    { id: "DEV-002", code: "IDIA-2024-D4E5F6", status: "active", location: "Mall Kiosk", provisionedAt: "2024-12-20", salesAgent: "SA-1002" },
    { id: "DEV-003", code: "IDIA-2024-G7H8I9", status: "pending", location: "Airport", provisionedAt: "2024-12-28", salesAgent: "SA-1001" },
  ];

  const generateProvisioningCode = () => {
    const code = `IDIA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setNewCode(code);
    toast.success("Provisioning code generated");
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "pending": return "secondary";
      case "expired": return "destructive";
      default: return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "pending": return <Clock className="h-4 w-4 text-warning" />;
      case "expired": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Device Provisioning (AUT-M.2.1)
          </DialogTitle>
          <DialogDescription>
            Bind app instances to merchant_id via one-time provisioning codes from Hub Sales Interface
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Generate New Code */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Generate Provisioning Code
              </CardTitle>
              <CardDescription className="text-xs">
                Create a new one-time code for device registration with sales agent attribution (DAT-M.6.1)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sales Agent ID (DAT-M.6.1)</Label>
                  <Input 
                    placeholder="e.g., SA-1001" 
                    value={salesAgentId}
                    onChange={(e) => setSalesAgentId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Stamps sales_agent_id onto every transaction for TPV tracking
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Target Location</Label>
                  <Input placeholder="e.g., Downtown Store" />
                </div>
              </div>

              <Button onClick={generateProvisioningCode} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New Provisioning Code
              </Button>

              {newCode && (
                <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Generated Code:</p>
                    <p className="text-lg font-mono font-bold">{newCode}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyCode(newCode)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Transmission Notice */}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Crazy Gatekeeper Security (AUT-M.2.4)</p>
                <p className="text-xs text-muted-foreground">
                  All provisioning events (Device ID, IP, Provision Code) are automatically transmitted to Security Agent API for fraud detection and compliance monitoring.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Provisioned Devices List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Provisioned Devices
              </CardTitle>
              <CardDescription className="text-xs">
                All devices bound to this merchant account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {provisionedDevices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(device.status)}
                      <div>
                        <p className="text-sm font-medium">{device.location}</p>
                        <p className="text-xs text-muted-foreground font-mono">{device.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Sales Agent: {device.salesAgent}</p>
                        <p className="text-xs text-muted-foreground">{device.provisionedAt}</p>
                      </div>
                      <Badge variant={getStatusColor(device.status)} className="capitalize">
                        {device.status}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => copyCode(device.code)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
