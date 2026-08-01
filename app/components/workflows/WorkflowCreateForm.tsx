"use client";

import { useState } from "react";
import { createWorkflow } from "@/app/dashboard/actions";
import { WorkflowForm } from "@/app/components/workflows/WorkflowForm";

export function WorkflowCreateForm() {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-10 items-center rounded-full bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
      >
        New workflow
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <h3 className="text-sm font-semibold text-slate-900">New workflow</h3>
      <div className="mt-4">
        <WorkflowForm
          submitLabel="Create workflow"
          pendingLabel="Creating…"
          action={createWorkflow}
          onSuccess={() => setIsOpen(false)}
          onCancel={() => setIsOpen(false)}
        />
      </div>
    </div>
  );
}
