"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import PriceBreakdown from "@/components/PriceBreakdown";
import LoadingSpinner from "@/components/LoadingSpinner";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface SpaceInfo {
  id: string;
  title: string;
  city: string;
  thumbnail_url: string | null;
  base_price_hourly: number;
  weekend_multiplier: number;
  surge_enabled: boolean;
  capacity_seated: number | null;
}

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const spaceId = params.id as string;

  const [space, setSpace] = useState<SpaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [hours, setHours] = useState(2);
  const [capacity, setCapacity] = useState(20);
  const [eventName, setEventName] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [specialReqs, setSpecialReqs] = useState("");

  // Pricing
  const [pricing, setPricing] = useState<{
    hours: number; base_price: number; weekend_applied: boolean;
    surge_applied: boolean; platform_fee: number; gst: number; total: number;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    api.get(`/listings/${spaceId}`).then((r) => setSpace(r.data)).catch(() => setError("Space not found")).finally(() => setLoading(false));
  }, [spaceId]);

  // Live pricing
  const updatePricing = useCallback(async () => {
    if (!space || !date) return;
    try {
      const [h, m] = startTime.split(":").map(Number);
      const start = new Date(`${date}T${startTime}:00`);
      const end = new Date(start.getTime() + hours * 3600000);
      const res = await api.post("/listings/calculate-price", {
        space_id: space.id,
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        demand_factor: 1.0,
      });
      setPricing(res.data);
    } catch {
      // Local fallback
      if (space) {
        const base = space.base_price_hourly * hours;
        const pf = +(base * 0.12).toFixed(2);
        const gst = +((base + pf) * 0.18).toFixed(2);
        setPricing({ hours, base_price: base, weekend_applied: false, surge_applied: false, platform_fee: pf, gst, total: +(base + pf + gst).toFixed(2) });
      }
    }
  }, [space, date, startTime, hours]);

  useEffect(() => { updatePricing(); }, [updatePricing]);

  const handleSubmit = async () => {
    if (!date || !space) return;
    setSubmitting(true);
    setError("");

    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(start.getTime() + hours * 3600000);

    try {
      const res = await api.post("/bookings/", {
        space_id: space.id,
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        capacity_requested: capacity,
        event_name: eventName || undefined,
        event_description: eventDesc || undefined,
        special_requirements: specialReqs || undefined,
      });
      router.push(`/book/${spaceId}/success?booking_id=${res.data.id}`);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { detail?: string } } };
      setError(axErr.response?.data?.detail || "Booking failed.");
      setSubmitting(false);
    }
  };

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner size="lg" /></div>;
  if (!space) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">{error || "Space not found"}</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0D1B2A] py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/" className="text-white font-bold text-lg">FlexiSpace</a>
          <a href={`/spaces/${spaceId}`} className="text-sm text-white/60 hover:text-white">&larr; Back to space</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-6">Complete Your Booking</h1>

        {error && <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Form */}
          <div className="flex-1 space-y-6">
            {/* Space card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
              <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                {space.thumbnail_url ? (
                  <img src={space.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{space.title}</h3>
                <p className="text-xs text-gray-500">{space.city}</p>
                <p className="text-sm font-bold text-[#0D1B2A] mt-1">₹{space.base_price_hourly.toLocaleString()}/hr</p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">Date & Time</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Date *</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start time</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Duration: {hours}h</label>
                <input type="range" min={1} max={12} value={hours} onChange={(e) => setHours(+e.target.value)} className="w-full accent-teal-600" />
              </div>
            </div>

            {/* Event details */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">Event Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Guests</label>
                  <input type="number" value={capacity} onChange={(e) => setCapacity(+e.target.value)} min={1}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Event name</label>
                  <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Team offsite"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500" />
                </div>
              </div>
              <textarea placeholder="Tell the host about your event..." value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 resize-none" />
              <textarea placeholder="Special requirements (optional)" value={specialReqs} onChange={(e) => setSpecialReqs(e.target.value)} rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 resize-none" />
            </div>
          </div>

          {/* Right: Pricing + CTA */}
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="sticky top-20 space-y-4">
              {pricing && (
                <PriceBreakdown hours={pricing.hours} basePrice={pricing.base_price} weekendApplied={pricing.weekend_applied}
                  surgeApplied={pricing.surge_applied} platformFee={pricing.platform_fee} gst={pricing.gst} total={pricing.total} />
              )}
              <button onClick={handleSubmit} disabled={!date || submitting}
                className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  date ? "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 active:scale-[0.98]" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}>
                {submitting ? <><LoadingSpinner size="sm" className="border-gray-400 border-t-white" /> Confirming...</> : "Confirm Booking"}
              </button>
              <p className="text-[10px] text-gray-400 text-center">No payment required — booking is confirmed instantly</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
