"""준비 중 탭 — 생산량 / 예지보전 / 주문량."""
import streamlit as st

PAGE_INFO = {
    "placeholder_production": {"icon": "📦", "name": "생산량"},
    "placeholder_maintenance": {"icon": "🔧", "name": "예지보전"},
    "placeholder_order": {"icon": "📋", "name": "주문량"},
}


def render_placeholder():
    page = st.session_state.get("current_page", "placeholder_production")
    info = PAGE_INFO.get(page, {"icon": "📦", "name": "준비 중"})

    st.markdown(
        f"""
        <div style="display:flex; flex-direction:column; align-items:center;
                    justify-content:center; height:60vh;">
            <span style="font-size:5em;">{info['icon']}</span>
            <h2 style="margin-top:20px;">{info['name']}</h2>
            <p style="font-size:1.3em; color:#aaa;">데이터 연동 준비 중</p>
            <p style="color:#777;">팀원 데이터셋 수집 후 연동 예정</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
