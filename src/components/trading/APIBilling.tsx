import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, CreditCard, TrendingDown } from "lucide-react";
import { useBillingData } from "@/hooks/useBillingData";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { Skeleton } from "@/components/ui/skeleton";

export const APIBilling = () => {
  const { currentUsage, subscriptionPlan, daysRemaining, isLoading } = useBillingData();
  const { balanceData, burnRate } = useSynapseCredits();
  const remaining = subscriptionPlan.limits.credits - currentUsage.used;
  const burnStatus = burnRate?.burn_status ?? 'healthy';
  const dailyAvg = burnRate?.daily_average ?? 0;

  const burnColor = burnStatus === 'critical' ? 'text-destructive' : burnStatus === 'warning' ? 'text-amber-500' : 'text-foreground';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          Synapse Credit Consumption
        </CardTitle>
        <CardDescription>
          Usage-based billing for API calls and feature feed access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">Credits Consumed (Current Period)</span>
              </div>
              <p className="text-sm text-muted-foreground">Across all API endpoints</p>
            </div>
            <div className="text-right">
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <>
                  <div className="text-2xl font-bold text-foreground">{currentUsage.used.toLocaleString()}</div>
                  <Badge variant="outline" className="mt-1">{remaining > 0 ? `${remaining.toLocaleString()} remaining` : 'Limit reached'}</Badge>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">Credit Allocation</span>
              </div>
              <p className="text-sm text-muted-foreground">{subscriptionPlan.name} Tier</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">{subscriptionPlan.limits.credits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {daysRemaining > 0 ? `Resets in ${daysRemaining} days` : 'No active billing period'}
              </p>
            </div>
          </div>

          {/* Burn Rate Warning */}
          {dailyAvg > 0 && (
            <div className={`flex items-center justify-between p-4 border rounded-lg ${
              burnStatus === 'critical' ? 'border-destructive/50 bg-destructive/5' : burnStatus === 'warning' ? 'border-amber-500/50 bg-amber-500/5' : ''
            }`}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingDown className={`h-4 w-4 ${burnColor}`} />
                  <span className={`font-semibold ${burnColor}`}>Burn Rate</span>
                </div>
                <p className="text-sm text-muted-foreground">30-day consumption average</p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold font-mono ${burnColor}`}>
                  {dailyAvg.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">CRD / day</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
