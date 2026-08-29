import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  BuyerJurisdiction,
  BuyerLatency,
  BuyerProfileVector,
  BuyerRole,
  CanonicalDataCategory,
} from "@/lib/buyer-affinity";

export interface BuyerVectorRow {
  user_id: string;
  role: BuyerRole;
  jurisdiction: BuyerJurisdiction;
  latency_requirement: BuyerLatency;
  weights: Record<CanonicalDataCategory, number>;
  level0_completed_at: string | null;
  level1_completed_at: string | null;
  level1_battery: string | null;
  tier_at_completion: string | null;
  raw_answers: Record<string, string>;
}

export interface DiagnosticAnswer {
  questionId: string;
  choice: string;
}

export const useBuyerProfile = () => {
  const { user, isAuthenticated, isLoading: authLoading, subscriptionTier } = useAuth();
  const [vector, setVector] = useState<BuyerVectorRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated || !user?.user_id) {
      setVector(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("buyer_profile_vectors")
      .select(
        "user_id, role, jurisdiction, latency_requirement, weights, level0_completed_at, level1_completed_at, level1_battery, tier_at_completion, raw_answers",
      )
      .eq("user_id", user.user_id)
      .maybeSingle();

    if (error) {
      console.error("[useBuyerProfile] vector load failed", error);
      setVector(null);
    } else {
      setVector((data as unknown as BuyerVectorRow) ?? null);
    }
    setLoading(false);
  }, [isAuthenticated, user?.user_id]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  const logAnswers = useCallback(
    async (batteryLevel: "LEVEL_0" | "LEVEL_1", roleBattery: string | null, answers: DiagnosticAnswer[]) => {
      if (!user?.user_id) return;
      const rows = answers.map((a) => ({
        user_id: user.user_id,
        battery_level: batteryLevel,
        role_battery: roleBattery,
        question_id: a.questionId,
        selected_choice: a.choice,
      }));
      const { error } = await supabase.from("buyer_diagnostic_responses").insert(rows);
      if (error) console.error("[useBuyerProfile] response log failed", error);
    },
    [user?.user_id],
  );

  /** Level 0 — role + jurisdiction. Weights are computed server-side by trigger. */
  const submitLevel0 = useCallback(
    async (role: BuyerRole, jurisdiction: BuyerJurisdiction, answers: DiagnosticAnswer[]) => {
      if (!user?.user_id) return;
      setSaving(true);
      try {
        const payload = {
          user_id: user.user_id,
          role,
          jurisdiction,
          level0_completed_at: new Date().toISOString(),
          tier_at_completion: subscriptionTier,
          raw_answers: Object.fromEntries(answers.map((a) => [a.questionId, a.choice])),
        };
        const { error } = await supabase
          .from("buyer_profile_vectors")
          .upsert(payload as never, { onConflict: "user_id" });
        if (error) throw error;
        await logAnswers("LEVEL_0", null, answers);
        await load();
      } catch (err) {
        console.error("[useBuyerProfile] level0 submit failed", err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user?.user_id, subscriptionTier, logAnswers, load],
  );

  /** Level 1 — role battery answers. Weights recomputed server-side. */
  const submitLevel1 = useCallback(
    async (roleBattery: BuyerRole, latency: BuyerLatency, answers: DiagnosticAnswer[]) => {
      if (!user?.user_id) return;
      setSaving(true);
      try {
        const merged = {
          ...(vector?.raw_answers ?? {}),
          ...Object.fromEntries(answers.map((a) => [a.questionId, a.choice])),
        };
        const { error } = await supabase
          .from("buyer_profile_vectors")
          .update({
            latency_requirement: latency,
            level1_completed_at: new Date().toISOString(),
            level1_battery: roleBattery,
            tier_at_completion: subscriptionTier,
            raw_answers: merged,
          } as never)
          .eq("user_id", user.user_id);
        if (error) throw error;
        await logAnswers("LEVEL_1", roleBattery, answers);
        await load();
      } catch (err) {
        console.error("[useBuyerProfile] level1 submit failed", err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user?.user_id, vector?.raw_answers, subscriptionTier, logAnswers, load],
  );

  /** Manual recalibration — clears completion stamps so both batteries re-run. */
  const recalibrate = useCallback(async () => {
    if (!user?.user_id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("buyer_profile_vectors")
        .update({
          level0_completed_at: null,
          level1_completed_at: null,
          raw_answers: {},
        } as never)
        .eq("user_id", user.user_id);
      if (error) throw error;
      await load();
    } finally {
      setSaving(false);
    }
  }, [user?.user_id, load]);

  const needsLevel0 = !authLoading && isAuthenticated && !loading && !vector?.level0_completed_at;

  // Level 1 fires only on a tier change relative to the last completed battery.
  const needsLevel1 =
    !authLoading &&
    isAuthenticated &&
    !loading &&
    !!vector?.level0_completed_at &&
    (vector?.tier_at_completion ?? null) !== subscriptionTier;

  const profileVector: BuyerProfileVector | null = vector
    ? {
        userId: vector.user_id,
        role: vector.role,
        jurisdiction: vector.jurisdiction,
        latencyRequirement: vector.latency_requirement,
        weights: vector.weights,
      }
    : null;

  return {
    vector,
    profileVector,
    loading,
    saving,
    needsLevel0,
    needsLevel1,
    submitLevel0,
    submitLevel1,
    recalibrate,
    reload: load,
  };
};
