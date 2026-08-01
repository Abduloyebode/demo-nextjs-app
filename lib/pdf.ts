import { extractText, getDocumentProxy } from "unpdf";

export class UnsupportedPdfError extends Error {}

// Below this, treat the PDF as having no usable text layer (e.g. a scanned
// image PDF) rather than silently sending near-empty text to the AI.
const MIN_EXTRACTED_TEXT_LENGTH = 20;

export async function extractPdfText(buffer: Buffer): Promise<string> {
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
  } catch {
    throw new UnsupportedPdfError("Could not read this file as a PDF.");
  }

  const { text } = await extractText(pdf, { mergePages: true });
  const trimmed = text.trim();

  if (trimmed.length < MIN_EXTRACTED_TEXT_LENGTH) {
    throw new UnsupportedPdfError(
      "This PDF doesn't have a readable text layer (it may be a scanned image).",
    );
  }

  return trimmed;
}
