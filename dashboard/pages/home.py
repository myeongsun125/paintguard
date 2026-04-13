"""홈 화면 — MES 시스템 개요."""
from pathlib import Path
import streamlit as st

_ASSETS = Path(__file__).resolve().parent.parent / "assets" / "home_images"

SECTORS = {
    "top": [
        {"name": "주문량", "image": "order.png", "page": "placeholder_order"},
        {"name": "공정", "image": "process.png", "page": "process"},
        {"name": "품질", "image": "quality.png", "page": "quality"},
    ],
    "bottom": [
        {"name": "예지보전", "image": "maintenance.png", "page": "placeholder_maintenance"},
        {"name": "생산량", "image": "production.png", "page": "placeholder_production"},
    ],
}


def render_home():
    st.markdown(
        "<h1 style='text-align:center;'>PaintGuard MES 시스템</h1>"
        "<p style='text-align:center; color:#aaa; font-size:1.2em;'>"
        "자동차 도장 공정 통합 모니터링</p>",
        unsafe_allow_html=True,
    )
    st.markdown("---")

    # 상단 3열
    cols_top = st.columns(3)
    for col, sector in zip(cols_top, SECTORS["top"]):
        with col:
            img_path = _ASSETS / sector["image"]
            if img_path.exists():
                st.image(str(img_path), use_container_width=True)
            if st.button(
                f"**{sector['name']}**",
                key=f"home_{sector['page']}",
                use_container_width=True,
            ):
                st.session_state.current_page = sector["page"]
                st.rerun()

    st.markdown("")

    # 하단 2열
    cols_bot = st.columns(2)
    for col, sector in zip(cols_bot, SECTORS["bottom"]):
        with col:
            img_path = _ASSETS / sector["image"]
            if img_path.exists():
                st.image(str(img_path), use_container_width=True)
            if st.button(
                f"**{sector['name']}**",
                key=f"home_{sector['page']}",
                use_container_width=True,
            ):
                st.session_state.current_page = sector["page"]
                st.rerun()
