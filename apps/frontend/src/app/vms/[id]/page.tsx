"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { VmLive } from "@/lib/types";

export default function VmDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [vm, setVm] = useState<VmLive | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!params?.id) return;
    try { const res = await api.get(`/vms/${params.id}/live`); setVm(res.data); } catch { setVm(null); }
  };

  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [params]);

  const action = async (a: string) => {
    if (!vm) return;
    setBusy(true);
    try {
      if (a === "delete") { await api.delete(`/vms/${vm.id}`); router.push("/vms"); return; }
      await api.post(`/vms/${vm.id}/${a}`);
      await load();
    } catch {} finally { setBusy(false); }
  };

  if (!vm) return <p className="text-zinc-400">VM laden...</p>;

  const live = vm.live;
  const memPct = live ? ((live.mem / Math.max(live.maxmem, 1)) * 100) : null;
  const cpuPct = live ? (live.cpu * 100) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{vm.name}</h1>
      <div className="flex gap-2">
        <button disabled={busy || vm.powerState === "RUNNING"} onClick={() => action("start")} className="rounded bg-green-700 px-3 py-2 text-sm text-white disabled:opacity-30">Start</button>
        <button disabled={busy || vm.powerState === "STOPPED"} onClick={() => action("stop")} className="rounded bg-yellow-700 px-3 py-2 text-sm text-white disabled:opacity-30">Stop</button>
        <button disabled={busy || vm.powerState === "STOPPED"} onClick={() => action("reboot")} className="rounded bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-30">Reboot</button>
        <button disabled={busy} onClick={() => { if (confirm("VM verwijderen?")) action("delete"); }} className="rounded bg-red-700 px-3 py-2 text-sm text-white">Delete</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-zinc-800 bg-zinc-950 p-4 space-y-1">
          <h2 className="font-semibold mb-2">Configuratie</h2>
          <Row label="VMID" value={String(vm.vmid)} />
          <Row label="Status" value={vm.status} />
          <Row label="Power" value={vm.powerState} />
          <Row label="Node" value={vm.currentNode ?? "-"} />
          <Row label="Cores" value={String(vm.cores)} />
          <Row label="Memory" value={`${vm.memoryMB} MB`} />
          <Row label="Disk" value={`${vm.diskGB} GB`} />
          <Row label="Bridge" value={vm.bridge ?? "-"} />
          <Row label="VLAN" value={vm.vlanTag ? String(vm.vlanTag) : "-"} />
          <Row label="HA" value={vm.haEnabled ? `Ja${vm.haGroup ? ` (${vm.haGroup})` : ""}` : "Nee"} />
          <Row label="Mode" value={vm.isoPath ? "ISO" : "Template"} />
          {vm.isoPath && <Row label="ISO" value={vm.isoPath} />}
          {vm.ciUser && <Row label="Cloud-init user" value={vm.ciUser} />}
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-950 p-4 space-y-1">
          <h2 className="font-semibold mb-2">Live resources</h2>
          {live ? (<>
            <Bar label="CPU" percent={cpuPct ?? 0} />
            <Bar label="RAM" percent={memPct ?? 0} detail={`${Math.round((live.mem ?? 0) / 1048576)} / ${Math.round((live.maxmem ?? 0) / 1048576)} MB`} />
            <Row label="Uptime" value={`${Math.floor((live.uptime ?? 0) / 3600)}h ${Math.floor(((live.uptime ?? 0) % 3600) / 60)}m`} />
            <Row label="Net in" value={`${Math.round((live.netin ?? 0) / 1048576)} MB`} />
            <Row label="Net out" value={`${Math.round((live.netout ?? 0) / 1048576)} MB`} />
          </>) : (<p className="text-zinc-500">Geen live data (VM offline?)</p>)}
        </div>
      </div>
      {vm.errorMessage && (<div className="rounded border border-red-800 bg-red-950 p-4 text-sm text-red-300">{vm.errorMessage}</div>)}
      <p className="text-xs text-zinc-500">Laatste sync: {vm.lastStatusSyncAt ?? "-"}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-sm"><span className="text-zinc-400">{label}</span><span>{value}</span></div>;
}

function Bar({ label, percent, detail }: { label: string; percent: number; detail?: string }) {
  const c = Math.min(100, Math.max(0, percent));
  const color = c > 80 ? "bg-red-500" : c > 60 ? "bg-yellow-500" : "bg-green-500";
  return (<div className="mt-2"><div className="flex justify-between text-xs text-zinc-400"><span>{label}</span><span>{detail ?? `${c.toFixed(1)}%`}</span></div><div className="mt-1 h-2 w-full rounded bg-zinc-800"><div className={`h-2 rounded ${color}`} style={{ width: `${c}%` }} /></div></div>);
}
