#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
for manifest in (ROOT / "outputs" / "backups").glob("*/backup_manifest.json"):
    json.loads(manifest.read_text(encoding="utf-8"))
    print(f"OK {manifest}")
