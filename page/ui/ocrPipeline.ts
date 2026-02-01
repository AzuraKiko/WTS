import path from 'path';
import fs from 'fs';
import { Page, Locator } from '@playwright/test';

import { cropRegion, CropOptions } from '../../helpers/crop';
import { ocrImageFull, OcrRequestOptions } from '../../helpers/ocr-client';
import { setPageZoom } from '../../helpers/zoom';

/* =========================
 * Types
 * ========================= */

export interface OcrPipelineOptions<T> {
    locator: Locator;
    parse: (texts: string[]) => T;
    countMatches: (texts: string[]) => number;

    artifactPrefix: string;

    zoomLevels?: number[];
    minMatches?: number;
    threshold?: number;
    ocrOptions?: OcrRequestOptions;
    ocrScale?: number;
    cropOptions?: Omit<
        CropOptions,
        'output' | 'locator' | 'selector' | 'text' | 'targets' | 'between'
    >;
    cropper?: (page: Page, context: OcrCropContext) => Promise<Buffer>;
}

export interface OcrPipelineResult<T> {
    data: T;
    texts: string[];
    bestZoom: number;
    success: boolean;
}

export interface OcrCropContext {
    locator: Locator;
    outputPath: string;
    zoom: number;
}

/* =========================
 * Generic OCR Pipeline
 * ========================= */

export async function ocrPipeline<T>(
    page: Page,
    options: OcrPipelineOptions<T>
): Promise<OcrPipelineResult<T>> {
    const {
        locator,
        parse,
        countMatches,
        artifactPrefix,
        zoomLevels = [],
        minMatches = 4,
        threshold,
        ocrOptions,
        ocrScale,
        cropOptions,
        cropper
    } = options;

    const artifactDir = path.join('playwright', 'data');
    fs.mkdirSync(artifactDir, { recursive: true });

    let bestTexts: string[] = [];
    let bestData = parse([]);
    let bestZoom = 1;
    let success = false;

    const resolvedCropper =
        cropper ??
        ((currentPage: Page, context: OcrCropContext) =>
            cropRegion(currentPage, {
                locator: context.locator,
                padding: 20,
                extraHeight: 100,
                output: context.outputPath,
                ...cropOptions
            }));

    for (const zoom of zoomLevels) {
        await setPageZoom(page, zoom);

        const imgPath = path.join(
            artifactDir,
            `${artifactPrefix}-zoom-${zoom}.png`
        );
        const ocrPreprocessPath = path.join(
            artifactDir,
            `${artifactPrefix}-zoom-${zoom}.bw.png`
        );
        const ocrRawPath = path.join(
            artifactDir,
            `${artifactPrefix}-zoom-${zoom}.raw.json`
        );

        const buffer = await resolvedCropper(page, {
            locator,
            outputPath: imgPath,
            zoom
        });

        let texts: string[] = [];
        try {
            const preprocess = {
                grayscale: true,
                normalize: true,
                autoInvert: true,
                output: ocrPreprocessPath,
                ...(typeof ocrScale === 'number' ? { scale: ocrScale } : {}),
                ...ocrOptions?.preprocess
            };
            if (
                typeof threshold === 'number' &&
                typeof preprocess.threshold !== 'number'
            ) {
                preprocess.threshold = threshold;
            }

            const response = await ocrImageFull(buffer, {
                ...ocrOptions,
                preprocess
            });
            if (response.text && response.text.length > 0) {
                texts = response.text;
            } else if (response.items && response.items.length > 0) {
                texts = response.items.map((item) => item.text);
            } else {
                texts = [];
            }
            fs.writeFileSync(
                ocrRawPath,
                JSON.stringify(response.raw ?? response, null, 2)
            );
        } catch (error) {
            texts = [];
            fs.writeFileSync(
                ocrRawPath,
                JSON.stringify(
                    {
                        error: error instanceof Error ? error.message : String(error),
                        zoom,
                        artifactPrefix,
                        serviceUrl: ocrOptions?.serviceUrl
                    },
                    null,
                    2
                )
            );
        }

        const matchCount = countMatches(texts);
        const data = parse(texts);

        if (matchCount >= minMatches) {
            bestTexts = texts;
            bestData = data;
            bestZoom = zoom;
            success = true;
            break;
        }

        if (matchCount > countMatches(bestTexts)) {
            bestTexts = texts;
            bestData = data;
            bestZoom = zoom;
        }
    }

    await setPageZoom(page, 1);

    // fs.writeFileSync(
    //     path.join(artifactDir, `${artifactPrefix}.texts.json`),
    //     JSON.stringify(bestTexts, null, 2)
    // );

    fs.writeFileSync(
        path.join(artifactDir, `${artifactPrefix}.parsed.json`),
        JSON.stringify(bestData, null, 2)
    );

    return {
        data: bestData,
        texts: bestTexts,
        bestZoom,
        success
    };
}



// await ocrPipeline(page, {
//   locator: assetPage.overviewLocator,
//   zoomLevels: [0.8], // zoom nhỏ để chụp đủ màn hình
//   ocrScale: 2,       // phóng to ảnh trước khi OCR
//   parse: parseAsset,
//   countMatches: countAssetLabelMatches,
//   artifactPrefix: 'asset',
//   minMatches: 4
// });