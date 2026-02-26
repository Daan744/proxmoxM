"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminTemplatesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState("Template custom");
  const [templateVmid, setTemplateVmid] = useState(9002);

  const load = async () => {
    const res = await api.get("/templates");
    setRows(res.data);
  };

  useEffect(() => {
    load().catch(() => setRows([]));
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await api.post("/templates", {
      name,
      nodeScope: "CLUSTER",
      templateVmid,
      storage: "local-lvm",
      defaultBridge: "vmbr0",
      minCores: 1,
      maxCores: 8,
      minMemoryMB: 1024,
      maxMemoryMB: 16384,
      minDiskGB: 10,
      maxDiskGB: 500,
      haEnabledDefault: false,
      allowUserNodeSelect: true,
      allowHaToggle: true
    });
    await load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Template beheer</h1>
      <div className="flex gap-2">
        <button className="bg-zinc-700 text-white" onClick={async () => { await api.post("/templates/sync"); await load(); }}>
          Sync vanuit Proxmox
        </button>
      </div>
      <form onSubmit={create} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" value={templateVmid} onChange={(e) => setTemplateVmid(Number(e.target.value))} />
        <button className="bg-blue-700 text-white" type="submit">Create</button>
      </form>
      <div className="rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead><tr><th className="px-3 py-2 text-left">Naam</th><th className="px-3 py-2 text-left">VMID</th></tr></thead>
          <tbody>
            {rows.map((r) => <tr key={String(r.id)} className="border-t border-zinc-800"><td className="px-3 py-2">{String(r.name)}</td><td className="px-3 py-2">{String(r.templateVmid)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
