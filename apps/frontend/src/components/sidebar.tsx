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
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-6">
        <p className="text-lg font-semibold text-white">Proxmox Portal</p>
        <p className="text-xs text-zinc-400">{user.email}</p>
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
        onClick={async () => {
          await api.post("/auth/logout");
          clearSession();
          router.push("/login");
        }}
        className="mt-6 rounded bg-red-700 px-3 py-2 text-sm text-white hover:bg-red-600"
      >
        Logout
      </button>
    </aside>
  );
}
