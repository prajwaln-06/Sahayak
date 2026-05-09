"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/LoadingSpinner";
import api from "@/lib/api";

interface BookingItem {
  id: string;
  space_id: string;
  start_datetime: string;
  end_datetime: string;
  event_name: string | null;
  status: string;
  total_amount: number;
  created_at: string;
}

const TABS = ["Upcoming", "Past", "Cancelled"];

export default function MyBookingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Upcoming");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/bookings/my", { params: { page_size: 100 } });
        setBookings(res.data.bookings || []);
      } catch { /* ignore */ }
      setLoading(false);
    };
    if (user) load();
  }, [user]);

  const now = new Date();
  const filtered = bookings.filter((b) => {
    if (tab === "Cancelled") return b.status === "CANCELLED";
    if (tab === "Past") return b.status !== "CANCELLED" && new Date(b.end_datetime) < now;
    return b.status !== "CANCELLED" && new Date(b.end_datetime) >= now;
  });

  const handleCancel = async () => {
    if (!cancelId) return;
    setCancelling(true);
    try {
      await api.post(`/bookings/${cancelId}/cancel`);
      setBookings((prev) => prev.map((b) => b.id === cancelId ? { ...b, status: "CANCELLED" } : b));
    } catch { /* ignore */ }
    setCancelId(null);
    setCancelling(false);
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0D1B2A] py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="text-white font-bold text-lg">FlexiSpace</a>
          <a href="/dashboard" className="text-sm text-white/60 hover:text-white">Dashboard</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-6">My Bookings</h1>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t ? "bg-white text-[#0D1B2A] shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>{t}</button>
          ))}
        </div>

        {/* Booking cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-14 h-14 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-400">No {tab.toLowerCase()} bookings</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => {
              const startDate = new Date(b.start_datetime);
              const statusColors: Record<string, string> = {
                CONFIRMED: "bg-teal-50 text-teal-700",
                CANCELLED: "bg-red-50 text-red-600",
                DRAFT: "bg-gray-50 text-gray-600",
              };

              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-50 to-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{b.event_name || "Booking"}</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusColors[b.status] || "bg-gray-50 text-gray-500"}`}>
                        {b.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {startDate.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                      {" · "}
                      {startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[#0D1B2A]">₹{Number(b.total_amount).toLocaleString()}</p>
                    {b.status === "CONFIRMED" && tab === "Upcoming" && (
                      <button onClick={() => setCancelId(b.id)} className="text-[10px] text-red-500 hover:text-red-700 mt-1">Cancel</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cancel modal */}
      {cancelId && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-2">Cancel Booking?</h3>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">Keep Booking</button>
              <button onClick={handleCancel} disabled={cancelling} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
