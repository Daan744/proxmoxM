import type { ReactNode } from "react";
import "./globals.css";
import { ProtectedLayout } from "@/components/protected-layout";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <ProtectedLayout>{children}</ProtectedLayout>
      </body>
    </html>
  );
}
