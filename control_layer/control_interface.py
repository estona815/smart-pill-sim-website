class ControlInterface:
    def initialize(self): raise NotImplementedError
    def get_status(self): raise NotImplementedError
    def request_dispense(self, slot_id, quantity): raise NotImplementedError
    def emergency_stop(self): raise NotImplementedError
    def reset(self): raise NotImplementedError
    def read_sensors(self): raise NotImplementedError
    def get_last_error(self): raise NotImplementedError
