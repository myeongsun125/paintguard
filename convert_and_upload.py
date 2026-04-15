"""
PaintGuard 데이터 파이프라인
CSV → JSON 변환 + S3 업로드 스크립트

실행 전 준비:
  pip install pandas boto3

실행:
  python convert_and_upload.py

구조:
  C:\paintguard\mes_2025\         ← 원본 MES CSV
  C:\paintguard\dashboard\data\dashboard\  ← 집계 CSV
"""

import json
import os
import pandas as pd
import boto3
from pathlib import Path
from datetime import datetime

# ─────────────────────────────────────────
# 설정
# ─────────────────────────────────────────
BUCKET_NAME = "project2-argos-i-376715672571-ap-northeast-2-an"
REGION = "ap-northeast-2"
MES_DIR = Path(r"C:\paintguard\mes_2025")
AGG_DIR = Path(r"C:\paintguard\dashboard\data\dashboard")
OUTPUT_DIR = Path(r"C:\paintguard\outputs\json")  # 로컬 확인용

# S3 클라이언트 (EC2 IAM Role로 인증 — 키 불필요)
s3 = boto3.client("s3", region_name=REGION)


# ─────────────────────────────────────────
# 유틸
# ─────────────────────────────────────────
def to_json(data: list | dict) -> str:
    return json.dumps(data, ensure_ascii=False, default=str)


def upload(key: str, data: list | dict):
    """S3 업로드 + 로컬 저장 (확인용)"""
    body = to_json(data)

    # S3 업로드
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=key,
        Body=body.encode("utf-8"),
        ContentType="application/json; charset=utf-8",
    )
    print(f"  ✅ s3://{BUCKET_NAME}/{key}")

    # 로컬 저장
    local_path = OUTPUT_DIR / key
    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_text(body, encoding="utf-8")


def read_csv(path: Path, **kwargs) -> pd.DataFrame:
    return pd.read_csv(path, encoding="utf-8-sig", **kwargs)


# ─────────────────────────────────────────
# 1. master/ — 마스터 데이터
# ─────────────────────────────────────────
def build_master():
    print("\n[1] master/ 변환 중...")

    # model.json
    df = read_csv(MES_DIR / "master_model.csv")
    upload("master/model.json", df.to_dict(orient="records"))

    # color.json
    df = read_csv(MES_DIR / "master_color.csv")
    upload("master/color.json", df.to_dict(orient="records"))

    # plant_line.json
    df = read_csv(MES_DIR / "master_plant_line.csv")
    upload("master/plant_line.json", df.to_dict(orient="records"))

    # defect_process_map.json — 고정값
    defect_map = {
        "SCR": {"process": "상도", "name_kr": "스크래치"},
        "DNT": {"process": "차체이송/프레스", "name_kr": "덴트"},
        "PDR": {"process": "상도/건조", "name_kr": "미세요철"},
        "RUN": {"process": "상도", "name_kr": "흐름"},
        "ORG": {"process": "상도/건조", "name_kr": "귤껍질"},
        "GAP": {"process": "조립", "name_kr": "단차"},
        "CRK": {"process": "건조", "name_kr": "크랙"},
        "CLP": {"process": "조립", "name_kr": "클립누락"},
        "WLD": {"process": "용접", "name_kr": "용접불량"},
        "OTH": {"process": "기타", "name_kr": "기타"},
    }
    upload("master/defect_process_map.json", defect_map)


# ─────────────────────────────────────────
# 2. aggregates/ — 집계 데이터
# ─────────────────────────────────────────
def build_aggregates():
    print("\n[2] aggregates/ 변환 중...")

    # kpi_daily.json ← agg_plant_daily.csv
    df = read_csv(AGG_DIR / "agg_plant_daily.csv")
    upload("aggregates/kpi_daily.json", df.to_dict(orient="records"))

    # shift_defect_rate.json ← agg_shift_hourly.csv
    df = read_csv(AGG_DIR / "agg_shift_hourly.csv")
    upload("aggregates/shift_defect_rate.json", df.to_dict(orient="records"))

    # color_distribution.json ← mes_color_production.csv
    df = read_csv(MES_DIR / "mes_color_production.csv")
    upload("aggregates/color_distribution.json", df.to_dict(orient="records"))

    # line_monthly.json ← agg_line_monthly.csv
    df = read_csv(AGG_DIR / "agg_line_monthly.csv")
    upload("aggregates/line_monthly.json", df.to_dict(orient="records"))

    # env_bins.json ← agg_env_bins.csv
    df = read_csv(AGG_DIR / "agg_env_bins.csv")
    upload("aggregates/env_bins.json", df.to_dict(orient="records"))


# ─────────────────────────────────────────
# 3. snapshots/ — 날짜별 스냅샷
# ─────────────────────────────────────────
def build_snapshots():
    print("\n[3] snapshots/ 변환 중...")

    # 생산계획 + 실적 로드
    df_plan = read_csv(MES_DIR / "mes_production_plan.csv")
    df_result = read_csv(MES_DIR / "mes_production_result.csv")
    df_demand = read_csv(MES_DIR / "mes_demand_forecast.csv")
    df_inventory = read_csv(MES_DIR / "mes_inventory_daily.csv")

    # 날짜 컬럼 자동 탐지
    date_col_plan = _find_date_col(df_plan)
    date_col_result = _find_date_col(df_result)

    if date_col_plan:
        df_plan[date_col_plan] = pd.to_datetime(df_plan[date_col_plan]).dt.strftime("%Y-%m-%d")
        dates = df_plan[date_col_plan].unique()

        for date in sorted(dates):
            snapshot = {
                "date": date,
                "production_plan": df_plan[df_plan[date_col_plan] == date].to_dict(orient="records"),
            }

            if date_col_result and date_col_result in df_result.columns:
                df_result[date_col_result] = pd.to_datetime(df_result[date_col_result]).dt.strftime("%Y-%m-%d")
                snapshot["production_result"] = df_result[
                    df_result[date_col_result] == date
                ].to_dict(orient="records")

            upload(f"snapshots/daily/{date}.json", snapshot)
    else:
        # 날짜 컬럼 없으면 전체를 단일 파일로
        upload("snapshots/daily/all.json", df_plan.to_dict(orient="records"))

    print(f"  → 날짜별 스냅샷 생성 완료")


def _find_date_col(df: pd.DataFrame) -> str | None:
    """날짜 관련 컬럼명 자동 탐지"""
    candidates = ["date", "work_date", "plan_date", "production_date", "reg_date", "일자", "날짜"]
    for col in df.columns:
        if col.lower() in candidates:
            return col
    # 컬럼명에 date 포함
    for col in df.columns:
        if "date" in col.lower() or "일자" in col:
            return col
    return None


# ─────────────────────────────────────────
# 4. oven/ — 건조로 데이터
# ─────────────────────────────────────────
def build_oven():
    print("\n[4] oven/ 변환 중...")

    # oven_status.json — 최신 상태 (마지막 N행)
    df_sensor = read_csv(MES_DIR / "mes_oven_sensor.csv", nrows=10000)
    latest = df_sensor.tail(500)
    upload("aggregates/oven_status.json", latest.to_dict(orient="records"))

    # alerts/events.json — 이상 이벤트
    df_anomaly = read_csv(MES_DIR / "mes_oven_anomaly_log.csv")
    upload("alerts/events.json", df_anomaly.to_dict(orient="records"))

    print(f"  → 건조로 센서: 최신 500행 업로드")
    print(f"  → 이상 이벤트: {len(df_anomaly)}건 업로드")


# ─────────────────────────────────────────
# 5. work_orders/ — 작업지시
# ─────────────────────────────────────────
def build_work_orders():
    print("\n[5] work_orders/ 변환 중...")

    df = read_csv(MES_DIR / "mes_work_order.csv")

    # 날짜 컬럼 탐지 후 날짜별 분할
    date_col = _find_date_col(df)
    if date_col:
        df[date_col] = pd.to_datetime(df[date_col]).dt.strftime("%Y-%m-%d")
        dates = df[date_col].unique()
        for date in sorted(dates):
            chunk = df[df[date_col] == date].to_dict(orient="records")
            upload(f"work_orders/{date}.json", chunk)
        print(f"  → {len(dates)}일치 작업지시 업로드")
    else:
        upload("work_orders/all.json", df.to_dict(orient="records"))


# ─────────────────────────────────────────
# 메인
# ─────────────────────────────────────────
def main():
    print("=" * 50)
    print("PaintGuard 데이터 파이프라인 시작")
    print(f"버킷: {BUCKET_NAME}")
    print(f"시작: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        build_master()
        build_aggregates()
        build_snapshots()
        build_oven()
        build_work_orders()

        print("\n" + "=" * 50)
        print("✅ 모든 파일 업로드 완료")
        print(f"로컬 확인: {OUTPUT_DIR}")
        print("=" * 50)

    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        raise


if __name__ == "__main__":
    main()
