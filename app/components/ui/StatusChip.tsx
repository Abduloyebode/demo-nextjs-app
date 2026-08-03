const toneClass = {
  neutral: "bg-[var(--paper-deep)] text-[var(--ink-soft)]",
  amber: "bg-[var(--amber-soft)] text-[var(--amber)]",
  emerald: "bg-[var(--emerald-soft)] text-[var(--emerald)]",
  rose: "bg-[var(--rose-soft)] text-[var(--rose)]",
  teal: "bg-[var(--teal-soft)] text-[var(--teal)]",
} as const;

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneClass;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
