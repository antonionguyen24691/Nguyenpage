type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
type CanvasModule = typeof import("@napi-rs/canvas");
type PdfJsWorkerModule = typeof import("pdfjs-dist/legacy/build/pdf.worker.mjs");

let cachedPdfJsModule: PdfJsModule | null = null;
let nodeCanvasGlobalsReady = false;
let pdfJsWorkerReady = false;

async function ensurePdfJsNodeGlobals() {
  if (nodeCanvasGlobalsReady) {
    return;
  }

  const canvasModule = (await import("@napi-rs/canvas")) as CanvasModule;
  const globalScope = globalThis as any;

  globalScope.DOMMatrix ??= canvasModule.DOMMatrix;
  globalScope.ImageData ??= canvasModule.ImageData;
  globalScope.Path2D ??= canvasModule.Path2D;
  nodeCanvasGlobalsReady = true;
}

async function ensurePdfJsWorker() {
  if (pdfJsWorkerReady) {
    return;
  }

  const globalScope = globalThis as any;
  globalScope.pdfjsWorker ??= (await import("pdfjs-dist/legacy/build/pdf.worker.mjs")) as PdfJsWorkerModule;
  pdfJsWorkerReady = true;
}

async function loadPdfJs() {
  if (!cachedPdfJsModule) {
    await ensurePdfJsNodeGlobals();
    await ensurePdfJsWorker();
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
