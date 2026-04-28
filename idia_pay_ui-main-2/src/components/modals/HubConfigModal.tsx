import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, Smartphone, Package, BarChart3, Shield, 
  RefreshCw, Download, Upload, CheckCircle2, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface HubConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HubConfigModal = ({ isOpen, onClose }: HubConfigModalProps) => {
  const [modules, setModules] = useState({
    pos: true,
    inventory: true,
    recipes: true,
    team: true,
    reports: true,
    xr: false,
    affiliates: false,
    tax: true,
  });

  const [featureFlags, setFeatureFlags] = useState({
    nfcPayment: true,
    barcodeScanner: true,
    dataCoop: true,
    offlineMode: true,
    lazyLoading: true,
  });

  const handleModuleToggle = (module: keyof typeof modules) => {
    setModules(prev => ({ ...prev, [module]: !prev[module] }));
    toast.success(`Module ${module} ${!modules[module] ? 'enabled' : 'disabled'}`);
  };

  const handleFeatureToggle = (feature: keyof typeof featureFlags) => {
    setFeatureFlags(prev => ({ ...prev, [feature]: !prev[feature] }));
    toast.success(`Feature flag updated`);
  };

  const handlePushManifest = () => {
    toast.success("App manifest pushed to all devices");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Hub Configuration (SYS-M)
          </DialogTitle>
          <DialogDescription>
            Configure the modular shell architecture and dynamic app manifest for all merchant devices
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="modules">Module Control</TabsTrigger>
            <TabsTrigger value="features">Feature Flags</TabsTrigger>
            <TabsTrigger value="manifest">Manifest Sync</TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Active Modules (SYS-M.1.2)</CardTitle>
                <CardDescription className="text-xs">
                  Enable/disable modules via app_manifest. Changes propagate to all devices on next sync.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {Object.entries(modules).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <Label className="capitalize font-medium">{key}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={enabled ? "default" : "secondary"} className="text-xs">
                        {enabled ? "Active" : "Disabled"}
                      </Badge>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => handleModuleToggle(key as keyof typeof modules)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Feature Flags (SYS-M.1.3)</CardTitle>
                <CardDescription className="text-xs">
                  Dynamic navigation and feature control via Hub-driven configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(featureFlags).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="font-medium">
                        {key === 'nfcPayment' && 'NFC Payment (POS-M.3.2)'}
                        {key === 'barcodeScanner' && 'Barcode Scanner (INV-M.5.3)'}
                        {key === 'dataCoop' && 'Data Co-op (DAT-M.6.2)'}
                        {key === 'offlineMode' && 'Offline Config Cache (SYS-M.1.4)'}
                        {key === 'lazyLoading' && 'Lazy Loading (POS-M.3.4)'}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {key === 'nfcPayment' && 'Activate NFC Reader for IDIA-USD transactions'}
                        {key === 'barcodeScanner' && 'Enable camera barcode scanner button'}
                        {key === 'dataCoop' && 'Background logging of anonymized BHI data'}
                        {key === 'offlineMode' && 'Cache app_manifest locally for offline sessions'}
                        {key === 'lazyLoading' && 'Enforce lazy_load=TRUE for <100ms scroll performance'}
                      </p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => handleFeatureToggle(key as keyof typeof featureFlags)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manifest" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Manifest Synchronization (SYS-M.1.5)</CardTitle>
                <CardDescription className="text-xs">
                  Push configuration updates to all connected devices with skeleton hydration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 text-center">
                    <Smartphone className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-xs text-muted-foreground">Connected Devices</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                    <p className="text-2xl font-bold">11</p>
                    <p className="text-xs text-muted-foreground">Up to Date</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-warning" />
                    <p className="text-2xl font-bold">1</p>
                    <p className="text-xs text-muted-foreground">Pending Sync</p>
                  </Card>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handlePushManifest} className="flex-1">
                    <Upload className="h-4 w-4 mr-2" />
                    Push Manifest to All Devices
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Config
                  </Button>
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Force Sync
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
