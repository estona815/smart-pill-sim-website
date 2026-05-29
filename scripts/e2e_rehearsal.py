#!/usr/bin/env python3
from datetime import datetime
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
report = ROOT / "docs" / "e2e_rehearsal_report.md"
log = ROOT / "outputs" / "startup_logs" / "e2e_rehearsal_latest.json"
steps = ["backup", "json_validation", "qc", "simulation_dry_run", "hardware_gate", "submission_package"]
result = {"generated_at": datetime.now().isoformat(), "final_status": "NEEDS_MINOR_FIX", "steps": steps, "notes": "handoff skeleton only"}
report.write_text("# E2E Rehearsal Report\n\nFinal status: NEEDS_MINOR_FIX\n\nTODO: Wire all project scripts on next computer.\n", encoding="utf-8")
log.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(result, ensure_ascii=False, indent=2))
