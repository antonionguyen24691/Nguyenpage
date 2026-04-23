import { createRequire } from "node:module";

type PdfParseModule = typeof import("pdf-parse");

const require = createRequire(import.meta.url);

let cachedPdfParseModule: PdfParseModule | null = null;

function loadPdfParseModule() {
  if (!cachedPdfParseModule) {
    cachedPdfParseModule = require("pdf-parse") as PdfParseModule;
  }

  return cachedPdfParseModule;
}

export async function extractPdfTextFromBuffer(buffer: Buffer) {
  const { PDFParse } = loadPdfParseModule();
  const parser = new PDFParse({ data: buffer });

  try {
    const pdfData = await parser.getText();
    return pdfData.text;
  } finally {
    await parser.destroy();
  }
}
