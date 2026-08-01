"use client";

import { useState, useTransition } from "react";
import type { Document } from "@prisma/client";
import { deleteDocument } from "@/app/dashboard/documents/actions";
import {
  documentRiskLevelLabels,
  type documentRiskLevelValues,
} from "@/lib/document-validation";
import { asStringArray } from "@/lib/document-json";

const statusBadgeClass: Record<Document["status"], string> = {
  PROCESSING: "bg-amber-100 text-amber-900",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-rose-100 text-rose-800",
};

const riskBadgeClass: Record<(typeof documentRiskLevelValues)[number], string> = {
  LOW: "bg-slate-200 text-slate-700",
  MEDIUM: "bg-amber-100 text-amber-900",
  HIGH: "bg-rose-100 text-rose-800",
};

export function DocumentRow({ document }: { document: Document }) {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function onDelete() {
    if (!window.confirm(`Delete "${document.fileName}"? This can't be undone.`)) {
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

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              {document.title ?? document.fileName}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass[document.status]}`}
            >
              {document.status === "PROCESSING"
                ? "Processing"
                : document.status === "COMPLETED"
                  ? "Completed"
                  : "Failed"}
            </span>
            {document.riskLevel ? (
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskBadgeClass[document.riskLevel]}`}
              >
                {documentRiskLevelLabels[document.riskLevel]}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-400">{document.fileName}</p>
        </div>

        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-rose-200 bg-white px-3.5 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>

      {document.status === "FAILED" && document.errorMessage ? (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {document.errorMessage}
        </p>
      ) : null}

      {document.status === "COMPLETED" ? (
        <div className="mt-3 space-y-3">
          {document.summary ? (
            <p className="text-sm leading-6 text-slate-600">{document.summary}</p>
          ) : null}

          {importantDates.length > 0 ? (
            <div>
              <p className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                Important dates
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                {importantDates.map((date, index) => (
                  <li key={index}>{date}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {obligations.length > 0 ? (
            <div>
              <p className="text-xs font-semibold tracking-[0.1em] text-slate-500 uppercase">
                Obligations / action items
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                {obligations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {deleteError ? (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {deleteError}
        </p>
      ) : null}
    </li>
  );
}
