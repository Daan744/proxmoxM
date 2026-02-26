"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { VmTable } from "@/components/vm-table";
import type { Vm } from "@/lib/types";

export default function VmsPage() {
  const [vms, setVms] = useState<Vm[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get("/vms"); setVms(res.data); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">VM overzicht</h1>
        <div className="flex gap-2">
          <button onClick={load} className="rounded bg-zinc-700 px-3 py-2 text-sm text-white">Vernieuwen</button>
          <Link href="/vms/new" className="rounded bg-blue-700 px-3 py-2 text-sm text-white">Nieuwe VM</Link>
        </div>
      </div>
      <VmTable rows={vms} onAction={onAction} loading={loading} />
    </div>
  );
}
