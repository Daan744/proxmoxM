"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import type { Vm, ClusterNode } from "@/lib/types";

export default function DashboardPage() {
  const [vms, setVms] = useState<Vm[]>([]);
  const [nodes, setNodes] = useState<ClusterNode[]>([]);
  const user = getSessionUser();

  useEffect(() => {
    api.get("/vms").then((r) => setVms(r.data)).catch(() => {});
    if (user?.role === "ADMIN") {
      api.get("/cluster/health").then((r) => setNodes(r.data.nodes ?? [])).catch(() => {});
    }
  }, []);

  const running = vms.filter((v) => v.status === "RUNNING").length;
  const stopped = vms.filter((v) => v.status === "STOPPED").length;
  const failed = vms.filter((v) => v.status === "FAILED").length;
  const provisioning = vms.filter((v) => v.status === "PROVISIONING").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
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
              <div key={n.node} className="rounded border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{n.node}</span>
                  <span className={n.status === "online" ? "text-green-400" : "text-red-400"}>{n.status}</span>
                </div>
                <BarInfo label="CPU" percent={n.cpuUsagePercent} />
                <BarInfo label="RAM" percent={n.memPercent} detail={`${n.memUsedMB} / ${n.memTotalMB} MB`} />
                <p className="mt-1 text-xs text-zinc-500">Uptime: {n.uptimeFormatted}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex gap-3">
        <Link href="/vms/new" className="rounded bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-600">Nieuwe VM</Link>
        {user?.role === "ADMIN" && (
          <Link href="/admin/cluster" className="rounded bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600">Cluster overzicht</Link>
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
  const c = Math.min(100, Math.max(0, percent));
  const color = c > 80 ? "bg-red-500" : c > 60 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-zinc-400"><span>{label}</span><span>{detail ?? `${c.toFixed(1)}%`}</span></div>
      <div className="mt-1 h-2 w-full rounded bg-zinc-800"><div className={`h-2 rounded ${color}`} style={{ width: `${c}%` }} /></div>
    </div>
  );
}
