import { useEffect, useState, useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Users, Building2, CreditCard, Coins, Activity, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, SubscriptionTier } from "@/contexts/AuthContext";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { usePipelineActivity } from "@/hooks/usePipelineActivity";
import SynapseVisualizer from "@/components/visualizer/SynapseVisualizer";

const OrganizationAdminDashboard = () => {
  const { user, profile, subscriptionTier, piiData } = useAuth();
  const { balanceData } = useSynapseCredits();
  const { activities, activityCount } = usePipelineActivity();

  // Tier-Bound Protocol Limits
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
      console.log("[OrgDashboard] >>> START: Reconciling Live Metrics");
      if (!user?.user_id) return;

      try {
        // 1. Resolve Business ID from business_users
        const { data: bizUser } = await supabase
          .from("business_users")
          .select("business_id")
          .eq("user_id", user.user_id)
          .maybeSingle();

        const businessId = bizUser?.business_id;

        if (businessId) {
          // 2. Count Total Institutional Users
          const { count: userCount } = await supabase
            .from("business_users")
            .select("*", { count: "exact", head: true })
            .eq("business_id", businessId);

          // 3. Count Team Members via the View
          const { count: memberCount } = await supabase
            .from("team_members" as any)
            .select("*", { count: "exact", head: true })
            .eq("business_id", businessId);

          // 4. Calculate Fiscal Burn (Sum of synapse_purchase in ledger)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { data: spendData } = await supabase
            .from("synapse_credit_ledger")
            .select("amount")
            .eq("user_id", user.user_id)
            .eq("transaction_type" as any, "synapse_purchase")
            .gte("created_at", thirtyDaysAgo.toISOString());

          const totalSpend = spendData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

          setStats({
            totalUsers: userCount || 0,
            activeTeams: memberCount || 0,
            monthlySpend: Math.floor(totalSpend),
            loading: false,
          });
        }
      } catch (err) {
        console.error("[OrgDashboard] !!! ERROR: Reconciliation failed", err);
      } finally {
        console.log("[OrgDashboard] <<< END: Metrics Updated");
      }
    };

    fetchOrgStats();
  }, [user, activityCount]);

  const recentActivity = activities.slice(0, 4).map((activity: any) => ({
    id: activity.id,
    action: (activity.type as string).replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    details: activity.metadata?.description || "Protocol verified",
    timestamp: activity.created_at
      ? new Date(activity.created_at).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "--:--",
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8 bg-white min-h-screen antialiased">
      <header className="flex flex-col space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-4 w-4 text-purple-600" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {piiData?.source === "auth_metadata_stub" ? "Verified Enclave" : "Secure Session"}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 font-mono">IDIA_HUB_OPS</h1>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
          {subscriptionTier} TIER • {profile?.account_type?.replace("_", " ") || "SYSTEM"}
        </p>
      </header>

      {/* Engine Visualizer */}
      <section className="bg-slate-50 rounded-[2rem] p-4">
        <div className="flex items-center justify-between px-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Synapse Engine™</span>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-slate-900">{activityCount} EVENTS</span>
          </div>
        </div>
        <div className="h-[180px] md:h-[240px]">
          <SynapseVisualizer />
        </div>
      </section>

      {/* 2x2 Grid for Mobile-First Display */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricTile title="Total Users" value={stats.totalUsers} icon={<Users />} />
        <MetricTile title="Team Size" value={stats.activeTeams} icon={<Building2 />} />
        <MetricTile
          title="USDC Balance"
          value={(balanceData as any)?.usdc_balance?.toFixed(2) || "0.00"}
          icon={<Coins />}
          variant="primary"
        />
        <MetricTile title="30D Spend" value={`$${stats.monthlySpend}`} icon={<CreditCard />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 px-1">Utilization</h3>
          <div className="bg-slate-50/50 p-6 rounded-3xl space-y-6 border border-slate-100">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-sm font-semibold text-slate-800">API Threshold</span>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {activityCount.toLocaleString()} / {apiThreshold.toLocaleString()}
                </span>
              </div>
              <Progress value={(activityCount / apiThreshold) * 100} className="h-1 bg-slate-200" />
            </div>

            {/* Embedded Gas Display */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Synapse Gas Remaining</span>
              <span className="text-xs font-mono font-bold text-purple-600">
                {Math.floor((balanceData as any)?.synapse_gas_credits || 0)} Cr
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 px-1">Protocol Stream</h3>
          <div className="space-y-1">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800 leading-none mb-1">{activity.action}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{activity.details}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {activity.timestamp}
                </span>
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
    className={`p-4 rounded-3xl transition-all ${variant === "primary" ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "bg-white border border-slate-100 shadow-sm"}`}
  >
    <div className="flex items-center justify-between mb-4 px-1">
      <div className={`p-2 rounded-xl ${variant === "primary" ? "bg-slate-800" : "bg-slate-50"}`}>
        <div className={`h-3.5 w-3.5 ${variant === "primary" ? "text-white" : "text-slate-400"}`}>{icon}</div>
      </div>
      <span
        className={`text-[9px] font-bold uppercase tracking-widest ${variant === "primary" ? "text-slate-400" : "text-slate-400"}`}
      >
        {title}
      </span>
    </div>
    <div className="text-xl font-semibold tracking-tight px-1">{value}</div>
  </div>
);

export default OrganizationAdminDashboard;
