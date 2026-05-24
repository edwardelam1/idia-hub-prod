import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Coins, Zap, ShieldCheck, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { useBillingData } from "@/hooks/useBillingData";
import { formatCredits } from "@/lib/utils";
import AvailablePlansDialog from "@/components/billing/AvailablePlansDialog";

const IndividualBilling = () => {
  const [showPlans, setShowPlans] = useState(false);
  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />A La Carte Billing
          </CardTitle>
          <CardDescription>Your current data access model.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-muted bg-muted/30">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Individual accounts have access to personal insights and A La Carte marketplace queries (
              <span className="font-semibold">$10.00 USD per query</span>). To purchase Data Bundles or access Premier
              Filters, you must upgrade to a Business Entity.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Upgrade to Business Entity</p>
              <p className="text-xs text-muted-foreground">
                Access Data Bundles, Synapse Credits, and Premier Filters.
              </p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setShowPlans(true)}>
              Upgrade
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <AvailablePlansDialog open={showPlans} onOpenChange={setShowPlans} currentTier="base" />
    </div>
  );
};

const BusinessBilling = () => {
  const navigate = useNavigate();
  const { balanceData, burnRate } = useSynapseCredits();
  const { subscriptionPlan, currentUsage, daysRemaining } = useBillingData();

  const credits = balanceData?.available_credits ?? 0;
  const dailyBurn = burnRate?.daily_average ?? 0;
  const burnStatus = burnRate?.burn_status ?? "healthy";
  const usagePercent = currentUsage.limit > 0 ? (currentUsage.used / currentUsage.limit) * 100 : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* Subscription Tier */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Subscription Tier
              </CardTitle>
              <CardDescription>
                {subscriptionPlan.name} · {subscriptionPlan.cost}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {daysRemaining} days remaining
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Credit Usage</span>
            <span className="font-medium">
              {formatCredits(currentUsage.used)} / {formatCredits(currentUsage.limit)}
            </span>
          </div>
          <Progress value={Math.min(usagePercent, 100)} className="h-2" />
        </CardContent>
      </Card>

      {/* Synapse Credit Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Synapse Credit Ledger
          </CardTitle>
          <CardDescription>Real-time credit balance · Secure FBO account at Airwallex</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p
                  className={`text-2xl font-bold ${burnStatus === "critical" ? "text-destructive" : burnStatus === "warning" ? "text-orange-500" : "text-foreground"}`}
                >
                  {formatCredits(credits)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Synapse Credits</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Daily Burn Rate</p>
                <p className="text-2xl font-bold text-foreground flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  {formatCredits(dailyBurn)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">CR / day</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Estimated Runway</p>
                <p className="text-2xl font-bold text-foreground">
                  {dailyBurn > 0 ? Math.floor(credits / dailyBurn) : "∞"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">days</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5" onClick={() => navigate("/top-up")}>
              <Zap className="h-3.5 w-3.5" />
              Top Up Credits
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/billing")}>
              View Full Ledger
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* T-1-P Opt-In */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tier-1-Provisioning (T-1-P)</CardTitle>
          <CardDescription>Opt in to raw data intake for your enterprise.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Enable T-1-P Raw Data Intake</Label>
              <p className="text-xs text-muted-foreground">
                Allows your enterprise to ingest raw, unprocessed data streams into your private vault.
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const SettingsBilling = () => {
  const { isBusinessAccount } = useAuth();

  return isBusinessAccount ? <BusinessBilling /> : <IndividualBilling />;
};
