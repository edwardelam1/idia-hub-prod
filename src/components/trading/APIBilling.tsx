import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, CreditCard, TrendingDown } from "lucide-react";
import { useBillingData } from "@/hooks/useBillingData";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCredits } from "@/lib/utils";

export const APIBilling = () => {
  const { currentUsage, subscriptionPlan, daysRemaining, dailyBurn, isLoading } = useBillingData();
  const { balanceData } = useSynapseCredits();
  const available = balanceData?.available_credits ?? 0;
  const hasAllocation = subscriptionPlan.limits.credits > 0;
  const remaining = subscriptionPlan.limits.credits - currentUsage.used;
  const burnStatus: 'healthy' | 'warning' | 'critical' =
    dailyBurn > 0 && available < dailyBurn * 2
      ? 'critical'
      : dailyBurn > 0 && available < dailyBurn * 7
        ? 'warning'
        : 'healthy';

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
                  <div className="text-2xl font-bold text-foreground">{formatCredits(currentUsage.used)}</div>
                  {hasAllocation && (
                    <Badge variant="outline" className="mt-1">
                      {remaining > 0 ? `${formatCredits(remaining)} remaining` : 'Limit reached'}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">
                  {hasAllocation ? 'Credit Allocation' : 'Available Balance'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{subscriptionPlan.name} Tier</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                {hasAllocation ? formatCredits(subscriptionPlan.limits.credits) : formatCredits(available)}
              </div>
              <p className="text-xs text-muted-foreground">
                {daysRemaining > 0 ? `Renews in ${daysRemaining} days` : 'No active billing period'}
              </p>
            </div>
          </div>

          {/* Burn Rate Warning */}
          {dailyBurn > 0 && (
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
                  {dailyBurn.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">CR / day</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
