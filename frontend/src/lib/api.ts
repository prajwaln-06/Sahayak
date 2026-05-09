"use client";

import axios from "axios";
import { getToken } from "@/lib/auth";
import { saveTokens, clearTokens } from "@/lib/auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// ── Request interceptor: attach JWT ──────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // #region agent log
      fetch("http://127.0.0.1:7481/ingest/d2476cbd-8cf8-42e2-adbf-9b9708ecf997",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"cfe79d"},body:JSON.stringify({sessionId:"cfe79d",runId:"baseline",hypothesisId:"H2",location:"api.ts:response:401",message:"401 intercepted",data:{url:error?.config?.url||null,retrying:!!error?.config?._retry},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // Try refresh if we have a refresh token
      const refreshToken = typeof window !== "undefined"
        ? localStorage.getItem("flexispace_refresh_token")
        : null;

      if (refreshToken && error.config && !error.config._retry) {
        error.config._retry = true;
        try {
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          const { access_token, refresh_token } = res.data;
          saveTokens(access_token, refresh_token);
          // #region agent log
          fetch("http://127.0.0.1:7481/ingest/d2476cbd-8cf8-42e2-adbf-9b9708ecf997",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"cfe79d"},body:JSON.stringify({sessionId:"cfe79d",runId:"baseline",hypothesisId:"H2",location:"api.ts:refresh:success",message:"token refresh success",data:{url:error?.config?.url||null},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          error.config.headers.Authorization = `Bearer ${access_token}`;
          return api(error.config);
        } catch {
          // Refresh failed — clear tokens
          // #region agent log
          fetch("http://127.0.0.1:7481/ingest/d2476cbd-8cf8-42e2-adbf-9b9708ecf997",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"cfe79d"},body:JSON.stringify({sessionId:"cfe79d",runId:"baseline",hypothesisId:"H2",location:"api.ts:refresh:failed",message:"token refresh failed, clearing auth",data:{url:error?.config?.url||null},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          clearTokens();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
