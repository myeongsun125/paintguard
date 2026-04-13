"""
사전 집계 스크립트 — inspection_master.csv(312MB)를 경량 CSV로 변환.
홈화면 이미지 크롭도 수행.
"""
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from pathlib import Path
import pandas as pd
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent.parent  # PROJ2/
DATA_IN = ROOT / "track_a_data"
DATA_OUT = ROOT / "dashboard" / "data" / "dashboard"
ASSETS_OUT = ROOT / "dashboard" / "assets" / "home_images"
DATA_OUT.mkdir(parents=True, exist_ok=True)
ASSETS_OUT.mkdir(parents=True, exist_ok=True)

# ============================================================
# 1. agg_plant_daily.csv
# ============================================================
print("[1/5] agg_plant_daily.csv 생성 중...")

im = pd.read_csv(DATA_IN / "inspection_master.csv", parse_dates=["inspection_datetime"])
plant_master = pd.read_csv(DATA_IN / "master_plant_line.csv")
plant_names = plant_master.drop_duplicates("plant_code")[["plant_code", "plant_name"]]

im["date"] = im["inspection_datetime"].dt.date
im["is_fail"] = (im["result"] == "FAIL").astype(int)

agg = im.groupby(["date", "plant_code", "shift"]).agg(
    total=("inspection_id", "count"),
    fail_count=("is_fail", "sum"),
    avg_temp=("ambient_temp_c", "mean"),
    avg_humidity=("humidity_pct", "mean"),
    avg_takt=("takt_time_sec", "mean"),
).reset_index()
agg["yield_rate"] = ((agg["total"] - agg["fail_count"]) / agg["total"] * 100).round(2)
agg = agg.merge(plant_names, on="plant_code", how="left")
agg = agg[["date", "plant_code", "plant_name", "shift", "total", "fail_count",
           "yield_rate", "avg_temp", "avg_humidity", "avg_takt"]]
agg.to_csv(DATA_OUT / "agg_plant_daily.csv", index=False, encoding="utf-8-sig")
print(f"  -> {len(agg)}행 저장")

# ============================================================
# 2. agg_shift_hourly.csv
# ============================================================
print("[2/5] agg_shift_hourly.csv 생성 중...")

im["hour"] = im["inspection_datetime"].dt.hour
sh = im.groupby(["shift", "hour"]).agg(
    total=("inspection_id", "count"),
    fail_count=("is_fail", "sum"),
).reset_index()
sh["fail_rate"] = (sh["fail_count"] / sh["total"] * 100).round(4)
sh.to_csv(DATA_OUT / "agg_shift_hourly.csv", index=False, encoding="utf-8-sig")
print(f"  -> {len(sh)}행 저장")

# ============================================================
# 3. agg_env_bins.csv
# ============================================================
print("[3/5] agg_env_bins.csv 생성 중...")

im["humidity_bin"] = (np.floor(im["humidity_pct"] / 5) * 5 + 2.5).round(1)
im["temp_bin"] = (np.floor(im["ambient_temp_c"] / 2.5) * 2.5 + 1.25).round(2)

env = im.groupby(["humidity_bin", "temp_bin"]).agg(
    total=("inspection_id", "count"),
    fail_count=("is_fail", "sum"),
).reset_index()
env["fail_rate"] = (env["fail_count"] / env["total"] * 100).round(4)
env.to_csv(DATA_OUT / "agg_env_bins.csv", index=False, encoding="utf-8-sig")
print(f"  -> {len(env)}행 저장")

# ============================================================
# 4. agg_line_monthly.csv
# ============================================================
print("[4/5] agg_line_monthly.csv 생성 중...")

im["ym"] = im["inspection_datetime"].dt.to_period("M").astype(str)
lm = im.groupby(["ym", "plant_code", "line_code"]).agg(
    total=("inspection_id", "count"),
    fail_count=("is_fail", "sum"),
).reset_index()
lm["yield_rate"] = ((lm["total"] - lm["fail_count"]) / lm["total"] * 100).round(2)
lm.to_csv(DATA_OUT / "agg_line_monthly.csv", index=False, encoding="utf-8-sig")
print(f"  -> {len(lm)}행 저장")

# ============================================================
# 5. 홈화면 이미지 크롭
# ============================================================
print("[5/5] 홈화면 이미지 크롭 중...")

home_img_path = ROOT / "홈화면_이미지.png"
if home_img_path.exists():
    img = Image.open(home_img_path)
    W, H = img.size

    # 상단 3등분 (상위 ~55%), 하단 2등분 (하위 ~45%)
    mid_y = int(H * 0.55)

    # 상단 3등분
    third_w = W // 3
    crops_top = {
        "order.png": (0, 0, third_w, mid_y),
        "process.png": (third_w, 0, third_w * 2, mid_y),
        "quality.png": (third_w * 2, 0, W, mid_y),
    }

    # 하단 2등분
    half_w = W // 2
    crops_bot = {
        "maintenance.png": (0, mid_y, half_w, H),
        "production.png": (half_w, mid_y, W, H),
    }

    all_crops = {**crops_top, **crops_bot}
    for name, box in all_crops.items():
        cropped = img.crop(box)
        cropped.save(ASSETS_OUT / name)
        print(f"  -> {name} ({cropped.size[0]}x{cropped.size[1]})")
else:
    print("  [WARN] 홈화면_이미지.png 없음 — 크롭 스킵")

print("\n[완료] 모든 집계 파일 저장 완료")
print(f"  출력 경로: {DATA_OUT}")
print(f"  이미지 경로: {ASSETS_OUT}")
