"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);

  const load = async () => {
    const res = await api.get("/admin/users");
    setUsers(res.data);
  };

  useEffect(() => {
    load().catch(() => setUsers([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">User beheer</h1>
      <div className="rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead><tr><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Rol</th></tr></thead>
          <tbody>
            {users.map((u) => <tr key={String(u.id)} className="border-t border-zinc-800"><td className="px-3 py-2">{String(u.email)}</td><td className="px-3 py-2">{String(u.role)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
