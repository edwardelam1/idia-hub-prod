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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldAlert, Clock, Fingerprint, Eye, EyeOff, 
  UserCheck, AlertTriangle, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface MinorSafeguardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MinorSafeguardsModal = ({ isOpen, onClose }: MinorSafeguardsModalProps) => {
  const [settings, setSettings] = useState({
    shiftRestrictionEnabled: true,
    shiftStartTime: "06:00",
    shiftEndTime: "21:00",
    disableBiometric: true,
    dataShieldEnabled: true,
  });

  // Mock minor employees
  const minorEmployees = [
    { id: "EMP-001", name: "Alex Johnson", age: 17, location: "Downtown", biometricDisabled: true, dataShieldActive: true },
    { id: "EMP-002", name: "Sam Williams", age: 16, location: "Mall Kiosk", biometricDisabled: true, dataShieldActive: true },
    { id: "EMP-003", name: "Jordan Lee", age: 17, location: "Airport", biometricDisabled: true, dataShieldActive: true },
  ];

  const handleSettingChange = (key: keyof typeof settings, value: boolean | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast.success("Minor safeguard settings updated");
  };

  const handleSaveSettings = () => {
    toast.success("HCD compliance settings saved successfully");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Minor Employee Safeguards (AUT-M.2.3 & DAT-M.6.2)
          </DialogTitle>
          <DialogDescription>
            HCD Compliance controls for employees under 18 - shift restrictions, biometric controls, and data protection
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Compliance Status */}
          <Card className="border-success/50 bg-success/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-medium">HCD Compliance Status: Active</p>
                <p className="text-xs text-muted-foreground">
                  All minor employee safeguards are enabled and enforced across all locations
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Shift Restrictions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Shift Restriction Logic (AUT-M.2.3)
              </CardTitle>
              <CardDescription className="text-xs">
                Enforce login restrictions for minor employees based on time of day
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Enable Shift Restrictions</Label>
                  <p className="text-xs text-muted-foreground">
                    Prevent login outside allowed hours
                  </p>
                </div>
                <Switch
                  checked={settings.shiftRestrictionEnabled}
                  onCheckedChange={(checked) => handleSettingChange("shiftRestrictionEnabled", checked)}
                />
              </div>

              {settings.shiftRestrictionEnabled && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label>Earliest Login Time</Label>
                    <Input 
                      type="time" 
                      value={settings.shiftStartTime}
                      onChange={(e) => handleSettingChange("shiftStartTime", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Default: 6:00 AM</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Latest Login Time</Label>
                    <Input 
                      type="time" 
                      value={settings.shiftEndTime}
                      onChange={(e) => handleSettingChange("shiftEndTime", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Default: 9:00 PM</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Biometric Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Fingerprint className="h-4 w-4" />
                Biometric Login Controls
              </CardTitle>
              <CardDescription className="text-xs">
                Disable biometric authentication for minor employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Disable Biometric Login for Minors</Label>
                  <p className="text-xs text-muted-foreground">
                    If user.is_minor=TRUE, disable biometric login and require PIN/password
                  </p>
                </div>
                <Switch
                  checked={settings.disableBiometric}
                  onCheckedChange={(checked) => handleSettingChange("disableBiometric", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Minor Data Shield */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Minor Data Shield (DAT-M.6.2)
              </CardTitle>
              <CardDescription className="text-xs">
                Strictly disable bhi_logging for minor employee sessions to prevent behavioral tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="font-medium">Enable Data Shield</Label>
                  <p className="text-xs text-muted-foreground">
                    HCD Compliance (Data Minimization) - No BHI data collection for minors
                  </p>
                </div>
                <Switch
                  checked={settings.dataShieldEnabled}
                  onCheckedChange={(checked) => handleSettingChange("dataShieldEnabled", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Minor Employees List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Minor Employees
              </CardTitle>
              <CardDescription className="text-xs">
                Employees flagged as is_minor=TRUE with active safeguards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {minorEmployees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium">{employee.name.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{employee.name}</p>
                        <p className="text-xs text-muted-foreground">Age: {employee.age} • {employee.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {employee.biometricDisabled && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Fingerprint className="h-3 w-3" />
                          Biometric Off
                        </Badge>
                      )}
                      {employee.dataShieldActive && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <EyeOff className="h-3 w-3" />
                          Data Shield
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSaveSettings} className="w-full">
            Save HCD Compliance Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
