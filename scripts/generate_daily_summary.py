#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "data" / "daily_standup.json").read_text(encoding="utf-8"))
out = ROOT / "outputs" / "reports" / "daily_summary_latest.md"
out.write_text("# Daily Summary\n\nTODO: Expand from daily_standup/task_log/activity_feed on next computer.\n\nEntries: " + str(len(data.get("entries", []))) + "\n", encoding="utf-8")
print(out)
