import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, User } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      const { data } = await authApi.refreshToken(localStorage.getItem('refreshToken') || '');
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      const profileRes = await import('@/services/api').then((m) => m.userApi.getProfile());
      setUser(profileRes.data);
      localStorage.setItem('user', JSON.stringify(profileRes.data));
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const { data } = await authApi.login({ email, password });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Login failed. Please try again.';
      setError(message);
      throw new Error(message);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setError(null);
    try {
      const { data } = await authApi.register({ name, email, password });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Registration failed. Please try again.';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
