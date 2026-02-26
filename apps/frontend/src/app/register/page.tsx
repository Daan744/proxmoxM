"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setSession } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post("/auth/register", { email, password });
      setSession(res.data.accessToken, res.data.user);
      router.push("/dashboard");
    } catch {
      setError("Registratie mislukt");
    }
  };

  return (
    <div className="mx-auto mt-24 max-w-md rounded border border-zinc-800 bg-zinc-950 p-6">
      <h1 className="mb-4 text-xl font-semibold">Register</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full" />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="w-full"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button className="w-full bg-blue-700 text-white hover:bg-blue-600" type="submit">
          Register
        </button>
      </form>
    </div>
  );
}
