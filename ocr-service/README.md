# Setup OCR service (Tesseract)

## 1) Cài Tesseract

### macOS (Homebrew)

```bash
brew install tesseract
brew install tesseract-lang
```

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-vie
```

### Windows (Chocolatey)

```powershell
choco install tesseract
```

Nếu hệ thống không tự nhận được `tesseract`, cần thêm vào PATH hoặc set `TESSDATA_PREFIX`.

## 2) Tạo venv + cài deps

```bash
python3 -m venv venv
source venv/bin/activate   # macOS / Linux
# venv\Scripts\activate    # Windows

pip install -r requirements.txt

# Nếu máy có nhiều version Python:
pip3 install -r requirements.txt

## Kiểm tra đã cài thành công chưa
pip list
# hoặc
pip freeze

## Chạy service
cd ocr-service

python app.py

uvicorn app:app --port 8000

uvicorn app:app --reload

```

## 3) Chạy service

```bash
cd ocr-service
uvicorn app:app --port 8000 --reload
```

## 4) Test nhanh

```bash
curl -X POST "http://localhost:8000/ocr" \
  -F "file=@./sample.png"
```

## 5) Params hỗ trợ

`/ocr` hỗ trợ query:

- `grayscale` (default: true)
- `threshold` (default: 180)
- `invert` (default: false)
- `blur` (default: 0)
- `lang` (default: vie)

Ví dụ:

```bash
curl -X POST "http://localhost:8000/ocr?lang=vie&threshold=160" \
  -F "file=@./sample.png"
```
