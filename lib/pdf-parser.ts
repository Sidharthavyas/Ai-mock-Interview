import * as pdfParseImport from "pdf-parse";

export async function extractResumeText(fileBuffer: Buffer): Promise<string> {
  const pdfParse = (pdfParseImport as any).default || pdfParseImport;
  const result = await pdfParse(fileBuffer);
  const cleaned = result.text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (cleaned.length < 50) {
    throw new Error(
      "Could not extract meaningful text from this PDF. It may be a scanned image rather than a text-based PDF."
    );
  }

  return cleaned;
}
