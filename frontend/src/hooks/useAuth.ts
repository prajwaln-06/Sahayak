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
    // #region agent log
    fetch("http://127.0.0.1:7481/ingest/d2476cbd-8cf8-42e2-adbf-9b9708ecf997",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"cfe79d"},body:JSON.stringify({sessionId:"cfe79d",runId:"baseline",hypothesisId:"H1",location:"useAuth.ts:fetchUser:start",message:"fetchUser start",data:{hasToken:!!isAuthenticated()},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      const res = await api.get("/auth/me");
      const userData = res.data as AuthUser;
      saveUser(userData);
      setUser(userData);
      // #region agent log
      fetch("http://127.0.0.1:7481/ingest/d2476cbd-8cf8-42e2-adbf-9b9708ecf997",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"cfe79d"},body:JSON.stringify({sessionId:"cfe79d",runId:"baseline",hypothesisId:"H1",location:"useAuth.ts:fetchUser:success",message:"fetchUser success",data:{userId:userData?.id||null,isAdmin:!!userData?.is_admin},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return userData;
    } catch {
      // #region agent log
      fetch("http://127.0.0.1:7481/ingest/d2476cbd-8cf8-42e2-adbf-9b9708ecf997",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"cfe79d"},body:JSON.stringify({sessionId:"cfe79d",runId:"baseline",hypothesisId:"H1",location:"useAuth.ts:fetchUser:error",message:"fetchUser failed",data:{reason:"auth_me_failed"},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return null;
    }
  }, []);

  // ── Initialize: check for existing session ─────────────────
  useEffect(() => {
    const init = async () => {
      if (!isAuthenticated()) {
        clearTokens();
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
        const fresh = await fetchUser();
        if (!fresh) {
          clearTokens();
          setUser(null);
        }
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
