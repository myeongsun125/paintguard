"""
model_profile_mapping.ipynb 전 셀 재실행 (v11s inference 기준).
- nbclient in-place execute, 타임아웃 1200s
- 에러 발생 시 즉시 중단 (allow_errors=False)
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
    allow_errors=False,
)
print(f"실행 시작 : {NB}")
client.execute()
print("실행 완료")
nbformat.write(nb, NB)
print(f"저장 완료 : {NB}")
