import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, Building2, CreditCard, Coins, Activity } from "lucide-react";
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
      try {
        const { data: orgUser } = await supabase
          .from("business_users")
          .select("org_id")
          .eq("user_id", profile?.user_id)
          .single();

        if (orgUser?.org_id) {
          const { count: userCount } = await supabase
            .from("business_users")
            .select("*", { count: "exact", head: true })
            .eq("org_id", orgUser.org_id);

          const { count: teamCount } = await supabase
            .from("teams")
            .select("*", { count: "exact", head: true })
            .eq("org_id", orgUser.org_id)
            .eq("status", "active");

          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { data: spendData } = await supabase
            .from("synapse_credit_ledger")
            .select("amount")
            .eq("user_id", profile?.user_id)
            .eq("transaction_type", "synapse_purchase")
            .gte("created_at", thirtyDaysAgo.toISOString());

          const totalSpend = spendData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

          setStats({
            totalUsers: userCount || 0,
            activeTeams: teamCount || 0,
            monthlySpend: totalSpend,
            apiCalls: activityCount,
            loading: false,
          });
        }
      } catch (err) {
        console.error("[OrgDashboard] !!! ERROR:", err);
      }
    };

    if (profile?.user_id) fetchOrgStats();
  }, [profile, activityCount]);

  const recentActivity = activities.slice(0, 4).map((activity) => ({
    id: activity.id,
    action:
      activity.type === "data_sale_payout"
        ? "Settlement"
        : activity.type === "synapse_purchase"
          ? "Purchase"
          : activity.type === "hub_protocol_fee"
            ? "Protocol"
            : "System",
    details: activity.description || "Verified",
    timestamp: new Date(activity.created_at).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8 bg-white min-h-screen antialiased">
      {/* Header: Clean & Compact */}
      <header className="flex flex-col space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-widest">
          <span>{profile?.account_type === "god_guid" ? "Sovereign" : "Enterprise"}</span>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span>IDIA Hub v3.0</span>
        </div>
      </header>

      {/* Visualizer: Reduced height for mobile-first focus */}
      <section>
        <Card className="border-none shadow-none bg-slate-50 overflow-hidden rounded-2xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-600" />
              Engine Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] md:h-[300px] p-0">
            <SynapseVisualizer />
          </CardContent>
        </Card>
      </section>

      {/* Metrics: 2x2 on mobile, 1x4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <MetricCard title="Users" value={stats.totalUsers} icon={<Users />} />
        <MetricCard title="Teams" value={stats.activeTeams} icon={<Building2 />} />
        <MetricCard title="Gas" value={Math.floor(balanceData?.synapse_gas_credits || 0)} icon={<Coins />} highlight />
        <MetricCard title="Spend" value={`$${stats.monthlySpend}`} icon={<CreditCard />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Utilization */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Utilization</h3>
          <div className="space-y-6 bg-slate-50 p-6 rounded-2xl">
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-600">API Threshold</span>
                <span className="text-slate-900 font-mono">{stats.apiCalls.toLocaleString()} / 15k</span>
              </div>
              <Progress value={(stats.apiCalls / 15000) * 100} className="h-1.5 bg-slate-200" />
            </div>
          </div>
        </div>

        {/* Feed: Minimalist Timeline */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Protocol Stream</h3>
          <div className="space-y-1">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800">{activity.action}</span>
                  <span className="text-xs text-slate-500 truncate max-w-[180px]">{activity.details}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400">{activity.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, highlight = false }: any) => (
  <div
    className={`p-4 rounded-2xl transition-all ${highlight ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "bg-white border border-slate-100 shadow-sm"}`}
  >
    <div className="flex items-center justify-between mb-3">
      <span
        className={`text-[10px] font-bold uppercase tracking-wider ${highlight ? "text-purple-200" : "text-slate-400"}`}
      >
        {title}
      </span>
      <div className={`h-4 w-4 ${highlight ? "text-purple-200" : "text-slate-300"}`}>{icon}</div>
    </div>
    <div className="text-xl font-semibold tracking-tight">{value}</div>
  </div>
);

export default OrganizationAdminDashboard;
