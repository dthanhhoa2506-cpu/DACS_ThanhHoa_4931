/**
 * src/contexts/AuthContext.jsx
 * ─────────────────────────────
 * Global auth state: user info, token, login/logout helpers.
 * Đọc từ localStorage khi khởi động để duy trì session qua refresh.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);

const API = 'http://127.0.0.1:8000';

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); }
    catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || null);

  // Keep localStorage in sync whenever state changes
  useEffect(() => {
    if (token) localStorage.setItem('auth_token', token);
    else        localStorage.removeItem('auth_token');
  }, [token]);

  useEffect(() => {
    if (user)  localStorage.setItem('auth_user', JSON.stringify(user));
    else       localStorage.removeItem('auth_user');
  }, [user]);

  /**
   * login({ username, password }) → throws on failure
   * Returns the response payload on success.
   */
  const login = useCallback(async ({ username, password }) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Đăng nhập thất bại');

    setToken(data.access_token);
    setUser({ username: data.username, role: data.role });
    return data;
  }, []);

  /**
   * logout() — calls POST /auth/logout (best-effort) then clears local state.
   */
  const logout = useCallback(async () => {
    if (token) {
      try {
        await fetch(`${API}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore network errors on logout */ }
    }
    setToken(null);
    setUser(null);
  }, [token]);

  const isAdmin = useCallback(() => user?.role === 'admin', [user]);

  /**
   * authFetch(url, options) — fetch wrapper that injects Bearer token if logged in.
   */
  const authFetch = useCallback((url, options = {}) => {
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
