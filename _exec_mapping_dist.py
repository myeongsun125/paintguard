"""analysis_mapping_distribution.ipynb 실행 스크립트."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from pathlib import Path
import nbformat
from nbclient import NotebookClient

NB = Path("C:/Users/user/Desktop/PROJ2/analysis_mapping_distribution.ipynb")
nb = nbformat.read(NB, as_version=4)

client = NotebookClient(
    nb,
    timeout=1200,
    kernel_name="python3",
    resources={"metadata": {"path": str(NB.parent)}},
    allow_errors=False,
)

print("실행 시작...")
client.execute()
nbformat.write(nb, NB)

# 에러 셀 확인
error_cells = []
for i, cell in enumerate(nb.cells):
    if cell.cell_type == "code":
        for out in cell.get("outputs", []):
            if out.get("output_type") == "error":
                error_cells.append((i, out.get("ename", ""), out.get("evalue", "")))

print(f"\n실행 완료: {len(nb.cells)} cells")
print(f"코드 셀: {sum(1 for c in nb.cells if c.cell_type == 'code')}")
print(f"마크다운 셀: {sum(1 for c in nb.cells if c.cell_type == 'markdown')}")
print(f"에러 셀: {len(error_cells)}")

if error_cells:
    for idx, ename, evalue in error_cells:
        print(f"  [ERROR] cell {idx}: {ename}: {evalue}")
else:
    print("✅ 전 셀 에러 없이 실행 완료")
