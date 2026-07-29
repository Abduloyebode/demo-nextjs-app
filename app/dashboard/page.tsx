import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/app/components/SignOutButton";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
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
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <p className="text-sm font-bold tracking-[0.16em] text-teal-700 uppercase">
          Dashboard
        </p>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
          Welcome, {session.user.name}.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          You&apos;re signed in as{" "}
          <span className="font-medium text-slate-800">{session.user.email}</span>.
          This space is where weekly priorities and workflows will live next.
        </p>
      </main>
    </div>
  );
}
