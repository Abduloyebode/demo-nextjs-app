export default function DocumentsLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8 lg:px-10">
          <div className="h-9 w-40 animate-pulse rounded-md bg-slate-200" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <div className="h-9 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-8 h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="mt-8 space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
