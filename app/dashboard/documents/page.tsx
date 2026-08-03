import type { Metadata } from "next";
import { DashboardShell } from "@/app/components/DashboardShell";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { DocumentUploadForm } from "@/app/components/documents/DocumentUploadForm";
import { DocumentRow } from "@/app/components/documents/DocumentRow";
import { DocumentsAutoRefresh } from "@/app/components/documents/DocumentsAutoRefresh";
import { requireOrganisationMembership } from "@/lib/organisation";
import { isInFlightDocumentStatus } from "@/lib/document-job";
import { listDocuments } from "@/lib/documents";

export const metadata: Metadata = {
  title: "Documents",
};

export default async function DocumentsPage() {
  const { organisationId } = await requireOrganisationMembership();
  const documents = await listDocuments(organisationId);
  const hasInFlight = documents.some((document) =>
    isInFlightDocumentStatus(document.status),
  );
  const inFlightCount = documents.filter((document) =>
    isInFlightDocumentStatus(document.status),
  ).length;

  return (
    <>
      <DocumentsAutoRefresh active={hasInFlight} />
      <DashboardShell
        active="documents"
        title="Documents"
        subtitle="Upload a PDF; extraction runs in the background and results land here."
      >
        <DocumentUploadForm />

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
              title="No documents yet"
              description="Upload a PDF above to extract title, summary, dates, obligations, and risk."
            />
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
