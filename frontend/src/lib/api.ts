"use client";

import axios from "axios";
import { getToken } from "@/lib/auth";

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
          localStorage.setItem("flexispace_token", access_token);
          localStorage.setItem("flexispace_refresh_token", refresh_token);
          error.config.headers.Authorization = `Bearer ${access_token}`;
          return api(error.config);
        } catch {
          // Refresh failed — clear tokens
          localStorage.removeItem("flexispace_token");
          localStorage.removeItem("flexispace_refresh_token");
          document.cookie = "flexispace_auth=; path=/; max-age=0";
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
