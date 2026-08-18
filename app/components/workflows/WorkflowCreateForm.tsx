"use client";

import { useState } from "react";
import { createWorkflow } from "@/app/dashboard/actions";
import { WorkflowForm, type WorkflowFormMember } from "@/app/components/workflows/WorkflowForm";

export function WorkflowCreateForm({ members }: { members: WorkflowFormMember[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-10 items-center rounded-full bg-[var(--teal)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--teal-bright)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-2"
      >
        New workflow
      </button>
    );
  }

  return (
    <div className="w-full rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)] lg:max-w-md lg:self-start">
      <h3 className="text-sm font-semibold text-[var(--ink)]">New workflow</h3>
      <div className="mt-4">
        <WorkflowForm
          submitLabel="Create workflow"
          pendingLabel="Creating…"
          action={createWorkflow}
          onSuccess={() => setIsOpen(false)}
          onCancel={() => setIsOpen(false)}
          members={members}
        />
      </div>
    </div>
  );
}
