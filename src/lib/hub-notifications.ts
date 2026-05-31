import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

/**
 * Fire a sonner toast AND persist a row in hub_notifications so the bell
 * always reflects the user's recent activity.
 */
export const notifyAndToast = async (input: {
  title: string;
  body?: string;
  category?: string;
  severity?: "info" | "success" | "warning" | "error";
  link?: string;
  metadata?: Record<string, unknown>;
}) => {
  const sev = input.severity ?? "info";
  const fn =
    sev === "success" ? toast.success : sev === "error" ? toast.error : sev === "warning" ? toast.warning : toast.info;
  fn(input.title, input.body ? { description: input.body } : undefined);
  return recordHubNotification(input);
};