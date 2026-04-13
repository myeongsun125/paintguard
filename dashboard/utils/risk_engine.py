"""리스크 스코어 엔진 — CLAUDE.md 공식 구현."""
import pandas as pd
import numpy as np

SEVERITY_SCORE = {"CRITICAL": 40, "MAJOR": 25, "MINOR": 10}

GRADE_THRESHOLDS = {
    "CRITICAL": 60.91,
    "HIGH": 50.80,
    "MEDIUM": 25.20,
}


def compute_risk_score(severity: str, c_shift_ratio: float,
                       low_humidity_ratio: float, rework_ratio: float,
                       conf: float) -> float:
    """리스크 스코어 산출 (총 100점)."""
    sev = SEVERITY_SCORE.get(severity, 10)
    score = (
        sev
        + c_shift_ratio * 20
        + low_humidity_ratio * 15
        + rework_ratio * 15
        + conf * 10
    )
    return round(score, 2)


def assign_grade(score: float) -> str:
    if score >= GRADE_THRESHOLDS["CRITICAL"]:
        return "CRITICAL"
    elif score >= GRADE_THRESHOLDS["HIGH"]:
        return "HIGH"
    elif score >= GRADE_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    else:
        return "LOW"


GRADE_COLOR = {
    "CRITICAL": "#e74c3c",
    "HIGH": "#e67e22",
    "MEDIUM": "#f1c40f",
    "LOW": "#2ecc71",
}

GRADE_EMOJI = {
    "CRITICAL": "\U0001f534",  # 🔴
    "HIGH": "\U0001f7e0",      # 🟠
    "MEDIUM": "\U0001f7e1",    # 🟡
    "LOW": "\U0001f7e2",       # 🟢
}

GRADE_ACTION = {
    "CRITICAL": "즉시 라인 정지 및 전수 재검사",
    "HIGH": "교대 시작 직후 집중 모니터링 / 습도 25% 이상 유지",
    "MEDIUM": "주기적 모니터링 강화",
    "LOW": "정기 모니터링 유지",
}


# zone 매핑: 이미지 zone → master zone(들)
ZONE_MAP = {
    "hood": ["HOOD"],
    "front_door": ["FD"],
    "rear_door": ["RD"],
    "roof": ["ROOF"],
    "trunk": ["TRUNK"],
    "rocker": ["ROCKER"],
    "bumper": ["BUMPER_F", "BUMPER_R"],
    "fender": ["FF", "RF"],
}


def lookup_profile(profile_df: pd.DataFrame, defect_type_code: str,
                   zone: str) -> dict:
    """프로파일 테이블에서 defect_type_code × zone_code 조회.
    bumper/fender는 두 zone 평균."""
    master_zones = ZONE_MAP.get(zone, [zone.upper()])
    rows = profile_df[
        (profile_df["defect_type_code"] == defect_type_code)
        & (profile_df["zone_code"].isin(master_zones))
    ]
    if rows.empty:
        return {
            "shift_C_ratio": 0.08,
            "low_humidity_ratio": 0.005,
            "rework_required_ratio": 0.3,
            "avg_rework_min": 30,
            "avg_humidity": 45.0,
            "avg_temp": 23.0,
            "std_rework_time_min": 30,
        }
    return {
        "shift_C_ratio": rows["shift_C_ratio"].mean(),
        "low_humidity_ratio": rows["low_humidity_ratio"].mean(),
        "rework_required_ratio": rows["rework_required_ratio"].mean(),
        "avg_rework_min": rows["avg_rework_min"].mean(),
        "avg_humidity": rows["avg_humidity"].mean(),
        "avg_temp": rows["avg_temp"].mean(),
        "std_rework_time_min": rows["std_rework_time_min"].mean(),
    }


def build_fail_entry(row: pd.Series, profile_df: pd.DataFrame) -> dict:
    """YOLO 탐지 1건에 대해 리스크 정보를 산출."""
    dtc = row.get("defect_type_code", "")
    zone = row.get("zone", "")
    severity = row.get("severity", "MINOR")
    conf = row.get("conf", 0.9)

    profile = lookup_profile(profile_df, dtc, zone)

    score = compute_risk_score(
        severity=severity,
        c_shift_ratio=profile["shift_C_ratio"],
        low_humidity_ratio=profile["low_humidity_ratio"],
        rework_ratio=profile["rework_required_ratio"],
        conf=conf if not pd.isna(conf) else 0.9,
    )
    grade = assign_grade(score)

    defect_type_name_map = {
        "SCR": "스크래치", "DNT": "덴트", "PBB": "도장기포",
        "PDR": "도장흘림", "DST": "이물질", "ORG": "오렌지필",
        "CRK": "크랙", "GAP": "Gap불량",
    }

    return {
        "image_file": row["image_file"],
        "risk_grade": grade,
        "risk_score": score,
        "defect_type_name": defect_type_name_map.get(dtc, dtc),
        "defect_type_code": dtc,
        "zone": zone,
        "severity": severity,
        "conf": round(conf, 4) if not pd.isna(conf) else 0.0,
        "bbox": {
            "x1": row.get("bbox_x1", 0),
            "y1": row.get("bbox_y1", 0),
            "x2": row.get("bbox_x2", 0),
            "y2": row.get("bbox_y2", 0),
        },
        "profile": profile,
    }
