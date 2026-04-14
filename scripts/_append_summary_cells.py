"""
model_profile_mapping.ipynb 맨 끝에 PaintGuard 총평 셀 4개 추가.
- 마크다운: 섹션 제목
- 코드: 2x2 시각화 (paintguard_final_summary.png 저장)
- 마크다운: 수치 성과 요약표
- 마크다운: 총평 및 결론

기존 셀은 절대 수정하지 않음. 맨 끝에만 append.
"""
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.paths import PROJECT_ROOT, NOTEBOOKS_DIR
import nbformat

NB = NOTEBOOKS_DIR / "model_profile_mapping.ipynb"

nb = nbformat.read(NB, as_version=4)
before_count = len(nb.cells)
print(f"[BEFORE] 총 셀 수: {before_count}")

# ==================== 셀 1: 마크다운 섹션 제목 ====================
md1 = """## PaintGuard 프로젝트 총평
> Phase 1-A / 1-B / 2 전 단계 완료 기준

---"""

# ==================== 셀 2: 코드 시각화 ====================
code = '''# PaintGuard 프로젝트 최종 성과 요약 시각화
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib import rcParams
import numpy as np

rcParams["font.family"] = "Malgun Gothic"
rcParams["axes.unicode_minus"] = False

fig, axes = plt.subplots(2, 2, figsize=(16, 12), facecolor="white")

# ---------- 차트 1 (좌상): 단계별 완성도 ----------
ax1 = axes[0, 0]
phases = ["EDA (3단계)", "Phase 1-A LightGBM", "Phase 1-B YOLO",
          "Phase 2 프로파일매핑", "Phase 3 대시보드"]
completion = [100, 100, 100, 100, 0]
colors1 = ["#2C5F8A" if v == 100 else "#CCCCCC" for v in completion]
y_pos = np.arange(len(phases))
bars1 = ax1.barh(y_pos, completion, color=colors1, edgecolor="white")
ax1.set_yticks(y_pos)
ax1.set_yticklabels(phases)
ax1.invert_yaxis()
ax1.set_xlim(0, 115)
ax1.set_xlabel("완성도 (%)")
ax1.set_title("PaintGuard 단계별 완성도", fontsize=14, fontweight="bold")
for bar, val in zip(bars1, completion):
    label = f"{val}%" if val > 0 else "예정 (MES 통합 시)"
    ax1.text(val + 2, bar.get_y() + bar.get_height() / 2, label,
             va="center", fontsize=10)
ax1.grid(axis="x", alpha=0.3)
ax1.set_axisbelow(True)

# ---------- 차트 2 (우상): 모델별 핵심 성능 지표 ----------
ax2 = axes[0, 1]
models = ["LightGBM\\nCLEAN", "YOLO v8n", "YOLO v11s"]
scores = [0.556, 0.8111, 0.8656]
colors2 = ["#F39C12", "#5DADE2", "#2C5F8A"]
bars2 = ax2.bar(models, scores, color=colors2, edgecolor="white")
ax2.axhline(y=0.5, color="red", linestyle="--", linewidth=1.5,
            label="랜덤 수준 (0.5)")
ax2.set_ylim(0, 1.08)
ax2.set_ylabel("성능 점수")
ax2.set_title("모델별 핵심 성능 지표", fontsize=14, fontweight="bold")
for bar, val in zip(bars2, scores):
    ax2.text(bar.get_x() + bar.get_width() / 2, val + 0.015,
             f"{val:.4f}", ha="center", fontsize=11, fontweight="bold")
# 지표 이름 주석
metric_names = ["AUC-ROC", "mAP@0.5:0.95", "mAP@0.5:0.95"]
for i, m in enumerate(metric_names):
    ax2.text(i, -0.065, m, ha="center", fontsize=9, color="gray",
             transform=ax2.get_xaxis_transform())
# LightGBM 막대 위 텍스트
ax2.text(0, 0.62, "정형만으론\\n예측 불가", ha="center", fontsize=10,
         color="#C00000", fontweight="bold")
ax2.legend(loc="upper right")
ax2.grid(axis="y", alpha=0.3)
ax2.set_axisbelow(True)

# ---------- 차트 3 (좌하): 리스크 등급 분포 pie ----------
ax3 = axes[1, 0]
grades = ["CRITICAL\\n26건", "HIGH\\n50건", "MEDIUM\\n75건", "LOW\\n100건"]
sizes = [26, 50, 75, 100]
colors3 = ["#C00000", "#E26B0A", "#7F6000", "#375623"]
wedges, texts, autotexts = ax3.pie(
    sizes, labels=grades, colors=colors3,
    autopct="%.1f%%", startangle=90,
    textprops={"fontsize": 11},
    wedgeprops={"edgecolor": "white", "linewidth": 2},
)
for at in autotexts:
    at.set_color("white")
    at.set_fontweight("bold")
    at.set_fontsize(11)
ax3.set_title("YOLO 탐지 결과 리스크 등급 분포\\n(v11s, 251건)",
              fontsize=14, fontweight="bold")

# ---------- 차트 4 (우하): 결함 유형별 mAP@0.5:0.95 ----------
ax4 = axes[1, 1]
defects = ["SCR 스크래치", "DNT 덴트", "PBB 도장기포", "PDR 도장흘림",
           "DST 이물질", "ORG 오렌지필", "CRK 크랙", "GAP Gap불량"]
maps = [0.9383, 0.9818, 0.9255, 0.8477, 0.9000, 0.9138, 0.8931, 0.5248]
severity = {
    "SCR 스크래치": "MINOR",
    "DNT 덴트":     "MAJOR",
    "PBB 도장기포": "MINOR",
    "PDR 도장흘림": "MINOR",
    "DST 이물질":   "MINOR",
    "ORG 오렌지필": "MINOR",
    "CRK 크랙":     "CRITICAL",
    "GAP Gap불량":  "CRITICAL",
}
sev_color = {"CRITICAL": "#C00000", "MAJOR": "#E26B0A", "MINOR": "#5DADE2"}
colors4 = [sev_color[severity[d]] for d in defects]
y_pos4 = np.arange(len(defects))
bars4 = ax4.barh(y_pos4, maps, color=colors4, edgecolor="white")
ax4.axvline(x=0.8, color="gray", linestyle="--", linewidth=1.5,
            label="기준선 0.80")
ax4.set_yticks(y_pos4)
ax4.set_yticklabels(defects)
ax4.invert_yaxis()
ax4.set_xlim(0, 1.1)
ax4.set_xlabel("mAP@0.5:0.95")
ax4.set_title("결함 클래스별 탐지 정확도 (mAP@0.5:0.95)",
              fontsize=14, fontweight="bold")
for bar, val in zip(bars4, maps):
    ax4.text(val + 0.012, bar.get_y() + bar.get_height() / 2,
             f"{val:.4f}", va="center", fontsize=10)
# GAP 주석
gap_idx = defects.index("GAP Gap불량")
ax4.annotate("개선 필요",
             xy=(0.5248, gap_idx),
             xytext=(0.78, gap_idx - 0.35),
             fontsize=10, color="#C00000", fontweight="bold",
             arrowprops=dict(arrowstyle="->", color="#C00000", lw=1.5))
legend_handles = [
    mpatches.Patch(color="#C00000", label="CRITICAL"),
    mpatches.Patch(color="#E26B0A", label="MAJOR"),
    mpatches.Patch(color="#5DADE2", label="MINOR"),
    plt.Line2D([0], [0], color="gray", linestyle="--", label="기준선 0.80"),
]
ax4.legend(handles=legend_handles, loc="lower right", fontsize=9)
ax4.grid(axis="x", alpha=0.3)
ax4.set_axisbelow(True)

fig.suptitle("PaintGuard 프로젝트 최종 성과 요약",
             fontsize=16, fontweight="bold", y=1.00)
plt.tight_layout()

OUT_PNG = str(PROJECT_ROOT / "paintguard_final_summary.png")
plt.savefig(OUT_PNG, dpi=150, bbox_inches="tight", facecolor="white")
plt.show()
print(f"Saved: {OUT_PNG}")
'''

# ==================== 셀 3: 마크다운 수치 성과 요약표 ====================
md2 = """### 수치 성과 요약

| 구분 | 항목 | 결과 | 비고 |
|---|---|---|---|
| 데이터 | 정형 데이터 | 300만행, Null 0%, FK 100% | 완벽한 품질 |
| 데이터 | 이미지 | 1,000장, 8클래스 | YOLO 라벨 포함 |
| EDA | 핵심 인사이트 | C조 6.02% / 교대직후 6.08% / 저습도 4.3~4.5% | 3가지 패턴 확인 |
| Phase 1-A | LightGBM AUC | 0.556 (≈ 랜덤) | 정형만으론 예측 불가 확인 |
| Phase 1-A | SHAP 1위 피처 | `shift_hour` (2위 대비 20배) | EDA 인사이트 모델로 재확인 |
| Phase 1-B | YOLO v11s mAP@0.5 | 0.9875 | 8클래스 전부 0.93 이상 |
| Phase 1-B | YOLO v11s mAP@0.5:0.95 | 0.8656 | v8n 대비 +6.7% 개선 |
| Phase 1-B | 색상 분류 Top-1 Acc | 1.0000 | 9클래스 완벽 분리 |
| Phase 2 | 프로파일 매핑 성공률 | 100% (251건 전건) | 인스턴스 조인 없이 달성 |
| Phase 2 | 리스크 CRITICAL 건수 | 26건 (10.4%) | 분위수 자동 조정 방식 |"""

# ==================== 셀 4: 마크다운 총평 및 결론 ====================
md3 = """## 총평

### 1. 데이터 한계를 방법론으로 극복
이미지와 정형 데이터 사이에 공유 키가 없어 인스턴스 레벨 직접 조인이
불가능했다. 이를 **"프로파일 레벨 매핑"** 방식으로 우회하여
`결함 유형 × 구역` 조합으로 과거 공정 이력을 조회하는 구조를 설계했다.

### 2. 두 파이프라인의 상호 보완
- 정형 모델(LightGBM AUC 0.556)은 FAIL 예측에 실패했으나,
  이 결과 자체가 **"이미지 트랙이 필요하다"는 근거**가 되었다.
- YOLO(mAP@0.5:0.95 = 0.866)는 이미지에서 결함을 성공적으로 탐지했고,
  그 결과를 정형 데이터 기반 프로파일과 연결해 공정 맥락을 부여했다.
- 두 트랙이 독립적으로 성립하면서 동시에 서로를 보완하는 구조다.

### 3. 한계 및 향후 방향
- **GAP(Gap불량) mAP@0.5:0.95 = 0.5248** — 얇고 길쭉한 bbox 회귀 한계.
  SIoU loss 또는 oversampling으로 개선 가능.
- 합성 데이터 기반이므로 실제 공정 데이터로 재검증 필요.
- Phase 3 (MES 통합 대시보드)에서 생산량/공정/품질/예지보전
  4개 레이어를 통합하여 시연할 예정.

### 4. MES 시스템 내 위치
본 프로젝트(**PaintGuard**)는 MES 4개 레이어 중
**공정 + 품질** 파트에 해당하며,
나머지 레이어(생산량, 예지보전) 완성 후
통합 대시보드로 연결될 예정이다.

---

*Phase 1-A / 1-B / 2 전 단계 완료. 본 노트북은 Phase 2 최종 산출물.*"""

# ==================== 셀 append ====================
new_cells = [
    nbformat.v4.new_markdown_cell(md1),
    nbformat.v4.new_code_cell(code),
    nbformat.v4.new_markdown_cell(md2),
    nbformat.v4.new_markdown_cell(md3),
]

# 기존 셀 복사 안 하고 append 만 (원본 셀 건드리지 않음)
for c in new_cells:
    nb.cells.append(c)

after_count = len(nb.cells)
print(f"[AFTER]  총 셀 수: {after_count} (추가: {after_count - before_count})")

# 추가된 셀 확인
for i, c in enumerate(nb.cells[-4:], start=after_count - 4):
    src = c.source if isinstance(c.source, str) else "".join(c.source)
    print(f"  [{i}] {c.cell_type:10s} ({len(src)} chars) : {src.splitlines()[0][:60]}")

nbformat.write(nb, NB)
print(f"\n저장 완료: {NB}")
