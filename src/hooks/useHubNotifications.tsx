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

  const markRead = async (id: string) => {
    await (supabase.from("hub_notifications" as any) as any)
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  };

  const markAllRead = async () => {
    if (!userId) return;
    await (supabase.from("hub_notifications" as any) as any)
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
  };

  const remove = async (id: string) => {
    await supabase.from("hub_notifications" as any).delete().eq("id", id);
  };

  return { items, loading, unreadCount, markRead, markAllRead, remove, reload: load };
};

/**
 * Helper: insert a notification for the current user. Use this anywhere you'd
 * normally fire a toast that should ALSO be persisted to the bell history.
 */
export const recordHubNotification = async (input: {
  title: string;
  body?: string;
  category?: string;
  severity?: "info" | "success" | "warning" | "error";
  link?: string;
  metadata?: Record<string, unknown>;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("hub_notifications" as any).insert({
    user_id: user.id,
    title: input.title,
    body: input.body ?? null,
    category: input.category ?? "general",
    severity: input.severity ?? "info",
    link: input.link ?? null,
    metadata: input.metadata ?? {},
  } as any).select().single();
  if (error) {
    console.error("[hub_notifications] insert failed", error);
    return null;
  }
  return data;
};