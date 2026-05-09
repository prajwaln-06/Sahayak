"use client";

import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0D1B2A] py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">FlexiSpace</span>
        </div>
        <button
          onClick={logout}
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-2">
          Welcome{user?.full_name ? `, ${user.full_name}` : ""}!
        </h1>
        <p className="text-gray-500 mb-8">
          Your FlexiSpace dashboard — more features coming soon.
        </p>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Phone</p>
              <p className="font-medium text-gray-800">{user?.phone || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400">Email</p>
              <p className="font-medium text-gray-800">
                {user?.email || "—"}
                {user?.email && (
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${user.is_email_verified ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                    {user.is_email_verified ? "Verified" : "Unverified"}
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Role</p>
              <p className="font-medium text-gray-800">
                {user?.is_host ? "Host" : "Guest"}
              </p>
            </div>
            <div>
              <p className="text-gray-400">KYC Status</p>
              <p className="font-medium text-gray-800">{user?.kyc_status || "NONE"}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
