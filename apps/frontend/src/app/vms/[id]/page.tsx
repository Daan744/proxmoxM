"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function VmDetailPage() {
  const params = useParams<{ id: string }>();
  const [vm, setVm] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    api.get(`/vms/${params.id}`).then((res) => setVm(res.data)).catch(() => setVm(null));
  }, [params]);

  if (!vm) return <p>VM laden...</p>;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">VM details</h1>
      <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
        <p>Naam: {String(vm.name)}</p>
        <p>VMID: {String(vm.vmid)}</p>
        <p>Status: {String(vm.status)}</p>
        <p>Power: {String(vm.powerState)}</p>
        <p>Node: {String(vm.currentNode ?? "-")}</p>
        <p>Last sync: {String(vm.lastStatusSyncAt ?? "-")}</p>
      </div>
    </div>
  );
}
