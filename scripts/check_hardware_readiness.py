#!/usr/bin/env python3
"""Hardware readiness gate skeleton. Never connects to hardware."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GATE = ROOT / "data" / "hardware_readiness_gate.json"
LOG = ROOT / "outputs" / "qc_logs" / "hardware_readiness_latest.json"
CHECKLIST = ROOT / "docs" / "pre_connection_checklist.md"


REQUIRED = [
    "DC-DC 컨버터 출력 전압 5V 실측",
    "Raspberry Pi 입력 전압 5V 안정성 확인",
    "24V가 Pi로 직접 들어가지 않는 구조 확인",
    "모터 전원과 Pi 전원 경로 분리 확인",
    "GND 공통 처리 계획 확인",
    "센서 출력 전압 3.3V 호환 확인",
    "긴급 정지 스위치 설계 확인"
]


def main() -> None:
    gate = json.loads(GATE.read_text(encoding="utf-8"))
    gate["updated_at"] = datetime.now(timezone.utc).isoformat()
    gate["gate_status"] = "BLOCKED"
    gate["blocking_items"] = REQUIRED
    LOG.write_text(json.dumps(gate, ensure_ascii=False, indent=2), encoding="utf-8")
    CHECKLIST.write_text("# Pre-Connection Checklist\n\n" + "\n".join(f"- [ ] {item}" for item in REQUIRED) + "\n\n실측 증거 없는 항목은 PASS 금지.\n", encoding="utf-8")
    print(json.dumps(gate, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
