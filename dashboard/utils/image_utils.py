"""이미지 유틸 — bbox 오버레이, 썸네일 생성."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import streamlit as st

_VAL_DIR = Path(__file__).resolve().parent.parent.parent / "track_a_images" / "images" / "val"

GRADE_COLOR_RGB = {
    "CRITICAL": (231, 76, 60),
    "HIGH": (230, 126, 34),
    "MEDIUM": (241, 196, 15),
    "LOW": (46, 204, 113),
}


def load_val_image(image_file: str) -> Image.Image | None:
    """val 이미지를 PIL Image로 로드."""
    try:
        path = _VAL_DIR / image_file
        if path.exists():
            return Image.open(path).convert("RGB")
        return None
    except Exception:
        return None


def draw_bbox_overlay(image_file: str, bbox: dict, grade: str,
                      defect_name: str = "", thumbnail_size: tuple | None = None) -> Image.Image | None:
    """이미지에 bbox 오버레이를 그려 반환.
    bbox 좌표는 정규화(0~1) 값으로 가정."""
    img = load_val_image(image_file)
    if img is None:
        return None

    W, H = img.size
    draw = ImageDraw.Draw(img)
    color = GRADE_COLOR_RGB.get(grade, (255, 255, 255))

    x1 = bbox.get("x1", 0)
    y1 = bbox.get("y1", 0)
    x2 = bbox.get("x2", 0)
    y2 = bbox.get("y2", 0)

    # 정규화 좌표 → 픽셀 변환 (값이 0~1 범위이면 정규화로 판단)
    if all(0 <= v <= 1.01 for v in [x1, y1, x2, y2]):
        px1, py1 = int(x1 * W), int(y1 * H)
        px2, py2 = int(x2 * W), int(y2 * H)
    else:
        px1, py1 = int(x1), int(y1)
        px2, py2 = int(x2), int(y2)

    # bbox 그리기 (두께 3)
    for i in range(3):
        draw.rectangle([px1 - i, py1 - i, px2 + i, py2 + i], outline=color)

    # 텍스트 라벨
    if defect_name:
        try:
            font = ImageFont.truetype("malgun.ttf", 16)
        except Exception:
            font = ImageFont.load_default()
        label = f"{defect_name} ({grade})"
        text_bbox = draw.textbbox((px1, py1 - 20), label, font=font)
        draw.rectangle([text_bbox[0] - 2, text_bbox[1] - 2,
                        text_bbox[2] + 2, text_bbox[3] + 2], fill=color)
        draw.text((px1, py1 - 20), label, fill=(255, 255, 255), font=font)

    if thumbnail_size:
        img.thumbnail(thumbnail_size, Image.LANCZOS)

    return img
