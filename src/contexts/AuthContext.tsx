import React, { createContext, useContext, useState, useCallback } from 'react';

export type AccountType = 'individual' | 'business';

interface AuthUser {
  user_id: string;
  role: string;
  account_status: string;
  account_type: AccountType;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBusinessAccount: boolean;
  isAdminRole: boolean;
  login: (user?: Partial<AuthUser>) => void;
  logout: () => void;
}

const defaultUser: AuthUser = {
  user_id: 'mock-ent-9921',
  role: 'enterprise_admin',
  account_status: 'DELT_AUTHORIZED',
  account_type: 'business',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(defaultUser);

  const login = useCallback((overrides?: Partial<AuthUser>) => {
    setUser({ ...defaultUser, ...overrides });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('idia_auth_token');
  }, []);

  const isBusinessAccount = user?.account_type === 'business';
  const isAdminRole = ['enterprise_admin', 'organization-admin', 'super-admin'].includes(user?.role ?? '');

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isBusinessAccount, isAdminRole, login, logout }}>
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
