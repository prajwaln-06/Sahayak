"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import SpaceMediaViewer from "@/components/SpaceMediaViewer";
import PriceBreakdown from "@/components/PriceBreakdown";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import AmenityGrid from "@/components/AmenityGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import api from "@/lib/api";

interface SpaceDetail {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  space_type: string;
  address: string;
  city: string;
  neighbourhood: string | null;
  lat: number | null;
  lng: number | null;
  capacity_seated: number | null;
  capacity_standing: number | null;
  amenities: string[];
  rules: Record<string, string> | null;
  base_price_hourly: number;
  base_price_daily: number | null;
  weekend_multiplier: number;
  surge_enabled: boolean;
  surge_multiplier: number;
  min_booking_hours: number;
  instant_book: boolean;
  is_active: boolean;
  is_3d_generated: boolean;
  thumbnail_url: string | null;
  photo_urls: string[];
  mesh_url: string | null;
  video_url: string | null;
  rating_avg: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

interface PricingResult {
  hours: number;
  base_price: number;
  weekend_applied: boolean;
  surge_applied: boolean;
  platform_fee: number;
  gst: number;
  total: number;
}

const typeLabels: Record<string, string> = {
  CONFERENCE_ROOM: "Conference Room", STUDIO: "Studio", ROOFTOP: "Rooftop",
  GARDEN: "Garden", GALLERY: "Gallery", RESTAURANT: "Restaurant",
  WAREHOUSE: "Warehouse", OTHER: "Other",
};

export default function SpaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;

  const [space, setSpace] = useState<SpaceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPhoto, setCurrentPhoto] = useState(0);

  // Booking / pricing state
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [bookingHours, setBookingHours] = useState(2);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  // Fetch space
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/listings/${spaceId}`);
        setSpace(res.data);
      } catch {
        setError("Space not found.");
      } finally {
        setIsLoading(false);
      }
    };
    if (spaceId) load();
  }, [spaceId]);

  // Fetch blocked dates for current month
  const fetchAvailability = useCallback(async (year: number, month: number) => {
    try {
      const m = `${year}-${String(month).padStart(2, "0")}`;
      const res = await api.get(`/listings/${spaceId}/availability`, { params: { month: m } });
      setBlockedDates(res.data.map((b: { blocked_date: string }) => b.blocked_date));
    } catch {
      // ignore
    }
  }, [spaceId]);

  useEffect(() => {
    const now = new Date();
    fetchAvailability(now.getFullYear(), now.getMonth() + 1);
  }, [fetchAvailability]);

  // Calculate pricing
  const calculatePrice = useCallback(async () => {
    if (!space || !selectedStart) return;
    setPricingLoading(true);
    try {
      const startDt = new Date(`${selectedStart}T10:00:00`);
      const endDt = new Date(startDt.getTime() + bookingHours * 60 * 60 * 1000);
      const res = await api.post("/listings/calculate-price", {
        space_id: space.id,
        start_datetime: startDt.toISOString(),
        end_datetime: endDt.toISOString(),
        demand_factor: 1.0,
      });
      setPricing(res.data);
    } catch {
      // fallback local calc
      const base = space.base_price_hourly * bookingHours;
      setPricing({
        hours: bookingHours, base_price: base, weekend_applied: false,
        surge_applied: false, platform_fee: +(base * 0.12).toFixed(2),
        gst: +((base + base * 0.12) * 0.18).toFixed(2),
        total: +(base + base * 0.12 + (base + base * 0.12) * 0.18).toFixed(2),
      });
    } finally {
      setPricingLoading(false);
    }
  }, [space, selectedStart, bookingHours]);

  useEffect(() => { if (selectedStart) calculatePrice(); }, [selectedStart, bookingHours, calculatePrice]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner size="lg" /></div>;
  if (error || !space) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <p className="text-gray-500 mb-4">{error || "Space not found"}</p>
      <button onClick={() => router.push("/spaces")} className="text-sm text-teal-600 hover:underline">Browse spaces</button>
    </div>
  );

  const photos = space.photo_urls.length > 0 ? space.photo_urls : [space.thumbnail_url].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0D1B2A] py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="text-white font-bold text-lg">FlexiSpace</a>
          <a href="/spaces" className="text-sm text-white/60 hover:text-white transition-colors">&larr; Back to spaces</a>
        </div>
      </header>

      {/* Hero Media Viewer */}
      <div className="bg-black/5">
        <div className="max-w-6xl mx-auto lg:mt-6 lg:mb-8">
          <SpaceMediaViewer
            photos={photos}
            videoUrl={space.video_url}
            title={space.title}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Details */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Title & meta */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-700">
                  {typeLabels[space.space_type] || space.space_type}
                </span>
                {space.instant_book && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700">
                    Instant Book
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0D1B2A]">{space.title}</h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {space.address}, {space.city}
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-semibold text-gray-900">{space.rating_avg.toFixed(1)}</span>
                  <span className="text-gray-400">({space.review_count})</span>
                </div>
                {space.capacity_seated && (
                  <div className="flex items-center gap-1 text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    {space.capacity_seated} seated
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {space.description && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">About this space</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{space.description}</p>
              </div>
            )}

            {/* Amenities */}
            {space.amenities.length > 0 && (
              <div>
                <h2 className="font-semibold text-gray-900 mb-3">Amenities</h2>
                <AmenityGrid amenities={space.amenities} />
              </div>
            )}

            {/* Availability Calendar */}
            <div>
              <h2 className="font-semibold text-gray-900 mb-3">Availability</h2>
              <AvailabilityCalendar
                blockedDates={blockedDates}
                selectedStart={selectedStart}
                selectedEnd={selectedEnd}
                onSelectRange={(start, end) => { setSelectedStart(start); setSelectedEnd(end); }}
                onMonthChange={fetchAvailability}
              />
            </div>

            {/* Reviews */}
            <div>
              <h2 className="font-semibold text-gray-900 mb-3">Reviews</h2>
              {space.review_count === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-8 text-center">
                  <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm text-gray-400">No reviews yet. Be the first to book and leave a review!</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right: Booking sidebar */}
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="sticky top-20 space-y-4">
              {/* Price header */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold text-[#0D1B2A]">&#8377;{space.base_price_hourly.toLocaleString()}</span>
                  <span className="text-sm text-gray-400">/hour</span>
                </div>
                {space.base_price_daily && (
                  <p className="text-xs text-gray-400">
                    &#8377;{space.base_price_daily.toLocaleString()}/day
                  </p>
                )}

                {/* Hours selector */}
                <div className="mt-4">
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Duration (hours)</label>
                  <select
                    value={bookingHours}
                    onChange={(e) => setBookingHours(+e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((h) => (
                      <option key={h} value={h}>{h} hour{h > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </div>

                {/* Selected date */}
                {selectedStart && (
                  <p className="mt-3 text-xs text-gray-500">
                    Date: <span className="font-medium text-gray-700">{selectedStart}</span>
                  </p>
                )}
              </div>

              {/* Price breakdown */}
              {pricing && !pricingLoading && (
                <PriceBreakdown
                  hours={pricing.hours}
                  basePrice={pricing.base_price}
                  weekendApplied={pricing.weekend_applied}
                  surgeApplied={pricing.surge_applied}
                  platformFee={pricing.platform_fee}
                  gst={pricing.gst}
                  total={pricing.total}
                />
              )}
              {pricingLoading && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 flex justify-center">
                  <LoadingSpinner />
                </div>
              )}

              {/* Book button */}
              <button
                onClick={() => router.push(`/book/${space.id}`)}
                disabled={!selectedStart}
                className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${selectedStart
                  ? "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 active:scale-[0.98]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
              >
                {selectedStart ? "Book Now" : "Select a date to book"}
              </button>

              {!selectedStart && (
                <p className="text-[10px] text-gray-400 text-center">Pick a date on the calendar to see pricing</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
