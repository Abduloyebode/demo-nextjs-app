import type { DocumentStatus } from "@prisma/client";
import { UnsupportedPdfError } from "@/lib/pdf";
import { AiExtractionError } from "@/lib/ai-extraction";

export function isTerminalDocumentStatus(status: DocumentStatus): boolean {
  return status === "COMPLETED" || status === "FAILED";
}

export function isInFlightDocumentStatus(status: DocumentStatus): boolean {
  return status === "PENDING" || status === "PROCESSING";
}

export type ClassifiedProcessingError = {
  permanent: boolean;
  message: string;
};

/**
 * Permanent errors should not be retried (bad PDF, missing file, etc.).
 * Temporary errors (most AI/network failures) should throw so Inngest retries.
 */
export function classifyProcessingError(
  error: unknown,
): ClassifiedProcessingError {
  if (error instanceof UnsupportedPdfError) {
    return { permanent: true, message: error.message };
  }

  if (error instanceof AiExtractionError) {
    const message = error.message;
    const looksConfigOrValidation =
      message.includes("OPENAI_API_KEY") ||
      message.includes("did not return a usable result") ||
      message.includes("did not match the expected shape");

    return {
      permanent: looksConfigOrValidation,
      message,
    };
  }

  if (error instanceof Error) {
    return {
      permanent: false,
      message: error.message || "Something went wrong while processing this document.",
    };
  }

  return {
    permanent: false,
    message: "Something went wrong while processing this document.",
  };
}

export function documentStatusLabel(status: DocumentStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "PROCESSING":
      return "Processing";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
  }
}
