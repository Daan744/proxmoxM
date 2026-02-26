"use client";

import Link from "next/link";
import type { Vm } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  RUNNING: "bg-green-700 text-green-100",
  STOPPED: "bg-zinc-700 text-zinc-200",
  PROVISIONING: "bg-blue-700 text-blue-100",
  FAILED: "bg-red-700 text-red-100",
  DELETED: "bg-zinc-900 text-zinc-500"
};

export function VmTable({ rows, onAction, loading, showSyncCta }: {
  rows: Vm[];
  onAction: (id: string, action: "start" | "stop" | "reboot" | "delete") => Promise<void>;
  loading?: boolean;
  showSyncCta?: boolean;
}) {
  if (loading) return <p className="text-zinc-400">Laden...</p>;
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center">
        <p className="text-zinc-400">Geen VMs gevonden.</p>
        {showSyncCta && (
          <p className="mt-2 text-sm text-zinc-500">Klik op &quot;Sync Proxmox&quot; om bestaande VMs uit Proxmox te importeren.</p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-900 text-zinc-300">
          <tr>
            <th className="px-3 py-2 text-left">Naam</th>
            <th className="px-3 py-2 text-left">VMID</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Power</th>
            <th className="px-3 py-2 text-left">Node</th>
            <th className="px-3 py-2 text-left">Cores</th>
            <th className="px-3 py-2 text-left">RAM</th>
            <th className="px-3 py-2 text-left">Disk</th>
            <th className="px-3 py-2 text-left">Acties</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((vm) => (
            <tr key={vm.id} className="border-t border-zinc-800 hover:bg-zinc-900/50">
              <td className="px-3 py-2"><Link href={`/vms/${vm.id}`} className="text-blue-400 hover:underline">{vm.name}</Link></td>
              <td className="px-3 py-2">{vm.vmid}</td>
              <td className="px-3 py-2"><span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[vm.status] ?? "bg-zinc-800"}`}>{vm.status}</span></td>
              <td className="px-3 py-2">{vm.powerState}</td>
              <td className="px-3 py-2">{vm.currentNode ?? "-"}</td>
              <td className="px-3 py-2">{vm.cores}</td>
              <td className="px-3 py-2">{vm.memoryMB} MB</td>
              <td className="px-3 py-2">{vm.diskGB} GB</td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <button disabled={vm.powerState === "RUNNING"} className="rounded bg-green-700 px-2 py-1 text-xs text-white disabled:opacity-30" onClick={() => onAction(vm.id, "start")}>Start</button>
                  <button disabled={vm.powerState === "STOPPED"} className="rounded bg-yellow-700 px-2 py-1 text-xs text-white disabled:opacity-30" onClick={() => onAction(vm.id, "stop")}>Stop</button>
                  <button disabled={vm.powerState === "STOPPED"} className="rounded bg-blue-700 px-2 py-1 text-xs text-white disabled:opacity-30" onClick={() => onAction(vm.id, "reboot")}>Reboot</button>
                  <button className="rounded bg-red-700 px-2 py-1 text-xs text-white" onClick={() => { if (confirm("VM verwijderen?")) onAction(vm.id, "delete"); }}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
