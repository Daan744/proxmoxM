"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getSessionUser } from "@/lib/auth";
import { api } from "@/lib/api";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getSessionUser();

  if (!user) return null;

  const baseLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/vms", label: "VMs" },
    { href: "/vms/new", label: "Nieuwe VM" }
  ];
  const adminLinks = [
    { href: "/admin/templates", label: "Templates" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/audit", label: "Audit" },
    { href: "/admin/cluster", label: "Cluster" }
  ];
  const links = user.role === "ADMIN" ? [...baseLinks, ...adminLinks] : baseLinks;

  return (
    <aside className="flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 p-4" role="navigation" aria-label="Hoofdnavigatie">
      <div className="mb-6">
        <p className="text-lg font-semibold text-white">Proxmox Portal</p>
        <p className="text-xs text-zinc-400">{user.email}</p>
        <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${user.role === "ADMIN" ? "bg-amber-800 text-amber-200" : "bg-zinc-700 text-zinc-300"}`}>
          {user.role}
        </span>
      </div>
      <nav className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block rounded px-3 py-2 text-sm ${
              pathname.startsWith(link.href) ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        onClick={async () => {
          try { await api.post("/auth/logout"); } catch {}
          clearSession();
          router.push("/login");
        }}
        className="mt-auto rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-900/50"
        aria-label="Uitloggen"
      >
        Uitloggen
      </button>
    </aside>
  );
}
