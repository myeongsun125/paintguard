"""
model_profile_mapping.ipynb 진단 실행.
- allow_errors=True → 에러 발생해도 끝까지 실행
- 각 셀 결과 수집 후 에러 셀만 리포트
- 원본 노트북은 수정/저장하지 않음 (in-memory 만 실행)
"""
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.paths import NOTEBOOKS_DIR
import nbformat
from nbclient import NotebookClient

NB = NOTEBOOKS_DIR / "model_profile_mapping.ipynb"

nb = nbformat.read(NB, as_version=4)
client = NotebookClient(
    nb,
    timeout=1200,
    kernel_name="python3",
    resources={"metadata": {"path": str(NB.parent)}},
    allow_errors=True,  # 에러 나도 계속 진행
)
print(f"[진단 실행] {NB}")
client.execute()
print("[진단 실행 완료]\n")

# 에러 셀 수집
error_cells = []
for i, cell in enumerate(nb.cells):
    if cell.cell_type != "code":
        continue
    for out in (cell.get("outputs") or []):
        if out.get("output_type") == "error":
            error_cells.append((i, cell, out))
            break

print(f"총 셀 수        : {len(nb.cells)}")
print(f"code 셀 수      : {sum(1 for c in nb.cells if c.cell_type=='code')}")
print(f"에러 발생 셀 수 : {len(error_cells)}")
print("=" * 70)

if not error_cells:
    print("모든 셀 정상 실행 완료 (에러 없음)")
else:
    for idx, cell, err in error_cells:
        print(f"\n### [cell index {idx}] execution_count={cell.get('execution_count')}")
        print("--- source ---")
        src = cell.source
        for ln, line in enumerate(src.splitlines(), 1):
            print(f"{ln:3d}| {line}")
        print("--- error ---")
        print(f"ename    : {err.get('ename')}")
        print(f"evalue   : {err.get('evalue')}")
        print("traceback:")
        tb = err.get("traceback") or []
        for line in tb:
            # nbformat traceback 은 ANSI 색상 포함 → 그대로 출력
            print(line)
        print("-" * 70)

# 원본 덮어쓰지 않음 — 진단만.
print("\n[원본 노트북 보존 — nbformat.write 호출 안 함]")
