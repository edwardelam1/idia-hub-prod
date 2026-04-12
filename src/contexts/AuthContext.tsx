import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type AccountType = 'individual' | 'business';

interface AuthUser {
  user_id: string;
  role: string;
  account_status: string;
  account_type: AccountType;
  email?: string;
}

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: ProfileData | null;
  isAuthenticated: boolean;
  isBusinessAccount: boolean;
  isAdminRole: boolean;
  isLoading: boolean;
  login: (emailOrRole: string, password?: string) => Promise<void>;
  logout: () => void;
}

const mockUsers: Record<string, Partial<AuthUser>> = {
  'super-admin': { role: 'super-admin', account_status: 'DELT_AUTHORIZED', account_type: 'business' },
  'organization-admin': { role: 'organization-admin', account_status: 'DELT_AUTHORIZED', account_type: 'business' },
  'team-lead': { role: 'team-lead', account_status: 'DELT_AUTHORIZED', account_type: 'business' },
  'team-member': { role: 'team-member', account_status: 'DELT_AUTHORIZED', account_type: 'business' },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildUserFromSession = (session: Session, subscription: any, profileData: ProfileData | null): AuthUser => {
  const tier = subscription?.tier?.toLowerCase() ?? '';
  let role = 'team-member';
  if (['enterprise', 'pure_alpha'].includes(tier)) role = 'organization-admin';

  return {
    user_id: session.user.id,
    role,
    account_status: subscription ? 'DELT_AUTHORIZED' : 'PENDING',
    account_type: (profileData?.account_type as AccountType) || 'business',
    email: session.user.email,
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  const fetchProfileAndSubscription = useCallback(async (session: Session) => {
    // Fetch profile
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, account_type')
      .eq('user_id', session.user.id)
      .maybeSingle();

    const prof: ProfileData = profileRow ?? {
      display_name: session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? null,
      avatar_url: null,
      account_type: 'business',
    };
    setProfile(prof);

    // Fetch subscription
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setUser(buildUserFromSession(session, sub, prof));
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session && !isMockMode) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchProfileAndSubscription(session), 0);
        } else if (!session && !isMockMode) {
          setUser(null);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    // Then check existing session
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
    // If it's a mock role (no password), use mock mode
    if (!password && mockUsers[emailOrRole]) {
      setIsMockMode(true);
      const mock = mockUsers[emailOrRole];
      setUser({
        user_id: `mock-${emailOrRole}`,
        role: mock.role!,
        account_status: mock.account_status!,
        account_type: mock.account_type!,
      });
      setProfile({ display_name: null, avatar_url: null, account_type: mock.account_type! });
      return;
    }

    // Real Supabase auth
    setIsMockMode(false);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailOrRole,
      password: password!,
    });
    if (error) throw error;
    // onAuthStateChange will handle the rest
  }, []);

  const logout = useCallback(async () => {
    setIsMockMode(false);
    setUser(null);
    setProfile(null);
    await supabase.auth.signOut();
    localStorage.removeItem('idia_auth_token');
  }, []);

  const isBusinessAccount = user?.account_type === 'business';
  const isAdminRole = ['enterprise_admin', 'organization-admin', 'super-admin'].includes(user?.role ?? '');

  return (
    <AuthContext.Provider value={{ user, profile, isAuthenticated: !!user, isBusinessAccount, isAdminRole, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
