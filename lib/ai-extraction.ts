import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { extractionResultSchema, type ExtractionResult } from "./document-validation";

export class AiExtractionError extends Error {}

// Bounds the size (and cost) of any single request, regardless of how long
// the source document is. See Step 3 documentation for the cost estimate
// this is based on.
const MAX_INPUT_CHARACTERS = 15_000;

const MODEL = "gpt-5-mini";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new AiExtractionError("OPENAI_API_KEY is not configured.");
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export async function extractDocumentInfo(
  documentText: string,
): Promise<ExtractionResult> {
  const truncated = documentText.slice(0, MAX_INPUT_CHARACTERS);

  let completion;
  try {
    completion = await getClient().chat.completions.parse({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You extract structured information from business documents. " +
            "Be concise and factual. If a field genuinely doesn't apply, " +
            "use an empty array (for lists) rather than inventing content.",
        },
        {
          role: "user",
          content: `Extract the title, a short summary, important dates, key obligations or action items, and a suggested risk level (LOW, MEDIUM, or HIGH) from this document:\n\n${truncated}`,
        },
      ],
      response_format: zodResponseFormat(extractionResultSchema, "extraction"),
    });
  } catch (error) {
    throw new AiExtractionError(
      error instanceof Error ? error.message : "The AI request failed.",
    );
  }

  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) {
    throw new AiExtractionError("The AI did not return a usable result.");
  }

  // Belt and suspenders: the SDK already validates against the schema, but
  // re-validate explicitly so a future SDK/model change can't silently save
  // something we didn't actually check.
  const revalidated = extractionResultSchema.safeParse(parsed);
  if (!revalidated.success) {
    throw new AiExtractionError("The AI's response did not match the expected shape.");
  }

  return revalidated.data;
}
