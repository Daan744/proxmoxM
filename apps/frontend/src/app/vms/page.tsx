"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { VmTable } from "@/components/vm-table";
import type { Vm } from "@/lib/types";

export default function VmsPage() {
  const [vms, setVms] = useState<Vm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const user = getSessionUser();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/vms");
      setVms(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "response" in e
        ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Kon VMs niet laden")
        : "Kon VMs niet laden";
      setError(msg);
      setVms([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const onSync = useCallback(async () => {
    setSyncMsg(null);
    setError(null);
    try {
      const r = await api.post("/vms/sync");
      const d = r.data as { imported?: number; updated?: number; total?: number };
      setSyncMsg(`${d.imported ?? 0} geïmporteerd, ${d.updated ?? 0} bijgewerkt (${d.total ?? 0} op Proxmox)`);
      await load();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "response" in e
        ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Sync mislukt")
        : "Sync mislukt";
      setError(msg);
    }
  }, [load]);

  const onAction = async (id: string, action: "start" | "stop" | "reboot" | "delete") => {
    try {
      if (action === "delete") await api.delete(`/vms/${id}`);
      else await api.post(`/vms/${id}/${action}`);
    } catch {}
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">VM overzicht</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={load} className="rounded bg-zinc-700 px-3 py-2 text-sm text-white hover:bg-zinc-600">
            Vernieuwen
          </button>
          {user?.role === "ADMIN" && (
            <button
              onClick={onSync}
              disabled={loading}
              className="rounded bg-green-700 px-3 py-2 text-sm text-white hover:bg-green-600 disabled:opacity-50"
            >
              Sync Proxmox
            </button>
          )}
          <Link href="/vms/new" className="rounded bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-600">
            Nieuwe VM
          </Link>
        </div>
      </div>
      {error && (
        <div className="rounded border border-red-800 bg-red-950/50 px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}
      {syncMsg && (
        <div className="rounded border border-green-800 bg-green-950/30 px-4 py-2 text-green-300 text-sm">
          {syncMsg}
        </div>
      )}
      <VmTable rows={vms} onAction={onAction} loading={loading} showSyncCta={user?.role === "ADMIN"} />
    </div>
  );
}
