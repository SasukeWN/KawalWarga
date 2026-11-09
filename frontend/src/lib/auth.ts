"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "./api/auth";
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "./api/client";
import type { LoginPayload, User } from "./types";

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  isReady: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      const savedUserRaw = window.localStorage.getItem(USER_STORAGE_KEY);
      if (savedToken && savedUserRaw) {
        const parsedUser = JSON.parse(savedUserRaw) as User;
        if (parsedUser && parsedUser.email && parsedUser.role) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setToken(savedToken);
          setUser(parsedUser);
        }
      }
    } catch {
      // Abaikan bila data localStorage rusak
    } finally {
      setIsReady(true);
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<User> => {
    const res = await authApi.login(payload);
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, res.token);
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    } catch {
      // Abaikan bila localStorage penuh/diblokir
    }
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Tetap bersihkan sesi lokal meskipun request logout gagal
    }
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // Abaikan
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isReady,
      login,
      logout,
    }),
    [user, token, isReady, login, logout]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam <AuthProvider>.");
  }
  return context;
}
