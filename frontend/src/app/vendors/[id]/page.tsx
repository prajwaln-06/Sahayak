"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import api from "@/lib/api";

interface VendorDetail {
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
  portfolio_urls: string[];
  is_verified: boolean;
  services: { id: string; service_name: string; description: string | null; price: number | null; unit: string | null; photo_url: string | null; }[];
}

const typeLabels: Record<string, string> = { CATERING: "Catering", AV_TECH: "AV & Tech", SECURITY: "Security", DECOR: "Decor", PHOTOGRAPHY: "Photography", CLEANING: "Cleaning", OTHER: "Other" };

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteMsg, setQuoteMsg] = useState("");

  useEffect(() => { api.get(`/vendors/${params.id}`).then(r => setVendor(r.data)).catch(() => {}).finally(() => setLoading(false)); }, [params.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><LoadingSpinner size="lg" /></div>;
  if (!vendor) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><p className="text-gray-500 mb-4">Vendor not found</p><button onClick={() => router.push("/vendors")} className="text-sm text-teal-600 hover:underline">Browse vendors</button></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0D1B2A] py-4 px-6"><div className="max-w-4xl mx-auto flex items-center justify-between"><a href="/" className="text-white font-bold text-lg">FlexiSpace</a><a href="/vendors" className="text-sm text-white/60 hover:text-white">&larr; Vendors</a></div></header>
      <div className="bg-gradient-to-r from-[#0D1B2A] to-teal-900 h-32" />
      <main className="max-w-4xl mx-auto px-6 -mt-16">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-100 to-gray-100 flex items-center justify-center -mt-12 border-4 border-white shadow-sm text-3xl">
              {vendor.vendor_type === "CATERING" ? "🍽" : vendor.vendor_type === "PHOTOGRAPHY" ? "📸" : vendor.vendor_type === "AV_TECH" ? "🎙" : "📦"}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-xl font-bold text-[#0D1B2A] flex items-center gap-2">{vendor.business_name}{vendor.is_verified && <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812z" clipRule="evenodd"/></svg>}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">{typeLabels[vendor.vendor_type] || vendor.vendor_type}</span>
                <span className="text-xs text-gray-500">⭐ {vendor.rating_avg.toFixed(1)} ({vendor.review_count})</span>
              </div>
            </div>
            <button onClick={() => setQuoteOpen(true)} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-sm">Request Quote</button>
          </div>
          {vendor.description && <p className="text-sm text-gray-600 mt-4 leading-relaxed">{vendor.description}</p>}
          <div className="flex flex-wrap gap-1.5 mt-4">{vendor.service_cities.map(c => <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{c}</span>)}</div>
          {vendor.min_price != null && <p className="mt-4 text-sm"><span className="text-gray-500">Pricing: </span><span className="font-bold text-[#0D1B2A]">₹{vendor.min_price.toLocaleString()}{vendor.max_price ? ` – ₹${vendor.max_price.toLocaleString()}` : ""}</span></p>}
        </div>

        {vendor.services.length > 0 && <div className="mb-6"><h2 className="text-lg font-semibold text-[#0D1B2A] mb-4">Services</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{vendor.services.map(s => <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4"><h4 className="text-sm font-semibold text-gray-900">{s.service_name}</h4>{s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}{s.price != null && <p className="text-xs font-bold text-teal-700 mt-1">₹{s.price.toLocaleString()}{s.unit ? `/${s.unit}` : ""}</p>}</div>)}</div></div>}

        {vendor.portfolio_urls.length > 0 && <div className="mb-6"><h2 className="text-lg font-semibold text-[#0D1B2A] mb-4">Portfolio</h2><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{vendor.portfolio_urls.map((url, i) => <img key={i} src={url} alt="" className="w-full aspect-square rounded-2xl object-cover" />)}</div></div>}
      </main>

      {quoteOpen && <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-6"><div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"><h3 className="font-semibold text-gray-900 mb-4">Request Quote</h3><textarea value={quoteMsg} onChange={e => setQuoteMsg(e.target.value)} placeholder="Describe your event..." rows={4} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-teal-500 resize-none mb-4" /><div className="flex gap-3"><button onClick={() => setQuoteOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm bg-gray-100 text-gray-700">Cancel</button><button onClick={() => { setQuoteOpen(false); setQuoteMsg(""); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700">Send</button></div></div></div>}
    </div>
  );
}
