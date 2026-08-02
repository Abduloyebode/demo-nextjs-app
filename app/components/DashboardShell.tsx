import Link from "next/link";
import { SignOutButton } from "@/app/components/SignOutButton";

const tabs = [
  { href: "/dashboard", label: "Workflows", match: "workflows" as const },
  {
    href: "/dashboard/documents",
    label: "Documents",
    match: "documents" as const,
  },
];

export function DashboardShell({
  active,
  children,
  title,
  subtitle,
}: {
  active: "workflows" | "documents";
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--line)]/80 bg-[var(--surface)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-md text-[var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-[var(--teal-soft)] text-sm font-black text-[var(--teal)]"
            >
              N
            </span>
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Northstar Ops
            </span>
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        {(title || subtitle) && (
          <header className="max-w-2xl">
            {title ? (
              <h1
                className="text-balance text-[length:var(--font-display-size,2rem)] font-semibold text-[var(--ink)]"
                style={{
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.03em",
                  fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                }}
              >
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 text-[var(--muted)] sm:text-[0.9375rem]">
                {subtitle}
              </p>
            ) : null}
          </header>
        )}

        <nav
          aria-label="Dashboard sections"
          className="mt-8 flex gap-1 border-b border-[var(--line)]"
        >
          {tabs.map((tab) => {
            const isActive = tab.match === active;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  isActive
                    ? "border-b-2 border-[var(--teal)] px-3 py-3 text-sm font-semibold text-[var(--teal)]"
                    : "border-b-2 border-transparent px-3 py-3 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--ink-soft)]"
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
