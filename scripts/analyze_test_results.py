#!/usr/bin/env python3
"""Analyze imported actual test results without running hardware."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IN_FILE = ROOT / "data" / "test_results.json"
PERF_FILE = ROOT / "data" / "actual_performance.json"
LOG_FILE = ROOT / "outputs" / "qc_logs" / "test_result_analysis_latest.json"


def confidence(sample_count: int) -> str:
    if sample_count < 30:
        return "LOW"
    if sample_count < 100:
        return "MEDIUM"
    return "HIGH"


def analyze() -> dict:
    payload = json.loads(IN_FILE.read_text(encoding="utf-8"))
    records = payload.get("records", [])
    sample_count = len(records)
    success_count = sum(1 for record in records if record.get("result") == "PASS")
    failure_count = sample_count - success_count
    detected_count = sum(1 for record in records if record.get("sensor_detected"))
    breakdown = {
        "jam": sum(1 for r in records if r.get("jam_occurred")),
        "double_dispense": sum(1 for r in records if r.get("double_dispense")),
        "no_dispense": sum(1 for r in records if r.get("no_dispense")),
        "sensor_miss": sum(1 for r in records if not r.get("sensor_detected")),
        "motor_fail": sum(1 for r in records if r.get("motor_fail")),
        "power_issue": sum(1 for r in records if r.get("power_issue"))
    }
    actual_success_rate = None if sample_count == 0 else round(success_count / sample_count * 100, 2)
    status = "NO_ACTUAL_TEST_DATA" if sample_count == 0 else "PARTIAL_DATA" if sample_count < 100 else "ANALYZED"
    warnings = []
    if sample_count < 10:
        warnings.append("Sample count is below 10; confidence is LOW.")
    if sample_count < 30:
        warnings.append("Target achievement cannot be confirmed with fewer than 30 samples.")
    result = {
        "status": status,
        "sample_count": sample_count,
        "success_count": success_count,
        "failure_count": failure_count,
        "actual_success_rate": actual_success_rate,
        "actual_failure_rate": None if sample_count == 0 else round(failure_count / sample_count * 100, 2),
        "sensor_detection_rate": None if sample_count == 0 else round(detected_count / sample_count * 100, 2),
        "failure_breakdown": breakdown,
        "confidence_level": confidence(sample_count),
        "target_success_rate": 90,
        "target_met": bool(sample_count >= 30 and actual_success_rate is not None and actual_success_rate >= 90),
        "warnings": warnings,
        "recommendations": ["Add more recorded tests before using actual success rate in final report."]
    }
    return result


if __name__ == "__main__":
    result = analyze()
    PERF_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    LOG_FILE.write_text(json.dumps({"generated_at": datetime.now(timezone.utc).isoformat(), **result}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
