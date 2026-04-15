"""
PaintGuard defects/ S3 업로드 스크립트
- track_a_images/images/val/ 200장 → s3://버킷/defects/images/{id}.jpg
- yolo_inference_results.csv → s3://버킷/defects/meta/{id}.json
- defects/list.json 생성 (전체 결함 리스트)

실행:
  python upload_defects.py
"""

import json
import os
import pandas as pd
import boto3
from pathlib import Path

# ─────────────────────────────────────────
# 설정
# ─────────────────────────────────────────
BUCKET_NAME = "project2-argos-i-376715672571-ap-northeast-2-an"
REGION = "ap-northeast-2"
VAL_IMAGES_DIR = Path(r"C:\paintguard\track_a_images\images\val")
YOLO_CSV = Path(r"C:\paintguard\yolo_inference_results.csv")

s3 = boto3.client("s3", region_name=REGION)


# ─────────────────────────────────────────
# 리스크 점수 계산
# ─────────────────────────────────────────
SEVERITY_SCORE = {"CRITICAL": 40, "MAJOR": 30, "MODERATE": 20, "MINOR": 10}
RISK_LEVEL = {
    range(75, 101): "CRITICAL",
    range(50, 75):  "HIGH",
    range(25, 50):  "MEDIUM",
    range(0, 25):   "LOW",
}

def get_risk_level(score: int) -> str:
    for r, level in RISK_LEVEL.items():
        if score in r:
            return level
    return "LOW"

def calc_risk_score(severity: str, conf: float) -> int:
    base = SEVERITY_SCORE.get(severity, 10)
    return min(100, int(base + conf * 60))


# ─────────────────────────────────────────
# 1. 이미지 업로드
# ─────────────────────────────────────────
def upload_images():
    print("\n[1] defects/images/ 업로드 중...")
    images = list(VAL_IMAGES_DIR.glob("*.jpg"))
    print(f"  총 {len(images)}장")

    for i, img_path in enumerate(images, 1):
        key = f"defects/images/{img_path.name}"
        with open(img_path, "rb") as f:
            s3.put_object(
                Bucket=BUCKET_NAME,
                Key=key,
                Body=f.read(),
                ContentType="image/jpeg",
            )
        if i % 20 == 0:
            print(f"  {i}/{len(images)} 완료...")

    print(f"  ✅ {len(images)}장 업로드 완료")


# ─────────────────────────────────────────
# 2. 메타 JSON 생성 + 업로드
# ─────────────────────────────────────────
def upload_meta():
    print("\n[2] defects/meta/ 업로드 중...")

    df = pd.read_csv(YOLO_CSV)

    # val 이미지 파일명 목록
    val_files = {p.name for p in VAL_IMAGES_DIR.glob("*.jpg")}

    # val 이미지만 필터링
    df_val = df[df["image_file"].isin(val_files)].copy()

    # image_file 기준으로 그룹핑 (한 이미지에 여러 결함 가능)
    grouped = df_val.groupby("image_file")

    defect_list = []

    for image_file, group in grouped:
        stem = Path(image_file).stem  # 확장자 제외 파일명

        # 결함 있는 행만
        defects = group[group["class_name"].notna() & (group["class_name"] != "")]

        detections = []
        risk_scores = []

        for _, row in defects.iterrows():
            conf = float(row["conf"]) if row["conf"] else 0.0
            severity = str(row["severity"]) if row["severity"] else "MINOR"
            risk_score = calc_risk_score(severity, conf)
            risk_scores.append(risk_score)

            detections.append({
                "class_id": int(float(row["class_id"])) if row["class_id"] else None,
                "class_name": str(row["class_name"]),
                "defect_type_code": str(row["defect_type_code"]),
                "severity": severity,
                "conf": round(conf, 4),
                "bbox": {
                    "x1": float(row["bbox_x1"]) if row["bbox_x1"] else None,
                    "y1": float(row["bbox_y1"]) if row["bbox_y1"] else None,
                    "x2": float(row["bbox_x2"]) if row["bbox_x2"] else None,
                    "y2": float(row["bbox_y2"]) if row["bbox_y2"] else None,
                    "w_norm": float(row["bbox_w_norm"]) if row["bbox_w_norm"] else None,
                    "h_norm": float(row["bbox_h_norm"]) if row["bbox_h_norm"] else None,
                    "area_norm": float(row["area_norm"]) if row["area_norm"] else None,
                },
                "risk_score": risk_score,
                "risk_level": get_risk_level(risk_score),
            })

        # 대표 리스크: 가장 높은 점수 기준
        max_risk = max(risk_scores) if risk_scores else 0
        risk_level = get_risk_level(max_risk)

        first = group.iloc[0]
        meta = {
            "id": stem,
            "image_file": image_file,
            "zone": str(first["zone"]) if first["zone"] else None,
            "color": str(first["color"]) if first["color"] else None,
            "image_id": str(first["image_id"]) if first["image_id"] else None,
            "has_defect": len(detections) > 0,
            "defect_count": len(detections),
            "max_risk_score": max_risk,
            "risk_level": risk_level,
            "detections": detections,
        }

        # S3 업로드
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=f"defects/meta/{stem}.json",
            Body=json.dumps(meta, ensure_ascii=False, default=str).encode("utf-8"),
            ContentType="application/json; charset=utf-8",
        )

        # 리스트용 요약
        defect_list.append({
            "id": stem,
            "image_file": image_file,
            "zone": meta["zone"],
            "color": meta["color"],
            "has_defect": meta["has_defect"],
            "defect_count": meta["defect_count"],
            "risk_level": risk_level,
            "max_risk_score": max_risk,
            "defect_types": list({d["defect_type_code"] for d in detections}),
        })

    print(f"  ✅ {len(defect_list)}개 메타 파일 업로드 완료")
    return defect_list


# ─────────────────────────────────────────
# 3. list.json 업로드
# ─────────────────────────────────────────
def upload_list(defect_list: list):
    print("\n[3] defects/list.json 업로드 중...")

    # 리스크 높은 순 정렬
    defect_list.sort(key=lambda x: x["max_risk_score"], reverse=True)

    s3.put_object(
        Bucket=BUCKET_NAME,
        Key="defects/list.json",
        Body=json.dumps(defect_list, ensure_ascii=False, default=str).encode("utf-8"),
        ContentType="application/json; charset=utf-8",
    )
    print(f"  ✅ list.json 업로드 완료 ({len(defect_list)}건)")


# ─────────────────────────────────────────
# 메인
# ─────────────────────────────────────────
def main():
    print("=" * 50)
    print("PaintGuard defects/ 업로드 시작")
    print(f"버킷: {BUCKET_NAME}")
    print("=" * 50)

    upload_images()
    defect_list = upload_meta()
    upload_list(defect_list)

    print("\n" + "=" * 50)
    print("✅ defects/ 업로드 전체 완료")
    print("=" * 50)


if __name__ == "__main__":
    main()
