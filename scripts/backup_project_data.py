#!/usr/bin/env python3
from datetime import datetime
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
backup_dir = ROOT / "outputs" / "backups" / datetime.now().strftime("%Y-%m-%d_%H%M%S")
backup_dir.mkdir(parents=True, exist_ok=True)
files = []
for folder in ["data", "docs"]:
    src = ROOT / folder
    if src.exists():
        dst = backup_dir / folder
        shutil.copytree(src, dst, dirs_exist_ok=True)
        files.extend(str(p.relative_to(backup_dir)) for p in dst.rglob("*") if p.is_file())
manifest = {"backup_id": backup_dir.name, "created_at": datetime.now().isoformat(), "files": files, "file_count": len(files), "notes": "handoff skeleton backup"}
(backup_dir / "backup_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(backup_dir)
