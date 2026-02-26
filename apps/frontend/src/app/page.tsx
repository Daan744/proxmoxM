"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getSessionUser() ? "/dashboard" : "/login");
  }, [router]);
  return null;
}
