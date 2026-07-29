import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-md text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-teal-300 text-sm font-black text-slate-950"
            >
              N
            </span>
            <span className="font-semibold tracking-tight">Northstar Ops</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col px-5 py-16 sm:px-8">
        {children}
      </main>
    </div>
  );
}
