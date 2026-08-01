"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { uploadDocument } from "@/app/dashboard/documents/actions";

export function DocumentUploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await uploadDocument(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40"
    >
      <h3 className="text-sm font-semibold text-slate-900">Upload a document</h3>
      <p className="mt-1 text-sm text-slate-500">
        PDF only, up to 10 MB. The AI extracts a title, summary, important
        dates, obligations, and a risk level.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          name="file"
          accept="application/pdf"
          required
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-600"
        />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Processing…" : "Upload"}
        </button>
      </div>
    </form>
  );
}
