import { extractText, getDocumentProxy } from "unpdf";

export async function extractResumeText(fileBuffer: Buffer): Promise<string> {
  // unpdf parses the PDF entirely in JS/TS with zero native dependencies
  const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
  const { text } = await extractText(pdf, { mergePages: true });

  const cleaned = text
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
