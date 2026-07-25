"use client";

import { useState } from "react";

type DayKey = "MON" | "MID" | "FRI";

const DAYS: { day: DayKey; title: string; detail: string; nextLabel: string }[] =
  [
    {
      day: "MON",
      title: "Align priorities",
      detail: "Three outcomes, one clear direction",
      nextLabel: "Monday priority check-in",
    },
    {
      day: "MID",
      title: "Check the signal",
      detail: "Resolve blockers before they grow",
      nextLabel: "Midweek signal check",
    },
    {
      day: "FRI",
      title: "Review and reset",
      detail: "Carry the learning forward",
      nextLabel: "Friday review and reset",
    },
  ];

export function WeeklyRhythmCard() {
  const [priorities, setPriorities] = useState(["", "", ""]);
  const [done, setDone] = useState<Record<DayKey, boolean>>({
    MON: false,
    MID: false,
    FRI: false,
  });

  const completedCount = Object.values(done).filter(Boolean).length;
  const status =
    completedCount === 3
      ? "Complete"
      : completedCount > 0
        ? "In progress"
        : "Not started";

  const statusClass =
    completedCount === 3
      ? "bg-emerald-100 text-emerald-800"
      : completedCount > 0
        ? "bg-amber-100 text-amber-900"
        : "bg-slate-200 text-slate-700";

  const nextDay = DAYS.find((d) => !done[d.day]);
  const nextLabel = nextDay
    ? nextDay.nextLabel
    : "All set for this week";

  function updatePriority(index: number, value: string) {
    setPriorities((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function toggleDay(day: DayKey) {
    setDone((prev) => ({ ...prev, [day]: !prev[day] }));
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-6 -z-10 rounded-[2rem] bg-teal-300/20 blur-3xl"
      />
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.07] p-3 shadow-2xl shadow-black/25 backdrop-blur sm:p-4">
        <div className="rounded-[1.25rem] bg-slate-50 p-5 text-slate-950 sm:p-7">
          <div className="flex items-start justify-between gap-5 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-teal-700 uppercase">
                Weekly rhythm
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                The work, at a glance
              </h2>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
            >
              {status}
            </span>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
              This week&apos;s priorities
            </p>
            <ul className="mt-3 space-y-2">
              {priorities.map((value, index) => (
                <li key={index}>
                  <label className="sr-only" htmlFor={`priority-${index + 1}`}>
                    Priority {index + 1}
                  </label>
                  <input
                    id={`priority-${index + 1}`}
                    type="text"
                    value={value}
                    onChange={(e) => updatePriority(index, e.target.value)}
                    placeholder={`Priority ${index + 1}`}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-200"
                  />
                </li>
              ))}
            </ul>
          </div>

          <ol className="mt-2 divide-y divide-slate-200">
            {DAYS.map((item) => {
              const isDone = done[item.day];
              return (
                <li
                  key={item.day}
                  className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 py-4 sm:gap-4"
                >
                  <span
                    className={`text-xs font-bold tracking-wider ${
                      isDone ? "text-teal-700" : "text-slate-400"
                    }`}
                  >
                    {item.day}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {item.detail}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-pressed={isDone}
                    aria-label={`Mark ${item.day} ${isDone ? "incomplete" : "complete"}`}
                    onClick={() => toggleDay(item.day)}
                    className={
                      isDone
                        ? "grid size-7 place-items-center rounded-full bg-teal-100 text-xs font-bold text-teal-800 transition hover:bg-teal-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        : "grid size-7 place-items-center rounded-full border border-slate-300 text-xs text-slate-400 transition hover:border-teal-400 hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    }
                  >
                    {isDone ? "OK" : ""}
                  </button>
                </li>
              );
            })}
          </ol>

          <p className="mt-2 rounded-xl bg-[#0b1f1e] px-4 py-3 text-sm text-slate-200">
            <span className="font-semibold text-white">Next:</span> {nextLabel}
          </p>
        </div>
      </div>
    </>
  );
}
