(() => {
  'use strict';

  let selectedSlot = '아침';
  const slotLabel = document.getElementById('demoSlotLabel');
  const mainStatus = document.getElementById('demoMainStatus');
  const detail = document.getElementById('demoDetail');
  const logEl = document.getElementById('demoLog');
  const sensorEl = document.getElementById('demoSensor');

  function setSlot(label) {
    selectedSlot = label;
    slotLabel.textContent = `${label} 복용`;
    mainStatus.textContent = `${label} 복용 시연 준비`;
    detail.textContent = '가상 1회 배출을 누르면 mock layer가 가상 구동과 가상 센서 감지를 기록합니다.';
  }

  function renderLog() {
    const events = window.HardwareMock.state.events;
    logEl.innerHTML = '';
    if (!events.length) {
      logEl.innerHTML = '<li>아직 실행된 시연이 없습니다.</li>';
      return;
    }
    for (const event of events) {
      const li = document.createElement('li');
      li.textContent = `${new Date(event.at).toLocaleTimeString('ko-KR')} · ${event.type} · ${event.detail}`;
      logEl.appendChild(li);
    }
  }

  function runDemo() {
    slotLabel.textContent = `${selectedSlot} 복용`;
    mainStatus.textContent = '가상 서보 구동 중';
    detail.textContent = '실제 모터 제어 없이 mock 이벤트만 생성합니다.';
    const motorEvent = window.HardwareMock.dispatchMotor(45);
    const reading = window.HardwareMock.readDropSensor(Date.now());
    sensorEl.className = reading.detected ? 'demo-sensor detected' : 'demo-sensor warning';
    sensorEl.textContent = reading.detected ? 'MOCK DETECTED' : 'MOCK CHECK';
    mainStatus.textContent = reading.detected ? '가상 배출 감지' : '가상 센서 재확인 필요';
    detail.textContent = reading.detected
      ? 'DEMO 상태입니다. 실제 테스트 전 PASS로 처리하지 않습니다.'
      : 'DEMO 상태입니다. 실제 센서 위치와 낙하 통로 검증이 필요합니다.';
    window.HardwareMock.state.events.unshift({
      type: 'mock_sensor',
      detail: `${reading.message} Result: ${reading.detected ? 'detected' : 'needs review'}. Linked motor event: ${motorEvent.type}`,
      at: new Date().toISOString()
    });
    renderLog();
  }

  document.getElementById('demoMorningBtn').addEventListener('click', () => setSlot('아침'));
  document.getElementById('demoLunchBtn').addEventListener('click', () => setSlot('점심'));
  document.getElementById('demoEveningBtn').addEventListener('click', () => setSlot('저녁'));
  document.getElementById('runDemoBtn').addEventListener('click', runDemo);
  document.getElementById('resetDemoBtn').addEventListener('click', () => {
    window.HardwareMock.resetMock();
    sensorEl.className = 'demo-sensor';
    sensorEl.textContent = 'IR MOCK';
    mainStatus.textContent = 'Mock 초기화 완료';
    detail.textContent = '실제 하드웨어 상태는 변경하지 않았습니다.';
    renderLog();
  });

  setSlot('아침');
  renderLog();
})();
