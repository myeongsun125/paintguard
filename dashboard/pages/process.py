"""공정 탭 — 공정 모니터링 대시보드."""
import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from components.timeline_player import render_timeline_player
from components.kpi_cards import render_kpi_row
from utils.data_loader import (
    load_agg_plant_daily, load_agg_shift_hourly, load_profile_table,
    load_yolo_results, get_sorted_image_list,
)
from utils.risk_engine import lookup_profile

FONT = "Malgun Gothic"


def render_process():
    st.markdown("## ⚙️ 공정 모니터링")
    st.markdown("---")

    # 타임라인 플레이어
    render_timeline_player()
    st.markdown("---")

    # 데이터 로드
    fail_history = st.session_state.get("fail_history", [])
    current_idx = st.session_state.get("current_idx", 0)
    plant_daily = load_agg_plant_daily()
    shift_hourly = load_agg_shift_hourly()
    profile_df = load_profile_table()
    yolo_df = load_yolo_results()

    # 현재 이미지 프로파일
    image_list = get_sorted_image_list(yolo_df)
    current_img = image_list[current_idx] if current_idx < len(image_list) else ""
    current_rows = yolo_df[yolo_df["image_file"] == current_img]
    detected = current_rows[current_rows["class_id"].notna()]

    env_status = "✅ 정상"
    if not detected.empty:
        row = detected.iloc[0]
        prof = lookup_profile(profile_df, row.get("defect_type_code", ""),
                              row.get("zone", ""))
        if prof["avg_humidity"] < 25:
            env_status = "⚠️ 저습도 경보"

    # KPI 카드
    total_inspected = current_idx + 1
    fail_count = len(set(e["idx"] for e in fail_history))
    fail_rate = (fail_count / total_inspected * 100) if total_inspected > 0 else 0

    avg_takt = plant_daily["avg_takt"].mean() if not plant_daily.empty else 0

    render_kpi_row([
        {"label": "총 검사 건수", "value": f"{total_inspected}"},
        {"label": "현재 불량률", "value": f"{fail_rate:.1f}%"},
        {"label": "평균 택트타임", "value": f"{avg_takt:.2f}초"},
        {"label": "환경 상태", "value": env_status},
    ])

    st.markdown("---")

    # 차트 영역
    col_left, col_right = st.columns(2)

    # 공장별 불량률 바 차트
    with col_left:
        st.markdown("### 공장별 불량률")
        if not plant_daily.empty:
            agg = plant_daily.groupby("plant_name").agg(
                total=("total", "sum"),
                fail=("fail_count", "sum"),
            ).reset_index()
            agg["fail_rate"] = (agg["fail"] / agg["total"] * 100).round(2)

            fig = go.Figure()
            fig.add_trace(go.Bar(
                x=agg["plant_name"],
                y=agg["fail_rate"],
                marker_color=["#00b4d8", "#0077b6", "#023e8a", "#03045e"],
                text=agg["fail_rate"].apply(lambda x: f"{x:.2f}%"),
                textposition="outside",
            ))
            fig.add_hline(y=4.07, line_dash="dash", line_color="red",
                          annotation_text="평균 4.07%",
                          annotation_position="top right")
            fig.update_layout(
                height=350,
                margin=dict(l=40, r=20, t=30, b=40),
                yaxis_title="불량률 (%)",
                font=dict(family=FONT),
                plot_bgcolor="rgba(0,0,0,0)",
                paper_bgcolor="rgba(0,0,0,0)",
            )
            st.plotly_chart(fig, use_container_width=True)

    # 온습도 이중축 시계열
    with col_right:
        st.markdown("### 검사 환경 추이 (온도/습도)")
        if fail_history:
            humidities = [e["profile"]["avg_humidity"] for e in fail_history
                          if e["idx"] <= current_idx]
            temps = [e["profile"]["avg_temp"] for e in fail_history
                     if e["idx"] <= current_idx]
            idxs = [e["idx"] for e in fail_history if e["idx"] <= current_idx]

            if humidities:
                fig2 = make_subplots(specs=[[{"secondary_y": True}]])
                fig2.add_trace(
                    go.Scatter(x=idxs, y=humidities, name="습도 (%)",
                               line=dict(color="#00b4d8")),
                    secondary_y=False,
                )
                fig2.add_trace(
                    go.Scatter(x=idxs, y=temps, name="온도 (°C)",
                               line=dict(color="#e67e22")),
                    secondary_y=True,
                )
                fig2.add_hline(y=25, line_dash="dash", line_color="red",
                               secondary_y=False,
                               annotation_text="저습도 경계 25%")
                fig2.update_layout(
                    height=350,
                    margin=dict(l=40, r=40, t=30, b=40),
                    font=dict(family=FONT),
                    legend=dict(orientation="h", yanchor="bottom", y=1.02),
                    plot_bgcolor="rgba(0,0,0,0)",
                    paper_bgcolor="rgba(0,0,0,0)",
                )
                fig2.update_yaxes(title_text="습도 (%)", secondary_y=False)
                fig2.update_yaxes(title_text="온도 (°C)", secondary_y=True)
                st.plotly_chart(fig2, use_container_width=True)
            else:
                st.info("재생을 시작하면 환경 추이가 표시됩니다.")
        else:
            st.info("재생을 시작하면 환경 추이가 표시됩니다.")

    # 교대조 × 시간대 히트맵
    st.markdown("### 교대조 × 시간대 불량률 히트맵")
    if not shift_hourly.empty:
        pivot = shift_hourly.pivot(index="shift", columns="hour", values="fail_rate")
        pivot = pivot.reindex(index=["A", "B", "C"])

        annotations = []
        for i, shift in enumerate(pivot.index):
            for j, hour in enumerate(pivot.columns):
                val = pivot.iloc[i, j]
                if not (shift == "C" and hour == 22):
                    continue
                annotations.append(dict(
                    x=hour, y=shift,
                    text="⚠️ 최고위험",
                    showarrow=False,
                    font=dict(color="white", size=11, family=FONT),
                ))

        fig3 = go.Figure(data=go.Heatmap(
            z=pivot.values,
            x=[str(h) + "시" for h in pivot.columns],
            y=pivot.index.tolist(),
            colorscale="Reds",
            colorbar_title="불량률(%)",
            text=pivot.values.round(2),
            texttemplate="%{text:.2f}%",
            hovertemplate="교대조: %{y}<br>시간: %{x}<br>불량률: %{z:.2f}%<extra></extra>",
        ))
        fig3.update_layout(
            height=280,
            margin=dict(l=40, r=20, t=20, b=40),
            font=dict(family=FONT),
            annotations=annotations,
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
        )
        st.plotly_chart(fig3, use_container_width=True)
