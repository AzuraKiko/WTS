from fastapi import FastAPI, UploadFile, File, Query
from fastapi.concurrency import run_in_threadpool
import cv2
import numpy as np
import pytesseract

app = FastAPI()


def preprocess_image(
    img: np.ndarray,
    grayscale: bool,
    threshold: int,
    invert: bool,
    blur: int,
) -> np.ndarray:
    if grayscale:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if blur > 0:
        ksize = max(1, blur // 2 * 2 + 1)
        img = cv2.GaussianBlur(img, (ksize, ksize), 0)

    if threshold > 0:
        img = cv2.adaptiveThreshold(
            img,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2
        )

    if invert:
        img = cv2.bitwise_not(img)

    return img


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ocr")
async def ocr_image(
    file: UploadFile = File(...),
    grayscale: bool = Query(True),
    threshold: int = Query(180, ge=0, le=255),
    invert: bool = Query(False),
    blur: int = Query(0, ge=0, le=25),
    lang: str = Query("vie"),
    min_confidence: int = Query(0, ge=0, le=100),
):
    img_bytes = await file.read()
    npimg = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    if img is None:
        return {"text": [], "items": [], "error": "Invalid image"}

    img = preprocess_image(img, grayscale, threshold, invert, blur)

    config = "--oem 3 --psm 6"

    data = await run_in_threadpool(
        pytesseract.image_to_data,
        img,
        lang=lang,
        config=config,
        output_type=pytesseract.Output.DICT
    )

    items = []
    for text, conf in zip(data.get("text", []), data.get("conf", [])):
        if not text or not text.strip():
            continue

        try:
            confidence = float(conf)
        except (TypeError, ValueError):
            confidence = None

        if confidence is not None and confidence < min_confidence:
            continue

        items.append({
            "text": text.strip(),
            "confidence": confidence,
        })

    return {
        "text": [i["text"] for i in items],
        "items": items
    }
