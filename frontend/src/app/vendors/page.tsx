"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import api from "@/lib/api";

interface VendorItem {
  id: string;
  business_name: string;
  vendor_type: string;
  description: string | null;
  service_cities: string[];
  min_price: number | null;
  max_price: number | null;
  price_unit: string;
  rating_avg: number;
  review_count: number;
  is_verified: boolean;
  portfolio_urls: string[];
}

const TYPES = [
  { value: "", label: "All" },
  { value: "CATERING", label: "🍽 Catering" },
  { value: "AV_TECH", label: "🎙 AV & Tech" },
  { value: "SECURITY", label: "🛡 Security" },
  { value: "DECOR", label: "🎨 Decor" },
  { value: "PHOTOGRAPHY", label: "📸 Photography" },
  { value: "CLEANING", label: "🧹 Cleaning" },
  { value: "OTHER", label: "📦 Other" },
];

const typeLabels: Record<string, string> = {
  CATERING: "Catering", AV_TECH: "AV & Tech", SECURITY: "Security",
  DECOR: "Decor", PHOTOGRAPHY: "Photography", CLEANING: "Cleaning", OTHER: "Other",
};

export default function VendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { page, page_size: 20 };
        if (typeFilter) params.vendor_type = typeFilter;
        const res = await api.get("/vendors/", { params });
        setVendors(res.data.vendors || []);
        setTotal(res.data.total || 0);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [typeFilter, page]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0D1B2A] py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="text-white font-bold text-lg">FlexiSpace</a>
          <a href="/spaces" className="text-sm text-white/60 hover:text-white">Browse Spaces</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-2">Vendor Marketplace</h1>
        <p className="text-sm text-gray-500 mb-6">Find verified vendors for catering, AV, decor, and more.</p>

        {/* Type tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {TYPES.map((t) => (
            <button key={t.value} onClick={() => { setTypeFilter(t.value); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                typeFilter === t.value
                  ? "bg-[#0D1B2A] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>{t.label}</button>
          ))}
        </div>

        {/* Vendor grid */}
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-14 h-14 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-400">No vendors found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((v) => (
              <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-50 to-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">
                      {typeFilter === "CATERING" ? "🍽" : typeFilter === "AV_TECH" ? "🎙" :
                        typeFilter === "PHOTOGRAPHY" ? "📸" : typeFilter === "DECOR" ? "🎨" : "📦"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{v.business_name}</h3>
                      {v.is_verified && (
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                      {typeLabels[v.vendor_type] || v.vendor_type}
                    </span>
                  </div>
                </div>

                {v.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{v.description}</p>
                )}

                {/* Cities */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {v.service_cities.slice(0, 3).map((c) => (
                    <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{c}</span>
                  ))}
                  {v.service_cities.length > 3 && (
                    <span className="text-[10px] text-gray-400">+{v.service_cities.length - 3}</span>
                  )}
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs font-semibold text-gray-900">{v.rating_avg.toFixed(1)}</span>
                    </div>
                    {v.min_price != null && (
                      <span className="text-xs text-gray-400">
                        ₹{v.min_price.toLocaleString()}{v.max_price ? ` – ₹${v.max_price.toLocaleString()}` : ""}
                      </span>
                    )}
                  </div>
                  <button onClick={() => router.push(`/vendors/${v.id}`)}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 group-hover:underline">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center gap-2 mt-8">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-xl text-sm bg-white border border-gray-200 disabled:opacity-40">Previous</button>
            <span className="px-4 py-2 text-sm text-gray-500">Page {page}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={vendors.length < 20}
              className="px-4 py-2 rounded-xl text-sm bg-white border border-gray-200 disabled:opacity-40">Next</button>
          </div>
        )}
      </main>
    </div>
  );
}
