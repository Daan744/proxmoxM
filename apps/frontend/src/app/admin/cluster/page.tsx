"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ClusterNode } from "@/lib/types";

export default function AdminClusterPage() {
  const [nodes, setNodes] = useState<ClusterNode[]>([]);
  const [quorum, setQuorum] = useState<{ quorate: boolean; nodes: number } | null>(null);
  const [ha, setHa] = useState<Array<Record<string, unknown>>>([]);

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await api.get("/cluster/health");
      setNodes(Array.isArray(res.data?.nodes) ? res.data.nodes : []);
      setQuorum(res.data?.quorum ?? null);
      setLastRefresh(new Date());
    } catch {}
    try {
      const res = await api.get("/cluster/ha/resources");
      setHa(Array.isArray(res.data) ? res.data : []);
    } catch {}
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 30000); return () => clearInterval(i); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Cluster health</h1>
        <div className="flex items-center gap-2">
          {lastRefresh && <span className="text-xs text-zinc-500">Laatst ververst: {lastRefresh.toLocaleTimeString("nl-NL")}</span>}
          <button onClick={load} className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-600">Vernieuwen</button>
        </div>
      </div>

      {quorum && (
        <div className={`rounded border p-3 text-sm ${quorum.quorate ? "border-green-800 bg-green-950 text-green-300" : "border-red-800 bg-red-950 text-red-300"}`}>
          Quorum: {quorum.quorate ? "OK" : "VERLOREN"} &mdash; {quorum.nodes} nodes
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {nodes.map((n) => (
          <div key={n.node} className="rounded border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-medium">{n.node}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${n.status === "online" ? "bg-green-800 text-green-200" : "bg-red-800 text-red-200"}`}>{n.status}</span>
            </div>
            <Bar label="CPU" percent={n.cpuUsagePercent} />
            <Bar label="RAM" percent={n.memPercent} detail={`${n.memUsedMB} / ${n.memTotalMB} MB`} />
            <p className="mt-2 text-xs text-zinc-500">Uptime: {n.uptimeFormatted}</p>
            {n.loadavg && n.loadavg.length > 0 && (
              <p className="mt-1 text-xs text-zinc-500">Load: {n.loadavg.map((l) => l.toFixed(2)).join(", ")}</p>
            )}
            {n.storage.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-zinc-400">Storage</p>
                {n.storage.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs text-zinc-400"><span>{s.name} ({s.type})</span><span>{s.usedGB} / {s.totalGB} GB</span></div>
                    <div className="mt-1 h-1.5 w-full rounded bg-zinc-800">
                      <div className={`h-1.5 rounded ${s.percentUsed > 80 ? "bg-red-500" : s.percentUsed > 60 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(s.percentUsed, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold">HA Resources</h2>
      {ha.length === 0 ? <p className="text-zinc-400">Geen HA resources gevonden.</p> : (
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900"><tr><th className="px-3 py-2 text-left">SID</th><th className="px-3 py-2 text-left">State</th><th className="px-3 py-2 text-left">Group</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
            <tbody>{ha.map((r, i) => (<tr key={i} className="border-t border-zinc-800"><td className="px-3 py-2">{String(r.sid)}</td><td className="px-3 py-2">{String(r.state)}</td><td className="px-3 py-2">{String(r.group ?? "-")}</td><td className="px-3 py-2">{String(r.status ?? "-")}</td></tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Bar({ label, percent, detail }: { label: string; percent: number; detail?: string }) {
  const c = Math.min(100, Math.max(0, percent));
  const color = c > 80 ? "bg-red-500" : c > 60 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-zinc-400"><span>{label}</span><span>{detail ?? `${c.toFixed(1)}%`}</span></div>
      <div className="mt-1 h-2 w-full rounded bg-zinc-800"><div className={`h-2 rounded ${color}`} style={{ width: `${c}%` }} /></div>
    </div>
  );
}
