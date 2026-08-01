"use client";

import { useState, useTransition } from "react";
import type { Workflow } from "@prisma/client";
import { workflowStatusLabels } from "@/lib/workflow-validation";
import { deleteWorkflow, updateWorkflow } from "@/app/dashboard/actions";
import { WorkflowForm } from "@/app/components/workflows/WorkflowForm";

const statusBadgeClass: Record<Workflow["status"], string> = {
  NOT_STARTED: "bg-slate-200 text-slate-700",
  IN_PROGRESS: "bg-amber-100 text-amber-900",
  DONE: "bg-emerald-100 text-emerald-800",
};

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
      <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
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
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{workflow.name}</h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass[workflow.status]}`}
            >
              {workflowStatusLabels[workflow.status]}
            </span>
          </div>
          {workflow.description ? (
            <p className="mt-1.5 text-sm leading-6 text-slate-600">
              {workflow.description}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-slate-400">
            Updated {workflow.updatedAt.toLocaleDateString()}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="inline-flex min-h-9 items-center rounded-full border border-rose-200 bg-white px-3.5 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
      {deleteError ? (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {deleteError}
        </p>
      ) : null}
    </li>
  );
}
