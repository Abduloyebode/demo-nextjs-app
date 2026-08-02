"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { uploadDocument } from "@/app/dashboard/documents/actions";

export function DocumentUploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await uploadDocument(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setFileName(null);
      setSuccess("Upload queued. Extraction is running in the background.");
      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-panel)] sm:p-6"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Upload a PDF</h2>
        <p className="text-xs text-[var(--muted)]">Up to 10 MB · returns immediately</p>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
        We extract title, summary, important dates, obligations, and a risk
        level. Watch the list below for Pending → Processing → Completed.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-[10px] border border-[var(--rose)]/25 bg-[var(--rose-soft)] px-3 py-2 text-sm text-[var(--rose)]"
        >
          {error}
        </p>
      ) : null}

      {success ? (
        <p
          role="status"
          className="mt-4 rounded-[10px] border border-[var(--emerald)]/20 bg-[var(--emerald-soft)] px-3 py-2 text-sm text-[var(--emerald)]"
        >
          {success}
        </p>
      ) : null}

      <div className="mt-5 rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--paper)]/80 px-4 py-5">
        <label htmlFor="file" className="block text-sm font-medium text-[var(--ink-soft)]">
          Choose PDF
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            id="file"
            type="file"
            name="file"
            accept="application/pdf"
            required
            onChange={(event) => {
              const next = event.target.files?.[0]?.name ?? null;
              setFileName(next);
              setSuccess(null);
            }}
            className="block w-full text-sm text-[var(--ink-soft)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--teal)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--teal-bright)]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-[var(--teal)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--teal-bright)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Uploading…" : "Upload"}
          </button>
        </div>
        {fileName ? (
          <p className="mt-3 text-xs text-[var(--muted)]">Selected: {fileName}</p>
        ) : null}
      </div>
    </form>
  );
}
