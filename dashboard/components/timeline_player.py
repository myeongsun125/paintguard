"""타임라인 플레이어 — val 200장 순차 재생."""
import time
import pandas as pd
import streamlit as st
from utils.data_loader import load_yolo_results, load_profile_table, get_sorted_image_list
from utils.risk_engine import build_fail_entry


def _rebuild_fail_history(yolo_df: pd.DataFrame, profile_df: pd.DataFrame,
                          image_list: list[str], up_to_idx: int) -> list[dict]:
    """0~up_to_idx까지 FAIL 히스토리 재구축."""
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

    # 현재 이미지의 PASS/FAIL 카운트
    fail_count = len(set(e["idx"] for e in fail_history))
    pass_count = (current_idx + 1) - fail_count

    # 컨트롤 바
    cols = st.columns([1, 1, 2, 4])
    with cols[0]:
        if st.button("⏮ 처음", key="btn_reset"):
            st.session_state.current_idx = 0
            st.session_state.fail_history = []
            st.session_state.is_playing = False
            st.rerun()
    with cols[1]:
        if is_playing:
            if st.button("⏸ 정지", key="btn_pause"):
                st.session_state.is_playing = False
                st.rerun()
        else:
            if st.button("▶ 재생", key="btn_play"):
                st.session_state.is_playing = True
                st.rerun()
    with cols[2]:
        speed = st.radio("속도", [0.5, 1.0, 2.0], index=1,
                         horizontal=True, key="speed_radio",
                         label_visibility="collapsed")
        st.session_state.play_speed = speed

    with cols[3]:
        st.markdown(
            f"**이미지 {current_idx + 1}/{total}** &nbsp; "
            f"✅ PASS: {pass_count} &nbsp; ❌ FAIL: {fail_count}"
        )

    # 슬라이더
    new_idx = st.slider(
        "타임라인", 0, total - 1, current_idx,
        key="timeline_slider",
        label_visibility="collapsed",
    )
    if new_idx != current_idx:
        st.session_state.current_idx = new_idx
        # 역방향 이동 시 전체 재계산
        st.session_state.fail_history = _rebuild_fail_history(
            yolo_df, profile_df, image_list, new_idx
        )
        st.session_state.is_playing = False
        st.rerun()

    # 진행 바
    st.progress(min((current_idx + 1) / total, 1.0))

    # 자동 재생 루프
    if is_playing and current_idx < total - 1:
        # 현재 이미지 처리
        img_file = image_list[current_idx]
        rows = yolo_df[yolo_df["image_file"] == img_file]
        detected = rows[rows["class_id"].notna()]

        # 현재 idx가 이미 히스토리에 있는지 확인
        existing_idxs = set(e["idx"] for e in fail_history)
        if current_idx not in existing_idxs and not detected.empty:
            for _, row in detected.iterrows():
                entry = build_fail_entry(row, profile_df)
                entry["idx"] = current_idx
                fail_history.append(entry)
            st.session_state.fail_history = fail_history

        play_speed = st.session_state.get("play_speed", 1.0)
        time.sleep(1.0 / play_speed)
        st.session_state.current_idx = current_idx + 1
        st.rerun()
    elif is_playing and current_idx >= total - 1:
        # 마지막 이미지 처리
        img_file = image_list[current_idx]
        rows = yolo_df[yolo_df["image_file"] == img_file]
        detected = rows[rows["class_id"].notna()]
        existing_idxs = set(e["idx"] for e in fail_history)
        if current_idx not in existing_idxs and not detected.empty:
            for _, row in detected.iterrows():
                entry = build_fail_entry(row, profile_df)
                entry["idx"] = current_idx
                fail_history.append(entry)
            st.session_state.fail_history = fail_history
        st.session_state.is_playing = False
        st.rerun()
