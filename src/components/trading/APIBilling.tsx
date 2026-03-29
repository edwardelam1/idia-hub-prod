import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, CreditCard } from "lucide-react";
import { useBillingData } from "@/hooks/useBillingData";
import { Skeleton } from "@/components/ui/skeleton";

export const APIBilling = () => {
  const { currentUsage, subscriptionPlan, daysRemaining, isLoading } = useBillingData();
  const remaining = subscriptionPlan.limits.credits - currentUsage.used;

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
        </div>
      </CardContent>
    </Card>
  );
};
