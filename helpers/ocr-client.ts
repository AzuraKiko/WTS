// ocrClient.ts
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/* =========================
 * Types
 * ========================= */

export interface OcrItem {
  text: string;
  confidence?: number;
}

export interface OcrResponse {
  text: string[];
  items?: OcrItem[];
  raw?: unknown;
}

export interface OcrPreprocessOptions {
  grayscale?: boolean;
  normalize?: boolean;
  threshold?: number;
  output?: string;
  invert?: boolean;
  autoInvert?: boolean;
  scale?: number;
  resize?: {
    width?: number;
    height?: number;
    fit?: keyof sharp.FitEnum;
  };
}

export interface OcrRequestOptions {
  serviceUrl?: string;
  timeoutMs?: number;
  retries?: number;
  minConfidence?: number;
  params?: Record<string, string | number | boolean>;
  preprocess?: OcrPreprocessOptions;
  ping?: boolean;
  pingTimeoutMs?: number;
}

/* =========================
 * Config
 * ========================= */

const DEFAULT_OCR_URL =
  process.env.OCR_SERVICE_URL || 'http://localhost:8000/ocr';
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_RETRIES = 2;
const DEFAULT_THRESHOLD = 180;

/* =========================
 * Helpers
 * ========================= */

function buildUrl(
  baseUrl: string,
  params?: Record<string, string | number | boolean>
): string {
  if (!params) return baseUrl;
  const url = new URL(baseUrl);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function pingService(url: string, timeoutMs: number): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
  } catch {
    clearTimeout(timeout);
    const controllerGet = new AbortController();
    const timeoutGet = setTimeout(() => controllerGet.abort(), timeoutMs);
    try {
      await fetch(url, { method: 'GET', signal: controllerGet.signal });
      clearTimeout(timeoutGet);
    } catch (error) {
      clearTimeout(timeoutGet);
      throw new Error(
        `OCR service not reachable at ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

async function preprocessImage(
  buffer: Buffer,
  options?: OcrPreprocessOptions
): Promise<Buffer> {
  if (!options) return buffer;

  let pipeline = sharp(buffer);
  let shouldInvert = options.invert === true;
  const shouldAutoInvert = options.autoInvert === true && options.invert === undefined;
  if (shouldAutoInvert) {
    const stats = await sharp(buffer).stats();
    const mean =
      stats.channels.reduce((sum, channel) => sum + channel.mean, 0) /
      Math.max(1, stats.channels.length);
    shouldInvert = mean < 120;
  }

  if (options.grayscale !== false) pipeline = pipeline.grayscale();
  if (options.normalize !== false) pipeline = pipeline.normalize();

  if (typeof options.scale === 'number' && options.scale > 1) {
    const meta = await pipeline.metadata();
    if (meta.width && meta.height) {
      pipeline = pipeline.resize({
        width: Math.round(meta.width * options.scale),
        height: Math.round(meta.height * options.scale),
        fit: 'fill'
      });
    }
  } else if (options.resize) {
    pipeline = pipeline.resize({
      width: options.resize.width,
      height: options.resize.height,
      fit: options.resize.fit ?? 'inside'
    });
  }

  if (typeof options.threshold === 'number') {
    pipeline = pipeline.threshold(options.threshold ?? DEFAULT_THRESHOLD);
  }

  if (shouldInvert) {
    pipeline = pipeline.negate({ alpha: false });
  }

  const processed = await pipeline.png().toBuffer();
  if (options.output) {
    await fs.writeFile(options.output, processed);
  }
  return processed;
}

function extractText(
  payload: OcrResponse,
  minConfidence?: number
): string[] {
  if (!payload.items) return payload.text ?? [];

  return payload.items
    .filter(i =>
      minConfidence ? (i.confidence ?? 1) >= minConfidence : true
    )
    .map(i => i.text);
}

/* =========================
 * Main API
 * ========================= */

export async function ocrImageFull(
  input: string | Buffer,
  options: OcrRequestOptions = {}
): Promise<OcrResponse> {
  const serviceUrl = options.serviceUrl ?? DEFAULT_OCR_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const pingTimeoutMs = options.pingTimeoutMs ?? 3000;
  const serviceUrlWithParams = buildUrl(serviceUrl, options.params);

  if (options.ping !== false) {
    await pingService(serviceUrlWithParams, pingTimeoutMs);
  }

  const raw =
    typeof input === 'string' ? await fs.readFile(input) : input;

  const buffer = await preprocessImage(raw, options.preprocess);
  const filename =
    typeof input === 'string' ? path.basename(input) : 'image.png';

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const form = new FormData();
      form.append(
        'file',
        new Blob([new Uint8Array(buffer)]),
        filename
      );

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(
        serviceUrlWithParams,
        { method: 'POST', body: form, signal: controller.signal }
      );

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`OCR error ${res.status}`);
      }

      const payload = await res.json();
      return {
        text: payload.text ?? [],
        items: payload.items,
        raw: payload
      };
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
  }

  throw new Error(
    `OCR failed after ${retries} attempts at ${serviceUrlWithParams}: ${
      lastError instanceof Error ? lastError.message : 'unknown'
    }`
  );
}

export async function ocrImage(
  input: string | Buffer,
  options: OcrRequestOptions = {}
): Promise<string[]> {
  const result = await ocrImageFull(input, options);
  return extractText(result, options.minConfidence);
}
