"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user-id";
import { extractPdfText, UnsupportedPdfError } from "@/lib/pdf";
import { extractDocumentInfo, AiExtractionError } from "@/lib/ai-extraction";
import { MAX_PDF_SIZE_BYTES } from "@/lib/document-validation";

export type DocumentActionResult = { error: string | null };

const PDF_MAGIC_BYTES = Buffer.from("%PDF-");

function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, PDF_MAGIC_BYTES.length).equals(PDF_MAGIC_BYTES);
}

export async function uploadDocument(
  formData: FormData,
): Promise<DocumentActionResult> {
  const userId = await requireUserId();

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
      fileName: file.name.slice(0, 255),
      fileSize: file.size,
      status: "PROCESSING",
    },
  });

  try {
    const text = await extractPdfText(buffer);
    const result = await extractDocumentInfo(text);

    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "COMPLETED",
        title: result.title,
        summary: result.summary,
        importantDates: result.importantDates,
        obligations: result.obligations,
        riskLevel: result.riskLevel,
      },
    });
  } catch (error) {
    const message =
      error instanceof UnsupportedPdfError || error instanceof AiExtractionError
        ? error.message
        : "Something went wrong while processing this document.";

    await prisma.document.update({
      where: { id: document.id },
      data: { status: "FAILED", errorMessage: message },
    });

    revalidatePath("/dashboard/documents");
    return { error: message };
  }

  revalidatePath("/dashboard/documents");
  return { error: null };
}

export async function deleteDocument(id: string): Promise<DocumentActionResult> {
  const userId = await requireUserId();

  const result = await prisma.document.deleteMany({
    where: { id, ownerId: userId },
  });

  if (result.count === 0) {
    return { error: "That document could not be found." };
  }

  revalidatePath("/dashboard/documents");
  return { error: null };
}
