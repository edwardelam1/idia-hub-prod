import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AccountType = "individual" | "business";

interface AuthUser {
  user_id: string;
  role: string;
  account_status: string;
  account_type: AccountType;
  email?: string;
}

/** In-memory PII — NEVER persisted to database or localStorage */
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
  login: (emailOrRole: string, password?: string) => Promise<void>;
  logout: () => void;
}

const mockUsers: Record<string, Partial<AuthUser>> = {
  "super-admin": { role: "super-admin", account_status: "DELT_AUTHORIZED", account_type: "business" },
  "organization-admin": { role: "organization-admin", account_status: "DELT_AUTHORIZED", account_type: "business" },
  "team-lead": { role: "team-lead", account_status: "DELT_AUTHORIZED", account_type: "business" },
  "team-member": { role: "team-member", account_status: "DELT_AUTHORIZED", account_type: "business" },
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
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  /** Fetch PII from life-pii-bridge edge function (in-memory only) */
  const fetchPiiData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("life-pii-bridge");
      if (error) {
        console.warn("PII bridge unavailable, using fallback:", error.message);
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
      console.warn("PII bridge error:", err);
      return null;
    }
  }, []);

  const fetchProfileAndSubscription = useCallback(

  useEffect(() => {
    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session && !isMockMode) {
        setTimeout(() => fetchProfileAndSubscription(session), 0);
      } else if (!session && !isMockMode) {
        setUser(null);
        setProfile(null);
        setPiiData(null); // Clear PII from memory on logout
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
        account_status: mock.account_status!,
        account_type: mock.account_type!,
      });
      setProfile({ avatar_url: null, account_type: mock.account_type! });
      setPiiData({
        displayName: emailOrRole.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        fullName: null,
        email: null,
        avatarUrl: null,
        platformGuid: null,
        source: "mock",
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
    setPiiData(null); // Clear all PII from memory
    await supabase.auth.signOut();
    localStorage.removeItem("idia_auth_token");
  }, []);

  const isBusinessAccount = user?.account_type === "business";
  const isAdminRole = ["enterprise_admin", "organization-admin", "super-admin"].includes(user?.role ?? "");

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        piiData,
        isAuthenticated: !!user,
        isBusinessAccount,
        isAdminRole,
        isLoading,
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
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
