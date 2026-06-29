const capsuleCatalog = {
  CH0: {
    code: "CH0",
    name: "비타민",
    color: "#f3ba45",
    accent: "#fff1b0",
    label: "VITAMIN",
  },
  CH1: {
    code: "CH1",
    name: "미네랄",
    color: "#f1ede3",
    accent: "#ffffff",
    label: "MINERAL",
  },
  CH2: {
    code: "CH2",
    name: "오메가3",
    color: "#d9a72e",
    accent: "#ffe48a",
    label: "OMEGA 3",
  },
  CH3: {
    code: "CH3",
    name: "프로바이오틱",
    color: "#e7d4bd",
    accent: "#fff0df",
    label: "PROBIOTIC",
  },
};

const initialQueueTemplate = [
  { channel: "CH0", qty: 1 },
  { channel: "CH2", qty: 1 },
  { channel: "CH1", qty: 1 },
  { channel: "CH3", qty: 1 },
];

const routeMap = {
  CH0: {
    start: { x: 26, y: 16, rotation: -8 },
    gate: { x: 26, y: 31, rotation: -4 },
    ramp: { x: 38, y: 59, rotation: 24 },
    jam: { x: 38, y: 59, rotation: 20 },
    retryBack: { x: 35, y: 66, rotation: 32 },
    cup: { x: 45, y: 86, rotation: 78 },
    final: { x: 46, y: 90, rotation: 90 },
  },
  CH1: {
    start: { x: 39, y: 16, rotation: -4 },
    gate: { x: 39, y: 31, rotation: -2 },
    ramp: { x: 43, y: 59, rotation: 14 },
    jam: { x: 43, y: 59, rotation: 12 },
    retryBack: { x: 42, y: 66, rotation: 22 },
    cup: { x: 46, y: 86, rotation: 86 },
    final: { x: 47, y: 90, rotation: 92 },
  },
  CH2: {
    start: { x: 52, y: 16, rotation: 4 },
    gate: { x: 52, y: 31, rotation: 2 },
    ramp: { x: 47, y: 59, rotation: 2 },
    jam: { x: 47, y: 59, rotation: 0 },
    retryBack: { x: 47, y: 66, rotation: 12 },
    cup: { x: 48, y: 86, rotation: 88 },
    final: { x: 49, y: 90, rotation: 92 },
  },
  CH3: {
    start: { x: 65, y: 16, rotation: 6 },
    gate: { x: 65, y: 31, rotation: 10 },
    ramp: { x: 51, y: 58, rotation: -8 },
    jam: { x: 51, y: 58, rotation: -12 },
    retryBack: { x: 49, y: 65, rotation: 4 },
    cup: { x: 49, y: 86, rotation: 88 },
    final: { x: 50, y: 90, rotation: 92 },
  },
};

const refs = {
  stage: document.querySelector("#sim-stage"),
  activeCapsule: document.querySelector("#active-capsule"),
  stageStateLabel: document.querySelector("#stage-state-label"),
  stepFlow: document.querySelector("#step-flow"),
  statusBadge: document.querySelector("#status-badge"),
  currentState: document.querySelector("#current-state"),
  currentCapsule: document.querySelector("#current-capsule"),
  currentStep: document.querySelector("#current-step"),
  positionStatus: document.querySelector("#position-status"),
  sensorState: document.querySelector("#sensor-state"),
  motorState: document.querySelector("#motor-state"),
  powerState: document.querySelector("#power-state"),
  jamPoint: document.querySelector("#jam-point"),
  dispensedCount: document.querySelector("#dispensed-count"),
  dispensedCountPanel: document.querySelector("#dispensed-count-panel"),
  queueCount: document.querySelector("#queue-count"),
  queueList: document.querySelector("#queue-list"),
  nextButton: document.querySelector("#next-dispense"),
  passButton: document.querySelector("#pass-button"),
  jamButton: document.querySelector("#jam-test"),
  retryButton: document.querySelector("#retry-button"),
  resetButton: document.querySelector("#reset-button"),
  logStatus: document.querySelector("#log-status"),
  eventLog: document.querySelector("#event-log"),
  cycleNote: document.querySelector("#cycle-note"),
  normalCount: document.querySelector("#normal-count"),
  jamCount: document.querySelector("#jam-count"),
  retryCount: document.querySelector("#retry-count"),
  remainingCount: document.querySelector("#remaining-count"),
  statusMessage: document.querySelector("#status-message"),
  currentChannelChip: document.querySelector("#current-channel-chip"),
  capsuleSample: document.querySelector(".capsule-sample"),
  jamMarker: document.querySelector("#jam-marker"),
  retryBadge: document.querySelector("#retry-badge"),
};

const state = {
  queue: [],
  running: false,
  jammed: false,
  awaitingPass: false,
  pendingSuccess: false,
  sensor: "대기",
  statusCode: "READY",
  statusText: "다음 배출 대기",
  stepText: "게이트 정렬 대기",
  jamLocation: "없음",
  dispensed: 0,
  successfulCycles: 0,
  jamEvents: 0,
  retries: 0,
  logs: [],
  capsulePosition: { ...routeMap.CH0.start },
};

function makeQueue() {
  return initialQueueTemplate.map((item, index) => ({
    id: `queue-${index + 1}`,
    ...item,
  }));
}

function getCurrentItem() {
  return state.queue[0] ?? null;
}

function getCurrentRoute(item = getCurrentItem()) {
  return routeMap[item?.channel ?? "CH0"];
}

function formatCapsule(item) {
  if (!item) return "대기 없음";
  const capsule = capsuleCatalog[item.channel];
  return `${capsule.code} ${capsule.name}`;
}

function getNow() {
  return new Date().toLocaleTimeString("ko-KR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function addLog(type, message) {
  state.logs.unshift({
    type,
    message,
    time: getNow(),
  });
  state.logs = state.logs.slice(0, 24);
}

function placeCapsule(position) {
  state.capsulePosition = { ...position };
  refs.activeCapsule.style.left = `${position.x}%`;
  refs.activeCapsule.style.top = `${position.y}%`;
  refs.activeCapsule.style.setProperty("--capsule-rotation", `${position.rotation}deg`);
}

function colorCapsule(item) {
  const capsule = item ? capsuleCatalog[item.channel] : capsuleCatalog.CH0;
  refs.activeCapsule.style.setProperty("--capsule-main", capsule.color);
  refs.activeCapsule.style.setProperty("--capsule-accent", capsule.accent);
  refs.capsuleSample?.style.setProperty("--capsule-main", capsule.color);
  refs.capsuleSample?.style.setProperty("--capsule-accent", capsule.accent);
}

function setDynamicMarkers(route) {
  refs.jamMarker.style.left = `${route.jam.x + 3}%`;
  refs.jamMarker.style.top = `${route.jam.y - 7}%`;
  refs.retryBadge.style.left = `${route.retryBack.x - 1}%`;
  refs.retryBadge.style.top = `${route.retryBack.y + 3}%`;
}

function renderQueue() {
  refs.queueList.innerHTML = state.queue
    .map((item, index) => {
      const capsule = capsuleCatalog[item.channel];
      return `
        <div class="queue-item ${index === 0 ? "is-active" : ""}">
          <span
            class="queue-swatch"
            style="--capsule-main:${capsule.color}; --capsule-accent:${capsule.accent};"
          ></span>
          <div class="queue-copy">
            <strong>${capsule.code} ${capsule.name}</strong>
            <span>${item.qty}정 · ${index === 0 ? "현재 대상" : "대기"}</span>
          </div>
          <span class="queue-state">${index === 0 ? "LIVE" : "QUEUE"}</span>
        </div>
      `;
    })
    .join("");

  if (state.queue.length === 0) {
    refs.queueList.innerHTML = `
      <div class="queue-item">
        <span class="queue-swatch"></span>
        <div class="queue-copy">
          <strong>큐 완료</strong>
          <span>모든 발표용 시나리오를 처리했습니다.</span>
        </div>
        <span class="queue-state">DONE</span>
      </div>
    `;
  }

  refs.queueCount.textContent = `${state.queue.length}건`;
  refs.remainingCount.textContent = `${state.queue.length}건`;
}

function renderLogs() {
  refs.logStatus.textContent = `${state.logs.length} events`;
  refs.eventLog.innerHTML = state.logs
    .map(
      (entry) => `
        <div class="log-entry">
          <span class="log-time">${entry.time}</span>
          <span class="log-type log-type-${entry.type.toLowerCase()}">${entry.type}</span>
          <p>${entry.message}</p>
        </div>
      `
    )
    .join("");
}

function getLiveLabel() {
  if (state.statusCode === "READY") {
    return "대기 중: 완성품 기준 카트리지와 배출 경로를 그대로 따라가며 다음 배출을 준비합니다.";
  }
  if (state.statusCode === "BLOCKED") {
    return "Jam 감지: 사선 램프 하단에서 멈춘 캡슐을 RETRY 또는 PASS로 처리할 수 있습니다.";
  }
  if (state.statusCode === "RETRY") {
    return "재정렬 중: 걸린 캡슐을 다시 흔들어 컵 토출 경로로 복귀시키고 있습니다.";
  }
  if (state.statusCode === "PASS WAIT") {
    return "검증 대기: 실물 기준 토출이 끝났습니다. PASS를 눌러 현재 사이클을 확정하세요.";
  }
  if (state.statusCode === "COMPLETE") {
    return "시뮬레이션 완료: 준비된 모든 실물 기준 배출 시나리오를 처리했습니다.";
  }
  return state.statusText;
}

function getCycleNote() {
  if (state.statusCode === "READY") return "00:08";
  if (state.statusCode === "BLOCKED") return "HOLD";
  if (state.statusCode === "RETRY") return "RETRY";
  if (state.statusCode === "PASS WAIT") return "PASS";
  if (state.statusCode === "COMPLETE") return "DONE";
  return "00:04";
}

function getProgressStage() {
  if (state.statusCode === "COMPLETE" || state.awaitingPass) return "4";
  if (
    state.statusCode === "RETRY" ||
    state.stepText === "사선 램프 이동" ||
    state.stepText === "컵 배출 확인" ||
    state.stepText === "사선 램프 하단 Jam" ||
    state.stepText === "재정렬 후 배출"
  ) {
    return "3";
  }
  if (state.stepText === "선택 채널 개방") {
    return "2";
  }
  return "1";
}

function renderStatus() {
  const currentItem = getCurrentItem();
  const route = getCurrentRoute(currentItem);

  colorCapsule(currentItem);
  setDynamicMarkers(route);
  refs.stage.dataset.channel = currentItem?.channel ?? "CH0";

  refs.currentCapsule.textContent = formatCapsule(currentItem);
  refs.currentState.textContent = state.statusText;
  refs.currentStep.textContent = state.stepText;
  refs.currentChannelChip.textContent = currentItem
    ? `${capsuleCatalog[currentItem.channel].label} · ${capsuleCatalog[currentItem.channel].name}`
    : "시나리오 완료";
  refs.positionStatus.textContent =
    state.statusCode === "BLOCKED"
      ? "오류"
      : state.running
        ? "정렬 중"
        : state.awaitingPass || state.statusCode === "COMPLETE"
          ? "완료"
          : "대기";
  refs.sensorState.textContent = state.sensor;
  refs.motorState.textContent = state.running ? "구동" : state.jammed ? "중단" : "정지";
  refs.powerState.textContent = "정상";
  refs.jamPoint.textContent = state.jamLocation;
  refs.dispensedCount.textContent = `${state.dispensed}정`;
  refs.dispensedCountPanel.textContent = `${state.dispensed}정`;
  refs.statusBadge.textContent = state.statusCode;
  refs.statusBadge.dataset.state = state.statusCode;
  refs.stageStateLabel.textContent = getLiveLabel();
  refs.cycleNote.textContent = getCycleNote();
  refs.normalCount.textContent = `${state.successfulCycles}회`;
  refs.jamCount.textContent = `${state.jamEvents}회`;
  refs.retryCount.textContent = `${state.retries}회`;
  refs.stepFlow.dataset.stage = getProgressStage();
  refs.statusMessage.textContent =
    state.statusCode === "BLOCKED"
      ? "사선 램프 하단에서 캡슐이 멈춘 상태입니다. RETRY로 재정렬하거나 PASS로 수동 통과 처리할 수 있습니다."
      : state.statusCode === "PASS WAIT"
        ? "컵 토출과 IR 감지가 끝났습니다. PASS를 눌러 현재 검증 결과를 기록하고 다음 카트리지로 넘어가세요."
        : state.statusCode === "COMPLETE"
          ? "모든 실물 기준 시뮬레이션이 완료되었습니다. 초기화 버튼으로 발표 흐름을 다시 시작할 수 있습니다."
          : "선택된 카트리지에서 실제 완성품 기준 토출 경로를 따라 캡슐이 컵으로 이동합니다.";
}

function renderButtons() {
  const hasItem = Boolean(getCurrentItem());
  refs.nextButton.disabled = state.running || state.jammed || state.awaitingPass || !hasItem;
  refs.jamButton.disabled = state.running || state.jammed || state.awaitingPass || !hasItem;
  refs.retryButton.disabled = state.running || !state.jammed;
  refs.passButton.disabled = state.running || (!state.awaitingPass && !state.jammed);
}

function renderAll() {
  renderQueue();
  renderLogs();
  renderStatus();
  renderButtons();
}

function setMode(mode) {
  refs.stage.dataset.mode = mode;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function animateTo(target, duration = 520) {
  return new Promise((resolve) => {
    const from = { ...state.capsulePosition };
    const start = performance.now();

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = {
        x: from.x + (target.x - from.x) * eased,
        y: from.y + (target.y - from.y) * eased,
        rotation: from.rotation + (target.rotation - from.rotation) * eased,
      };
      placeCapsule(next);
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        placeCapsule(target);
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

async function shakeAt(point) {
  const offsets = [
    { x: point.x - 1.1, y: point.y - 0.7, rotation: point.rotation - 7 },
    { x: point.x + 1.3, y: point.y + 0.5, rotation: point.rotation + 8 },
    { x: point.x - 0.8, y: point.y + 0.2, rotation: point.rotation - 5 },
    { x: point.x + 0.9, y: point.y - 0.3, rotation: point.rotation + 6 },
    point,
  ];

  for (const offset of offsets) {
    await animateTo(offset, 110);
  }
}

async function runCycle({ jam = false } = {}) {
  const currentItem = getCurrentItem();
  if (!currentItem || state.running || state.jammed || state.awaitingPass) return;

  const route = getCurrentRoute(currentItem);

  state.running = true;
  state.pendingSuccess = false;
  state.statusCode = jam ? "BLOCKED" : "DISPENSING";
  state.statusText = jam ? "걸림 시나리오 실행 중" : "실물 경로 배출 진행 중";
  state.stepText = "선택 채널 개방";
  state.sensor = "게이트 정렬";
  state.jamLocation = "없음";
  setMode(jam ? "jam" : "normal");
  addLog("SYSTEM", `${formatCapsule(currentItem)} 카트리지 게이트 개방`);
  addLog("MOTION", "상단 카트리지에서 사선 램프와 컵 토출 경로를 추적합니다.");
  renderAll();

  placeCapsule(route.start);
  await sleep(120);
  await animateTo(route.gate, 360);

  state.stepText = "사선 램프 이동";
  state.sensor = "낙하 중";
  renderAll();

  await animateTo(route.ramp, 620);

  if (jam) {
    state.running = false;
    state.jammed = true;
    state.statusCode = "BLOCKED";
    state.statusText = "JAM / BLOCKED";
    state.stepText = "사선 램프 하단 Jam";
    state.sensor = "미감지";
    state.jamLocation = "사선 램프 하단";
    state.jamEvents += 1;
    addLog("FAULT", `${formatCapsule(currentItem)} 캡슐이 사선 램프 하단에서 멈췄습니다.`);
    addLog("SYSTEM", "RETRY 또는 PASS 스킵을 기다리는 중");
    renderAll();
    return;
  }

  state.stepText = "컵 배출 확인";
  state.sensor = "감지 대기";
  renderAll();

  await animateTo(route.cup, 360);
  await animateTo(route.final, 240);

  state.running = false;
  state.awaitingPass = true;
  state.pendingSuccess = true;
  state.statusCode = "PASS WAIT";
  state.statusText = "PASS 확인 대기";
  state.stepText = "검증 및 기록";
  state.jamLocation = "없음";
  state.sensor = "감지됨";
  addLog("SENSOR", "컵 토출 구간 IR 감지 확인");
  addLog("PASS", "실물 기준 배출 완료. PASS 버튼으로 현재 사이클을 확정하세요.");
  renderAll();
}

async function runRetry() {
  if (!state.jammed || state.running) return;

  const currentItem = getCurrentItem();
  const route = getCurrentRoute(currentItem);

  state.running = true;
  state.jammed = false;
  state.retries += 1;
  state.statusCode = "RETRY";
  state.statusText = "재정렬 중";
  state.stepText = "재정렬 후 배출";
  state.sensor = "재정렬";
  state.jamLocation = "복구 중";
  setMode("retry");
  addLog("RETRY", "사선 램프 하단 걸림 구간 재정렬 시작");
  renderAll();

  await shakeAt(route.jam);
  await animateTo(route.retryBack, 200);
  await animateTo(route.cup, 340);
  await animateTo(route.final, 220);

  state.running = false;
  state.awaitingPass = true;
  state.pendingSuccess = true;
  state.statusCode = "PASS WAIT";
  state.statusText = "RETRY 완료 · PASS 대기";
  state.stepText = "검증 및 기록";
  state.sensor = "감지됨";
  state.jamLocation = "없음";
  addLog("SENSOR", "재정렬 후 컵 토출 감지 확인");
  addLog("PASS", "재시도 성공. PASS 버튼으로 현재 사이클을 확정하세요.");
  renderAll();
}

function advanceQueue({ skipped = false } = {}) {
  const currentItem = getCurrentItem();
  if (!currentItem) return;

  if (state.pendingSuccess && !skipped) {
    state.dispensed += currentItem.qty;
    state.successfulCycles += 1;
  }

  state.queue = state.queue.slice(1);
  state.pendingSuccess = false;
  state.awaitingPass = false;
  state.jammed = false;
  state.running = false;
  state.sensor = "대기";
  state.jamLocation = "없음";

  if (state.queue.length === 0) {
    state.statusCode = "COMPLETE";
    state.statusText = "시나리오 완료";
    state.stepText = "모든 큐 처리 완료";
    setMode("complete");
    addLog("SYSTEM", "모든 실물 구조 발표 시나리오가 완료되었습니다.");
  } else {
    const nextRoute = getCurrentRoute(state.queue[0]);
    state.statusCode = "READY";
    state.statusText = skipped ? "수동 통과 후 다음 큐 대기" : "다음 배출 대기";
    state.stepText = "게이트 정렬 대기";
    setMode("ready");
    placeCapsule(nextRoute.start);
  }

  renderAll();
}

function handlePass() {
  const currentItem = getCurrentItem();
  if (!currentItem || state.running || (!state.awaitingPass && !state.jammed)) return;

  if (state.jammed) {
    addLog("PASS", `${formatCapsule(currentItem)} 캡슐을 수동 통과 처리했습니다.`);
    advanceQueue({ skipped: true });
    return;
  }

  addLog("PASS", `${formatCapsule(currentItem)} 사이클을 확정하고 다음 카트리지로 이동합니다.`);
  advanceQueue({ skipped: false });
}

function handleReset() {
  state.queue = makeQueue();
  state.running = false;
  state.jammed = false;
  state.awaitingPass = false;
  state.pendingSuccess = false;
  state.sensor = "대기";
  state.statusCode = "READY";
  state.statusText = "다음 배출 대기";
  state.stepText = "게이트 정렬 대기";
  state.jamLocation = "없음";
  state.dispensed = 0;
  state.successfulCycles = 0;
  state.jamEvents = 0;
  state.retries = 0;
  state.logs = [];
  setMode("ready");
  placeCapsule(getCurrentRoute(state.queue[0]).start);
  addLog("SYSTEM", "완성품 기준 시뮬레이션 큐 4건을 로드했습니다.");
  addLog("SENSOR", "포지션 센서, IR 센서, 모터, 전원 상태를 대기값으로 초기화했습니다.");
  addLog("MOTION", "상단 카트리지와 사선 램프, 컵 토출 위치를 실물 기준 위치로 맞췄습니다.");
  addLog("SYSTEM", "다음 배출 또는 Jam Test를 눌러 시연을 시작하세요.");
  renderAll();
}

refs.nextButton.addEventListener("click", () => {
  runCycle({ jam: false });
});

refs.jamButton.addEventListener("click", () => {
  runCycle({ jam: true });
});

refs.retryButton.addEventListener("click", () => {
  runRetry();
});

refs.passButton.addEventListener("click", () => {
  handlePass();
});

refs.resetButton.addEventListener("click", () => {
  handleReset();
});

handleReset();
