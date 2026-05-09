"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AdminBookingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    try {
      const res = await api.get("/admin/bookings?limit=50");
      setBookings(Array.isArray(res.data) ? res.data : []);
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
    loadBookings();
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Bookings</h1>
      <Link href="/admin" className="text-sm text-teal-700">Back to admin</Link>
      <div className="mt-4 space-y-3">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-xl border p-4 bg-white">
            <p className="font-semibold">{b.space_title || "Space"}</p>
            <p className="text-xs text-gray-500">{b.renter_name || "Renter"} • {b.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
