"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id") || "—";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Animated checkmark */}
        <div className="w-20 h-20 rounded-full bg-teal-100 mx-auto mb-6 flex items-center justify-center animate-in zoom-in-50 duration-500">
          <svg className="w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-2">Booking Confirmed!</h1>
        <p className="text-sm text-gray-500 mb-6">Your space has been reserved successfully.</p>

        {/* Booking ID */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Booking ID</span>
            <span className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-0.5 rounded">{bookingId.slice(0, 8)}...</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 rounded-xl px-4 py-2.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-medium">WhatsApp confirmation sent to your phone</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <a href="/dashboard/bookings"
            className="block w-full py-3 rounded-xl text-sm font-semibold bg-[#0D1B2A] text-white hover:bg-[#1B2D45] transition-colors">
            View My Bookings
          </a>
          <a href="/spaces"
            className="block w-full py-3 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
            Browse More Spaces
          </a>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
