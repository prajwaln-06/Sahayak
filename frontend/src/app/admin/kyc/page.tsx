"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

export default function AdminKYCPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadQueue = async () => {
    try {
      const res = await api.get("/admin/kyc/queue");
      setQueue(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user?.is_admin) {
      router.replace("/dashboard");
      return;
    }
    loadQueue();
  }, [user, authLoading, router]);

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/admin/kyc/${id}/approve`);
      alert("KYC Approved ✅");
      loadQueue();
    } catch {
      alert("Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    try {
      await api.post(`/admin/kyc/${rejectingId}/reject`, { reason: rejectReason });
      alert("KYC Rejected");
      setRejectingId(null);
      setRejectReason("");
      loadQueue();
    } catch {
      alert("Failed to reject");
    }
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex py-6 flex-col shrink-0">
        <div className="px-6 mb-8">
           <h2 className="text-xl font-bold text-[#0D1B2A]">Admin Console</h2>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <Link href="/admin" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">❖ Dashboard</Link>
          <Link href="/admin/users" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">👥 Users</Link>
          <Link href="/admin/kyc" className="flex text-sm font-medium items-center px-3 py-2 bg-teal-50 text-teal-700 rounded-xl">📑 KYC Queue</Link>
          <Link href="/admin/spaces" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">🏢 Spaces</Link>
          <Link href="/admin/bookings" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">📅 Bookings</Link>
          <Link href="/admin/demo-tools" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">⚙️ Demo Tools</Link>
        </nav>
      </aside>

      <div className="flex-1 overflow-auto p-8 relative">
        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-6">KYC Verification Queue</h1>

        {queue.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center">
            <span className="text-5xl mb-4">🎉</span>
            <p className="text-lg font-medium text-gray-900 tracking-tight">No pending KYC reviews</p>
            <p className="text-sm text-gray-500 mt-1">Inbox zero achieved.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-3 border-b">Name</th>
                  <th className="px-6 py-3 border-b">Phone</th>
                  <th className="px-6 py-3 border-b">Submitted Date</th>
                  <th className="px-6 py-3 border-b text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((u) => (
                  <tr key={u.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{u.full_name || "Unknown"}</td>
                    <td className="px-6 py-4 text-gray-600">{u.phone}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                       <button onClick={() => setRejectingId(u.id)} className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">Reject</button>
                       <button onClick={() => handleApprove(u.id)} className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg">Approve</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Reject Modal */}
        {rejectingId && (
           <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                <h3 className="text-lg font-bold mb-4">Reject KYC</h3>
                <textarea 
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (sent to user)..."
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-500 resize-none h-24 mb-4"
                />
                <div className="flex gap-2 justify-end">
                   <button onClick={() => setRejectingId(null)} className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                   <button onClick={handleReject} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700">Confirm Reject</button>
                </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}