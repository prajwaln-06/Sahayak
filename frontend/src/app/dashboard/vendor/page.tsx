"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/LoadingSpinner";
import api from "@/lib/api";

interface RFQItem { id: string; booking_id: string; message: string | null; status: string; vendor_quoted_price: number | null; notes: string | null; created_at: string; }

const TABS = ["Incoming RFQs", "Active Gigs", "Earnings"];
const statusColors: Record<string, string> = { SENT: "bg-blue-50 text-blue-700", VIEWED: "bg-amber-50 text-amber-700", ACCEPTED: "bg-teal-50 text-teal-700", DECLINED: "bg-red-50 text-red-600", COUNTERED: "bg-purple-50 text-purple-700" };

export default function VendorDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState("Incoming RFQs");
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondId, setRespondId] = useState<string | null>(null);
  const [action, setAction] = useState("ACCEPTED");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { if (!authLoading && !user) router.replace("/login"); }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get("/vendors/rfq/incoming").then(r => setRfqs(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const handleRespond = async () => {
    if (!respondId) return;
    try {
      await api.post(`/vendors/rfq/${respondId}/respond`, { action, quoted_price: price ? parseFloat(price) : undefined, notes: notes || undefined });
      setRfqs(prev => prev.map(r => r.id === respondId ? { ...r, status: action, vendor_quoted_price: price ? parseFloat(price) : null } : r));
    } catch { /* ignore */ }
    setRespondId(null); setPrice(""); setNotes("");
  };

  const incoming = rfqs.filter(r => r.status === "SENT" || r.status === "VIEWED");
  const active = rfqs.filter(r => r.status === "ACCEPTED");
  const totalEarnings = active.reduce((s, r) => s + (Number(r.vendor_quoted_price) || 0), 0);
  const displayRfqs = tab === "Incoming RFQs" ? incoming : tab === "Active Gigs" ? active : [];

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0D1B2A] py-4 px-6"><div className="max-w-4xl mx-auto flex items-center justify-between"><a href="/" className="text-white font-bold text-lg">FlexiSpace</a><a href="/vendors" className="text-sm text-white/60 hover:text-white">Marketplace</a></div></header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-6">Vendor Dashboard</h1>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white text-[#0D1B2A] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{t}</button>)}
        </div>

        {tab === "Earnings" ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-500 mb-2">Total Accepted Gig Value</p>
            <p className="text-3xl font-bold text-[#0D1B2A]">₹{totalEarnings.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2">{active.length} active gig{active.length !== 1 ? "s" : ""}</p>
          </div>
        ) : displayRfqs.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-14 h-14 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <p className="text-sm text-gray-400">No {tab.toLowerCase()} yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayRfqs.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${statusColors[r.status] || "bg-gray-50 text-gray-500"}`}>{r.status}</span>
                  <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.message && <p className="text-sm text-gray-700 leading-relaxed mb-3">{r.message}</p>}
                {r.vendor_quoted_price != null && <p className="text-sm font-bold text-[#0D1B2A] mb-3">Quoted: ₹{Number(r.vendor_quoted_price).toLocaleString()}</p>}
                {(r.status === "SENT" || r.status === "VIEWED") && (
                  <div className="flex gap-2">
                    <button onClick={() => { setRespondId(r.id); setAction("ACCEPTED"); }} className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700">Accept</button>
                    <button onClick={() => { setRespondId(r.id); setAction("DECLINED"); }} className="px-4 py-2 rounded-xl text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">Decline</button>
                    <button onClick={() => { setRespondId(r.id); setAction("COUNTERED"); }} className="px-4 py-2 rounded-xl text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100">Counter</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {respondId && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-4">{action === "ACCEPTED" ? "Accept RFQ" : action === "DECLINED" ? "Decline RFQ" : "Counter Offer"}</h3>
            {action === "COUNTERED" && <><label className="text-xs text-gray-500 mb-1 block">Your price (₹)</label><input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 mb-3" /></>}
            <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setRespondId(null)} className="flex-1 py-2.5 rounded-xl text-sm bg-gray-100 text-gray-700">Cancel</button>
              <button onClick={handleRespond} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
