// cropRegion.ts
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { Page, Locator } from '@playwright/test';

/* =========================
 * Types
 * ========================= */

export interface CropPadding {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
}

export interface CropTarget {
    locator?: Locator;
    selector?: string;
    text?: string;
}

export interface CropOptions {
    output: string;
    locator?: Locator;
    selector?: string;
    text?: string;
    targets?: CropTarget[];
    between?: {
        from: CropTarget;
        to: CropTarget;
    };
    padding?: number | CropPadding;
    extraHeight?: number;
    extraWidth?: number;
    fullPage?: boolean;
    screenshot?: Buffer;
}

export type CropLocatorOptions = Omit<
    CropOptions,
    'locator' | 'selector' | 'text' | 'targets' | 'between'
>;

const DEFAULT_PADDING = 16;

/* =========================
 * Helpers
 * ========================= */

function normalizePadding(padding?: number | CropPadding): Required<CropPadding> {
    if (typeof padding === 'number') {
        return { top: padding, right: padding, bottom: padding, left: padding };
    }

    return {
        top: padding?.top ?? DEFAULT_PADDING,
        right: padding?.right ?? DEFAULT_PADDING,
        bottom: padding?.bottom ?? DEFAULT_PADDING,
        left: padding?.left ?? DEFAULT_PADDING
    };
}

function countDefined(values: Array<unknown>): number {
    return values.filter((value) => value !== undefined).length;
}

function assertSingleTarget(target: CropTarget, label: string): void {
    const count = countDefined([target.locator, target.selector, target.text]);
    if (count === 0) {
        throw new Error(`${label} must include locator, selector, or text`);
    }
    if (count > 1) {
        throw new Error(`${label} must include only one of locator, selector, or text`);
    }
}

async function resolveTarget(page: Page, target: CropTarget): Promise<Locator> {
    assertSingleTarget(target, 'Crop target');
    if (target.locator) return target.locator;
    if (target.selector) return page.locator(target.selector);
    return page.locator(`text=${target.text}`).first();
}

async function resolveCropBox(page: Page, options: CropOptions) {
    if (options.between) {
        const fromLocator = await resolveTarget(page, options.between.from);
        const toLocator = await resolveTarget(page, options.between.to);
        const [fromBox, toBox] = await Promise.all([
            fromLocator.boundingBox(),
            toLocator.boundingBox()
        ]);
        if (!fromBox || !toBox) throw new Error('Bounding box not found');

        const left = Math.min(fromBox.x, toBox.x);
        const top = Math.min(fromBox.y, toBox.y);
        const right = Math.max(fromBox.x + fromBox.width, toBox.x + toBox.width);
        const bottom = Math.max(fromBox.y + fromBox.height, toBox.y + toBox.height);

        return { x: left, y: top, width: right - left, height: bottom - top };
    }

    const hasSingleTarget = Boolean(options.locator || options.selector || options.text);
    if (options.targets && options.targets.length > 0) {
        if (hasSingleTarget) {
            throw new Error('Use either targets or locator/selector/text, not both');
        }

        const locators = await Promise.all(
            options.targets.map((target) => resolveTarget(page, target))
        );
        const boxes = await Promise.all(locators.map((locator) => locator.boundingBox()));
        const filtered = boxes.filter((box): box is NonNullable<typeof box> => Boolean(box));
        if (filtered.length === 0) throw new Error('Bounding box not found');

        const left = Math.min(...filtered.map((box) => box.x));
        const top = Math.min(...filtered.map((box) => box.y));
        const right = Math.max(...filtered.map((box) => box.x + box.width));
        const bottom = Math.max(...filtered.map((box) => box.y + box.height));

        return { x: left, y: top, width: right - left, height: bottom - top };
    }

    const locator = await resolveTarget(page, {
        locator: options.locator,
        selector: options.selector,
        text: options.text
    });
    const box = await locator.boundingBox();
    if (!box) throw new Error('Bounding box not found');
    return box;
}

/* =========================
 * Main API
 * ========================= */

export async function cropRegion(
    page: Page,
    options: CropOptions
): Promise<Buffer> {
    const box = await resolveCropBox(page, options);

    const fullPage = options.fullPage ?? true;
    const scrollOffset = fullPage
        ? await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }))
        : { x: 0, y: 0 };
    const adjustedBox = fullPage
        ? {
            x: box.x + scrollOffset.x,
            y: box.y + scrollOffset.y,
            width: box.width,
            height: box.height
        }
        : box;

    const padding = normalizePadding(options.padding);
    const screenshot =
        options.screenshot ??
        (await page.screenshot({ fullPage }));

    const deviceScaleFactor = await page.evaluate(
        () => window.devicePixelRatio || 1
    );
    const scaledPadding: Required<CropPadding> = {
        top: padding.top * deviceScaleFactor,
        right: padding.right * deviceScaleFactor,
        bottom: padding.bottom * deviceScaleFactor,
        left: padding.left * deviceScaleFactor
    };

    const image = sharp(screenshot);
    const metadata = await image.metadata();

    const imageWidth = metadata.width ?? 0;
    const imageHeight = metadata.height ?? 0;

    const left = Math.max(
        0,
        Math.round(adjustedBox.x * deviceScaleFactor - scaledPadding.left)
    );
    const top = Math.max(
        0,
        Math.round(adjustedBox.y * deviceScaleFactor - scaledPadding.top)
    );
    const width = Math.round(
        adjustedBox.width * deviceScaleFactor +
        scaledPadding.left +
        scaledPadding.right +
        (options.extraWidth ?? 0) * deviceScaleFactor
    );
    const height = Math.round(
        adjustedBox.height * deviceScaleFactor +
        scaledPadding.top +
        scaledPadding.bottom +
        (options.extraHeight ?? 0) * deviceScaleFactor
    );

    const clampedWidth =
        imageWidth > 0 ? Math.min(width, imageWidth - left) : width;
    const clampedHeight =
        imageHeight > 0 ? Math.min(height, imageHeight - top) : height;

    if (clampedWidth <= 0 || clampedHeight <= 0) {
        throw new Error('Invalid crop region');
    }

    const outputBuffer = await image
        .extract({ left, top, width: clampedWidth, height: clampedHeight })
        .png()
        .toBuffer();

    if (options.output) {
        fs.mkdirSync(path.dirname(options.output), { recursive: true });
        fs.writeFileSync(options.output, outputBuffer);
    }

    return outputBuffer;
}

export async function cropByLocator(
    page: Page,
    locator: Locator,
    options: CropLocatorOptions
): Promise<Buffer> {
    return cropRegion(page, { ...options, locator });
}

export async function cropBetweenLocators(
    page: Page,
    from: Locator,
    to: Locator,
    options: CropLocatorOptions
): Promise<Buffer> {
    return cropRegion(page, { ...options, between: { from: { locator: from }, to: { locator: to } } });
}

// Crop từ element A đến B

// await cropRegion(page, {
//     output: 'out.png',
//     between: {
//       from: { selector: '#start' },
//       to: { locator: page.getByText('End') }
//     },
//     padding: 8
//   });

// Crop nhiều element (gộp thành 1 vùng)

// await cropRegion(page, {
//     output: 'out.png',
//     targets: [
//       { selector: '.row-1' },
//       { selector: '.row-2' }
//     ]
//   });

// Crop theo locator:
// await cropByLocator(page, page.locator('#target'), {
//     output: 'out.png',
//     padding: 8
//   });

// Crop khoảng giữa 2 locator:

// await cropBetweenLocators(
//     page,
//     page.locator('#start'),
//     page.locator('#end'),
//     { output: 'out.png', padding: 8 }
//   );