import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Settings, Bell, Shield, Database, Globe } from "lucide-react";

interface SystemPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemPreferencesModal = ({ isOpen, onClose }: SystemPreferencesModalProps) => {
  const [preferences, setPreferences] = useState({
    // General Settings
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    currency: "USD",
    language: "en",
    timezone: "America/New_York",
    
    // Notifications
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    orderAlerts: true,
    inventoryAlerts: true,
    staffAlerts: true,
    
    // Security
    sessionTimeout: "30",
    requireMFA: false,
    passwordComplexity: true,
    loginAttempts: "5",
    
    // Data & Analytics
    dataRetention: "365",
    analyticsLevel: "full",
    anonymizeData: false,
    shareAnalytics: true,
    
    // System
    autoBackup: true,
    backupFrequency: "daily",
    maintenanceWindow: "02:00",
    logLevel: "info"
  });

  const { toast } = useToast();

  const updatePreference = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    toast({
      title: "System Preferences Updated",
      description: "Your system preferences have been successfully saved.",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Preferences
          </DialogTitle>
          <DialogDescription>
            Configure global system settings, notifications, and preferences.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select value={preferences.dateFormat} onValueChange={(value) => updatePreference('dateFormat', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <Select value={preferences.timeFormat} onValueChange={(value) => updatePreference('timeFormat', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12 Hour</SelectItem>
                      <SelectItem value="24h">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={preferences.currency} onValueChange={(value) => updatePreference('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={preferences.language} onValueChange={(value) => updatePreference('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={preferences.timezone} onValueChange={(value) => updatePreference('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Delivery Methods</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <Switch
                        id="emailNotifications"
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="smsNotifications">SMS Notifications</Label>
                      <Switch
                        id="smsNotifications"
                        checked={preferences.smsNotifications}
                        onCheckedChange={(checked) => updatePreference('smsNotifications', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pushNotifications">Push Notifications</Label>
                      <Switch
                        id="pushNotifications"
                        checked={preferences.pushNotifications}
                        onCheckedChange={(checked) => updatePreference('pushNotifications', checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Alert Types</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="orderAlerts">Order Alerts</Label>
                      <Switch
                        id="orderAlerts"
                        checked={preferences.orderAlerts}
                        onCheckedChange={(checked) => updatePreference('orderAlerts', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="inventoryAlerts">Inventory Alerts</Label>
                      <Switch
                        id="inventoryAlerts"
                        checked={preferences.inventoryAlerts}
                        onCheckedChange={(checked) => updatePreference('inventoryAlerts', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="staffAlerts">Staff Alerts</Label>
                      <Switch
                        id="staffAlerts"
                        checked={preferences.staffAlerts}
                        onCheckedChange={(checked) => updatePreference('staffAlerts', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={preferences.sessionTimeout}
                    onChange={(e) => updatePreference('sessionTimeout', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="loginAttempts">Max Login Attempts</Label>
                  <Input
                    id="loginAttempts"
                    type="number"
                    value={preferences.loginAttempts}
                    onChange={(e) => updatePreference('loginAttempts', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="requireMFA">Require Multi-Factor Authentication</Label>
                  <Switch
                    id="requireMFA"
                    checked={preferences.requireMFA}
                    onCheckedChange={(checked) => updatePreference('requireMFA', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="passwordComplexity">Enforce Password Complexity</Label>
                  <Switch
                    id="passwordComplexity"
                    checked={preferences.passwordComplexity}
                    onCheckedChange={(checked) => updatePreference('passwordComplexity', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data & Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Data & Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataRetention">Data Retention (days)</Label>
                  <Input
                    id="dataRetention"
                    type="number"
                    value={preferences.dataRetention}
                    onChange={(e) => updatePreference('dataRetention', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="analyticsLevel">Analytics Level</Label>
                  <Select value={preferences.analyticsLevel} onValueChange={(value) => updatePreference('analyticsLevel', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="full">Full</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="anonymizeData">Anonymize Personal Data</Label>
                  <Switch
                    id="anonymizeData"
                    checked={preferences.anonymizeData}
                    onCheckedChange={(checked) => updatePreference('anonymizeData', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="shareAnalytics">Share Analytics with IDIA Hub</Label>
                  <Switch
                    id="shareAnalytics"
                    checked={preferences.shareAnalytics}
                    onCheckedChange={(checked) => updatePreference('shareAnalytics', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};