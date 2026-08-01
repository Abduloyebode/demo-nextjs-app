import { z } from "zod";

export const documentRiskLevelValues = ["LOW", "MEDIUM", "HIGH"] as const;

export const documentRiskLevelLabels: Record<
  (typeof documentRiskLevelValues)[number],
  string
> = {
  LOW: "Low risk",
  MEDIUM: "Medium risk",
  HIGH: "High risk",
};

export const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// What we ask the LLM to return, and validate its response against before saving.
export const extractionResultSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(2000),
  importantDates: z.array(z.string().trim().min(1)).max(20),
  obligations: z.array(z.string().trim().min(1)).max(20),
  riskLevel: z.enum(documentRiskLevelValues),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;
