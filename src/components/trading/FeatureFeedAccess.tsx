import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import FeatureFeedCard, { type FeatureFeed } from "./FeatureFeedCard";

export default function FeatureFeedAccess() {
  const [feeds, setFeeds] = useState<FeatureFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    const load = async () => {
      console.log("[PHASE_START: FeatureFeed.Catalog]");
      setLoading(true);
      try {
        const { data, error: fault } = await supabase.from("feature_feeds").select("id,name,description,topic").eq("status", "active").order("name");
        if (fault) throw new Error(fault.message);
        if (!disposed) { setFeeds(data ?? []); setError(null); }
      } catch (e) {
        console.error("[PHASE_ERROR: FeatureFeed.Catalog]", e instanceof Error ? `${e.message}\n${e.stack}` : e);
        if (!disposed) setError(e instanceof Error ? e.message : "Could not load feeds");
      } finally {
        console.log("[PHASE_END: FeatureFeed.Catalog]");
        if (!disposed) setLoading(false);
      }
    };
    void load();
    return () => { disposed = true; };
  }, [attempt]);
  return <TooltipProvider delayDuration={150}><section className="space-y-4 min-w-0">
    <h2 className="text-xl font-semibold">Feature Feeds</h2>
    {loading ? <div className="grid gap-3 lg:grid-cols-2">{[0,1,2].map(i=><Skeleton key={i} className="h-72" />)}</div> : error ? <div role="alert" className="space-y-2"><p className="text-destructive text-sm">{error}</p><Button variant="outline" onClick={()=>setAttempt(a=>a+1)}>Retry</Button></div> : !feeds.length ? <p className="text-sm text-muted-foreground">No active feeds.</p> : <div className="grid gap-3 lg:grid-cols-2">{feeds.map(feed=><FeatureFeedCard key={feed.id} feed={feed}/>)}</div>}
  </section></TooltipProvider>;
}
