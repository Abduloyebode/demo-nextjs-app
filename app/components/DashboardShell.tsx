import Link from "next/link";
import { SignOutButton } from "@/app/components/SignOutButton";

const tabs = [
  { href: "/dashboard", label: "Workflows", match: "workflows" as const },
  {
    href: "/dashboard/documents",
    label: "Documents",
    match: "documents" as const,
  },
  {
    href: "/dashboard/organisation",
    label: "Organisation",
    match: "organisation" as const,
  },
];

export function DashboardShell({
  active,
  children,
  eyebrow,
  title,
  subtitle,
}: {
  active: "workflows" | "documents" | "organisation";
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {
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
        {eyebrow || title ? (
          <div className="mb-8">
            {eyebrow ? (
              <p className="text-sm font-bold tracking-[0.16em] text-teal-700 uppercase">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}

        <nav className="flex flex-wrap gap-5 border-b border-slate-200 text-sm font-medium">
          {tabs.map((tab) => {
            const isActive = tab.match === active;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  isActive
                    ? "border-b-2 border-teal-700 py-3 text-teal-700"
                    : "border-b-2 border-transparent py-3 text-slate-500 hover:text-slate-800"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
