"""
YOLOv11s 본학습 스크립트 (paintguard_v11s).
- epochs=20, patience=8 (earlystopping)
- 저장 경로: yolo_runs/paintguard_v11s/
- 기존 yolo_runs/paintguard_v1/ (v8n) 은 건드리지 않음.
"""
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.paths import PROJECT_ROOT, MODELS_DIR, YOLO_RUNS_DIR
from ultralytics import YOLO
import time

model = YOLO(str(MODELS_DIR / 'yolo11s.pt'))

start = time.time()

results = model.train(
    data=str(PROJECT_ROOT / 'data_yolo.yaml'),
    epochs=20,
    imgsz=640,
    batch=16,
    patience=8,
    project=str(YOLO_RUNS_DIR),
    name='paintguard_v11s',
    exist_ok=True,
    optimizer='AdamW',
    lr0=0.001,
    weight_decay=0.0005,
    hsv_h=0.015,
    hsv_s=0.7,
    hsv_v=0.4,
    flipud=0.0,
    fliplr=0.5,
    mosaic=1.0,
    verbose=True
)

elapsed = time.time() - start
print(f"[완료] 총 소요: {elapsed/60:.1f}분 ({elapsed:.1f}초)")
