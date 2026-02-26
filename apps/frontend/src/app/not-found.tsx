import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold text-white">404 – Pagina niet gevonden</h1>
      <p className="text-zinc-400">De opgevraagde pagina bestaat niet.</p>
      <Link href="/dashboard" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
        Naar dashboard
      </Link>
    </div>
  );
}
