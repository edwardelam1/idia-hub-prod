import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HubNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  category: string;
  severity: "info" | "success" | "warning" | "error" | string;
  link: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export const useHubNotifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<HubNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.user_id;

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("hub_notifications" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) setItems(data as unknown as HubNotification[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`hub_notifications_${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hub_notifications", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  // hub_notifications is not in the realtime publication, so every mutation
  // updates local state immediately and reloads from the server on failure.
  const markRead = async (id: string) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n)));
    const { error } = await (supabase.from("hub_notifications" as any) as any)
      .update({ read_at: now })
      .eq("id", id);
    if (error) {
      console.error("[hub_notifications] markRead failed", error);
      load();
    }
  };

  const markAllRead = async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    const { error } = await (supabase.from("hub_notifications" as any) as any)
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) {
      console.error("[hub_notifications] markAllRead failed", error);
      load();
    }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("hub_notifications" as any).delete().eq("id", id);
    if (error) {
      console.error("[hub_notifications] remove failed", error);
      load();
    }
  };

  return { items, loading, unreadCount, markRead, markAllRead, remove, reload: load };
};