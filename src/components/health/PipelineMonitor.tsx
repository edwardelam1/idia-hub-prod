import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePipelineActivity } from "@/hooks/usePipelineActivity";
import { Activity, Network, Library, ShieldCheck, Wallet } from "lucide-react";
import { format } from "date-fns";

export const PipelineActivityMonitor = () => {
  const { activities, isActive, activityCount } = usePipelineActivity();

  const getConfig = (type: string) => {
    switch (type) {
      case "apple_sync":
        return { icon: <Activity className="h-4 w-4 text-blue-500" />, title: "1. Apple Health Sync" };
      case "synapse_staged":
        return { icon: <Network className="h-4 w-4 text-indigo-500" />, title: "2. Synapse Valuation" };
      case "library_entry":
        return { icon: <Library className="h-4 w-4 text-purple-500" />, title: "3. University Library Catalog" };
      case "delt_transfer":
        return { icon: <ShieldCheck className="h-4 w-4 text-orange-500" />, title: "4. Process DELT Transfer" };
      case "royalty_payment":
        return { icon: <Wallet className="h-4 w-4 text-green-500" />, title: "5. Wallet Royalty Payment" };
      default:
        return { icon: <Activity className="h-4 w-4 text-gray-500" />, title: "System Event" };
    }
  };

  return (
    <Card className="w-full border-2 border-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Live Ledger Feed
              {isActive && (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600 animate-pulse">
                  Pipeline Flowing
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Real-time progression of the Circle of Life</CardDescription>
          </div>
          <Badge variant="outline" className="font-mono">
            {activityCount} Operations Verified
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50/50">
            <Activity className="h-8 w-8 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 font-medium">Awaiting Pipeline Events</p>
            <p className="text-sm text-gray-500 mt-1">Listening to sovereign tables for live data execution.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const config = getConfig(activity.type);
              return (
                <div key={activity.id} className="flex items-start gap-3 p-4 rounded-lg border bg-card shadow-sm">
                  <div className="mt-0.5 p-2 rounded-full bg-slate-100">{config.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{config.title}</h4>
                      <span className="text-xs text-gray-500 font-mono">
                        {format(new Date(activity.timestamp), "HH:mm:ss.SSS")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.details.label}</p>
                    <div className="flex gap-2 mt-2">
                      {activity.details.hash && (
                        <Badge variant="secondary" className="text-xs font-mono">
                          Hash: {activity.details.hash.slice(0, 12)}...
                        </Badge>
                      )}
                      {activity.details.token && (
                        <Badge variant="outline" className="text-xs font-mono">
                          Token: {activity.details.token.slice(0, 12)}...
                        </Badge>
                      )}
                      {activity.details.amount && (
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800 hover:bg-green-200">
                          +{activity.details.amount} CR
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
