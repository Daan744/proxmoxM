"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import type { Vm, ClusterNode } from "@/lib/types";

export default function DashboardPage() {
  const [vms, setVms] = useState<Vm[]>([]);
  const [nodes, setNodes] = useState<ClusterNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const user = getSessionUser();

  const load = useCallback(() => {
    setError(null);
    api
      .get("/vms")
      .then((r) => setVms(Array.isArray(r.data) ? r.data : []))
      .catch(() => setVms([]));
    if (user?.role === "ADMIN") {
      api
        .get("/cluster/health")
        .then((r) => setNodes(Array.isArray(r.data?.nodes) ? r.data.nodes : []))
        .catch(() => setNodes([]));
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const onSync = useCallback(async () => {
    setSyncMsg(null);
    setError(null);
    setSyncing(true);
    try {
      const r = await api.post("/vms/sync");
      const d = r.data as { imported?: number; updated?: number; total?: number };
      setSyncMsg(`${d.imported ?? 0} geïmporteerd, ${d.updated ?? 0} bijgewerkt (${d.total ?? 0} op Proxmox)`);
      load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Sync mislukt")
          : "Sync mislukt";
      setError(msg);
    } finally {
      setSyncing(false);
    }
  }, [load]);

  const running = vms.filter((v) => v.status === "RUNNING").length;
  const stopped = vms.filter((v) => v.status === "STOPPED").length;
  const failed = vms.filter((v) => v.status === "FAILED").length;
  const provisioning = vms.filter((v) => v.status === "PROVISIONING").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {error && (
        <div className="rounded border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</div>
      )}
      {syncMsg && (
        <div className="rounded border border-green-800 bg-green-950/30 px-4 py-2 text-sm text-green-300">{syncMsg}</div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Totaal VMs" value={vms.length} />
        <Card label="Running" value={running} color="text-green-400" />
        <Card label="Stopped" value={stopped} color="text-yellow-400" />
        <Card label="Failed" value={failed} color="text-red-400" />
        {provisioning > 0 && <Card label="Provisioning" value={provisioning} color="text-blue-400" />}
      </div>

      {user?.role === "ADMIN" && nodes.length > 0 && (
        <>
          <h2 className="text-xl font-semibold">Cluster nodes</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {nodes.map((n) => (
              <div key={n.node} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{n.node}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      n.status === "online" ? "bg-green-800 text-green-200" : "bg-red-800 text-red-200"
                    }`}
                  >
                    {n.status}
                  </span>
                </div>
                <BarInfo label="CPU" percent={n.cpuUsagePercent} />
                <BarInfo label="RAM" percent={n.memPercent} detail={`${n.memUsedMB} / ${n.memTotalMB} MB`} />
                <p className="mt-1 text-xs text-zinc-500">Uptime: {n.uptimeFormatted}</p>
                {"loadavg" in n && Array.isArray((n as { loadavg?: number[] }).loadavg) && (n as { loadavg: number[] }).loadavg.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Load: {(n as { loadavg: number[] }).loadavg.map((l) => l.toFixed(2)).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/vms/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Nieuwe VM
        </Link>
        {user?.role === "ADMIN" && (
          <>
            <button
              onClick={onSync}
              disabled={syncing}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
            >
              {syncing ? "Syncen…" : "Sync VMs vanuit Proxmox"}
            </button>
            <Link
              href="/admin/cluster"
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Cluster overzicht
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={`text-3xl font-bold ${color ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function BarInfo({ label, percent, detail }: { label: string; percent: number; detail?: string }) {
  const clamp = Math.min(100, Math.max(0, percent));
  const color = clamp > 80 ? "bg-red-500" : clamp > 60 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span>{detail ?? `${clamp.toFixed(1)}%`}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded bg-zinc-800">
        <div className={`h-2 rounded ${color}`} style={{ width: `${clamp}%` }} />
      </div>
    </div>
  );
}
