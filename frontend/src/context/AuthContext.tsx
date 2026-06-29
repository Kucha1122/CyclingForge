import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthResultDto } from '../types/auth';
import { tokenStorage } from '../services/tokenStorage';
import api from '../services/api';

interface AuthContextType {
  user: AuthResultDto | null;
  login: (result: AuthResultDto, rememberMe: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getInitialUser(): AuthResultDto | null {
  return tokenStorage.getToken() ? tokenStorage.getUser() : null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthResultDto | null>(getInitialUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 0);
    return () => clearTimeout(t);
  }, []);

  const login = (result: AuthResultDto, rememberMe: boolean) => {
    tokenStorage.setSession(result, rememberMe);
    setUser(result);
  };

  const logout = () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      // Revoke server-side; ignore failures (token may already be invalid).
      api.post('/users/logout', { refreshToken }, { silentError: true }).catch(() => {});
    }
    tokenStorage.clear();
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
