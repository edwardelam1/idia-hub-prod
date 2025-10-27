import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, TrendingUp, CreditCard } from "lucide-react";

export const APIBilling = () => {
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
                <span className="font-semibold text-foreground">Credits Consumed Today</span>
              </div>
              <p className="text-sm text-muted-foreground">Across all API endpoints</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">8,456</div>
              <Badge variant="outline" className="mt-1">12,544 remaining</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">Monthly Credit Allocation</span>
              </div>
              <p className="text-sm text-muted-foreground">Professional Tier</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">100,000</div>
              <p className="text-xs text-muted-foreground">Resets in 12 days</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
