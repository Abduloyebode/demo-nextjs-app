import { WeeklyRhythmCard } from "./components/WeeklyRhythmCard";

const workflowSteps = [
  {
    number: "01",
    title: "Choose the signal",
    description:
      "Agree on the outcome that matters most, then make the week's priorities visible.",
  },
  {
    number: "02",
    title: "Move with focus",
    description:
      "Give every priority a clear owner and keep progress easy to understand.",
  },
  {
    number: "03",
    title: "Review and improve",
    description:
      "Close the loop, capture what changed, and begin the next week with clarity.",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 font-semibold text-slate-950 shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-teal-400"
      >
        Skip to main content
      </a>

      <header className="absolute inset-x-0 top-0 z-20">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10"
        >
          <a
            href="#top"
            aria-label="Northstar Ops home"
            className="inline-flex items-center gap-3 rounded-md text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-teal-300 text-sm font-black text-slate-950"
            >
              N
            </span>
            <span className="font-semibold tracking-tight">Northstar Ops</span>
          </a>

          <ul className="flex items-center gap-2 text-sm font-medium sm:gap-6">
            <li className="hidden sm:block">
              <a
                href="#how-it-works"
                className="rounded-md px-2 py-2 text-slate-300 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
              >
                How it works
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                className="inline-flex min-h-11 items-center rounded-full border border-white/20 bg-white/10 px-4 text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 sm:px-5"
              >
                Get started
              </a>
            </li>
          </ul>
        </nav>
      </header>

      <main id="main-content">
        <section
          id="top"
          aria-labelledby="hero-heading"
          className="relative isolate overflow-hidden bg-[#0b1f1e] pb-20 pt-36 text-white sm:pb-24 sm:pt-40 lg:pb-28 lg:pt-44"
        >
          <div
            aria-hidden="true"
            className="absolute -right-32 -top-32 size-96 rounded-full bg-teal-400/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-48 -left-32 size-[30rem] rounded-full bg-emerald-300/10 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:px-10">
            <div className="max-w-3xl">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-200/10 px-3 py-1.5 text-sm font-medium text-teal-100">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-teal-300"
                />
                A simpler way to run the week
              </p>

              <h1
                id="hero-heading"
                className="max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-7xl"
              >
                Turn clear priorities into steady progress.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Northstar Ops gives growing teams a calm, repeatable rhythm for
                choosing what matters, moving work forward, and celebrating
                progress every week.
              </p>

              <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-teal-300 px-6 font-semibold text-slate-950 shadow-lg shadow-teal-950/20 transition hover:bg-teal-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b1f1e]"
                >
                  See how it works
                  <span aria-hidden="true">-&gt;</span>
                </a>
                <p className="text-sm leading-6 text-slate-400">
                  Start small. Keep the process visible.
                </p>
              </div>
            </div>

            <aside
              aria-label="Weekly operating rhythm"
              className="relative mx-auto w-full max-w-xl lg:mx-0"
            >
              <WeeklyRhythmCard />
            </aside>
          </div>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="scroll-mt-8 bg-slate-50 py-20 sm:py-24 lg:py-28"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-sm font-bold tracking-[0.16em] text-teal-700 uppercase">
                How it works
              </p>
              <h2
                id="how-it-works-heading"
                className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl"
              >
                One useful rhythm, repeated well.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Keep the operating system light enough to use and clear enough
                to trust.
              </p>
            </div>

            <ol className="mt-12 grid gap-5 md:grid-cols-3">
              {workflowSteps.map((step) => (
                <li
                  key={step.number}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40 sm:p-7"
                >
                  <span className="text-sm font-bold tracking-[0.14em] text-teal-700">
                    {step.number}
                  </span>
                  <h3 className="mt-8 text-xl font-semibold tracking-tight text-slate-950">
                    {step.title}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>
            <span className="font-semibold text-slate-800">Northstar Ops</span>{" "}
            - make the important work easier to see.
          </p>
          <a
            href="#top"
            className="w-fit rounded-md font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-4"
          >
            Back to top
          </a>
        </div>
      </footer>
    </div>
  );
}
