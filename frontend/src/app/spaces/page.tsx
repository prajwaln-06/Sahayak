"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import SpaceCard from "@/components/SpaceCard";
import MapView from "@/components/MapView";
import LoadingSpinner from "@/components/LoadingSpinner";
import api from "@/lib/api";

interface Space {
  id: string;
  title: string;
  thumbnail_url: string | null;
  base_price_hourly: number;
  rating_avg: number;
  review_count: number;
  capacity_seated: number | null;
  capacity_standing: number | null;
  city: string;
  space_type: string;
  instant_book: boolean;
  lat: number | null;
  lng: number | null;
}

const SPACE_TYPES = [
  { value: "", label: "All Types" },
  { value: "CONFERENCE_ROOM", label: "Conference Room" },
  { value: "STUDIO", label: "Studio" },
  { value: "ROOFTOP", label: "Rooftop" },
  { value: "GARDEN", label: "Garden" },
  { value: "GALLERY", label: "Gallery" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "OTHER", label: "Other" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

export default function SpacesPage() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"grid" | "map">("grid");

  // Filters
  const [city, setCity] = useState("");
  const [spaceType, setSpaceType] = useState("");
  const [minCapacity, setMinCapacity] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(50000);
  const [selectedDate, setSelectedDate] = useState("");
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const fetchSpaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { page, page_size: 20 };
      if (city) params.city = city;
      if (spaceType) params.space_type = spaceType;
      if (minCapacity > 0) params.capacity = minCapacity;
      if (minPrice > 0) params.min_price = minPrice;
      if (maxPrice < 50000) params.max_price = maxPrice;
      if (selectedDate) params.date = selectedDate;

      const res = await api.get("/listings/", { params });
      let fetched: Space[] = res.data.spaces || [];
      setTotal(res.data.total || 0);

      // Client-side sort
      if (sort === "price_low") fetched.sort((a, b) => a.base_price_hourly - b.base_price_hourly);
      if (sort === "price_high") fetched.sort((a, b) => b.base_price_hourly - a.base_price_hourly);
      if (sort === "rating") fetched.sort((a, b) => b.rating_avg - a.rating_avg);

      setSpaces(fetched);
    } catch (err) {
      console.error("Failed to load spaces:", err);
    } finally {
      setIsLoading(false);
    }
  }, [city, spaceType, minCapacity, minPrice, maxPrice, selectedDate, sort, page]);

  useEffect(() => { fetchSpaces(); }, [fetchSpaces]);

  const mapMarkers = spaces
    .filter((s) => s.lat && s.lng)
    .map((s) => ({ id: s.id, lat: s.lat!, lng: s.lng!, price: s.base_price_hourly, title: s.title }));

  // ── Filter Sidebar ─────────────────────────────────────────
  const renderFilters = () => (
    <div className="space-y-6">
      {/* City search */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Location</label>
        <input
          type="text"
          placeholder="Search city..."
          value={city}
          onChange={(e) => { setCity(e.target.value); setPage(1); }}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 transition-colors"
        />
      </div>

      {/* Space type */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Space Type</label>
        <div className="space-y-1">
          {SPACE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => { setSpaceType(t.value); setPage(1); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                spaceType === t.value ? "bg-teal-50 text-teal-700 font-medium" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Capacity */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Min Capacity: <span className="text-teal-600">{minCapacity || "Any"}</span>
        </label>
        <input
          type="range"
          min={0}
          max={500}
          step={10}
          value={minCapacity}
          onChange={(e) => { setMinCapacity(+e.target.value); setPage(1); }}
          className="w-full accent-teal-600"
        />
      </div>

      {/* Price range */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Price: ₹{minPrice.toLocaleString()} – ₹{maxPrice.toLocaleString()}
        </label>
        <div className="flex gap-2">
          <input type="number" placeholder="Min" value={minPrice || ""} onChange={(e) => { setMinPrice(+e.target.value); setPage(1); }}
            className="w-1/2 px-2 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-teal-500" />
          <input type="number" placeholder="Max" value={maxPrice >= 50000 ? "" : maxPrice} onChange={(e) => { setMaxPrice(+e.target.value || 50000); setPage(1); }}
            className="w-1/2 px-2 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-teal-500" />
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Available Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 transition-colors"
        />
      </div>

      {/* Clear filters */}
      <button
        onClick={() => { setCity(""); setSpaceType(""); setMinCapacity(0); setMinPrice(0); setMaxPrice(50000); setSelectedDate(""); setPage(1); }}
        className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        Clear all filters
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0D1B2A] py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="/" className="text-white font-bold text-lg">FlexiSpace</a>
          <div className="flex items-center gap-3">
            <a href="/host/onboard" className="text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors">
              List your space
            </a>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-gray-900">
              {total} space{total !== 1 ? "s" : ""} found
            </h1>
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-medium text-gray-600"
            >
              Filters
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-teal-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setView("grid")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "grid" ? "bg-[#0D1B2A] text-white" : "text-gray-500 hover:bg-gray-50"}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setView("map")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "map" ? "bg-[#0D1B2A] text-white" : "text-gray-500 hover:bg-gray-50"}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar — desktop */}
          <aside className={`w-64 flex-shrink-0 ${showMobileFilters ? "block" : "hidden"} lg:block`}>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-20">
              {renderFilters()}
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : spaces.length === 0 ? (
              <div className="text-center py-20">
                <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="font-semibold text-gray-700 mb-1">No spaces found</h3>
                <p className="text-sm text-gray-400">Try adjusting your filters</p>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {spaces.map((s) => (
                  <SpaceCard
                    key={s.id}
                    id={s.id}
                    title={s.title}
                    thumbnailUrl={s.thumbnail_url}
                    priceHourly={s.base_price_hourly}
                    ratingAvg={s.rating_avg}
                    reviewCount={s.review_count}
                    capacitySeated={s.capacity_seated}
                    capacityStanding={s.capacity_standing}
                    city={s.city}
                    spaceType={s.space_type}
                    instantBook={s.instant_book}
                  />
                ))}
              </div>
            ) : (
              <MapView
                markers={mapMarkers}
                height="calc(100vh - 180px)"
                onMarkerClick={(id) => router.push(`/spaces/${id}`)}
              />
            )}

            {/* Pagination */}
            {total > 20 && (
              <div className="flex justify-center gap-2 mt-8">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-30 hover:bg-gray-50">Prev</button>
                <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
                <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-30 hover:bg-gray-50">Next</button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
