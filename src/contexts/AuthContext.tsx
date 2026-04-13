import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

// --- Types & Interfaces ---
export type AccountType = "individual" | "business";
export type SubscriptionTier = "none" | "base" | "analyst" | "professional" | "enterprise";

interface AuthUser {
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
  login: (emailOrRole: string, password?: string) => Promise<void>;
  logout: () => void;
}

const mockUsers: Record<string, Partial<AuthUser>> = {
  "super-admin": { role: "super-admin", account_status: "DELT_AUTHORIZED", account_type: "business" },
  "organization-admin": { role: "organization-admin", account_status: "DELT_AUTHORIZED", account_type: "business" },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildUserFromSession = (session: Session, subscription: any, profileData: ProfileData | null): AuthUser => {
  const tier = subscription?.tier?.toLowerCase() ?? "";
  let role = "team-member";
  if (["enterprise", "pure_alpha"].includes(tier)) role = "organization-admin";

  return {
    user_id: session.user.id,
    role,
    account_status: subscription ? "DELT_AUTHORIZED" : "PENDING",
    account_type: (profileData?.account_type as AccountType) || "business",
    email: session.user.email,
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [piiData, setPiiData] = useState<PiiData | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>("none");
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  const fetchPiiData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("life-pii-bridge");
      if (error) return null;
      return {
        displayName: data.display_name ?? null,
        fullName: data.full_name ?? null,
        email: data.email ?? null,
        avatarUrl: data.avatar_url ?? null,
        platformGuid: data.platform_guid ?? null,
        source: data.source ?? "auth_metadata_stub",
      } as PiiData;
    } catch (err) {
      return null;
    }
  }, []);

  const fetchProfileAndSubscription = useCallback(
    async (session: Session) => {
      // 1. Initial Profile Fetch
      let { data: profileRow } = await supabase
        .from("profiles")
        .select("avatar_url, account_type, platform_guid")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // 2. Anti-Race-Condition Check (Wait for DB Trigger)
      if (!profileRow) {
        console.warn("Profile check 1 failed. Waiting 1.5s for database trigger...");
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const retryFetch = await supabase
          .from("profiles")
          .select("avatar_url, account_type, platform_guid")
          .eq("user_id", session.user.id)
          .maybeSingle();

        profileRow = retryFetch.data;
      }

      // 3. IRONCLAD GATEKEEPER — EXTREME GOLDEN RULE
      // No self-healing allowed. If it's missing, they didn't come from IDIA Life.
      if (!profileRow || !profileRow.platform_guid) {
        console.error("EXTREME GOLDEN RULE VIOLATION: No verified profile. Terminating session.");
        await supabase.auth.signOut();
        localStorage.removeItem("idia_auth_token");
        window.location.href = "https://life.thebigidia.com";
        return;
      }

      const prof: ProfileData = {
        avatar_url: profileRow.avatar_url,
        account_type: profileRow.account_type || "business",
      };
      setProfile(prof);

      // 4. Subscription & Tier Logic
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
        if (["pure_alpha", "enterprise"].includes(t)) return "enterprise";
        return (t as SubscriptionTier) ?? "base";
      };

      setSubscriptionTier(deriveTier(sub));
      setUser(buildUserFromSession(session, sub, prof));

      const pii = await fetchPiiData();
      setPiiData(pii);
    },
    [fetchPiiData],
  );

  useEffect(() => {
    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && !isMockMode) {
        setTimeout(() => fetchProfileAndSubscription(session), 0);
      } else if (!session && !isMockMode) {
        setUser(null);
        setProfile(null);
        setPiiData(null);
        setSubscriptionTier("none");
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfileAndSubscription(session);
      } else {
        setIsLoading(false);
      }
    });

    return () => authSub.unsubscribe();
  }, [fetchProfileAndSubscription, isMockMode]);

  const login = useCallback(async (emailOrRole: string, password?: string) => {
    if (!password && mockUsers[emailOrRole]) {
      setIsMockMode(true);
      const mock = mockUsers[emailOrRole];
      setUser({
        user_id: `mock-${emailOrRole}`,
        role: mock.role!,
        account_status: "DELT_AUTHORIZED",
        account_type: "business",
      });
      return;
    }
    setIsMockMode(false);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailOrRole,
      password: password!,
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    setIsMockMode(false);
    setUser(null);
    setProfile(null);
    setPiiData(null);
    setSubscriptionTier("none");
    await supabase.auth.signOut();
    localStorage.removeItem("idia_auth_token");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        piiData,
        isAuthenticated: !!user,
        isBusinessAccount: user?.account_type === "business",
        isAdminRole: ["enterprise_admin", "organization-admin", "super-admin"].includes(user?.role ?? ""),
        isLoading,
        subscriptionTier,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
