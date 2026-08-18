import type {
  AttentionDocumentItem,
  AttentionSummary,
  AttentionWorkflowItem,
} from "@/lib/attention";
import { hasAnyAttentionItems } from "@/lib/attention";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { StatusChip } from "@/app/components/ui/StatusChip";

function WorkflowBucket({
  title,
  tone,
  bucket,
}: {
  title: string;
  tone: "rose" | "amber";
  bucket: { count: number; items: AttentionWorkflowItem[] };
}) {
  if (bucket.count === 0) return null;
  const extra = bucket.count - bucket.items.length;

  return (
    <div>
      <div className="flex items-center gap-2">
        <StatusChip tone={tone}>{bucket.count}</StatusChip>
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
        {bucket.items.map((item) => (
          <li key={item.id} className="truncate">
            {item.name}
          </li>
        ))}
      </ul>
      {extra > 0 ? (
        <p className="mt-1 text-xs text-[var(--muted)]">+{extra} more</p>
      ) : null}
    </div>
  );
}

function DocumentBucket({
  title,
  tone,
  bucket,
}: {
  title: string;
  tone: "rose";
  bucket: { count: number; items: AttentionDocumentItem[] };
}) {
  if (bucket.count === 0) return null;
  const extra = bucket.count - bucket.items.length;

  return (
    <div>
      <div className="flex items-center gap-2">
        <StatusChip tone={tone}>{bucket.count}</StatusChip>
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
        {bucket.items.map((item) => (
          <li key={item.id} className="truncate">
            {item.title ?? item.fileName}
          </li>
        ))}
      </ul>
      {extra > 0 ? (
        <p className="mt-1 text-xs text-[var(--muted)]">+{extra} more</p>
      ) : null}
    </div>
  );
}

export function AttentionPanel({ summary }: { summary: AttentionSummary }) {
  if (!hasAnyAttentionItems(summary)) {
    return (
      <EmptyState
        title="You're all caught up"
        description="Nothing needs attention right now."
      />
    );
  }

  return (
    <section
      aria-label="Needs attention today"
      className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)]"
    >
      <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">
        Needs attention
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <WorkflowBucket
          title="Overdue"
          tone="rose"
          bucket={summary.overdueWorkflows}
        />
        <WorkflowBucket
          title="Due today"
          tone="amber"
          bucket={summary.dueTodayWorkflows}
        />
        <DocumentBucket
          title="Failed to process"
          tone="rose"
          bucket={summary.failedDocuments}
        />
        <DocumentBucket
          title="High risk"
          tone="rose"
          bucket={summary.highRiskDocuments}
        />
      </div>
    </section>
  );
}
