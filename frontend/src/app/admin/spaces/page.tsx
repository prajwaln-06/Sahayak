"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AdminSpacesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSpaces = async () => {
    try {
      const res = await api.get("/admin/spaces");
      setSpaces(Array.isArray(res.data) ? res.data : []);
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
    loadSpaces();
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Spaces</h1>
      <Link href="/admin" className="text-sm text-teal-700">Back to admin</Link>
      <div className="mt-4 space-y-3">
        {spaces.map((s) => (
          <div key={s.id} className="rounded-xl border p-4 bg-white flex items-center justify-between">
            <div>
              <p className="font-semibold">{s.title}</p>
              <p className="text-xs text-gray-500">{s.city}</p>
            </div>
            <span className="text-xs">{s.is_active ? "Active" : "Inactive"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
