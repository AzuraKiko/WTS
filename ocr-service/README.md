# Setup OCR service (Tesseract.js - TypeScript)

## 1) Cài Node.js

Khuyến nghị Node.js 18+.

## 2) Cài deps

```bash
npm install
```

## 3) Chạy service

```bash
npm run ocr:build
npm run ocr:start
```

Service mặc định chạy ở `http://localhost:8000`.

## 4) Tesseract.js language data

`tesseract.js` sẽ tự tải language data khi chạy lần đầu. Nếu muốn cache cố định:

```bash
export TESSERACT_LANG_PATH="/path/to/tessdata"
export TESSERACT_CACHE_PATH="/path/to/cache"
```

## 5) Test nhanh

```bash
curl -X POST "http://localhost:8000/ocr" \
  -F "file=@./sample.png"
```

## 6) Params hỗ trợ

`/ocr` hỗ trợ query:

- `grayscale` (default: true)
- `threshold` (default: 180)
- `invert` (default: false)
- `blur` (default: 0)
- `lang` (default: vie)
- `min_confidence` (default: 0)

Ví dụ:

```bash
curl -X POST "http://localhost:8000/ocr?lang=vie&threshold=160" \
  -F "file=@./sample.png"
```
