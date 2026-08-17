"use client";

import { useState, useTransition } from "react";
import { deleteDocument } from "@/app/dashboard/documents/actions";
import {
  documentRiskLevelLabels,
  type documentRiskLevelValues,
} from "@/lib/document-validation";
import { asStringArray } from "@/lib/document-json";
import {
  documentStatusLabel,
  isInFlightDocumentStatus,
} from "@/lib/document-job";
import type { DocumentListItem } from "@/lib/documents";
import { StatusChip } from "@/app/components/ui/StatusChip";

const statusTone: Record<
  DocumentListItem["status"],
  "neutral" | "amber" | "emerald" | "rose"
> = {
  PENDING: "neutral",
  PROCESSING: "amber",
  COMPLETED: "emerald",
  FAILED: "rose",
};

const riskTone: Record<
  (typeof documentRiskLevelValues)[number],
  "neutral" | "amber" | "rose"
> = {
  LOW: "neutral",
  MEDIUM: "amber",
  HIGH: "rose",
};

export function DocumentRow({ document }: { document: DocumentListItem }) {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function onDelete() {
    if (
      !window.confirm(
        `Delete "${document.fileName}"? You can restore it later from Recently deleted.`,
      )
    ) {
      return;
    }
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteDocument(document.id);
      if (result.error) {
        setDeleteError(result.error);
      }
    });
  }

  const importantDates = asStringArray(document.importantDates);
  const obligations = asStringArray(document.obligations);
  const inFlight = isInFlightDocumentStatus(document.status);

  return (
    <li className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[0.9375rem] font-semibold text-[var(--ink)]">
              {document.title ?? document.fileName}
            </h3>
            <StatusChip tone={statusTone[document.status]}>
              {documentStatusLabel(document.status)}
            </StatusChip>
            {document.riskLevel ? (
              <StatusChip tone={riskTone[document.riskLevel]}>
                {documentRiskLevelLabels[document.riskLevel]}
              </StatusChip>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">{document.fileName}</p>

          {inFlight ? (
            <div
              className="mt-3 rounded-[10px] border border-[var(--amber)]/15 bg-[var(--amber-soft)] px-3 py-2"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-[var(--amber)]">
                {document.status === "PENDING"
                  ? "Queued for extraction"
                  : "Extracting structured details"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--amber)]/90">
                This row updates automatically when processing finishes.
              </p>
              <div
                className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--amber)]/15"
                aria-hidden="true"
              >
                <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--amber)]/70" />
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-[var(--rose)]/25 bg-[var(--surface)] px-3.5 text-xs font-medium text-[var(--rose)] transition hover:bg-[var(--rose-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rose)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      {document.status === "FAILED" && document.errorMessage ? (
        <p
          role="alert"
          className="mt-4 rounded-[10px] border border-[var(--rose)]/25 bg-[var(--rose-soft)] px-3 py-2 text-sm text-[var(--rose)]"
        >
          {document.errorMessage}
        </p>
      ) : null}

      {document.status === "COMPLETED" ? (
        <div className="mt-4 space-y-4 border-t border-[var(--line)] pt-4">
          {document.summary ? (
            <div>
              <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">
                Summary
              </p>
              <p className="mt-1.5 text-sm leading-6 text-[var(--ink-soft)]">
                {document.summary}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            {importantDates.length > 0 ? (
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">
                  Important dates
                </p>
                <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-[var(--ink-soft)]">
                  {importantDates.map((date, index) => (
                    <li key={index}>{date}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {obligations.length > 0 ? (
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-[var(--muted)] uppercase">
                  Obligations
                </p>
                <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-[var(--ink-soft)]">
                  {obligations.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {deleteError ? (
        <p role="alert" className="mt-3 text-sm text-[var(--rose)]">
          {deleteError}
        </p>
      ) : null}
    </li>
  );
}
