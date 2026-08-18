"use client";

import { useState, useTransition } from "react";
import { workflowStatusLabels } from "@/lib/workflow-validation";
import type { WorkflowListItem } from "@/lib/workflows";
import {
  deleteWorkflow,
  revertWorkflowStatus,
  updateWorkflow,
} from "@/app/dashboard/actions";
import { WorkflowForm, type WorkflowFormMember } from "@/app/components/workflows/WorkflowForm";
import { StatusChip } from "@/app/components/ui/StatusChip";

const statusTone: Record<
  WorkflowListItem["status"],
  "neutral" | "amber" | "emerald"
> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "amber",
  DONE: "emerald",
};

const panelClass =
  "rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)]";

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function isOverdue(workflow: WorkflowListItem): boolean {
  if (!workflow.dueDate || workflow.status === "DONE") return false;
  return workflow.dueDate.getTime() < Date.now();
}

export function WorkflowRow({
  workflow,
  members,
}: {
  workflow: WorkflowListItem;
  members: WorkflowFormMember[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [revertError, setRevertError] = useState<string | null>(null);
  const [isReverting, startRevertTransition] = useTransition();

  function onDelete() {
    if (
      !window.confirm(
        `Delete "${workflow.name}"? You can restore it later from Recently deleted.`,
      )
    ) {
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

  function onRevertStatus() {
    setRevertError(null);
    startRevertTransition(async () => {
      const result = await revertWorkflowStatus(workflow.id);
      if (result.error) {
        setRevertError(result.error);
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
              dueDate: toDateInputValue(workflow.dueDate),
              assigneeId: workflow.assigneeId ?? "",
            }}
            submitLabel="Save changes"
            pendingLabel="Saving…"
            action={(formData) => updateWorkflow(workflow.id, formData)}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
            members={members}
          />
        </div>
      </li>
    );
  }

  const overdue = isOverdue(workflow);

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
            {workflow.dueDate ? (
              <StatusChip tone={overdue ? "rose" : "neutral"}>
                {overdue ? "Overdue · " : "Due "}
                {workflow.dueDate.toLocaleDateString(undefined, { timeZone: "UTC" })}
              </StatusChip>
            ) : null}
          </div>
          {workflow.description ? (
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {workflow.description}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--muted)]">
            Updated {workflow.updatedAt.toLocaleDateString()}
            {workflow.assignee
              ? ` · Assigned to ${workflow.assignee.name || workflow.assignee.email}`
              : ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {workflow.previousStatus ? (
            <button
              type="button"
              onClick={onRevertStatus}
              disabled={isReverting}
              className="inline-flex min-h-9 items-center rounded-full border border-[var(--teal)]/25 bg-[var(--surface)] px-3.5 text-xs font-medium text-[var(--teal)] transition hover:bg-[var(--teal-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isReverting
                ? "Undoing…"
                : `Undo → ${workflowStatusLabels[workflow.previousStatus]}`}
            </button>
          ) : null}
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
      {revertError ? (
        <p role="alert" className="mt-3 text-sm text-[var(--rose)]">
          {revertError}
        </p>
      ) : null}
    </li>
  );
}
