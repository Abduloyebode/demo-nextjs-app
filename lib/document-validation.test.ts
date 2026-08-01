import { describe, expect, it } from "vitest";
import { extractionResultSchema } from "./document-validation";

describe("extractionResultSchema", () => {
  it("accepts a valid extraction result", () => {
    const result = extractionResultSchema.safeParse({
      title: "Service Agreement",
      summary: "A short summary of the document.",
      importantDates: ["2026-03-01", "2026-06-01"],
      obligations: ["Pay invoice within 30 days"],
      riskLevel: "MEDIUM",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty arrays for dates and obligations", () => {
    const result = extractionResultSchema.safeParse({
      title: "Simple Note",
      summary: "Nothing much here.",
      importantDates: [],
      obligations: [],
      riskLevel: "LOW",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing title", () => {
    const result = extractionResultSchema.safeParse({
      title: "",
      summary: "A summary.",
      importantDates: [],
      obligations: [],
      riskLevel: "LOW",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid risk level", () => {
    const result = extractionResultSchema.safeParse({
      title: "Doc",
      summary: "A summary.",
      importantDates: [],
      obligations: [],
      riskLevel: "SEVERE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a summary that is too long", () => {
    const result = extractionResultSchema.safeParse({
      title: "Doc",
      summary: "a".repeat(2001),
      importantDates: [],
      obligations: [],
      riskLevel: "LOW",
    });
    expect(result.success).toBe(false);
  });
});
