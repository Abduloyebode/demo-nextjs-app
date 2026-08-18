"use client";

import { useState, useTransition } from "react";
import type { WorkflowListItem } from "@/lib/workflows";
import { restoreWorkflow } from "@/app/dashboard/actions";

export function WorkflowTrashRow({ workflow }: { workflow: WorkflowListItem }) {
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, startTransition] = useTransition();

  function onRestore() {
    setError(null);
    startTransition(async () => {
      const result = await restoreWorkflow(workflow.id);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="text-[0.9375rem] font-semibold text-[var(--ink)]">{workflow.name}</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Deleted {workflow.deletedAt ? workflow.deletedAt.toLocaleDateString() : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <button
          type="button"
          onClick={onRestore}
          disabled={isRestoring}
          className="inline-flex min-h-9 items-center rounded-full border border-[var(--teal)]/25 bg-[var(--surface)] px-3.5 text-xs font-medium text-[var(--teal)] transition hover:bg-[var(--teal-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRestoring ? "Restoring…" : "Restore"}
        </button>
        {error ? (
          <p role="alert" className="text-xs text-[var(--rose)]">
            {error}
          </p>
        ) : null}
      </div>
    </li>
  );
}
