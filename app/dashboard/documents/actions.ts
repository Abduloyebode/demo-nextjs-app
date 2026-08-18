"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrganisationMembership } from "@/lib/organisation";
import { MAX_PDF_SIZE_BYTES } from "@/lib/document-validation";
import {
  deleteDocumentForOrg,
  restoreDocumentForOrg,
  type DocumentActionResult,
} from "@/lib/document-admin";
import {
  DOCUMENT_PROCESS_EVENT,
  inngest,
} from "@/lib/inngest/client";

export type { DocumentActionResult };

const PDF_MAGIC_BYTES = Buffer.from("%PDF-");

function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES);
}

export async function uploadDocument(
  formData: FormData,
): Promise<DocumentActionResult> {
  const { userId, organisationId } = await requireOrganisationMembership();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF file to upload." };
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return { error: "That file is too large (10 MB limit)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!looksLikePdf(buffer)) {
    return { error: "That doesn't look like a PDF file." };
  }

  const document = await prisma.document.create({
    data: {
      ownerId: userId,
      organisationId,
      fileName: file.name.slice(0, 255),
      fileSize: file.size,
      fileData: buffer,
      status: "PENDING",
    },
  });

  try {
    await inngest.send({
      name: DOCUMENT_PROCESS_EVENT,
      data: { documentId: document.id },
      id: `document-process-${document.id}`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not queue document processing.";

    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "FAILED",
        errorMessage: message,
        fileData: null,
      },
    });

    revalidatePath("/dashboard/documents");
    return { error: message };
  }

  revalidatePath("/dashboard/documents");
  return { error: null };
}

export async function deleteDocument(id: string): Promise<DocumentActionResult> {
  const ctx = await requireOrganisationMembership();
  const result = await deleteDocumentForOrg(ctx, id);
  if (result.error === null) {
    revalidatePath("/dashboard/documents");
  }
  return result;
}

export async function restoreDocument(id: string): Promise<DocumentActionResult> {
  const ctx = await requireOrganisationMembership();
  const result = await restoreDocumentForOrg(ctx, id);
  if (result.error === null) {
    revalidatePath("/dashboard/documents");
  }
  return result;
}
