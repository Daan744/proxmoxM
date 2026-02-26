"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Template } from "@/lib/types";

export default function AdminTemplatesPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState("Template custom");
  const [templateVmid, setTemplateVmid] = useState(9002);

  const load = async () => { try { const r = await api.get("/templates"); setRows(r.data); } catch {} };
  useEffect(() => { load(); }, []);

  const sync = async () => {
    setSyncResult(null);
    try { const r = await api.post("/templates/sync"); setSyncResult(`Sync klaar: ${r.data.created} nieuw, ${r.data.updated} bijgewerkt`); await load(); } catch { setSyncResult("Sync gefaald"); }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await api.post("/templates", { name, nodeScope: "CLUSTER", templateVmid, storage: "local-lvm", defaultBridge: "vmbr0", minCores: 1, maxCores: 16, minMemoryMB: 512, maxMemoryMB: 65536, minDiskGB: 5, maxDiskGB: 1000, haEnabledDefault: false, allowUserNodeSelect: true, allowHaToggle: true });
    await load();
  };

  const del = async (id: string) => { if (!confirm("Template verwijderen?")) return; await api.delete(`/templates/${id}`); await load(); };

  const saveEdit = async () => { if (!editing) return; await api.patch(`/templates/${editing.id}`, editing); setEditing(null); await load(); };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Template beheer</h1>
      <div className="flex gap-2 items-center">
        <button onClick={sync} className="rounded bg-zinc-700 px-3 py-2 text-sm text-white">Sync vanuit Proxmox</button>
        {syncResult && <span className="text-sm text-green-400">{syncResult}</span>}
      </div>
      <form onSubmit={create} className="flex gap-2 items-end">
        <label className="text-sm text-zinc-400">Naam<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block" /></label>
        <label className="text-sm text-zinc-400">VMID<input type="number" value={templateVmid} onChange={(e) => setTemplateVmid(Number(e.target.value))} className="mt-1 block w-24" /></label>
        <button className="rounded bg-blue-700 px-3 py-2 text-sm text-white" type="submit">Toevoegen</button>
      </form>
      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-300"><tr><th className="px-3 py-2 text-left">Naam</th><th className="px-3 py-2 text-left">VMID</th><th className="px-3 py-2 text-left">Scope</th><th className="px-3 py-2 text-left">Node</th><th className="px-3 py-2 text-left">Cores</th><th className="px-3 py-2 text-left">RAM</th><th className="px-3 py-2 text-left">Disk</th><th className="px-3 py-2 text-left">HA</th><th className="px-3 py-2 text-left">Acties</th></tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id} className="border-t border-zinc-800">
              <td className="px-3 py-2">{t.name}</td><td className="px-3 py-2">{t.templateVmid}</td><td className="px-3 py-2">{t.nodeScope}</td><td className="px-3 py-2">{t.sourceNode ?? "-"}</td>
              <td className="px-3 py-2">{t.minCores}-{t.maxCores}</td><td className="px-3 py-2">{t.minMemoryMB}-{t.maxMemoryMB}</td><td className="px-3 py-2">{t.minDiskGB}-{t.maxDiskGB}</td><td className="px-3 py-2">{t.haEnabledDefault ? "Ja" : "Nee"}</td>
              <td className="px-3 py-2 flex gap-1"><button onClick={() => setEditing({ ...t })} className="rounded bg-zinc-700 px-2 py-1 text-xs text-white">Edit</button><button onClick={() => del(t.id)} className="rounded bg-red-700 px-2 py-1 text-xs text-white">Delete</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded border border-zinc-700 bg-zinc-900 p-6 space-y-3">
            <h2 className="text-lg font-semibold">Template bewerken</h2>
            <label className="block text-sm text-zinc-400">Naam<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1 w-full" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-zinc-400">Min cores<input type="number" value={editing.minCores} onChange={(e) => setEditing({ ...editing, minCores: Number(e.target.value) })} className="mt-1 w-full" /></label>
              <label className="text-sm text-zinc-400">Max cores<input type="number" value={editing.maxCores} onChange={(e) => setEditing({ ...editing, maxCores: Number(e.target.value) })} className="mt-1 w-full" /></label>
              <label className="text-sm text-zinc-400">Min RAM<input type="number" value={editing.minMemoryMB} onChange={(e) => setEditing({ ...editing, minMemoryMB: Number(e.target.value) })} className="mt-1 w-full" /></label>
              <label className="text-sm text-zinc-400">Max RAM<input type="number" value={editing.maxMemoryMB} onChange={(e) => setEditing({ ...editing, maxMemoryMB: Number(e.target.value) })} className="mt-1 w-full" /></label>
              <label className="text-sm text-zinc-400">Min disk<input type="number" value={editing.minDiskGB} onChange={(e) => setEditing({ ...editing, minDiskGB: Number(e.target.value) })} className="mt-1 w-full" /></label>
              <label className="text-sm text-zinc-400">Max disk<input type="number" value={editing.maxDiskGB} onChange={(e) => setEditing({ ...editing, maxDiskGB: Number(e.target.value) })} className="mt-1 w-full" /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.haEnabledDefault} onChange={(e) => setEditing({ ...editing, haEnabledDefault: e.target.checked })} /> HA standaard aan</label>
            <div className="flex gap-2"><button onClick={saveEdit} className="rounded bg-blue-700 px-3 py-2 text-sm text-white">Opslaan</button><button onClick={() => setEditing(null)} className="rounded bg-zinc-700 px-3 py-2 text-sm text-white">Annuleren</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
