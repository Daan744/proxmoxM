"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [vms, setVms] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    api.get("/vms").then((res) => setVms(res.data)).catch(() => setVms([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm text-zinc-400">Totaal VM's</p>
          <p className="text-2xl font-semibold">{vms.length}</p>
        </div>
      </div>
      <Link href="/vms/new" className="inline-block rounded bg-blue-700 px-3 py-2 text-sm text-white hover:bg-blue-600">
        Nieuwe VM maken
      </Link>
    </div>
  );
}
