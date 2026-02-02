import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

type PreprocessOptions = {
  grayscale: boolean;
  threshold: number;
  invert: boolean;
  blur: number;
};

const DEFAULT_PORT = 8000;
const DEFAULT_LANG = 'vie';
const DEFAULT_THRESHOLD = 180;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

let worker: Tesseract.Worker | null = null;
let workerLang: string | null = null;
let queue = Promise.resolve();

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function ensureWorker(lang: string): Promise<Tesseract.Worker> {
  if (worker && workerLang === lang) return worker;

  if (worker) {
    await worker.terminate();
    worker = null;
  }

  const langPath = process.env.TESSERACT_LANG_PATH;
  const cachePath = process.env.TESSERACT_CACHE_PATH;

  worker = await Tesseract.createWorker(
    lang,
    undefined,
    {
      langPath: langPath || undefined,
      cachePath: cachePath || undefined
    }
  );
  await worker.load();
  await worker.reinitialize(lang);
  workerLang = lang;
  return worker;
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function preprocessImage(
  buffer: Buffer,
  options: PreprocessOptions
): Promise<Buffer> {
  let pipeline = sharp(buffer);

  if (options.grayscale) pipeline = pipeline.grayscale();

  if (options.blur > 0) {
    const sigma = Math.max(0.3, Math.min(options.blur, 25) / 2);
    pipeline = pipeline.blur(sigma);
  }

  if (options.threshold > 0) {
    pipeline = pipeline.threshold(Math.round(options.threshold));
  }

  if (options.invert) {
    pipeline = pipeline.negate({ alpha: false });
  }

  return pipeline.png().toBuffer();
}

const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.head('/ocr', (_req, res) => {
  res.status(200).end();
});

app.get('/ocr', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/ocr', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ text: [], items: [], error: 'Missing file' });
      return;
    }

    const grayscale = parseBoolean(req.query.grayscale, true);
    const threshold = parseNumber(req.query.threshold, DEFAULT_THRESHOLD);
    const invert = parseBoolean(req.query.invert, false);
    const blur = parseNumber(req.query.blur, 0);
    const lang =
      typeof req.query.lang === 'string' && req.query.lang.trim()
        ? req.query.lang.trim()
        : DEFAULT_LANG;
    const minConfidence = parseNumber(
      req.query.min_confidence ?? req.query.minConfidence,
      0
    );

    const processed = await preprocessImage(req.file.buffer, {
      grayscale,
      threshold,
      invert,
      blur
    });

    const data = await enqueue(async () => {
      const activeWorker = await ensureWorker(lang);
      const result = await activeWorker.recognize(processed);
      return result.data;
    });

    const items = (data.words ?? [])
      .filter(word => word.text && word.text.trim())
      .map(word => ({
        text: word.text.trim(),
        confidence: word.confidence
      }))
      .filter(item =>
        typeof item.confidence === 'number'
          ? item.confidence >= minConfidence
          : true
      );

    res.json({
      text: items.map(item => item.text),
      items
    });
  } catch (error) {
    res.status(500).json({
      text: [],
      items: [],
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

const port = Number(process.env.OCR_PORT) || DEFAULT_PORT;

const server = app.listen(port, () => {
  console.log(`OCR service listening on port ${port}`);
});

function shutdown() {
  server.close();
  if (worker) {
    worker.terminate().catch(() => undefined);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
