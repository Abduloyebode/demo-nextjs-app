import { describe, expect, it } from "vitest";
import { extractPdfText, UnsupportedPdfError } from "./pdf";

// A minimal, hand-built single-page PDF containing the text "Hello World".
// PDF.js (which unpdf wraps) tolerates a garbage/zeroed xref table by
// falling back to scanning the file for objects, so this doesn't need to be
// byte-perfect.
const MINIMAL_PDF_WITH_TEXT = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 300 144] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 58 >>
stream
BT /F1 24 Tf 72 72 Td (Hello World, this is a test document) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;

describe("extractPdfText", () => {
  it("extracts text from a valid PDF", async () => {
    const buffer = Buffer.from(MINIMAL_PDF_WITH_TEXT, "utf-8");
    const text = await extractPdfText(buffer);
    expect(text).toContain("Hello World");
  });

  it("rejects a file that isn't a PDF at all", async () => {
    const buffer = Buffer.from("this is definitely not a pdf file", "utf-8");
    await expect(extractPdfText(buffer)).rejects.toThrow(UnsupportedPdfError);
  });

  it("rejects an empty buffer", async () => {
    await expect(extractPdfText(Buffer.from(""))).rejects.toThrow(UnsupportedPdfError);
  });
});
