"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Sidebar } from "./sidebar";

export function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = getSessionUser();

  useEffect(() => {
    if (!user && !pathname.startsWith("/login") && !pathname.startsWith("/register")) {
      router.push("/login");
    }
  }, [pathname, router, user]);

  if (!user && !pathname.startsWith("/login") && !pathname.startsWith("/register")) return null;
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-zinc-900 text-zinc-100">
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
