import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, Building2, CreditCard, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { usePipelineActivity } from "@/hooks/usePipelineActivity";
import SynapseVisualizer from "@/components/visualizer/SynapseVisualizer";

const OrganizationAdminDashboard = () => {
  const { profile } = useAuth();
  const { balanceData } = useSynapseCredits();
  const { activities, activityCount } = usePipelineActivity();

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTeams: 0,
    monthlySpend: 0,
    apiCalls: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchOrgStats = async () => {
      console.log("[OrgDashboard] >>> START: Fetching Live Org Metrics");
      try {
        // 1. Get the Org GUID for this admin
        const { data: orgUser } = await supabase
          .from("business_users")
          .select("org_id")
          .eq("user_id", profile?.user_id)
          .single();

        if (orgUser?.org_id) {
          // 2. Count Total Users in Org
          const { count: userCount } = await supabase
            .from("business_users")
            .select("*", { count: "exact", head: true })
            .eq("org_id", orgUser.org_id);

          // 3. Count Active Teams
          const { count: teamCount } = await supabase
            .from("teams")
            .select("*", { count: "exact", head: true })
            .eq("org_id", orgUser.org_id)
            .eq("status", "active");

          // 4. Calculate Monthly Spend (Sum of synapse_purchase in last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { data: spendData } = await supabase
            .from("synapse_credit_ledger")
            .select("amount")
            .eq("user_id", profile?.user_id) // Scoped to admin/org wallet
            .eq("transaction_type", "synapse_purchase")
            .gte("created_at", thirtyDaysAgo.toISOString());

          const totalSpend = spendData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

          setStats({
            totalUsers: userCount || 0,
            activeTeams: teamCount || 0,
            monthlySpend: totalSpend,
            apiCalls: activityCount, // Using live pipeline count
            loading: false,
          });
        }
      } catch (err) {
        console.error("[OrgDashboard] !!! ERROR: Failed to reconcile stats", err);
      } finally {
        console.log("[OrgDashboard] <<< END: Metrics Reconciliation Complete");
      }
    };

    if (profile?.user_id) fetchOrgStats();
  }, [profile, activityCount]);

  // Map live activity types (lower_case_style) to UI labels
  const recentActivity = activities.slice(0, 5).map((activity) => ({
    id: activity.id,
    action:
      activity.type === "data_sale_payout"
        ? "Data Settlement"
        : activity.type === "synapse_purchase"
          ? "Credit Purchase"
          : activity.type === "hub_protocol_fee"
            ? "Protocol Settlement"
            : activity.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    details: activity.description || "System protocol verified",
    timestamp: new Date(activity.created_at).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    type: activity.type,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Organization Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Data Intelligence Operations • {profile?.account_type === "god_guid" ? "Sovereign View" : "Enterprise Admin"}
        </p>
      </header>

      <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live Synapse Engine™ Visualizer
          </CardTitle>
          <CardDescription>Real-time network contribution • {activityCount} protocols settled</CardDescription>
        </CardHeader>
        <CardContent>
          <SynapseVisualizer />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Users" value={stats.totalUsers} icon={<Users />} subtext="Across all teams" />
        <MetricCard title="Active Teams" value={stats.activeTeams} icon={<Building2 />} subtext="Provisioned squads" />
        <MetricCard
          title="Synapse Gas"
          value={Math.floor(balanceData?.synapse_gas_credits || 0)}
          icon={<Coins />}
          subtext="Operational fuel"
          isPrimary
        />
        <MetricCard
          title="Monthly Spend"
          value={`$${stats.monthlySpend.toLocaleString()}`}
          icon={<CreditCard />}
          subtext="Last 30 days"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quota Utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>API Threshold</span>
                <span className="font-mono">{stats.apiCalls.toLocaleString()} / 15k</span>
              </div>
              <Progress value={(stats.apiCalls / 15000) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Protocol Stream</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 border-l-2 border-muted pl-4 py-1">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.details}</p>
                    <time className="text-[10px] uppercase text-gray-400 mt-1 block">{activity.timestamp}</time>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, subtext, isPrimary = false }: any) => (
  <Card className={isPrimary ? "border-purple-200 bg-purple-50/50" : ""}>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
      <div className="h-4 w-4 text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${isPrimary ? "text-purple-700" : ""}`}>{value}</div>
      <p className="text-[10px] text-muted-foreground mt-1">{subtext}</p>
    </CardContent>
  </Card>
);

export default OrganizationAdminDashboard;
