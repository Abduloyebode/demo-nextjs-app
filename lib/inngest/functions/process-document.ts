import { NonRetriableError } from "inngest";
import { prisma } from "@/lib/prisma";
import { extractPdfText } from "@/lib/pdf";
import { extractDocumentInfo } from "@/lib/ai-extraction";
import {
  classifyProcessingError,
  isTerminalDocumentStatus,
} from "@/lib/document-job";
import {
  DOCUMENT_PROCESS_EVENT,
  inngest,
} from "@/lib/inngest/client";

type ProcessDocumentEvent = {
  name: typeof DOCUMENT_PROCESS_EVENT;
  data: {
    documentId: string;
  };
};

async function markDocumentFailed(documentId: string, message: string) {
  await prisma.document.updateMany({
    where: {
      id: documentId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
    data: {
      status: "FAILED",
      errorMessage: message,
      fileData: null,
    },
  });
}

export const processDocument = inngest.createFunction(
  {
    id: "process-document",
    triggers: { event: DOCUMENT_PROCESS_EVENT },
    // One run per document id within 24h — blocks duplicate event fan-out.
    idempotency: "event.data.documentId",
    retries: 3,
    onFailure: async ({ event, error }) => {
      const original = event.data.event as ProcessDocumentEvent | undefined;
      const documentId = original?.data?.documentId;

      if (!documentId) {
        console.error("process-document onFailure missing documentId", {
          error: error.message,
        });
        return;
      }

      console.error("process-document failed after retries", {
        documentId,
        error: error.message,
      });

      await markDocumentFailed(
        documentId,
        error.message || "Document processing failed after retries.",
      );
    },
  },
  async ({ event, step, logger }) => {
    const { documentId } = event.data as ProcessDocumentEvent["data"];

    const claimed = await step.run("claim-document", async () => {
      const existing = await prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true, status: true, fileData: true },
      });

      if (!existing) {
        logger.warn("document missing; skipping", { documentId });
        throw new NonRetriableError(`Document ${documentId} was not found.`);
      }

      if (isTerminalDocumentStatus(existing.status)) {
        logger.info("document already finished; skipping", {
          documentId,
          status: existing.status,
        });
        return { skip: true as const, reason: existing.status };
      }

      if (!existing.fileData) {
        logger.error("document has no file data", { documentId });
        await markDocumentFailed(
          documentId,
          "The uploaded file is no longer available for processing.",
        );
        throw new NonRetriableError(
          `Document ${documentId} has no file data to process.`,
        );
      }

      const updated = await prisma.document.updateMany({
        where: {
          id: documentId,
          status: { in: ["PENDING", "PROCESSING"] },
        },
        data: {
          status: "PROCESSING",
          errorMessage: null,
        },
      });

      if (updated.count === 0) {
        const again = await prisma.document.findUnique({
          where: { id: documentId },
          select: { status: true },
        });
        logger.info("could not claim document; skipping", {
          documentId,
          status: again?.status,
        });
        return { skip: true as const, reason: again?.status ?? "unknown" };
      }

      return { skip: false as const };
    });

    if (claimed.skip) {
      return { documentId, skipped: true, reason: claimed.reason };
    }

    const extraction = await step.run("extract-and-save", async () => {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true, status: true, fileData: true },
      });

      if (!document) {
        throw new NonRetriableError(`Document ${documentId} was not found.`);
      }

      if (isTerminalDocumentStatus(document.status)) {
        return { skipped: true as const, status: document.status };
      }

      if (!document.fileData) {
        await markDocumentFailed(
          documentId,
          "The uploaded file is no longer available for processing.",
        );
        throw new NonRetriableError(
          `Document ${documentId} has no file data to process.`,
        );
      }

      try {
        const text = await extractPdfText(Buffer.from(document.fileData));
        const result = await extractDocumentInfo(text);

        await prisma.document.update({
          where: { id: documentId },
          data: {
            status: "COMPLETED",
            title: result.title,
            summary: result.summary,
            importantDates: result.importantDates,
            obligations: result.obligations,
            riskLevel: result.riskLevel,
            errorMessage: null,
            fileData: null,
          },
        });

        logger.info("document processing completed", { documentId });
        return { skipped: false as const, status: "COMPLETED" as const };
      } catch (error) {
        const classified = classifyProcessingError(error);
        logger.error("document processing step failed", {
          documentId,
          permanent: classified.permanent,
          message: classified.message,
        });

        if (classified.permanent) {
          await markDocumentFailed(documentId, classified.message);
          throw new NonRetriableError(classified.message);
        }

        // Leave status as PROCESSING so retries continue; onFailure marks FAILED.
        throw error;
      }
    });

    return { documentId, ...extraction };
  },
);
