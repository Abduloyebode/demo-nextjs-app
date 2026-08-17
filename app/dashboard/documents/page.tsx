import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/app/components/DashboardShell";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { DocumentUploadForm } from "@/app/components/documents/DocumentUploadForm";
import { DocumentRow } from "@/app/components/documents/DocumentRow";
import { DocumentTrashRow } from "@/app/components/documents/DocumentTrashRow";
import { DocumentsAutoRefresh } from "@/app/components/documents/DocumentsAutoRefresh";
import { requireOrganisationMembership } from "@/lib/organisation";
import { isInFlightDocumentStatus } from "@/lib/document-job";
import { listDocuments } from "@/lib/documents";

export const metadata: Metadata = {
  title: "Documents",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { organisationId } = await requireOrganisationMembership();
  const params = await searchParams;
  const deletedView = params.view === "deleted";

  const documents = await listDocuments(organisationId, { deleted: deletedView });
  const hasInFlight =
    !deletedView && documents.some((document) => isInFlightDocumentStatus(document.status));
  const inFlightCount = deletedView
    ? 0
    : documents.filter((document) => isInFlightDocumentStatus(document.status)).length;

  return (
    <>
      <DocumentsAutoRefresh active={hasInFlight} />
      <DashboardShell
        active="documents"
        title="Documents"
        subtitle="Upload a PDF; extraction runs in the background and results land here."
      >
        <div className="flex items-center gap-3 text-sm">
          {deletedView ? (
            <Link
              href="/dashboard/documents"
              className="font-medium text-[var(--teal)] underline decoration-[var(--teal)]/40 underline-offset-4 hover:text-[var(--teal-bright)]"
            >
              ← Back to documents
            </Link>
          ) : (
            <Link
              href="/dashboard/documents?view=deleted"
              className="font-medium text-[var(--muted)] underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--ink)]"
            >
              Recently deleted
            </Link>
          )}
        </div>

        {!deletedView ? <div className="mt-4"><DocumentUploadForm /></div> : null}

        {hasInFlight ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 rounded-[10px] border border-[var(--amber)]/20 bg-[var(--amber-soft)] px-3 py-2 text-sm text-[var(--amber)]"
          >
            {inFlightCount === 1
              ? "1 document is still extracting…"
              : `${inFlightCount} documents are still extracting…`}{" "}
            This page refreshes automatically.
          </p>
        ) : null}

        <div className="mt-6">
          {documents.length === 0 ? (
            <EmptyState
              title={deletedView ? "Nothing in the trash" : "No documents yet"}
              description={
                deletedView
                  ? "Deleted documents show up here and can be restored."
                  : "Upload a PDF above to extract title, summary, dates, obligations, and risk."
              }
            />
          ) : deletedView ? (
            <ul className="space-y-3" aria-label="Deleted document list">
              {documents.map((document) => (
                <DocumentTrashRow key={document.id} document={document} />
              ))}
            </ul>
          ) : (
            <ul className="space-y-3" aria-label="Document list">
              {documents.map((document) => (
                <DocumentRow key={document.id} document={document} />
              ))}
            </ul>
          )}
        </div>
      </DashboardShell>
    </>
  );
}
