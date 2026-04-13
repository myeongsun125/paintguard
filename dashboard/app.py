"""PaintGuard MES Dashboard — 메인 앱."""
import sys
from pathlib import Path

# 모듈 경로 추가 (dashboard/ 기준)
sys.path.insert(0, str(Path(__file__).resolve().parent))

import streamlit as st

st.set_page_config(
    page_title="PaintGuard MES",
    page_icon="🏭",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── session_state 초기화 ──
_DEFAULTS = {
    "current_page": "home",
    "current_idx": 0,
    "is_playing": False,
    "play_speed": 1.0,
    "fail_history": [],
    "selected_card": None,
    "selected_entry": None,
}
for key, val in _DEFAULTS.items():
    if key not in st.session_state:
        st.session_state[key] = val

# ── 사이드바 ──
from components.sidebar import render_sidebar
render_sidebar()

# ── 페이지 라우팅 ──
page = st.session_state.current_page

if page == "home":
    from pages.home import render_home
    render_home()
elif page == "process":
    from pages.process import render_process
    render_process()
elif page == "quality":
    from pages.quality import render_quality
    render_quality()
else:
    from pages.placeholder import render_placeholder
    render_placeholder()
