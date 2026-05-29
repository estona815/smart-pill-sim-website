#!/usr/bin/env python3
from datetime import datetime
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs" / "submission_package"
OUT.mkdir(parents=True, exist_ok=True)
required = [
    "outputs/reports/professor_checkpoint_summary.md",
    "docs/hardware_readiness_gate.md",
    "docs/workshop_checklist.md",
    "WEB_FINAL_QC_REPORT.md"
]
missing = [path for path in required if not (ROOT / path).exists()]
(OUT / "README_SUBMISSION.md").write_text("# Submission Package\n\n교수 제출용 패키지 골격. 완료/진행/검증 필요 항목을 분리한다.\n", encoding="utf-8")
manifest = {"created_at": datetime.now().isoformat(), "included_files": [p for p in required if p not in missing], "missing_files": missing, "package_status": "READY" if not missing else "NEEDS_REVIEW", "notes": "handoff skeleton"}
(OUT / "submission_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(manifest, ensure_ascii=False, indent=2))
