/**
 * FlexiSpace — Auth Utilities
 * Token management via localStorage + cookie flag for middleware.
 */

export interface AuthUser {
  id: string;
  phone: string;
  email: string | null;
  full_name: string | null;
  is_phone_verified: boolean;
  is_email_verified: boolean;
  is_host: boolean;
  is_admin: boolean;
  trust_score: number;
  kyc_status: string;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

// ── Token Storage ────────────────────────────────────────────

export function saveTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("flexispace_token", accessToken);
  localStorage.setItem("flexispace_refresh_token", refreshToken);
  // Set cookie so Next.js middleware can detect auth status
  document.cookie = `flexispace_auth=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("flexispace_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("flexispace_refresh_token");
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("flexispace_token");
  localStorage.removeItem("flexispace_refresh_token");
  localStorage.removeItem("flexispace_user");
  document.cookie = "flexispace_auth=; path=/; max-age=0";
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ── User Cache ───────────────────────────────────────────────

export function saveUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("flexispace_user", JSON.stringify(user));
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("flexispace_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
