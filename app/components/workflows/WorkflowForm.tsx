"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  workflowStatusLabels,
  workflowStatusValues,
} from "@/lib/workflow-validation";
import type { WorkflowStatus } from "@prisma/client";
import type { WorkflowActionResult } from "@/app/dashboard/actions";

type WorkflowFormValues = {
  name: string;
  description: string;
  status: WorkflowStatus;
};

const fieldClass =
  "mt-1.5 w-full rounded-[10px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal-soft)]";

export function WorkflowForm({
  initialValues,
  submitLabel,
  pendingLabel,
  action,
  onSuccess,
  onCancel,
}: {
  initialValues?: Partial<WorkflowFormValues>;
  submitLabel: string;
  pendingLabel: string;
  action: (formData: FormData) => Promise<WorkflowActionResult>;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await action(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSuccess();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? (
        <p
          role="alert"
          className="rounded-[10px] border border-[var(--rose)]/25 bg-[var(--rose-soft)] px-3 py-2 text-sm text-[var(--rose)]"
        >
          {error}
        </p>
      ) : null}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--ink-soft)]">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={120}
          defaultValue={initialValues?.name}
          className={fieldClass}
          placeholder="Ship the onboarding redesign"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-[var(--ink-soft)]"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={initialValues?.description}
          className={fieldClass}
          placeholder="Optional details"
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-[var(--ink-soft)]">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={initialValues?.status ?? "NOT_STARTED"}
          className={fieldClass}
        >
          {workflowStatusValues.map((value) => (
            <option key={value} value={value}>
              {workflowStatusLabels[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--teal)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--teal-bright)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? pendingLabel : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 text-sm font-medium text-[var(--ink-soft)] transition hover:bg-[var(--paper)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
