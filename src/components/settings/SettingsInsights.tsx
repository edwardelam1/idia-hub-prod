import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Activity, Database, TrendingUp } from "lucide-react";

export const SettingsInsights = () => {
  const insights = [
    { label: "Data Contributions", value: 142, unit: "events", icon: Database, change: "+12 this week" },
    { label: "Personal Health Score", value: 78, unit: "/100", icon: Activity, change: "+3 from last month" },
    { label: "Marketplace Queries", value: 7, unit: "of 50 max", icon: BarChart3, change: "A La Carte quota" },
    { label: "Rewards Earned", value: 24.5, unit: "USDC", icon: TrendingUp, change: "Lifetime" },
  ];

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            My Personal Insights
          </CardTitle>
          <CardDescription>
            A summary of your individual data contributions and rewards. Individual accounts access the marketplace via
            A La Carte queries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {insights.map((item) => (
              <Card key={item.label} className="border-border/50">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-xl font-bold text-foreground">
                      {typeof item.value === "number" && item.label.includes("Earned")
                        ? `$${item.value.toFixed(2)}`
                        : item.value}
                      <span className="text-xs font-normal text-muted-foreground ml-1">{item.unit}</span>
                    </p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {item.change}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">A La Carte Query Quota</span>
              <span className="font-medium text-foreground">7 / 50</span>
            </div>
            <Progress value={14} className="h-2" />
            <p className="text-xs text-muted-foreground">$10.00 USD per query</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
