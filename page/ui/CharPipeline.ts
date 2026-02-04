import { Page, Locator } from '@playwright/test';
import { ocrPipeline } from './ocrPipeline';
import sharp from 'sharp';

export interface ChartHasDataResult {
    hasData: boolean;
    hasCandles: boolean;
    bestZoom: number;
    evidence: {
        byDom: boolean;
        byCanvas: boolean;
        byText: boolean;
        texts: string[];
    };
}

export interface ChartContext {
    symbol: string;        // ACB, VN30F1M, BTCUSDT
    timeframe: string;     // 1m, 5m, 1D
}

const PRICE_REGEX = /\b\d{1,4}(\.\d{1,2})?\b/;
const OHLC_REGEX = /\b[OHLC]\s?\d+/i;

function detectPrice(texts: string[]): boolean {
    return texts.some(t => PRICE_REGEX.test(t));
}

function detectOHLC(texts: string[]): boolean {
    return texts.some(t => OHLC_REGEX.test(t));
}

function detectVolume(texts: string[]): boolean {
    return texts.some(t =>
        /volume|khối lượng/i.test(t) || /\b\d+(k|m|b)\b/i.test(t)
    );
}

export async function chartHasDataPipeline(
    page: Page,
    context: ChartContext,
    options: {
        chartLocator: Locator;
    }
): Promise<ChartHasDataResult> {

    const byDom = await hasCandlesByDom(page, options.chartLocator);
    const byCanvas = byDom
        ? false
        : await hasCandlesByCanvasPixels(page, options.chartLocator);

    const ocrResult = await ocrPipeline(page, {
        locator: options.chartLocator,
        artifactPrefix: `chart-${context.symbol}-${context.timeframe}`,
        zoomLevels: [1, 0.85, 0.7],
        minMatches: 1,
        parse: (texts) => ({
            ohlc: detectOHLC(texts)
        }),
        countMatches: () => 1
    });

    const byText = detectOHLC(ocrResult.texts);

    const hasCandles = byDom || byCanvas || byText;

    return {
        hasData: hasCandles,
        hasCandles,
        bestZoom: ocrResult.bestZoom,
        evidence: {
            byDom,
            byCanvas,
            byText,
            texts: ocrResult.texts
        }
    };
}

// Chart render bằng SVG / DOM (TradingView thường có)
export async function hasCandlesByDom(page: Page, chartLocator: Locator): Promise<boolean> {
    const candleElements = chartLocator.locator(
        'rect, path, line'
    );

    const count = await candleElements.count();
    return count > 0;
}

// Canvas (phổ biến)
export async function hasCandlesByCanvasPixels(
    page: Page,
    chartLocator: Locator
): Promise<boolean> {
    const buffer = await chartLocator.screenshot();

    const { data } = await sharp(buffer)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    // Đếm pixel khác nền (không phải grid trống)
    let nonEmptyPixels = 0;
    for (let i = 0; i < data.length; i++) {
        if (data[i] < 240) nonEmptyPixels++;
    }

    return nonEmptyPixels > 5000; // threshold thực nghiệm
}




