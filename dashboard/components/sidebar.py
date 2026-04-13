"""사이드바 네비게이션."""
import streamlit as st

MENU_ITEMS = [
    ("🏠", "홈", "home"),
    ("📦", "생산량", "placeholder_production"),
    ("⚙️", "공정", "process"),
    ("🔍", "품질", "quality"),
    ("🔧", "예지보전", "placeholder_maintenance"),
]


def render_sidebar():
    """사이드바 렌더링."""
    with st.sidebar:
        st.markdown("## 🏭 PaintGuard MES")
        st.markdown("---")

        for icon, label, page_key in MENU_ITEMS:
            is_current = st.session_state.get("current_page") == page_key
            btn_label = f"**{icon} {label}**" if is_current else f"{icon} {label}"
            if st.button(
                btn_label,
                key=f"nav_{page_key}",
                use_container_width=True,
                type="primary" if is_current else "secondary",
            ):
                st.session_state.current_page = page_key
                st.rerun()

        st.markdown("---")
        st.caption("PaintGuard v1.0 | Phase 3")
