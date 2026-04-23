type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let cachedPdfJsModule: PdfJsModule | null = null;

async function loadPdfJs() {
  if (!cachedPdfJsModule) {
    cachedPdfJsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
  }

  return cachedPdfJsModule;
}

export async function extractPdfTextFromBuffer(buffer: Buffer) {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: false,
  });
  const pdf = await loadingTask.promise;

  try {
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);

      try {
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .filter(Boolean)
          .join(" ");

        if (pageText) {
          pageTexts.push(pageText);
        }
      } finally {
        page.cleanup();
      }
    }

    return pageTexts.join("\n");
  } finally {
    await loadingTask.destroy();
    await pdf.destroy();
  }
}
