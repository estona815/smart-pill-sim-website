class DryRunController:
    def request_dispense(self, slot_id, quantity):
        return {"mode": "DRY_RUN", "slot_id": slot_id, "quantity": quantity, "hardware_access": False}

    def get_status(self):
        return {"mode": "DRY_RUN", "ready": True, "hardware_access": False}
