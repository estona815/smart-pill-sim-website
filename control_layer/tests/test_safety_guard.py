from control_layer.safety_guard import can_enable_real_control


def test_real_control_blocked_by_default():
    result = can_enable_real_control()
    assert result["allowed"] is False
