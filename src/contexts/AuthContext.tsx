import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

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
  activePerspective: AccountType;
  switchPerspective: (type: AccountType) => void;
  login: (emailOrRole: string, password?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildUserFromSession = (session: Session, subscription: any, profileData: ProfileData | null): AuthUser => {
  const tier = subscription?.tier?.toLowerCase() ?? "";
  let role = "team-member";
  if (tier === "enterprise") role = "organization-admin";

  return {
    user_id: session.user.id,
    role,
    account_status: subscription ? "AUTHORIZED" : "PENDING",
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
  const [activePerspective, setActivePerspective] = useState<AccountType>("individual");

  const switchPerspective = useCallback((type: AccountType) => {
    setActivePerspective(type);
  }, []);

  // src/contexts/AuthContext.tsx

  const fetchPiiData = useCallback(async (session: Session) => {
    try {
      const { data, error } = await supabase.functions.invoke("life-pii-bridge", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("PII Bridge Error:", error);
        return null;
      }

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
      try {
        let { data: profileRow } = await supabase
          .from("profiles")
          .select("avatar_url, account_type, platform_guid")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!profileRow) {
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
          console.log("No Sovereign Identity found, redirecting to IDIA Life...");
          // Change thebigidia.com to life.thebigidia.com
          window.location.href = `https://life.thebigidia.com`;
          return;
        }

        const prof: ProfileData = {
          avatar_url: profileRow.avatar_url,
          account_type: profileRow.account_type || "business",
        };

        setProfile(prof);
        setActivePerspective((profileRow.account_type as AccountType) || "individual");

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

        setSubscriptionTier(deriveTier(sub));
        setUser(buildUserFromSession(session, sub, prof));

        const pii = await fetchPiiData(session);
        setPiiData(pii);
      } catch (err) {
        console.error("Auth init failed:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchPiiData],
  );

  useEffect(() => {
    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        fetchProfileAndSubscription(session).catch(console.error);
      } else {
        setUser(null);
        setProfile(null);
        setPiiData(null);
        setSubscriptionTier("none");
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfileAndSubscription(session).catch(console.error);
      } else {
        setIsLoading(false);
      }
    });

    return () => authSub.unsubscribe();
  }, [fetchProfileAndSubscription]);

  const login = useCallback(async (emailOrRole: string, password?: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: emailOrRole,
      password: password!,
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
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
        isBusinessAccount: activePerspective === "business",
        isAdminRole: user?.role === "organization-admin",
        isLoading,
        subscriptionTier,
        activePerspective,
        switchPerspective,
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
