import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
export interface FeedPacket { id: number; created_at: string; payload: { schema_version: string; observed_at: string; metrics: Record<string, unknown>; provenance: Record<string, unknown> } }
interface FeedSession { expires_at: string; credits_charged: number; reused?: boolean }
export async function featureRequest(topic: string, action: "sessions" | "latest") {
  const tag = `FeatureFeed.${action}`;
  console.log(`[PHASE_START: ${tag}]`);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sign in to access this feed.");
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/protocol-api/v1/features/${action}?topic=${encodeURIComponent(topic)}`, {
      method: action === "sessions" ? "POST" : "GET",
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? "Feed request failed.");
    return body;
  } catch (e) { console.error(`[PHASE_ERROR: ${tag}]`, e instanceof Error ? `${e.message}\n${e.stack}` : e); throw e; }
  finally { console.log(`[PHASE_END: ${tag}]`); }
}
export function useFeatureFeed(topic: string) {
  const [session, setSession] = useState<FeedSession | null>(null);
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState<string | null>(null);
  const [packets, setPackets] = useState<FeedPacket[]>([]);
  const [paused, setPaused] = useState(false);
  const [received, setReceived] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);
  const pausedRef = useRef(false);
  const connecting = useRef(false);
  const mounted = useRef(true);
  const seen = useRef(new Set<number>());
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  const accept = useCallback((rows: FeedPacket[], live = false) => {
    const fresh = rows.filter(row => !seen.current.has(row.id));
    fresh.forEach(row => seen.current.add(row.id));
    if (seen.current.size > 500) seen.current = new Set([...seen.current].slice(-250));
    if (!fresh.length) return;
    if (live) {
      setReceived(count => count + fresh.length);
      setLatency(Math.max(0, Date.now() - Date.parse(fresh[fresh.length - 1].created_at)));
    }
    if (!pausedRef.current) setPackets(current => [...fresh, ...current].sort((a, b) => b.id - a.id).slice(0, 50));
  }, []);
  const connect = async () => {
    if (connecting.current) return;
    connecting.current = true;
    setError(null); setStatus("Authorizing");
    try {
      const result = await featureRequest(topic, "sessions");
      if (mounted.current) setSession(result);
    } catch (e) { if (mounted.current) { setError(e instanceof Error ? e.message : "Connection failed"); setStatus("Disconnected"); } }
    finally { connecting.current = false; }
  };
  useEffect(() => {
    if (!session) return;
    let disposed = false;
    let loading = false;
    const reload = async () => {
      if (loading || disposed) return;
      loading = true;
      try {
        const result = await featureRequest(topic, "latest");
        if (!disposed) accept(result.packets);
      } catch (e) { if (!disposed) setError(e instanceof Error ? e.message : "Feed interrupted"); }
      finally { loading = false; }
    };
    const channel = supabase.channel(`feature-feed-${topic}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feature_feed_packets", filter: `topic=eq.${topic}` }, payload => {
        if (!disposed) accept([payload.new as FeedPacket], true);
      }).subscribe(state => {
        if (disposed) return;
        setStatus(state === "SUBSCRIBED" ? "Connected" : state === "CHANNEL_ERROR" || state === "TIMED_OUT" ? "Reconnecting" : "Connecting");
        if (state === "SUBSCRIBED") void reload();
      });
    void reload();
    // Backstop for missed socket packets, only while this visible paid session exists.
    const poll = setInterval(() => void reload(), 30_000);
    const expiry = setTimeout(() => { setSession(null); setStatus("Session expired"); }, Math.max(0, Date.parse(session.expires_at) - Date.now()));
    return () => { disposed = true; clearInterval(poll); clearTimeout(expiry); void supabase.removeChannel(channel); };
  }, [session, topic, accept]);
  return { session, status, error, packets, paused, setPaused, received, latency, connect,
    disconnect: () => { setSession(null); setStatus("Disconnected"); setPaused(false); } };
}