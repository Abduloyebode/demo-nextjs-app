import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@/app/components/SignOutButton";
import { DocumentUploadForm } from "@/app/components/documents/DocumentUploadForm";
import { DocumentRow } from "@/app/components/documents/DocumentRow";
import { DocumentsAutoRefresh } from "@/app/components/documents/DocumentsAutoRefresh";
import { requireUserId } from "@/lib/require-user-id";
import { isInFlightDocumentStatus } from "@/lib/document-job";
import { listDocuments } from "@/lib/documents";

export const metadata: Metadata = {
  title: "Documents",
};

export default async function DocumentsPage() {
  const userId = await requireUserId();
  const documents = await listDocuments(userId);
  const hasInFlight = documents.some((document) =>
    isInFlightDocumentStatus(document.status),
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <DocumentsAutoRefresh active={hasInFlight} />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-md text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-teal-300 text-sm font-black text-slate-950"
            >
              N
            </span>
            <span className="font-semibold tracking-tight">Northstar Ops</span>
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <nav className="flex gap-5 border-b border-slate-200 text-sm font-medium">
          <Link
            href="/dashboard"
            className="border-b-2 border-transparent py-3 text-slate-500 hover:text-slate-800"
          >
            Workflows
          </Link>
          <Link
            href="/dashboard/documents"
            className="border-b-2 border-teal-700 py-3 text-teal-700"
          >
            Documents
          </Link>
        </nav>

        <div className="mt-8">
          <DocumentUploadForm />
        </div>

        <div className="mt-8">
          {documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No documents yet.
              </p>
              <p className="mt-1.5 text-sm text-slate-500">
                Upload a PDF above to get started.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {documents.map((document) => (
                <DocumentRow key={document.id} document={document} />
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
