"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminClusterPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [ha, setHa] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    api.get("/cluster/health").then((res) => setHealth(res.data)).catch(() => setHealth(null));
    api.get("/cluster/ha/resources").then((res) => setHa(res.data)).catch(() => setHa([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Cluster health</h1>
      <pre className="overflow-auto rounded border border-zinc-800 bg-zinc-950 p-4 text-xs">{JSON.stringify(health, null, 2)}</pre>
      <h2 className="text-xl font-semibold">HA resources</h2>
      <pre className="overflow-auto rounded border border-zinc-800 bg-zinc-950 p-4 text-xs">{JSON.stringify(ha, null, 2)}</pre>
    </div>
  );
}
