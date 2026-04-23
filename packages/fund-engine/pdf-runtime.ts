import { createRequire } from "node:module";
type PdfParseModule = typeof import("pdf-parse");

const require = createRequire(import.meta.url);

let cachedPdfParseModule: PdfParseModule | null = null;

function loadPdfParseModule() {
  if (!cachedPdfParseModule) {
    const entryPath = require.resolve("pdf-parse");
    const loadModule = Function("loader", "modulePath", "return loader(modulePath);") as (
      loader: typeof require,
      modulePath: string,
    ) => PdfParseModule;
    cachedPdfParseModule = loadModule(require, entryPath);
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
