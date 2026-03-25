import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Force explicit sign-in on every fresh app load.
  useEffect(() => {
    localStorage.removeItem('jansewa_token');
    localStorage.removeItem('jansewa_user');
    setUser(null);
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('jansewa_token', data.access_token);
    // Fetch full user profile
    const { data: profile } = await authAPI.me();
    setUser(profile);
    localStorage.setItem('jansewa_user', JSON.stringify(profile));
    return profile;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authAPI.register(payload);
    return data;
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const { data } = await authAPI.updateMe(payload);
    setUser(data);
    localStorage.setItem('jansewa_user', JSON.stringify(data));
    return data;
  }, []);

  const forgotPassword = useCallback(async (payload) => {
    const { data } = await authAPI.forgotPassword(payload);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('jansewa_token');
    localStorage.removeItem('jansewa_user');
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles) => user && roles.includes(user.role),
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, forgotPassword, updateProfile, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
