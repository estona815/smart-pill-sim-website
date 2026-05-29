import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def can_enable_real_control():
    config = json.loads((ROOT / "control_layer" / "control_config.json").read_text(encoding="utf-8"))
    gate = json.loads((ROOT / "data" / "hardware_readiness_gate.json").read_text(encoding="utf-8"))
    reasons = []
    if not config.get("real_hardware_enabled"):
        reasons.append("real_hardware_enabled is false")
    if gate.get("gate_status") != "READY_FOR_CONTROL_TEST":
        reasons.append(f"gate_status is {gate.get('gate_status')}")
    return {"allowed": not reasons, "reasons": reasons}
