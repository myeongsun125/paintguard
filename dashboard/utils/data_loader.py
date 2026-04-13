"""데이터 로더 — 모든 CSV를 @st.cache_data로 로드."""
from pathlib import Path
import pandas as pd
import streamlit as st

_DASHBOARD_DATA = Path(__file__).resolve().parent.parent / "data" / "dashboard"
_ROOT = Path(__file__).resolve().parent.parent.parent  # PROJ2/


@st.cache_data
def load_yolo_results() -> pd.DataFrame:
    """yolo_inference_results.csv 로드, image_id 정렬."""
    try:
        df = pd.read_csv(_ROOT / "yolo_inference_results.csv")
        df = df.sort_values("image_id").reset_index(drop=True)
        return df
    except Exception as e:
        st.error(f"YOLO 결과 로드 실패: {e}")
        return pd.DataFrame()


@st.cache_data
def load_profile_table() -> pd.DataFrame:
    """defect_profile_table.csv 로드."""
    try:
        return pd.read_csv(_ROOT / "defect_profile_table.csv")
    except Exception as e:
        st.error(f"프로파일 테이블 로드 실패: {e}")
        return pd.DataFrame()


@st.cache_data
def load_agg_plant_daily() -> pd.DataFrame:
    try:
        return pd.read_csv(_DASHBOARD_DATA / "agg_plant_daily.csv")
    except Exception as e:
        st.error(f"공장별 일간 집계 로드 실패: {e}")
        return pd.DataFrame()


@st.cache_data
def load_agg_shift_hourly() -> pd.DataFrame:
    try:
        return pd.read_csv(_DASHBOARD_DATA / "agg_shift_hourly.csv")
    except Exception as e:
        st.error(f"교대-시간 집계 로드 실패: {e}")
        return pd.DataFrame()


@st.cache_data
def load_agg_env_bins() -> pd.DataFrame:
    try:
        return pd.read_csv(_DASHBOARD_DATA / "agg_env_bins.csv")
    except Exception as e:
        st.error(f"환경 구간 집계 로드 실패: {e}")
        return pd.DataFrame()


@st.cache_data
def load_agg_line_monthly() -> pd.DataFrame:
    try:
        return pd.read_csv(_DASHBOARD_DATA / "agg_line_monthly.csv")
    except Exception as e:
        st.error(f"라인별 월간 집계 로드 실패: {e}")
        return pd.DataFrame()


def get_sorted_image_list(yolo_df: pd.DataFrame) -> list[str]:
    """고유 이미지 파일 목록 (image_id 정렬 순)."""
    return yolo_df.drop_duplicates("image_file")["image_file"].tolist()
