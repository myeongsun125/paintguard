"""품질 탭 — FAIL 카드 그리드 + 상세 보기."""
import streamlit as st

from components.timeline_player import render_timeline_player
from utils.risk_engine import GRADE_COLOR, GRADE_EMOJI, GRADE_ACTION
from utils.image_utils import draw_bbox_overlay

GRADE_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


def render_quality():
    st.markdown("## 🔍 품질 검사")
    st.markdown("---")

    # 타임라인 플레이어
    render_timeline_player()
    st.markdown("---")

    fail_history = st.session_state.get("fail_history", [])
    current_idx = st.session_state.get("current_idx", 0)

    # 현재까지 누적 FAIL만
    visible = [e for e in fail_history if e["idx"] <= current_idx]

    # 등급별 카운트
    grade_counts = {g: 0 for g in GRADE_ORDER}
    for e in visible:
        g = e.get("risk_grade", "LOW")
        grade_counts[g] = grade_counts.get(g, 0) + 1

    total_inspected = current_idx + 1
    fail_images = len(set(e["idx"] for e in visible))

    # 상단 요약 바
    summary_cols = st.columns(6)
    labels = [
        ("총 검사", total_inspected),
        ("FAIL 건수", len(visible)),
        (f"{GRADE_EMOJI['CRITICAL']} CRITICAL", grade_counts["CRITICAL"]),
        (f"{GRADE_EMOJI['HIGH']} HIGH", grade_counts["HIGH"]),
        (f"{GRADE_EMOJI['MEDIUM']} MEDIUM", grade_counts["MEDIUM"]),
        (f"{GRADE_EMOJI['LOW']} LOW", grade_counts["LOW"]),
    ]
    for col, (label, val) in zip(summary_cols, labels):
        with col:
            st.metric(label=label, value=val)

    st.markdown("---")

    # 필터
    filter_cols = st.columns([3, 3, 6])
    with filter_cols[0]:
        selected_grades = st.multiselect(
            "등급 필터",
            GRADE_ORDER,
            default=GRADE_ORDER,
            key="quality_grade_filter",
        )

    # 필터 적용 + 정렬
    filtered = [e for e in visible if e.get("risk_grade") in selected_grades]
    filtered.sort(key=lambda x: x.get("risk_score", 0), reverse=True)

    if not filtered:
        st.info("표시할 FAIL 탐지가 없습니다. 재생을 시작하세요.")
        return

    # 카드 그리드 (4열)
    COLS = 4
    for row_start in range(0, len(filtered), COLS):
        row_items = filtered[row_start:row_start + COLS]
        cols = st.columns(COLS)
        for col_idx, entry in enumerate(row_items):
            with cols[col_idx]:
                grade = entry.get("risk_grade", "LOW")
                color = GRADE_COLOR.get(grade, "#2ecc71")
                emoji = GRADE_EMOJI.get(grade, "🟢")
                score = entry.get("risk_score", 0)
                defect_name = entry.get("defect_type_name", "")
                zone = entry.get("zone", "")
                image_file = entry.get("image_file", "")

                # 카드 컨테이너 (CSS 테두리)
                st.markdown(
                    f"""<div style="border: 2px solid {color}; border-radius: 8px;
                    padding: 8px; margin-bottom: 8px;">
                    <span style="font-size:1.2em;">{emoji} <b>{grade}</b></span>
                    </div>""",
                    unsafe_allow_html=True,
                )

                # bbox 오버레이 썸네일
                bbox = entry.get("bbox", {})
                try:
                    thumb = draw_bbox_overlay(
                        image_file, bbox, grade, defect_name,
                        thumbnail_size=(320, 240),
                    )
                    if thumb:
                        st.image(thumb, use_container_width=True)
                except Exception:
                    st.caption(f"📷 {image_file}")

                st.markdown(f"**{defect_name}** | {zone}")
                st.markdown(f"리스크: **{score:.2f}** / 100")

                # 상세 보기 토글
                card_key = f"detail_{image_file}_{entry.get('defect_type_code', '')}_{row_start}_{col_idx}"
                if st.button("상세 보기", key=card_key):
                    if st.session_state.get("selected_card") == card_key:
                        st.session_state.selected_card = None
                    else:
                        st.session_state.selected_card = card_key
                        st.session_state.selected_entry = entry
                    st.rerun()

    # 상세 보기 패널
    selected = st.session_state.get("selected_card")
    if selected and st.session_state.get("selected_entry"):
        st.markdown("---")
        _render_detail_panel(st.session_state.selected_entry)


def _render_detail_panel(entry: dict):
    """상세 보기 패널."""
    st.markdown("### 상세 분석")
    col_img, col_info = st.columns([1, 1])

    with col_img:
        bbox = entry.get("bbox", {})
        grade = entry.get("risk_grade", "LOW")
        defect_name = entry.get("defect_type_name", "")
        try:
            img = draw_bbox_overlay(
                entry.get("image_file", ""), bbox, grade, defect_name,
            )
            if img:
                st.image(img, use_container_width=True,
                         caption=entry.get("image_file", ""))
        except Exception:
            st.caption(f"📷 {entry.get('image_file', '')}")

    with col_info:
        profile = entry.get("profile", {})
        score = entry.get("risk_score", 0)
        grade = entry.get("risk_grade", "LOW")
        color = GRADE_COLOR.get(grade, "#2ecc71")

        st.markdown(f"**결함 유형**: {entry.get('defect_type_name', '')} ({entry.get('defect_type_code', '')})")
        st.markdown(f"**구역**: {entry.get('zone', '')}")
        st.markdown(f"**심각도**: {entry.get('severity', '')}")
        st.markdown(f"**YOLO 신뢰도**: {entry.get('conf', 0):.4f}")

        # 리스크 스코어 프로그레스 바
        pct = min(score / 100 * 100, 100)
        st.markdown(
            f"""<div style="background:#333; border-radius:8px; overflow:hidden; height:28px; margin:8px 0;">
            <div style="background:{color}; width:{pct}%; height:100%; border-radius:8px;
            display:flex; align-items:center; justify-content:center; font-weight:bold; color:white;">
            {score:.2f} / 100
            </div></div>""",
            unsafe_allow_html=True,
        )

        # 프로파일 지표
        c_ratio = profile.get("shift_C_ratio", 0)
        low_hum = profile.get("low_humidity_ratio", 0)
        rework = profile.get("rework_required_ratio", 0)
        rework_min = profile.get("std_rework_time_min", 0)

        warn = lambda v: " ⚠️" if v > 0.30 else ""
        st.markdown(f"- C조 발생비율: **{c_ratio:.1%}**{warn(c_ratio)}")
        st.markdown(f"- 저습도 환경비율: **{low_hum:.1%}**{warn(low_hum)}")
        st.markdown(f"- 재작업 필요비율: **{rework:.1%}**{warn(rework)}")
        st.markdown(f"- 예상 재작업시간: **{rework_min:.0f}분**")

        # 권고 조치
        action = GRADE_ACTION.get(grade, "정기 모니터링 유지")
        if grade == "CRITICAL":
            st.error(f"🚨 권고 조치: {action}")
        elif grade == "HIGH":
            st.warning(f"⚠️ 권고 조치: {action}")
        elif grade == "MEDIUM":
            st.info(f"📋 권고 조치: {action}")
        else:
            st.success(f"✅ 권고 조치: {action}")
