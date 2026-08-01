import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockParse = vi.fn();

vi.mock("openai", () => {
  class MockOpenAI {
    chat = { completions: { parse: mockParse } };
  }
  return { default: MockOpenAI };
});

vi.mock("openai/helpers/zod", () => ({
  zodResponseFormat: vi.fn(() => ({})),
}));

const originalApiKey = process.env.OPENAI_API_KEY;

describe("extractDocumentInfo", () => {
  beforeEach(() => {
    mockParse.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  it("throws AiExtractionError when OPENAI_API_KEY is not set", async () => {
    delete process.env.OPENAI_API_KEY;
    const { extractDocumentInfo, AiExtractionError } = await import("./ai-extraction");
    await expect(extractDocumentInfo("some text")).rejects.toThrow(AiExtractionError);
  });

  it("returns a validated extraction result on success", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mockParse.mockResolvedValue({
      choices: [
        {
          message: {
            parsed: {
              title: "Test Document",
              summary: "A short summary.",
              importantDates: ["2026-01-01"],
              obligations: ["Do the thing by Friday"],
              riskLevel: "LOW",
            },
          },
        },
      ],
    });

    const { extractDocumentInfo } = await import("./ai-extraction");
    const result = await extractDocumentInfo("some document text");

    expect(result.title).toBe("Test Document");
    expect(result.riskLevel).toBe("LOW");
    expect(result.importantDates).toEqual(["2026-01-01"]);
  });

  it("throws AiExtractionError when the AI returns nothing parsed", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mockParse.mockResolvedValue({ choices: [{ message: { parsed: null } }] });

    const { extractDocumentInfo, AiExtractionError } = await import("./ai-extraction");
    await expect(extractDocumentInfo("text")).rejects.toThrow(AiExtractionError);
  });

  it("throws AiExtractionError when the parsed result fails schema validation", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mockParse.mockResolvedValue({
      choices: [
        {
          message: {
            // empty title is invalid per extractionResultSchema
            parsed: {
              title: "",
              summary: "x",
              importantDates: [],
              obligations: [],
              riskLevel: "LOW",
            },
          },
        },
      ],
    });

    const { extractDocumentInfo, AiExtractionError } = await import("./ai-extraction");
    await expect(extractDocumentInfo("text")).rejects.toThrow(AiExtractionError);
  });

  it("throws AiExtractionError when the API call itself fails", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    mockParse.mockRejectedValue(new Error("network error"));

    const { extractDocumentInfo, AiExtractionError } = await import("./ai-extraction");
    await expect(extractDocumentInfo("text")).rejects.toThrow(AiExtractionError);
  });
});
