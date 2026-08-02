import type { Metadata } from "next";
import { DashboardShell } from "@/app/components/DashboardShell";
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

  return (
    <>
      <DocumentsAutoRefresh active={hasInFlight} />
      <DashboardShell active="documents">
        <DocumentUploadForm />

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
      </DashboardShell>
    </>
  );
}
