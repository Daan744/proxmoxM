"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Template, IsoFile, ProxmoxNode } from "@/lib/types";

export default function NewVmPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"template" | "iso">("template");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isos, setIsos] = useState<IsoFile[]>([]);
  const [nodes, setNodes] = useState<ProxmoxNode[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [isoPath, setIsoPath] = useState("");
  const [name, setName] = useState("vm-new");
  const [requestedNode, setRequestedNode] = useState("AUTO");
  const [cores, setCores] = useState(2);
  const [memoryMB, setMemoryMB] = useState(2048);
  const [diskGB, setDiskGB] = useState(20);
  const [haEnabled, setHaEnabled] = useState(false);
  const [ciUser, setCiUser] = useState("");
  const [ciSshKey, setCiSshKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadingMeta, setLoadingMeta] = useState(true);
  useEffect(() => {
    setLoadingMeta(true);
    Promise.all([
      api.get("/templates").then((r) => { setTemplates(Array.isArray(r.data) ? r.data : []); return r; }).catch(() => ({ data: [] })),
      api.get("/vms/isos").then((r) => { const list = Array.isArray(r.data) ? r.data : []; setIsos(list); if (list[0]) setIsoPath(list[0].volid); return r; }).catch(() => ({ data: [] })),
      api.get("/vms/nodes").then((r) => setNodes(Array.isArray(r.data) ? r.data : [])).catch(() => {})
    ]).finally(() => setLoadingMeta(false));
  }, []);

  const selectedTemplate = templates.find((t) => t.id === templateId);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { name, requestedNode, cores, memoryMB, diskGB, haEnabled };
      if (mode === "template") body.templateId = templateId;
      else body.isoPath = isoPath;
      if (ciUser || ciSshKey) body.cloudInit = { username: ciUser || undefined, sshKey: ciSshKey || undefined };
      await api.post("/vms", body);
      router.push("/vms");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Aanmaken mislukt");
    } finally { setSubmitting(false); }
  };

  function formatSize(bytes: number): string {
    if (bytes <= 0) return ""; if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Nieuwe VM</h1>
      <div className="flex gap-2">
        <button onClick={() => setMode("template")} className={`rounded px-3 py-2 text-sm ${mode === "template" ? "bg-blue-700 text-white" : "bg-zinc-800 text-zinc-300"}`}>Van template</button>
        <button onClick={() => setMode("iso")} className={`rounded px-3 py-2 text-sm ${mode === "iso" ? "bg-blue-700 text-white" : "bg-zinc-800 text-zinc-300"}`}>Van ISO</button>
      </div>
      <form className="space-y-3 rounded border border-zinc-800 bg-zinc-950 p-4" onSubmit={onSubmit}>
        <label className="block text-sm text-zinc-400">Naam<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full" /></label>
        {mode === "template" ? (
          <label className="block text-sm text-zinc-400">Template
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" disabled={loadingMeta}>
              {loadingMeta ? <option>Templates laden...</option> : templates.length === 0 ? <option value="">Geen templates – sync vanuit Proxmox in Admin → Templates</option> : templates.map((t) => <option key={t.id} value={t.id}>{t.name} (vmid {t.templateVmid})</option>)}
            </select>
          </label>
        ) : (
          <label className="block text-sm text-zinc-400">ISO
            <select value={isoPath} onChange={(e) => setIsoPath(e.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-white" disabled={loadingMeta}>
              {loadingMeta ? <option>ISO&#39;s laden...</option> : isos.length === 0 ? <option value="">Geen ISO&#39;s gevonden – upload in Proxmox naar een storage met ISO-content</option> : isos.map((iso) => <option key={iso.volid} value={iso.volid}>{iso.name} ({iso.node}) {formatSize(iso.size)}</option>)}
            </select>
          </label>
        )}
        <label className="block text-sm text-zinc-400">Node
          <select value={requestedNode} onChange={(e) => setRequestedNode(e.target.value)} className="mt-1 w-full">
            <option value="AUTO">AUTO (best fit)</option>
            {nodes.map((n) => <option key={String(n.node)} value={String(n.node)}>{String(n.node)} ({String(n.status)})</option>)}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="block text-sm text-zinc-400">Cores{selectedTemplate && <span className="ml-1 text-xs">({selectedTemplate.minCores}-{selectedTemplate.maxCores})</span>}
            <input type="number" value={cores} onChange={(e) => setCores(Number(e.target.value))} className="mt-1 w-full" min={selectedTemplate?.minCores ?? 1} max={selectedTemplate?.maxCores ?? 64} />
          </label>
          <label className="block text-sm text-zinc-400">RAM (MB){selectedTemplate && <span className="ml-1 text-xs">({selectedTemplate.minMemoryMB}-{selectedTemplate.maxMemoryMB})</span>}
            <input type="number" value={memoryMB} onChange={(e) => setMemoryMB(Number(e.target.value))} className="mt-1 w-full" min={selectedTemplate?.minMemoryMB ?? 512} />
          </label>
          <label className="block text-sm text-zinc-400">Disk (GB){selectedTemplate && <span className="ml-1 text-xs">({selectedTemplate.minDiskGB}-{selectedTemplate.maxDiskGB})</span>}
            <input type="number" value={diskGB} onChange={(e) => setDiskGB(Number(e.target.value))} className="mt-1 w-full" min={selectedTemplate?.minDiskGB ?? 5} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={haEnabled} onChange={(e) => setHaEnabled(e.target.checked)} /> HA enabled</label>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-zinc-400">Cloud-init (optioneel)</summary>
          <div className="mt-2 space-y-2">
            <label className="block text-sm text-zinc-400">Gebruiker<input value={ciUser} onChange={(e) => setCiUser(e.target.value)} className="mt-1 w-full" placeholder="bijv. ubuntu" /></label>
            <label className="block text-sm text-zinc-400">SSH public key<textarea value={ciSshKey} onChange={(e) => setCiSshKey(e.target.value)} className="mt-1 w-full" rows={3} placeholder="ssh-rsa AAAA..." /></label>
          </div>
        </details>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={submitting} className="bg-blue-700 text-white disabled:opacity-50" type="submit">{submitting ? "Bezig..." : "Provisioning starten"}</button>
      </form>
    </div>
  );
}
