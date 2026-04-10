"""
YOLOv11s-cls 색상 분류 본학습 스크립트 (paintguard_color_cls).

Step 0: 파일명에서 color 라벨 추출 → color_cls_dataset/ 구성 (shutil.copy2)
Step 1: YOLOv11s-cls 학습 (epochs=30, imgsz=224, batch=32, patience=10)
Step 2: val 평가 / Top-1, Top-5, 클래스별 정확도 리포트
Step 3: _color_cls_result.json 저장

주의:
- track_a_images/ 원본 절대 수정 금지 (copy2 만 사용)
- yolo_runs/paintguard_v11s/, yolo_runs/paintguard_v1/ 절대 건드리지 말 것
- green 색상(10번째) 은 9개 클래스에 없으므로 데이터셋에서 제외.
"""
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import json
import shutil
import time
from pathlib import Path
from collections import Counter, defaultdict

# ---------------- 상수 ----------------
PROJ = Path("C:/Users/user/Desktop/PROJ2")
SRC_TRAIN = PROJ / "track_a_images" / "images" / "train"
SRC_VAL   = PROJ / "track_a_images" / "images" / "val"
DST_ROOT  = PROJ / "color_cls_dataset"
RUN_PROJ  = PROJ / "yolo_runs"
RUN_NAME  = "paintguard_color_cls"
RUN_DIR   = RUN_PROJ / RUN_NAME
RESULT_JSON = PROJ / "_color_cls_result.json"

# 9개 색상 (green 제외)
COLOR_CLASSES = [
    "black", "white", "pearl_white", "silver",
    "red", "bronze", "gray", "blue", "navy",
]

# 파일명 파싱용
KNOWN_ZONES = [
    "front_door", "rear_door", "hood", "trunk",
    "roof", "rocker", "bumper", "fender",
]
# 매칭 순서 주의: pearl_white 를 white 보다 먼저 검사해야 함
KNOWN_COLORS_ORDERED = [
    "pearl_white", "black", "white", "silver",
    "red", "bronze", "gray", "blue", "navy", "green",
]


def parse_filename(fname: str):
    """`{zone}_{color}_{id}.jpg` → (zone, color) or (None, None)."""
    name = fname[:-4] if fname.lower().endswith(".jpg") else fname
    zone = None
    for z in KNOWN_ZONES:
        if name.startswith(z + "_"):
            zone = z
            break
    if zone is None:
        return None, None
    rest = name[len(zone) + 1:]
    color = None
    for c in KNOWN_COLORS_ORDERED:
        if rest.startswith(c + "_"):
            color = c
            break
    return zone, color


# ---------------- Step 0: 데이터셋 구성 ----------------
def build_dataset():
    print("=" * 60)
    print("[Step 0] color_cls_dataset 구성")
    print("=" * 60)

    if DST_ROOT.exists():
        print(f"기존 {DST_ROOT} 제거 후 재구성")
        shutil.rmtree(DST_ROOT)

    # 폴더 생성
    for split in ("train", "val"):
        for c in COLOR_CLASSES:
            (DST_ROOT / split / c).mkdir(parents=True, exist_ok=True)

    counts = defaultdict(lambda: defaultdict(int))
    skipped = defaultdict(int)  # split → skipped count

    for split, src in (("train", SRC_TRAIN), ("val", SRC_VAL)):
        for p in sorted(src.iterdir()):
            if not p.suffix.lower() == ".jpg":
                continue
            zone, color = parse_filename(p.name)
            if color is None:
                skipped[split] += 1
                print(f"  [parse fail] {split}/{p.name}")
                continue
            if color not in COLOR_CLASSES:
                # green 등 9개 밖 → skip
                skipped[split] += 1
                continue
            dst = DST_ROOT / split / color / p.name
            shutil.copy2(p, dst)
            counts[split][color] += 1

    # 리포트
    print(f"\n클래스별 이미지 수")
    print(f"{'class':15s} {'train':>6s} {'val':>6s}")
    print("-" * 30)
    t_tot, v_tot = 0, 0
    for c in COLOR_CLASSES:
        t = counts["train"][c]
        v = counts["val"][c]
        t_tot += t
        v_tot += v
        print(f"{c:15s} {t:>6d} {v:>6d}")
    print("-" * 30)
    print(f"{'TOTAL':15s} {t_tot:>6d} {v_tot:>6d}")
    print(f"\n제외(green 등): train={skipped['train']}, val={skipped['val']}")

    return counts, skipped, t_tot, v_tot


# ---------------- Step 1: 학습 ----------------
def train_model():
    print("\n" + "=" * 60)
    print("[Step 1] YOLOv11s-cls 학습 시작")
    print("=" * 60)

    from ultralytics import YOLO

    model = YOLO("yolo11s-cls.pt")  # classification pretrained (auto-download)

    start = time.time()

    model.train(
        data=str(DST_ROOT),
        epochs=30,
        imgsz=224,
        batch=32,
        patience=10,
        project=str(RUN_PROJ),
        name=RUN_NAME,
        exist_ok=True,
        optimizer="AdamW",
        lr0=0.001,
        weight_decay=0.0005,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        flipud=0.0,
        fliplr=0.5,
        verbose=True,
    )

    elapsed = time.time() - start
    print(f"\n[완료] 총 소요: {elapsed/60:.1f}분 ({elapsed:.1f}초)")
    return elapsed


# ---------------- Step 2: 평가 ----------------
def evaluate():
    print("\n" + "=" * 60)
    print("[Step 2] val 평가")
    print("=" * 60)

    from ultralytics import YOLO

    best_pt = RUN_DIR / "weights" / "best.pt"
    if not best_pt.exists():
        raise FileNotFoundError(f"best.pt 없음: {best_pt}")

    model = YOLO(str(best_pt))
    metrics = model.val(data=str(DST_ROOT), split="val", imgsz=224, verbose=False)

    top1 = float(metrics.top1)
    top5 = float(metrics.top5)

    print(f"val Top-1 Accuracy: {top1:.4f}")
    print(f"val Top-5 Accuracy: {top5:.4f}")

    # 클래스별 정확도 (수동 계산: val 폴더에서 각 이미지 추론)
    print("\n클래스별 정확도 계산 중 ...")
    per_class_correct = defaultdict(int)
    per_class_total   = defaultdict(int)

    # 모델의 클래스 이름 리스트 (폴더명 알파벳순으로 ultralytics 가 로드)
    class_names = model.names  # dict {idx: name}
    name_to_idx = {v: k for k, v in class_names.items()}

    for c in COLOR_CLASSES:
        vdir = DST_ROOT / "val" / c
        for p in sorted(vdir.iterdir()):
            if p.suffix.lower() != ".jpg":
                continue
            per_class_total[c] += 1
            res = model.predict(source=str(p), imgsz=224, verbose=False)[0]
            pred_idx = int(res.probs.top1)
            pred_name = class_names[pred_idx]
            if pred_name == c:
                per_class_correct[c] += 1

    per_class_acc = {}
    print(f"\n{'class':15s} {'correct':>8s} {'total':>6s} {'acc':>8s}")
    print("-" * 42)
    for c in COLOR_CLASSES:
        tot = per_class_total[c]
        cor = per_class_correct[c]
        acc = cor / tot if tot > 0 else 0.0
        per_class_acc[c] = acc
        print(f"{c:15s} {cor:>8d} {tot:>6d} {acc:>7.4f}")

    return top1, top5, per_class_acc


# ---------------- Step 3: 결과 저장 ----------------
def save_result(top1, top5, per_class_acc, train_time_sec, counts, skipped):
    print("\n" + "=" * 60)
    print("[Step 3] _color_cls_result.json 저장")
    print("=" * 60)

    # 실제 완료 epoch 는 results.csv 행 수
    results_csv = RUN_DIR / "results.csv"
    epochs_completed = None
    if results_csv.exists():
        with open(results_csv, "r", encoding="utf-8") as f:
            lines = [ln for ln in f.read().splitlines() if ln.strip()]
            epochs_completed = len(lines) - 1  # 헤더 제외

    payload = {
        "architecture": "YOLOv11s-cls",
        "classes": len(COLOR_CLASSES),
        "class_names": COLOR_CLASSES,
        "epochs_completed": epochs_completed,
        "train_time_sec": round(train_time_sec, 1),
        "train_time_min": round(train_time_sec / 60, 2),
        "top1_accuracy": round(top1, 4),
        "top5_accuracy": round(top5, 4),
        "per_class_accuracy": {k: round(v, 4) for k, v in per_class_acc.items()},
        "dataset_counts": {
            "train": {c: counts["train"][c] for c in COLOR_CLASSES},
            "val":   {c: counts["val"][c] for c in COLOR_CLASSES},
            "train_total": sum(counts["train"].values()),
            "val_total":   sum(counts["val"].values()),
            "skipped_train": skipped["train"],
            "skipped_val":   skipped["val"],
        },
        "best_pt_path": str(RUN_DIR / "weights" / "best.pt").replace("\\", "/"),
        "run_dir": str(RUN_DIR).replace("\\", "/"),
    }

    with open(RESULT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"저장 완료: {RESULT_JSON}")
    print(f"  epochs_completed: {epochs_completed}")
    print(f"  top1: {top1:.4f}  top5: {top5:.4f}")


# ---------------- main ----------------
def main():
    counts, skipped, t_tot, v_tot = build_dataset()
    if t_tot == 0 or v_tot == 0:
        raise RuntimeError(f"데이터셋 비었음: train={t_tot}, val={v_tot}")

    elapsed = train_model()
    top1, top5, per_class_acc = evaluate()
    save_result(top1, top5, per_class_acc, elapsed, counts, skipped)

    print("\n모든 Step 완료.")


if __name__ == "__main__":
    main()
