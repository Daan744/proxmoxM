"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AuditLog } from "@/lib/types";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");

  const load = async () => {
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (targetFilter) params.set("targetType", targetFilter);
    try { const r = await api.get(`/admin/audit-logs?${params}`); setLogs(r.data); } catch {}
  };

  useEffect(() => { load(); }, [actionFilter, targetFilter]);

  const actions = [...new Set(logs.map((l) => l.action))];
  const targets = [...new Set(logs.map((l) => l.targetType))];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit logs</h1>
      <div className="flex gap-3">
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="text-sm">
          <option value="">Alle acties</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)} className="text-sm">
          <option value="">Alle targets</option>
          {targets.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900"><tr><th className="px-3 py-2 text-left">Tijd</th><th className="px-3 py-2 text-left">Actie</th><th className="px-3 py-2 text-left">Target</th><th className="px-3 py-2 text-left">Target ID</th></tr></thead>
          <tbody>{logs.map((l) => (
            <tr key={l.id} className="border-t border-zinc-800">
              <td className="px-3 py-2 text-zinc-400">{new Date(l.createdAt).toLocaleString("nl-NL")}</td>
              <td className="px-3 py-2">{l.action}</td>
              <td className="px-3 py-2">{l.targetType}</td>
              <td className="px-3 py-2 text-zinc-500">{l.targetId ?? "-"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
