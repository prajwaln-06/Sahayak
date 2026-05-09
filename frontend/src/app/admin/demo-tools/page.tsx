"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

export default function AdminDemoToolsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.is_admin) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleDemoReset = async () => {
    if (!confirm("Are you absolutely sure? This will delete ALL bookings and chat messages! Users and Spaces will remain.")) return;
    
    setResetting(true);
    try {
      const res = await api.post("/admin/demo-reset");
      alert(`Reset Success! Items cleared:\nBookings: ${res.data.deleted_bookings}\nChat Messages: ${res.data.deleted_messages}`);
    } catch {
      alert("Failed to run demo reset.");
    } finally {
      setResetting(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex py-6 flex-col shrink-0">
        <div className="px-6 mb-8">
           <h2 className="text-xl font-bold text-[#0D1B2A]">Admin Console</h2>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <Link href="/admin" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">❖ Dashboard</Link>
          <Link href="/admin/users" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">👥 Users</Link>
          <Link href="/admin/kyc" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">📑 KYC Queue</Link>
          <Link href="/admin/spaces" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">🏢 Spaces</Link>
          <Link href="/admin/bookings" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">📅 Bookings</Link>
          <Link href="/admin/demo-tools" className="flex text-sm font-medium items-center px-3 py-2 bg-teal-50 text-teal-700 rounded-xl">⚙️ Demo Tools</Link>
        </nav>
      </aside>

      <div className="flex-1 overflow-auto p-8 relative">
        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-8">Demo Tools & System Health</h1>

        <div className="max-w-2xl bg-white border border-red-100 rounded-2xl p-6 shadow-sm">
           <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                 <span className="text-red-500 text-xl">⚠️</span>
              </div>
              <div>
                  <h3 className="text-lg font-bold text-gray-900">Soft Reset (Demo Prep)</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-4">
                    Use this button <strong>right before presentations or recordings.</strong> It completely flushes the `bookings` and `chat_messages` tables while keeping users, spaces, and vectors intact. This lets you re-record flows smoothly.
                  </p>
                  <button 
                    onClick={handleDemoReset}
                    disabled={resetting}
                    className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50"
                  >
                    {resetting ? "Resetting DB..." : "Run Soft Reset"}
                  </button>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}