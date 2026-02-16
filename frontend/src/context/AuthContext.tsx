import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthResultDto } from '../types/auth';

interface AuthContextType {
  user: AuthResultDto | null;
  login: (token: string, userData: AuthResultDto) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getInitialUser(): AuthResultDto | null {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  if (token && userData) return JSON.parse(userData) as AuthResultDto;
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthResultDto | null>(getInitialUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 0);
    return () => clearTimeout(t);
  }, []);

  const login = (token: string, userData: AuthResultDto) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook is intentionally exported from same file as provider
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
