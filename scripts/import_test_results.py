#!/usr/bin/env python3
"""Import recorded CSV/JSON test results into data/test_results.json.

Handoff skeleton only. It never performs hardware tests.
"""

from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "test_results.json"

COLUMNS = [
    "test_id", "timestamp", "operator", "test_type", "slot_id", "pill_type",
    "requested_quantity", "actual_quantity", "sensor_detected", "jam_occurred",
    "double_dispense", "no_dispense", "motor_fail", "power_issue", "notes"
]


def parse_bool(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y", "pass"}


def normalize(row: dict) -> dict:
    requested = int(row.get("requested_quantity") or 0)
    actual = int(row.get("actual_quantity") or 0)
    flags = {key: parse_bool(row.get(key, "")) for key in [
        "sensor_detected", "jam_occurred", "double_dispense", "no_dispense", "motor_fail", "power_issue"
    ]}
    fail_flags = flags["jam_occurred"] or flags["double_dispense"] or flags["no_dispense"] or flags["motor_fail"] or flags["power_issue"]
    if requested == actual and flags["sensor_detected"] and not fail_flags:
        result = "PASS"
    elif requested == actual and not flags["sensor_detected"] and not fail_flags:
        result = "NEEDS_REVIEW"
    else:
        result = "FAIL"
    return {
        "test_id": row.get("test_id", ""),
        "timestamp": row.get("timestamp", ""),
        "operator": row.get("operator", ""),
        "test_type": row.get("test_type", ""),
        "slot_id": row.get("slot_id", ""),
        "pill_type": row.get("pill_type", ""),
        "requested_quantity": requested,
        "actual_quantity": actual,
        **flags,
        "result": result,
        "notes": row.get("notes", "")
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    source = Path(args.source)
    if source.suffix.lower() == ".json":
        raw = json.loads(source.read_text(encoding="utf-8"))
        rows = raw.get("records", raw if isinstance(raw, list) else [])
    else:
        with source.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
    records = [normalize(row) for row in rows]
    payload = {
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "source_file": str(source),
        "records": records
    }
    if args.dry_run:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Imported {len(records)} records to {OUT}")


if __name__ == "__main__":
    main()
