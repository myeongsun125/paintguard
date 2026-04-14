"""타임라인 플레이어 — val 200장 순차 재생."""
import pandas as pd
import streamlit as st
from streamlit_autorefresh import st_autorefresh

from utils.data_loader import load_yolo_results, load_profile_table, get_sorted_image_list
from utils.risk_engine import build_fail_entry


def _rebuild_fail_history(
    yolo_df: pd.DataFrame,
    profile_df: pd.DataFrame,
    image_list: list[str],
    up_to_idx: int,
) -> list[dict]:
    """0 ~ up_to_idx 까지 FAIL 히스토리 재구축."""
    history = []
    for i in range(up_to_idx + 1):
        img_file = image_list[i]
        rows = yolo_df[yolo_df["image_file"] == img_file]
        detected = rows[rows["class_id"].notna()]
        if not detected.empty:
            for _, row in detected.iterrows():
                entry = build_fail_entry(row, profile_df)
                entry["idx"] = i
                history.append(entry)
    return history


def _append_current_fail_if_needed(
    yolo_df: pd.DataFrame,
    profile_df: pd.DataFrame,
    image_list: list[str],
    current_idx: int,
):
    """현재 프레임의 FAIL 탐지를 fail_history에 1회만 반영."""
    fail_history = st.session_state.get("fail_history", [])
    existing_idxs = {e["idx"] for e in fail_history}

    if current_idx in existing_idxs:
        return

    img_file = image_list[current_idx]
    rows = yolo_df[yolo_df["image_file"] == img_file]
    detected = rows[rows["class_id"].notna()]

    if detected.empty:
        return

    for _, row in detected.iterrows():
        entry = build_fail_entry(row, profile_df)
        entry["idx"] = current_idx
        fail_history.append(entry)

    st.session_state.fail_history = fail_history


def render_timeline_player():
    """타임라인 플레이어 UI."""
    yolo_df = load_yolo_results()
    profile_df = load_profile_table()

    if yolo_df.empty:
        st.error("YOLO 결과 데이터를 로드할 수 없습니다.")
        return

    image_list = get_sorted_image_list(yolo_df)
    total = len(image_list)

    if total == 0:
        st.error("이미지 목록이 비어있습니다.")
        return

    # 현재 상태
    current_idx = st.session_state.get("current_idx", 0)
    is_playing = st.session_state.get("is_playing", False)
    fail_history = st.session_state.get("fail_history", [])

    fail_count = len(set(e["idx"] for e in fail_history))
    pass_count = (current_idx + 1) - fail_count

    cols = st.columns([1, 1, 2, 4])

    with cols[0]:
        if st.button("⏮ 처음", key="btn_reset"):
            st.session_state.current_idx = 0
            st.session_state.fail_history = []
            st.session_state.is_playing = False
            st.session_state.selected_card = None
            st.session_state.selected_entry = None

    with cols[1]:
        if is_playing:
            if st.button("⏸ 정지", key="btn_pause"):
                st.session_state.is_playing = False
        else:
            if st.button("▶ 재생", key="btn_play"):
                st.session_state.is_playing = True

    with cols[2]:
        speed = st.radio(
            "속도",
            [0.5, 1.0, 2.0],
            index=[0.5, 1.0, 2.0].index(st.session_state.get("play_speed", 1.0)),
            horizontal=True,
            key="speed_radio",
            label_visibility="collapsed",
        )
        st.session_state.play_speed = speed

    with cols[3]:
        st.markdown(
            f"**이미지 {st.session_state.current_idx + 1}/{total}** &nbsp; "
            f"✅ PASS: {pass_count} &nbsp; ❌ FAIL: {fail_count}"
        )

    new_idx = st.slider(
        "타임라인",
        0,
        total - 1,
        st.session_state.current_idx,
        key="timeline_slider",
        label_visibility="collapsed",
    )

    # 슬라이더 이동 시 즉시 상태 반영
    if new_idx != st.session_state.current_idx:
        st.session_state.current_idx = new_idx
        st.session_state.fail_history = _rebuild_fail_history(
            yolo_df, profile_df, image_list, new_idx
        )
        st.session_state.is_playing = False
        st.session_state.selected_card = None
        st.session_state.selected_entry = None

    st.progress(min((st.session_state.current_idx + 1) / total, 1.0))

    # 재생 중이면 자동 새로고침으로 한 프레임씩 전진
    if st.session_state.get("is_playing", False):
        interval_ms = int(1000 / max(st.session_state.get("play_speed", 1.0), 0.1))

        st_autorefresh(
            interval=interval_ms,
            key=f"timeline_autorefresh_{st.session_state.get('current_page', 'page')}",
        )

        current_idx = st.session_state.current_idx

        _append_current_fail_if_needed(
            yolo_df=yolo_df,
            profile_df=profile_df,
            image_list=image_list,
            current_idx=current_idx,
        )

        if current_idx < total - 1:
            st.session_state.current_idx = current_idx + 1
        else:
            st.session_state.is_playing = False
            