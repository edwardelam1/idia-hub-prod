import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

// --- TYPES & BORDERS ---
export type AccountType = "individual" | "business";
export type SubscriptionTier = "none" | "base" | "analyst" | "professional" | "enterprise";

export interface AuthUser {
  user_id: string;
  role: string;
  account_status: string;
  account_type: AccountType;
  email?: string;
}

export interface PiiData {
  displayName: string | null;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  platformGuid: string | null;
  source: "secure_enclave" | "auth_metadata_stub" | "mock";
}

interface ProfileData {
  avatar_url: string | null;
  account_type: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: ProfileData | null;
  piiData: PiiData | null;
  isAuthenticated: boolean;
  isBusinessAccount: boolean;
  isAdminRole: boolean;
  isLoading: boolean;
  subscriptionTier: SubscriptionTier;
  activePerspective: AccountType;
  switchPerspective: (type: AccountType) => void;
  login: (emailOrRole: string, password?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- HELPERS ---
const buildUserFromSession = (session: Session, subscription: any, profileData: ProfileData | null): AuthUser => {
  const tier = subscription?.tier?.toLowerCase() ?? "";
  let role = "team-member";

  // Enterprise logic grants Org Admin status
  if (tier === "enterprise") role = "organization-admin";
  // C-Suite (platform_users.platform_role) overrides tier-based role downstream.

  return {
    user_id: session.user.id,
    role,
    account_status: subscription ? "AUTHORIZED" : "PENDING",
    account_type: (profileData?.account_type as AccountType) || "individual",
    email: session.user.email,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [piiData, setPiiData] = useState<PiiData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("none");
  const [activePerspective, setActivePerspective] = useState<AccountType>("individual");

  const switchPerspective = (type: AccountType) => {
    console.log(`[PerspectiveGate] Switching to: ${type}`);
    setActivePerspective(type);
  };

  // --- ANTI-PII BRIDGE ---
  const fetchPiiData = useCallback(async (
    session: Session,
    profileRow?: { avatar_url?: string | null; platform_guid?: string | null } | null,
  ): Promise<PiiData> => {
    console.log("[PiiBridge] >>> START: Extracting PII from Auth Metadata");
    const { user: authUser } = session;

    const pii: PiiData = {
      displayName: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || "System Architect",
      fullName: authUser.user_metadata?.full_name || null,
      email: authUser.email || null,
      // Source of truth for the avatar is profiles.avatar_url
      avatarUrl: profileRow?.avatar_url || authUser.user_metadata?.avatar_url || null,
      platformGuid: profileRow?.platform_guid || authUser.user_metadata?.platform_guid || null,
      source: "auth_metadata_stub",
    };

    console.log("[PiiBridge] <<< END: PII Extraction Complete");
    return pii;
  }, []);

  // --- MAIN INITIALIZATION ENGINE ---
  const fetchProfileAndSubscription = useCallback(
    async (session: Session) => {
      console.log("[AuthGate] >>> START: Full Profile & Subscription Sync");
      try {
        let { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("avatar_url, account_type, platform_guid")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (profileError) console.error("[AuthGate] Profile fetch error:", profileError);

        // Handle race condition for new sign-ups
        if (!profileRow) {
          console.log("[AuthGate] --- RETRY: Waiting for Profile provisioning...");
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const { data: retryRow } = await supabase
            .from("profiles")
            .select("avatar_url, account_type, platform_guid")
            .eq("user_id", session.user.id)
            .maybeSingle();
          profileRow = retryRow;
        }

        // --- THE FIX: REDIRECT TO SOVEREIGN ONBOARDING ---
        if (!profileRow || !profileRow.platform_guid) {
          console.log("[AuthGate] !!! FATAL: No Sovereign Identity (platform_guid) found. Redirecting to IDIA Life.");
          window.location.href = `https://life.thebigidia.com`;
          return;
        }

        const prof: ProfileData = {
          avatar_url: profileRow.avatar_url,
          account_type: profileRow.account_type || "individual",
        };

        setProfile(prof);
        // Only 'business' explicitly flips perspective; everything else (individual,
        // god_guid, null) defaults to the individual surface.
        setActivePerspective(profileRow.account_type === "business" ? "business" : "individual");

        // Fetch Subscription
        const { data: sub } = await supabase
          .from("user_subscriptions")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const deriveTier = (subData: any): SubscriptionTier => {
          if (!subData) return "base";
          const t = subData.tier?.toLowerCase();
          return t === "enterprise" ? "enterprise" : ((t as SubscriptionTier) ?? "base");
        };

        const tier = deriveTier(sub);
        setSubscriptionTier(tier);
        const baseUser = buildUserFromSession(session, sub, prof);

        // --- C-Suite override: platform_users.platform_role = 'csuite' wins over tier
        let finalUser = baseUser;
        try {
          const { data: platformRow } = await supabase
            .from("platform_users")
            .select("platform_role")
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (platformRow?.platform_role === "csuite") {
            finalUser = { ...baseUser, role: "csuite" };
            console.log("[AuthGate] --- C-Suite operator detected: role=csuite");
          } else if (platformRow?.platform_role) {
            finalUser = { ...baseUser, role: platformRow.platform_role };
          }
        } catch (e) {
          console.warn("[AuthGate] platform_users lookup skipped:", e);
        }
        setUser(finalUser);

        const pii = await fetchPiiData(session, profileRow);
        setPiiData(pii);

        console.log(`[AuthGate] --- SUCCESS: Identity stabilized. Tier: ${tier}`);
      } catch (err) {
        console.error("[AuthGate] !!! ERROR: Auth initialization failed:", err);
      } finally {
        setIsLoading(false);
        console.log("[AuthGate] <<< END: Profile Sync Sequence Complete");
      }
    },
    [fetchPiiData],
  );

  useEffect(() => {
    console.log("[AuthGate] >>> START: Global Auth State Listener");

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthGate] --- EVENT: ${event}`);
      if (session) {
        fetchProfileAndSubscription(session).catch(console.error);
      } else {
        setUser(null);
        setProfile(null);
        setPiiData(null);
        setSubscriptionTier("none");
        setIsLoading(false);
        console.log("[AuthGate] --- SESSION: No user detected.");
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfileAndSubscription(session).catch(console.error);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      console.log("[AuthGate] <<< END: Tearing down Auth Listener");
      authSub.unsubscribe();
    };
  }, [fetchProfileAndSubscription]);

  const login = useCallback(async (emailOrRole: string, password?: string) => {
    console.log("[AuthGate] >>> START: Login Sequence");
    const { error } = await supabase.auth.signInWithPassword({
      email: emailOrRole,
      password: password!,
    });
    if (error) {
      console.error("[AuthGate] !!! ERROR: Login failed", error.message);
      throw error;
    }
    console.log("[AuthGate] <<< END: Login Successful");
  }, []);

  const logout = useCallback(async () => {
    console.log("[AuthGate] >>> START: Logout Sequence");
    setUser(null);
    setProfile(null);
    setPiiData(null);
    setSubscriptionTier("none");
    await supabase.auth.signOut();
    localStorage.removeItem("idia_auth_token");
    console.log("[AuthGate] <<< END: Logout Complete");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        piiData,
        isAuthenticated: !!user,
        isBusinessAccount: activePerspective === "business",
        isAdminRole: user?.role === "organization-admin" || user?.role === "csuite",
        isLoading,
        subscriptionTier,
        activePerspective,
        switchPerspective,
        login,
        logout,
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error("[AuthGate] !!! FATAL: useAuth must be used within an AuthProvider");
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
