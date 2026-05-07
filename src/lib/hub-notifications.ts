import { supabase } from "@/integrations/supabase/client";

/**
 * Insert a notification for the current user. Use this anywhere you'd
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await (supabase.from("hub_notifications" as any) as any)
    .insert({
      user_id: user.id,
      title: input.title,
      body: input.body ?? null,
      category: input.category ?? "general",
      severity: input.severity ?? "info",
      link: input.link ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();
  if (error) {
    console.error("[hub_notifications] insert failed", error);
    return null;
  }
  return data;
};