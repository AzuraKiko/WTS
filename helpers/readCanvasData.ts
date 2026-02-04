import { Page } from '@playwright/test';
import fs from 'fs';

export interface CanvasReadOptions {
    region?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    sample?: number; // lấy mỗi N pixel (giảm size)
    includeBase64?: boolean;
}

export interface CanvasData {
    width: number;
    height: number;
    pixels: number[];
    base64?: string;
}


export async function readCanvasData(
    page: Page,
    selector: string,
    options: CanvasReadOptions = {}
): Promise<CanvasData> {

    const {
        region,
        sample = 1,
        includeBase64 = false
    } = options;

    await page.waitForSelector(selector);

    return page.$eval(
        selector,
        (canvas, opts) => {
            if (!(canvas instanceof HTMLCanvasElement)) {
                throw new Error('Element is not a canvas');
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Canvas 2D context not available');
            }

            const x = opts.region?.x ?? 0;
            const y = opts.region?.y ?? 0;
            const w = opts.region?.width ?? canvas.width;
            const h = opts.region?.height ?? canvas.height;

            const imageData = ctx.getImageData(x, y, w, h);
            const raw = imageData.data;

            // 🔥 sampling để giảm data
            const pixels: number[] = [];
            for (let i = 0; i < raw.length; i += 4 * opts.sample) {
                pixels.push(raw[i], raw[i + 1], raw[i + 2], raw[i + 3]);
            }

            return {
                width: w,
                height: h,
                pixels,
                base64: opts.includeBase64
                    ? canvas.toDataURL('image/png')
                    : undefined
            };
        },
        { region, sample, includeBase64 }
    );
}

// Check if canvas has data (Chart có nến / line đã vẽ)
export async function canvasHasData(
    page: Page,
    selector: string
  ): Promise<boolean> {
    const { pixels } = await readCanvasData(page, selector, {
      sample: 10
    });
  
    return pixels.some(v => v !== 0);
  }
  
  // Check if canvas changed after an action (zoom / change timeframe / change symbol)
  export async function canvasChanged(
    page: Page,
    selector: string,
    action: () => Promise<void>
  ): Promise<boolean> {
    const before = await readCanvasData(page, selector, { sample: 5 });
  
    await action();
  
    const after = await readCanvasData(page, selector, { sample: 5 });
  
    return JSON.stringify(before.pixels) !== JSON.stringify(after.pixels);
  }
  
// Snapshot canvas ra file (debug CI)
  export async function saveCanvasImage(
    page: Page,
    selector: string,
    path: string
  ) {
    const { base64 } = await readCanvasData(page, selector, {
      includeBase64: true
    });
  
    if (!base64) return;
  
    fs.writeFileSync(
      path,
      base64.replace(/^data:image\/png;base64,/, ''),
      'base64'
    );
  }
  
  // Example 
//   test('chart render đúng', async ({ page }) => {
//     await page.goto('/chart');
  
//     expect(await canvasHasData(page, '#chartCanvas')).toBe(true);
  
//     const changed = await canvasChanged(page, '#chartCanvas', async () => {
//       await page.click('text=1D');
//     });
  
//     expect(changed).toBe(true);
//   });
  