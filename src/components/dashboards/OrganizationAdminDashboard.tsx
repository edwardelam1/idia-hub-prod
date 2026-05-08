import { useEffect, useState, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Users, Building2, CreditCard, Coins, Activity, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, SubscriptionTier } from "@/contexts/AuthContext";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { usePipelineActivity } from "@/hooks/usePipelineActivity";
import SynapseVisualizer from "@/components/visualizer/SynapseVisualizer";

const OrganizationAdminDashboard = () => {
  const { profile, subscriptionTier, piiData } = useAuth();
  const { balanceData } = useSynapseCredits();
  const { activities, activityCount } = usePipelineActivity();

  // 1. TIER-BASED PROTOCOL LIMITS (The Business Logic)
  const tierLimits: Record<SubscriptionTier, number> = {
    none: 0,
    base: 1000,
    analyst: 10000,
    professional: 50000,
    enterprise: 250000,
  };

  const apiThreshold = useMemo(() => tierLimits[subscriptionTier] || 1000, [subscriptionTier]);

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTeams: 0,
    monthlySpend: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchOrgStats = async () => {
      console.log("[OrgDashboard] >>> START: Reconciling Org Metrics");
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
            .eq("org_id", orgUser.org_id);

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
  }, [profile]);

  const recentActivity = activities.slice(0, 4).map((activity) => ({
    id: activity.id,
    action: activity.type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    details: activity.description || "Protocol Verified",
    timestamp: new Date(activity.created_at).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10 bg-white min-h-screen antialiased">
      {/* Sovereign Header */}
      <header className="flex flex-col space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-4 w-4 text-purple-600" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {piiData?.source === "secure_enclave" ? "Verified Enclave" : "Secure Session"}
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Operations</h1>
        <p className="text-sm text-slate-500 font-medium">
          {subscriptionTier.toUpperCase()} TIER • {profile?.account_type.replace("_", " ")}
        </p>
      </header>

      {/* Synapse Engine Visualizer */}
      <section className="bg-slate-50 rounded-3xl p-2 md:p-6">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Synapse Engine™</span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-slate-600">{activityCount} EVENTS</span>
          </div>
        </div>
        <div className="h-[180px] md:h-[240px]">
          <SynapseVisualizer />
        </div>
      </section>

      {/* Grid: 2x2 for Mobile, 1x4 for Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MetricTile title="Total Users" value={stats.totalUsers} icon={<Users />} />
        <MetricTile title="Teams" value={stats.activeTeams} icon={<Building2 />} />
        <MetricTile
          title="Credits"
          value={Math.floor(balanceData?.synapse_gas_credits || 0)}
          icon={<Coins />}
          variant="primary"
        />
        <MetricTile title="Mo. Spend" value={`$${stats.monthlySpend}`} icon={<CreditCard />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Utilization Section */}
        <div className="space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Utilization</h3>
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-sm font-semibold text-slate-700">API Threshold</span>
                <span className="text-xs font-mono text-slate-500">
                  {activityCount.toLocaleString()} / {apiThreshold.toLocaleString()}
                </span>
              </div>
              <Progress value={(activityCount / apiThreshold) * 100} className="h-1 bg-slate-100" />
            </div>
          </div>
        </div>

        {/* Live Ledger Activity */}
        <div className="space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Ledger Activity</h3>
          <div className="space-y-1">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="group flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800">{activity.action}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{activity.details}</span>
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

const MetricTile = ({ title, value, icon, variant = "default" }: any) => (
  <div
    className={`p-5 rounded-3xl transition-all ${variant === "primary" ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "bg-white border border-slate-100 shadow-sm"}`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-xl ${variant === "primary" ? "bg-slate-800" : "bg-slate-50"}`}>
        <div className={`h-4 w-4 ${variant === "primary" ? "text-white" : "text-slate-400"}`}>{icon}</div>
      </div>
      <span
        className={`text-[10px] font-bold uppercase tracking-widest ${variant === "primary" ? "text-slate-400" : "text-slate-300"}`}
      >
        {title}
      </span>
    </div>
    <div className="text-2xl font-semibold tracking-tight">{value}</div>
  </div>
);

export default OrganizationAdminDashboard;
