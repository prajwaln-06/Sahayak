"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import Link from "next/link";

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState("");
  const [searchResult, setSearchResult] = useState<any | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users?limit=50");
      setUsers(res.data.users);
    } catch {
       // ign
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
    fetchUsers();
  }, [user, authLoading, router]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone) return setSearchResult(null);
    try {
      const formattedPhone = searchPhone.startsWith("+") ? searchPhone : `+91${searchPhone}`;
      const res = await api.get(`/admin/users/by-phone/${encodeURIComponent(formattedPhone)}`);
      setSearchResult(res.data);
    } catch {
      alert("User not found");
      setSearchResult(null);
    }
  };

  const promoteAdmin = async (id: string) => {
    if (!confirm("Make this user an admin?")) return;
    try {
      await api.post(`/admin/promote-admin/${id}`);
      fetchUsers();
      if (searchResult?.id === id) setSearchResult({...searchResult, is_admin: true});
    } catch {
      alert("Failed");
    }
  };
  
  const makeHost = async (id: string) => {
    if (!confirm("Make this user a host? (Also approves KYC)")) return;
    try {
      await api.post(`/admin/make-host/${id}`);
      fetchUsers();
      if (searchResult?.id === id) setSearchResult({...searchResult, is_host: true, kyc_status: "APPROVED"});
    } catch {
      alert("Failed");
    }
  }

  const renderUserCard = (u: any) => (
    <div key={u.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <h4 className="font-bold text-gray-900">{u.full_name || "New User"}</h4>
        <p className="text-sm text-gray-500">{u.phone}</p>
        <div className="flex gap-2 mt-2">
          {u.is_admin && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-md font-medium">Admin</span>}
          {u.is_host && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">Host</span>}
          {u.kyc_status && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium capitalize">{u.kyc_status}</span>}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {!u.is_admin && <button onClick={() => promoteAdmin(u.id)} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium">Promote to Admin</button>}
        {!u.is_host && <button onClick={() => makeHost(u.id)} className="text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded-lg font-medium">Make Host</button>}
      </div>
    </div>
  );

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex py-6 flex-col shrink-0">
        <div className="px-6 mb-8">
           <h2 className="text-xl font-bold text-[#0D1B2A]">Admin Console</h2>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <Link href="/admin" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">❖ Dashboard</Link>
          <Link href="/admin/users" className="flex text-sm font-medium items-center px-3 py-2 bg-teal-50 text-teal-700 rounded-xl">👥 Users</Link>
          <Link href="/admin/kyc" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">📑 KYC Queue</Link>
          <Link href="/admin/spaces" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">🏢 Spaces</Link>
          <Link href="/admin/bookings" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">📅 Bookings</Link>
          <Link href="/admin/demo-tools" className="flex text-sm font-medium items-center px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl">⚙️ Demo Tools</Link>
        </nav>
      </aside>

      <div className="flex-1 overflow-auto p-8 relative">
        <h1 className="text-2xl font-bold text-[#0D1B2A] mb-2">User Management</h1>
        <p className="text-gray-500 mb-8">Search users by phone immediately to bypass standard app flows during demos.</p>

        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input 
            type="text" 
            placeholder="Search by phone (e.g. 993132...)" 
            value={searchPhone}
            onChange={e => setSearchPhone(e.target.value)}
            className="flex-1 max-w-sm px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button type="submit" className="px-6 py-2 bg-[#0D1B2A] text-white rounded-xl font-medium hover:bg-gray-800">Search</button>
          {searchResult && <button type="button" onClick={() => setSearchResult(null)} className="px-4 text-sm text-gray-500">Clear</button>}
        </form>

        {searchResult && (
          <div className="mb-10">
            <h3 className="font-semibold text-gray-900 mb-4">Search Result</h3>
            {renderUserCard(searchResult)}
          </div>
        )}

        <h3 className="font-semibold text-gray-900 mb-4">Recent Users ({users.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => renderUserCard(u))}
        </div>
      </div>
    </div>
  );
}