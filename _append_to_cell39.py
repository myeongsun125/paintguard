"""
model_profile_mapping.ipynb 의 마지막 셀(39번, ## 총평 마크다운) 에
'### 5. 추론 플로우' / '### 6. MES 시스템 내 위치' 두 섹션을 기존 뒤에 append.
기존 텍스트는 절대 수정하지 않음.
"""
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from pathlib import Path
import nbformat

NB = Path("C:/Users/user/Desktop/PROJ2/model_profile_mapping.ipynb")

APPEND_TEXT = """

### 5. 추론 플로우 — 구현 준비 완료

본 프로젝트에서 구축한 파이프라인은 아래 순서로 실시간 동작 가능하다.

```
이미지 1장 입력
  → 결함 탐지 (YOLOv11s-detect) + 색상 분류 (YOLOv11s-cls) 동시 실행
  → 결함 유형 + bbox + 색상 + 심각도 확정
  → 프로파일 테이블 조회 ("유사 과거 결함은 C조, 저습도에서 빈발")
  → 리스크 스코어 + 등급 산출
  → 권고 조치 출력 ("즉시 라인 정지" / "집중 모니터링" 등)
  → 재작업 예상 비용(시간) 표시
```

필요한 모델 파일과 데이터 계층이 전부 준비된 상태이며,
웹 구현(Streamlit 또는 동등한 프레임워크)으로 즉시 확장 가능하다.

### 6. MES 시스템 내 위치 및 다음 단계

PaintGuard는 MES(Manufacturing Execution System) 4개 레이어 중
**공정 + 품질** 파트에 해당한다.

| MES 레이어 | 내용 | 상태 |
|---|---|---|
| 생산량 | 생산 실적, 목표 대비 달성률 | 미개발 |
| **공정** | **AI 비전 결함 탐지, 리스크 평가** | **완료 (PaintGuard)** |
| **품질** | **프로파일 매핑, 권고 조치** | **완료 (PaintGuard)** |
| 예지보전 | 설비 이상 예측, 교체 주기 관리 | 미개발 |

나머지 레이어(생산량, 예지보전) 완성 후
4개 레이어를 통합한 **MES 통합 대시보드**를 구현할 예정이다."""

nb = nbformat.read(NB, as_version=4)
total = len(nb.cells)
print(f"총 셀 수: {total}")

last = nb.cells[-1]
if last.cell_type != "markdown":
    raise SystemExit(f"마지막 셀이 markdown 아님: {last.cell_type}")

old_src = last.source if isinstance(last.source, str) else "".join(last.source)
print(f"마지막 셀 원본 길이: {len(old_src)} chars")
print(f"원본 첫 줄: {old_src.splitlines()[0]}")
print(f"원본 끝 3줄:")
for ln in old_src.splitlines()[-3:]:
    print(f"  | {ln}")

# 안전장치: 원본이 예상한 '## 총평' 섹션인지 확인
if not old_src.startswith("## 총평"):
    raise SystemExit("마지막 셀 시작이 '## 총평' 이 아님 - 잘못된 셀일 수 있음")

# 안전장치: 이미 append 된 상태인지 확인
if "### 5. 추론 플로우" in old_src:
    raise SystemExit("이미 '### 5. 추론 플로우' 섹션이 존재함 - 중복 append 방지")

new_src = old_src + APPEND_TEXT
last.source = new_src
# 마크다운 셀은 outputs/execution_count 없음 → 건드릴 것 없음

print(f"\n추가 후 길이: {len(new_src)} chars (+{len(new_src) - len(old_src)})")
print(f"추가 후 끝 3줄:")
for ln in new_src.splitlines()[-3:]:
    print(f"  | {ln}")

nbformat.write(nb, NB)
print(f"\n저장 완료: {NB}")

# 검증: 다시 읽어서 확인
nb2 = nbformat.read(NB, as_version=4)
last2 = nb2.cells[-1]
src2 = last2.source if isinstance(last2.source, str) else "".join(last2.source)
assert last2.cell_type == "markdown"
assert src2.startswith("## 총평")
assert "### 5. 추론 플로우 — 구현 준비 완료" in src2
assert "### 6. MES 시스템 내 위치 및 다음 단계" in src2
assert "| **공정** | **AI 비전 결함 탐지, 리스크 평가** | **완료 (PaintGuard)** |" in src2
assert len(nb2.cells) == total, f"셀 수 변동: {total} -> {len(nb2.cells)}"
print(f"\n[검증 OK] 총 {len(nb2.cells)}셀, 마지막 셀 {len(src2)} chars, 두 새 섹션 모두 존재")
