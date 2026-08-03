"use client";

import { useState, useTransition } from "react";
import type { Workflow } from "@prisma/client";
import { workflowStatusLabels } from "@/lib/workflow-validation";
import { deleteWorkflow, updateWorkflow } from "@/app/dashboard/actions";
import { WorkflowForm } from "@/app/components/workflows/WorkflowForm";
import { StatusChip } from "@/app/components/ui/StatusChip";

const statusTone: Record<
  Workflow["status"],
  "neutral" | "amber" | "emerald"
> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "amber",
  DONE: "emerald",
};

const panelClass =
  "rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)]";

export function WorkflowRow({ workflow }: { workflow: Workflow }) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function onDelete() {
    if (!window.confirm(`Delete "${workflow.name}"? This can't be undone.`)) {
      return;
    }
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteWorkflow(workflow.id);
      if (result.error) {
        setDeleteError(result.error);
      }
    });
  }

  if (isEditing) {
    return (
      <li className={panelClass}>
        <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">
          Edit workflow
        </p>
        <div className="mt-3">
          <WorkflowForm
            initialValues={{
              name: workflow.name,
              description: workflow.description ?? "",
              status: workflow.status,
            }}
            submitLabel="Save changes"
            pendingLabel="Saving…"
            action={(formData) => updateWorkflow(workflow.id, formData)}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </li>
    );
  }

  return (
    <li className={panelClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[0.9375rem] font-semibold text-[var(--ink)]">
              {workflow.name}
            </h3>
            <StatusChip tone={statusTone[workflow.status]}>
              {workflowStatusLabels[workflow.status]}
            </StatusChip>
          </div>
          {workflow.description ? (
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {workflow.description}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--muted)]">
            Updated {workflow.updatedAt.toLocaleDateString()}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex min-h-9 items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs font-medium text-[var(--ink-soft)] transition hover:bg-[var(--paper)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="inline-flex min-h-9 items-center rounded-full border border-[var(--rose)]/25 bg-[var(--surface)] px-3.5 text-xs font-medium text-[var(--rose)] transition hover:bg-[var(--rose-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rose)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      {deleteError ? (
        <p role="alert" className="mt-3 text-sm text-[var(--rose)]">
          {deleteError}
        </p>
      ) : null}
    </li>
  );
}
