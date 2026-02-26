"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function NewVmPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState("vm-new");
  const [templateId, setTemplateId] = useState("");
  const [requestedNode, setRequestedNode] = useState("AUTO");
  const [cores, setCores] = useState(2);
  const [memoryMB, setMemoryMB] = useState(2048);
  const [diskGB, setDiskGB] = useState(20);
  const [haEnabled, setHaEnabled] = useState(false);

  useEffect(() => {
    api.get("/templates").then((res) => {
      setTemplates(res.data);
      if (res.data?.[0]?.id) setTemplateId(String(res.data[0].id));
    }).catch(() => setTemplates([]));
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await api.post("/vms", {
      name,
      templateId,
      requestedNode,
      cores,
      memoryMB,
      diskGB,
      haEnabled
    });
    router.push("/vms");
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Nieuwe VM wizard</h1>
      <form className="space-y-3 rounded border border-zinc-800 bg-zinc-950 p-4" onSubmit={onSubmit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam" className="w-full" />
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="w-full">
          {templates.map((t) => (
            <option key={String(t.id)} value={String(t.id)}>{String(t.name)} (vmid {String(t.templateVmid)})</option>
          ))}
        </select>
        <select value={requestedNode} onChange={(e) => setRequestedNode(e.target.value)} className="w-full">
          <option value="AUTO">AUTO</option>
          <option value="pve1">pve1</option>
          <option value="pve2">pve2</option>
        </select>
        <div className="grid grid-cols-3 gap-3">
          <input type="number" value={cores} onChange={(e) => setCores(Number(e.target.value))} />
          <input type="number" value={memoryMB} onChange={(e) => setMemoryMB(Number(e.target.value))} />
          <input type="number" value={diskGB} onChange={(e) => setDiskGB(Number(e.target.value))} />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={haEnabled} onChange={(e) => setHaEnabled(e.target.checked)} /> HA enabled</label>
        <button className="bg-blue-700 text-white" type="submit">Provision</button>
      </form>
    </div>
  );
}
