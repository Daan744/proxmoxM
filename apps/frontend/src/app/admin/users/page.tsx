"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => { try { const r = await api.get("/admin/users"); setUsers(r.data); } catch {} };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    try {
      await api.patch(`/admin/users/${editing.id}`, { role: editing.role, quotaMaxVMs: editing.quotaMaxVMs, quotaMaxCoresTotal: editing.quotaMaxCoresTotal, quotaMaxMemoryMBTotal: editing.quotaMaxMemoryMBTotal, quotaMaxDiskGBTotal: editing.quotaMaxDiskGBTotal });
      setMsg("Opgeslagen"); setEditing(null); await load();
    } catch { setMsg("Opslaan mislukt"); }
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">User beheer</h1>
      {msg && <p className="text-sm text-green-400">{msg}</p>}
      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900"><tr><th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Rol</th><th className="px-3 py-2 text-left">VMs</th><th className="px-3 py-2 text-left">Cores</th><th className="px-3 py-2 text-left">RAM</th><th className="px-3 py-2 text-left">Disk</th><th className="px-3 py-2 text-left">Acties</th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id} className="border-t border-zinc-800"><td className="px-3 py-2">{u.email}</td><td className="px-3 py-2">{u.role}</td><td className="px-3 py-2">{u.quotaMaxVMs}</td><td className="px-3 py-2">{u.quotaMaxCoresTotal}</td><td className="px-3 py-2">{u.quotaMaxMemoryMBTotal}</td><td className="px-3 py-2">{u.quotaMaxDiskGBTotal}</td><td className="px-3 py-2"><button onClick={() => setEditing({ ...u })} className="rounded bg-zinc-700 px-2 py-1 text-xs text-white">Bewerken</button></td></tr>
          ))}</tbody>
        </table>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded border border-zinc-700 bg-zinc-900 p-6 space-y-3">
            <h2 className="text-lg font-semibold">{editing.email}</h2>
            <label className="block text-sm text-zinc-400">Rol<select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as "USER" | "ADMIN" })} className="mt-1 w-full"><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-zinc-400">Max VMs<input type="number" value={editing.quotaMaxVMs} onChange={(e) => setEditing({ ...editing, quotaMaxVMs: Number(e.target.value) })} className="mt-1 w-full" /></label>
              <label className="text-sm text-zinc-400">Max cores<input type="number" value={editing.quotaMaxCoresTotal} onChange={(e) => setEditing({ ...editing, quotaMaxCoresTotal: Number(e.target.value) })} className="mt-1 w-full" /></label>
              <label className="text-sm text-zinc-400">Max RAM (MB)<input type="number" value={editing.quotaMaxMemoryMBTotal} onChange={(e) => setEditing({ ...editing, quotaMaxMemoryMBTotal: Number(e.target.value) })} className="mt-1 w-full" /></label>
              <label className="text-sm text-zinc-400">Max disk (GB)<input type="number" value={editing.quotaMaxDiskGBTotal} onChange={(e) => setEditing({ ...editing, quotaMaxDiskGBTotal: Number(e.target.value) })} className="mt-1 w-full" /></label>
            </div>
            <div className="flex gap-2"><button onClick={save} className="rounded bg-blue-700 px-3 py-2 text-sm text-white">Opslaan</button><button onClick={() => setEditing(null)} className="rounded bg-zinc-700 px-3 py-2 text-sm text-white">Annuleren</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
