"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    api.get("/admin/audit-logs").then((res) => setLogs(res.data)).catch(() => setLogs([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit logs</h1>
      <div className="rounded border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead><tr><th className="px-3 py-2 text-left">Tijd</th><th className="px-3 py-2 text-left">Action</th><th className="px-3 py-2 text-left">Target</th></tr></thead>
          <tbody>
            {logs.map((l) => <tr key={String(l.id)} className="border-t border-zinc-800"><td className="px-3 py-2">{String(l.createdAt)}</td><td className="px-3 py-2">{String(l.action)}</td><td className="px-3 py-2">{String(l.targetType)}:{String(l.targetId ?? "")}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
