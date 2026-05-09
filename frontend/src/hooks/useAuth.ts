"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  AuthUser,
  saveTokens,
  saveUser,
  getUser,
  clearTokens,
  isAuthenticated,
} from "@/lib/auth";

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // ── Fetch user profile from API ────────────────────────────
  const fetchUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const res = await api.get("/auth/me");
      const userData = res.data as AuthUser;
      saveUser(userData);
      setUser(userData);
      return userData;
    } catch {
      return null;
    }
  }, []);

  // ── Initialize: check for existing session ─────────────────
  useEffect(() => {
    const init = async () => {
      if (!isAuthenticated()) {
        setIsLoading(false);
        return;
      }
      // Try cached user first
      const cached = getUser();
      if (cached) {
        setUser(cached);
        setIsLoading(false);
        // Refresh in background
        fetchUser();
      } else {
        await fetchUser();
        setIsLoading(false);
      }
    };
    init();
  }, [fetchUser]);

  // ── Login: save tokens + fetch user ────────────────────────
  const login = useCallback(
    async (accessToken: string, refreshToken: string): Promise<AuthUser> => {
      saveTokens(accessToken, refreshToken);
      const userData = await fetchUser();
      if (!userData) {
        throw new Error("Failed to fetch user profile after login");
      }
      return userData;
    },
    [fetchUser]
  );

  // ── Logout: clear everything + redirect ────────────────────
  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    router.push("/login");
  }, [router]);

  // ── Refresh user data ──────────────────────────────────────
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return {
    user,
    isLoading,
    isLoggedIn: !!user,
    login,
    logout,
    refreshUser,
  };
}
