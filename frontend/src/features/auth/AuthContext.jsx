import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authenticateUser, getCurrentUser, logoutUser } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ status: 'loading', user: null });
  const operation = useRef(0);
  const clearSession = useCallback(() => {
    operation.current += 1;
    setSession({ status: 'anonymous', user: null });
  }, []);
  const restoreSession = useCallback(async () => {
    try {
      return { status: 'authenticated', user: await getCurrentUser() };
    } catch (error) {
      return { status: error.status === 401 ? 'anonymous' : 'error', user: null };
    }
  }, []);
  useEffect(() => {
    let active = true;
    const current = ++operation.current;
    restoreSession().then((next) => {
      if (active && current === operation.current) setSession(next);
    });
    return () => {
      active = false;
    };
  }, [restoreSession]);
  const retry = useCallback(async () => {
    const current = ++operation.current;
    setSession({ status: 'loading', user: null });
    const next = await restoreSession();
    if (current === operation.current) setSession(next);
  }, [restoreSession]);
  const authenticate = useCallback(async (mode, credentials) => {
    const user = await authenticateUser(mode, credentials);
    operation.current += 1;
    setSession({ status: 'authenticated', user });
    return user;
  }, []);
  const logout = useCallback(async () => {
    await logoutUser();
    clearSession();
  }, [clearSession]);
  return (
    <AuthContext.Provider value={{ ...session, authenticate, logout, retry, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used within AuthProvider');
  return auth;
}
