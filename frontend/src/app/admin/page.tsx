"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

interface Stats {
  total_users: number;
  total_hosts: number;
  total_vendors: number;
  total_spaces: number;
  total_bookings: number;
  confirmed_bookings: number;
  pending_kyc: number;
  recent_bookings: any[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.is_admin) {
      router.replace("/dashboard");
      return;
    }
    
    api.get("/admin/dashboard")
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [user, authLoading, router]);

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!stats) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Nav */}
      <aside className="w-64 bg-white border-r border-gray-200 flex py-6 flex-col">
        <div className="px-6 mb-8">
           <h2 className="text-xl font-bold text-[#0D1B2A]">Admin Console</h2>
           <p className="text-xs text-teal-600 mt-1">FlexiSpace Ops</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <Link href="/admin" className="flex text-sm font-medium items-center px-3 py-2 bg-teal-50 text-teal-700 rounded-xl">❖ Dashboard</Link>
          <Link href="/admin/users" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">👥 Users</Link>
          <Link href="/admin/kyc" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">📑 KYC Queue</Link>
          <Link href="/admin/spaces" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">🏢 Spaces</Link>
          <Link href="/admin/bookings" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">📅 Bookings</Link>
          <Link href="/admin/demo-tools" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">⚙️ Demo Tools</Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-6">Dashboard Overview</h1>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border-t-4 border-blue-500 shadow-sm flex flex-col">
            <span className="text-blue-500 font-bold mb-2">👤</span>
            <span className="text-gray-500 text-sm font-medium">Total Users</span>
            <span className="text-3xl font-bold text-gray-900">{stats.total_users}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border-t-4 border-green-500 shadow-sm flex flex-col">
            <span className="text-green-500 font-bold mb-2">🏠</span>
            <span className="text-gray-500 text-sm font-medium">Total Hosts</span>
            <span className="text-3xl font-bold text-gray-900">{stats.total_hosts}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border-t-4 border-purple-500 shadow-sm flex flex-col">
            <span className="text-purple-500 font-bold mb-2">📅</span>
            <span className="text-gray-500 text-sm font-medium">Total Bookings</span>
            <span className="text-3xl font-bold text-gray-900">{stats.total_bookings}</span>
          </div>
          <div className="bg-white p-6 rounded-2xl border-t-4 border-orange-500 shadow-sm flex flex-col">
            <span className="text-orange-500 font-bold mb-2">⏳</span>
            <span className="text-gray-500 text-sm font-medium">Pending KYC</span>
            <span className="text-3xl font-bold text-gray-900">{stats.pending_kyc}</span>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Bookings</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3 border-b">Space</th>
                <th className="px-6 py-3 border-b">Renter</th>
                <th className="px-6 py-3 border-b">Date</th>
                <th className="px-6 py-3 border-b">Amount</th>
                <th className="px-6 py-3 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_bookings.map((b) => (
                <tr key={b.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{b.space_title}</td>
                  <td className="px-6 py-4 text-gray-600">{b.renter_name}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-[#0D1B2A]">₹{b.total_amount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      b.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                      b.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}