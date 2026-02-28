import React, { createContext, useContext, useState, useCallback } from 'react';

interface AuthUser {
  user_id: string;
  role: string;
  account_status: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user?: Partial<AuthUser>) => void;
  logout: () => void;
}

const defaultUser: AuthUser = {
  user_id: 'mock-ent-9921',
  role: 'enterprise_admin',
  account_status: 'DELT_AUTHORIZED',
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

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
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
