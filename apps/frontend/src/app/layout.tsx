import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ProtectedLayout } from "@/components/protected-layout";

export const metadata: Metadata = {
  title: "Proxmox Self-Service Portal",
  description: "Beheer je Proxmox VE VMs en cluster"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <ProtectedLayout>{children}</ProtectedLayout>
      </body>
    </html>
  );
}
