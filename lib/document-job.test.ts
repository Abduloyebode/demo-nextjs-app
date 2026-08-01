import { describe, expect, it } from "vitest";
import { AiExtractionError } from "@/lib/ai-extraction";
import { UnsupportedPdfError } from "@/lib/pdf";
import {
  classifyProcessingError,
  documentStatusLabel,
  isInFlightDocumentStatus,
  isTerminalDocumentStatus,
} from "@/lib/document-job";

describe("document job status helpers", () => {
  it("treats completed and failed as terminal", () => {
    expect(isTerminalDocumentStatus("COMPLETED")).toBe(true);
    expect(isTerminalDocumentStatus("FAILED")).toBe(true);
    expect(isTerminalDocumentStatus("PENDING")).toBe(false);
    expect(isTerminalDocumentStatus("PROCESSING")).toBe(false);
  });

  it("treats pending and processing as in-flight", () => {
    expect(isInFlightDocumentStatus("PENDING")).toBe(true);
    expect(isInFlightDocumentStatus("PROCESSING")).toBe(true);
    expect(isInFlightDocumentStatus("COMPLETED")).toBe(false);
    expect(isInFlightDocumentStatus("FAILED")).toBe(false);
  });

  it("labels each status for the UI", () => {
    expect(documentStatusLabel("PENDING")).toBe("Pending");
    expect(documentStatusLabel("PROCESSING")).toBe("Processing");
    expect(documentStatusLabel("COMPLETED")).toBe("Completed");
    expect(documentStatusLabel("FAILED")).toBe("Failed");
  });
});

describe("classifyProcessingError", () => {
  it("marks unsupported PDFs as permanent failures", () => {
    const result = classifyProcessingError(
      new UnsupportedPdfError("That PDF could not be read."),
    );
    expect(result).toEqual({
      permanent: true,
      message: "That PDF could not be read.",
    });
  });

  it("marks missing API key and invalid AI shape as permanent", () => {
    expect(
      classifyProcessingError(
        new AiExtractionError("OPENAI_API_KEY is not configured."),
      ).permanent,
    ).toBe(true);

    expect(
      classifyProcessingError(
        new AiExtractionError("The AI did not return a usable result."),
      ).permanent,
    ).toBe(true);

    expect(
      classifyProcessingError(
        new AiExtractionError(
          "The AI's response did not match the expected shape.",
        ),
      ).permanent,
    ).toBe(true);
  });

  it("marks ordinary AI/network failures as retryable", () => {
    const result = classifyProcessingError(
      new AiExtractionError("Connection reset by peer"),
    );
    expect(result.permanent).toBe(false);
    expect(result.message).toBe("Connection reset by peer");
  });

  it("marks unknown errors as retryable with a safe message", () => {
    const result = classifyProcessingError("boom");
    expect(result.permanent).toBe(false);
    expect(result.message).toContain("Something went wrong");
  });
});
