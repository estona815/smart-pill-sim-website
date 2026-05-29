(() => {
  'use strict';

  const mockState = {
    gpioEnabled: false,
    motorEnabled: false,
    sensorEnabled: false,
    lastCommand: 'idle',
    events: []
  };

  function logEvent(type, detail) {
    const event = {
      type,
      detail,
      at: new Date().toISOString()
    };
    mockState.events.unshift(event);
    mockState.events = mockState.events.slice(0, 20);
    return event;
  }

  function dispatchMotor(angleDeg) {
    mockState.lastCommand = `mock_motor_${angleDeg}`;
    return logEvent('mock_motor', `DEMO ONLY: requested virtual motor angle ${angleDeg}deg. No GPIO or motor control executed.`);
  }

  function readDropSensor(seed = Date.now()) {
    const detected = (Math.abs(Math.sin(seed)) * 100) % 1 > 0.18;
    return {
      detected,
      source: 'mock_sensor',
      message: 'DEMO ONLY: virtual sensor reading. No physical sensor accessed.'
    };
  }

  function resetMock() {
    mockState.lastCommand = 'idle';
    mockState.events = [];
    return logEvent('mock_reset', 'Mock layer reset. Physical hardware remains untouched.');
  }

  window.HardwareMock = {
    state: mockState,
    dispatchMotor,
    readDropSensor,
    resetMock
  };
})();
