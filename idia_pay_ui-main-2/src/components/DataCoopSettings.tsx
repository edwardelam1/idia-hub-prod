
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, TrendingUp, DollarSign, Shield, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataCoopSettingsModal } from "./modals/DataCoopSettingsModal";

export const DataCoopSettings = () => {
  const [coopEnabled, setCoopEnabled] = useState(true);
  const [anonymizationLevel, setAnonymizationLevel] = useState("high");
  const [monthlyEarnings, setMonthlyEarnings] = useState(127.50);
  const [dataPoints, setDataPoints] = useState(1847);
  const [privacyScore, setPrivacyScore] = useState(94);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleToggleCoop = async (enabled: boolean) => {
    setCoopEnabled(enabled);
    toast({
      title: enabled ? "Data Co-op Enabled" : "Data Co-op Disabled",
      description: enabled 
        ? "You're now earning from your anonymized business data" 
        : "Data sharing has been paused",
    });
  };

  const handleAnonymizationChange = (level: string) => {
    setAnonymizationLevel(level);
    toast({
      title: "Anonymization Updated",
      description: `Privacy level set to ${level}`,
    });
  };

  const handleOptimizeEarnings = () => {
    setIsSettingsModalOpen(true);
  };

  const handleOpenSettings = () => {
    setIsSettingsModalOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center">
          <Database className="w-6 h-6 mr-2 text-primary" />
          Data Co-op Settings
        </h2>
        <p className="text-muted-foreground mt-1">
          Monetize your business data while maintaining privacy
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="w-4 h-4 mr-1 text-success" />
              Monthly Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">${monthlyEarnings}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-1 text-primary" />
              Data Points Shared
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataPoints.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Shield className="w-4 h-4 mr-1 text-blue-500" />
              Privacy Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{privacyScore}%</div>
            <Progress value={privacyScore} className="mt-1" />
          </CardContent>
        </Card>
      </div>

      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sharing Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="coop-toggle" className="text-base font-medium">
                Enable Data Co-op
              </Label>
              <p className="text-sm text-muted-foreground">
                Share anonymized business data to earn IDIA-USD
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="coop-toggle"
                checked={coopEnabled}
                onCheckedChange={handleToggleCoop}
              />
              <Badge variant={coopEnabled ? "default" : "secondary"}>
                {coopEnabled ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          {coopEnabled && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-medium">Anonymization Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["high", "medium", "low"].map((level) => (
                    <Button
                      key={level}
                      variant={anonymizationLevel === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAnonymizationChange(level)}
                      className="capitalize"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Higher anonymization = Better privacy, Lower earnings potential
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Data Categories</Label>
                <div className="space-y-2">
                  {[
                    { name: "Sales Patterns", enabled: true, rate: "$0.002/record" },
                    { name: "Customer Behavior", enabled: true, rate: "$0.003/record" },
                    { name: "Inventory Trends", enabled: false, rate: "$0.001/record" },
                    { name: "Peak Hours Analysis", enabled: true, rate: "$0.002/record" }
                  ].map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <span className="text-sm font-medium">{category.name}</span>
                        <p className="text-xs text-muted-foreground">{category.rate}</p>
                      </div>
                      <Switch
                        checked={category.enabled}
                        onCheckedChange={() => {}}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleOptimizeEarnings} className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Advanced Settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Earnings History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { date: "Today", amount: 4.25, category: "Sales Data" },
              { date: "Yesterday", amount: 3.80, category: "Customer Analytics" },
              { date: "Dec 18", amount: 5.10, category: "Peak Hours Data" },
              { date: "Dec 17", amount: 3.95, category: "Inventory Patterns" }
            ].map((earning, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/50">
                <div>
                  <span className="text-sm font-medium">{earning.date}</span>
                  <p className="text-xs text-muted-foreground">{earning.category}</p>
                </div>
                <span className="text-sm font-bold text-success">+${earning.amount}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings Modal */}
      <DataCoopSettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};
