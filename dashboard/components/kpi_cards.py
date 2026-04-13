"""KPI 카드 렌더링."""
import streamlit as st


def render_kpi_row(metrics: list[dict]):
    """KPI 메트릭 행 렌더링.
    metrics: [{"label": ..., "value": ..., "delta": ...(optional)}]
    """
    cols = st.columns(len(metrics))
    for col, m in zip(cols, metrics):
        with col:
            delta = m.get("delta")
            st.metric(
                label=m["label"],
                value=m["value"],
                delta=delta,
            )
