import Tesseract from "tesseract.js";

const TESSERACT_VERSION = "7.0.0";

let workerPromise: Promise<Tesseract.Worker> | null = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker(["heb", "eng"], 1, {
      workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@v${TESSERACT_VERSION}/dist/worker.min.js`,
      // A directory, not a file. Tesseract picks the wasm build inside it.
      // langPath stays unset so each language is fetched from its own data package.
      corePath: `https://cdn.jsdelivr.net/npm/tesseract.js-core@v${TESSERACT_VERSION}`,
    }).catch((error: unknown) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

export async function recognizeImage(dataUrl: string) {
  const worker = await getWorker();
  const result = await worker.recognize(dataUrl);
  return result.data.text.trim();
}
