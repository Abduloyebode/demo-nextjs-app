export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-5 py-3.5 sm:px-8">
          <div className="h-9 w-40 animate-pulse rounded-md bg-[var(--paper-deep)]" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--paper-deep)]" />
        <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-[var(--paper-deep)]" />
        <div className="mt-8 h-10 w-full max-w-md animate-pulse rounded bg-[var(--paper-deep)]" />
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
