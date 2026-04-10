"""
model_yolo_v11s_detection.ipynb 실행.
- nbclient 로 in-place 실행.
- 타임아웃 2400s (val 200장 추론 포함).
"""
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from pathlib import Path
import nbformat
from nbclient import NotebookClient

NB = Path("C:/Users/user/Desktop/PROJ2/model_yolo_v11s_detection.ipynb")

nb = nbformat.read(NB, as_version=4)
client = NotebookClient(
    nb,
    timeout=2400,
    kernel_name="python3",
    resources={"metadata": {"path": str(NB.parent)}},
    allow_errors=False,
)
print(f"실행 시작 : {NB}")
client.execute()
print("실행 완료")
nbformat.write(nb, NB)
print(f"저장 완료 : {NB}")
