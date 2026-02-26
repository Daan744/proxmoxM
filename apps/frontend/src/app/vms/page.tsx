"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { VmTable } from "@/components/vm-table";

export default function VmsPage() {
  const [vms, setVms] = useState<Array<Record<string, unknown>>>([]);

  const load = async () => {
    const res = await api.get("/vms");
    setVms(res.data);
  };

  useEffect(() => {
    load().catch(() => setVms([]));
  }, []);

  const onAction = async (id: string, action: "start" | "stop" | "reboot" | "delete") => {
    if (action === "delete") {
      await api.delete(`/vms/${id}`);
    } else {
      await api.post(`/vms/${id}/${action}`);
    }
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">VM overzicht</h1>
        <Link href="/vms/new" className="rounded bg-blue-700 px-3 py-2 text-sm text-white">Nieuwe VM</Link>
      </div>
      <VmTable rows={vms} onAction={onAction} />
    </div>
  );
}
