const capsuleCatalog = {
  CH0: {
    code: "CH0",
    name: "비타민",
    color: "#f4b83d",
    accent: "#fff1b0",
  },
  CH1: {
    code: "CH1",
    name: "미네랄",
    color: "#f1ede3",
    accent: "#ffffff",
  },
  CH2: {
    code: "CH2",
    name: "오메가3",
    color: "#d9a72e",
    accent: "#ffe48a",
  },
  CH3: {
    code: "CH3",
    name: "프로바이오틱",
    color: "#e7d4bd",
    accent: "#fff0df",
  },
};

const initialQueueTemplate = [
  { channel: "CH0", qty: 1 },
  { channel: "CH2", qty: 1 },
  { channel: "CH1", qty: 1 },
  { channel: "CH3", qty: 1 },
];

const points = {
  start: { x: 46, y: 42, rotation: 6 },
  rampEntry: { x: 53, y: 51, rotation: 34 },
  rampMid: { x: 61.5, y: 64.5, rotation: 58 },
  jam: { x: 64, y: 68, rotation: 58 },
  retryBack: { x: 59.4, y: 60.6, rotation: 44 },
  tubeEntry: { x: 74, y: 81.2, rotation: 2 },
  tubeMid: { x: 82.5, y: 81.6, rotation: 0 },
  cup: { x: 89.2, y: 86.4, rotation: 0 },
};

const refs = {
  stage: document.querySelector("#sim-stage"),
  activeCapsule: document.querySelector("#active-capsule"),
  stageStateLabel: document.querySelector("#stage-state-label"),
  statusBadge: document.querySelector("#status-badge"),
  currentState: document.querySelector("#current-state"),
  currentCapsule: document.querySelector("#current-capsule"),
  currentStep: document.querySelector("#current-step"),
  sensorState: document.querySelector("#sensor-state"),
  jamPoint: document.querySelector("#jam-point"),
  dispensedCount: document.querySelector("#dispensed-count"),
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
  stepText: "포켓 정렬 대기",
  jamLocation: "없음",
  dispensed: 0,
  successfulCycles: 0,
  jamEvents: 0,
  retries: 0,
  logs: [],
  capsulePosition: { ...points.start },
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
}

function renderQueue() {
  refs.queueList.innerHTML = state.queue
    .map((item, index) => {
      const capsule = capsuleCatalog[item.channel];
      return `
        <div class="queue-item ${index === 0 ? "is-active" : ""}">
          <span
            class="queue-swatch"
            style="--swatch-main:${capsule.color}; --swatch-accent:${capsule.accent};"
          ></span>
          <div class="queue-copy">
            <strong>${capsule.code} ${capsule.name}</strong>
            <span>${item.qty}정 · ${index === 0 ? "현재 대상" : "대기"}</span>
          </div>
          <span class="queue-state">${index === 0 ? "READY" : "QUEUE"}</span>
        </div>
      `;
    })
    .join("");

  if (state.queue.length === 0) {
    refs.queueList.innerHTML = `
      <div class="queue-item">
        <div class="queue-copy">
          <strong>큐 완료</strong>
          <span>모든 발표 시나리오를 처리했습니다.</span>
        </div>
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

function renderStatus() {
  const currentItem = getCurrentItem();
  colorCapsule(currentItem);
  refs.currentCapsule.textContent = formatCapsule(currentItem);
  refs.currentState.textContent = state.statusText;
  refs.currentStep.textContent = state.stepText;
  refs.sensorState.textContent = state.sensor;
  refs.jamPoint.textContent = state.jamLocation;
  refs.dispensedCount.textContent = `${state.dispensed}정`;
  refs.statusBadge.textContent = state.statusCode;
  refs.statusBadge.dataset.state = state.statusCode;
  refs.stageStateLabel.textContent = state.stepText;
  refs.cycleNote.textContent = state.statusText;
  refs.normalCount.textContent = `${state.successfulCycles}회`;
  refs.jamCount.textContent = `${state.jamEvents}회`;
  refs.retryCount.textContent = `${state.retries}회`;
  refs.statusMessage.textContent =
    state.statusCode === "BLOCKED"
      ? "캡슐이 램프 구간에서 멈춘 상태입니다. RETRY로 재정렬하거나 PASS로 다음 큐로 넘어갈 수 있습니다."
      : state.statusCode === "PASS WAIT"
        ? "캡슐이 최종 컵까지 도달했습니다. PASS를 눌러 현재 사이클을 확정하면 다음 캡슐로 넘어갑니다."
        : state.statusCode === "COMPLETE"
          ? "모든 발표용 큐가 처리되었습니다. 초기화 버튼으로 시나리오를 다시 시작할 수 있습니다."
          : "다음 배출을 누르면 현재 포켓의 캡슐이 사선 램프와 수평 토출구를 따라 이동합니다.";
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
    { x: point.x - 1.4, y: point.y - 0.8, rotation: point.rotation - 6 },
    { x: point.x + 1.2, y: point.y + 0.6, rotation: point.rotation + 8 },
    { x: point.x - 0.8, y: point.y + 0.3, rotation: point.rotation - 4 },
    { x: point.x + 0.9, y: point.y - 0.4, rotation: point.rotation + 5 },
    point,
  ];

  for (const offset of offsets) {
    await animateTo(offset, 120);
  }
}

async function runCycle({ jam = false } = {}) {
  const currentItem = getCurrentItem();
  if (!currentItem || state.running || state.jammed || state.awaitingPass) return;

  state.running = true;
  state.pendingSuccess = false;
  state.statusCode = jam ? "BLOCKED" : "DISPENSING";
  state.statusText = jam ? "걸림 시나리오 실행 중" : "정상 배출 진행 중";
  state.stepText = "포켓 정렬";
  state.sensor = "정렬 확인";
  state.jamLocation = "없음";
  setMode(jam ? "jam" : "normal");
  addLog("SYSTEM", `${formatCapsule(currentItem)} 사이클 시작`);
  addLog("MOTION", "포켓 정렬 후 사선 램프로 진입");
  renderAll();

  placeCapsule(points.start);
  await sleep(120);
  await animateTo(points.rampEntry, 420);
  state.stepText = "사선 램프 이동";
  renderAll();

  await animateTo(points.rampMid, 540);

  if (jam) {
    await animateTo(points.jam, 260);
    state.running = false;
    state.jammed = true;
    state.statusCode = "BLOCKED";
    state.statusText = "JAM / BLOCKED";
    state.stepText = "램프 구간 걸림";
    state.sensor = "미감지";
    state.jamLocation = "사선 램프 하단";
    state.jamEvents += 1;
    addLog("FAULT", `${formatCapsule(currentItem)} 캡슐이 램프 구간에서 멈췄습니다.`);
    addLog("SYSTEM", "RETRY 또는 PASS 스킵을 기다리는 중");
    renderAll();
    return;
  }

  state.stepText = "수평 토출구 이동";
  state.sensor = "감지 대기";
  renderAll();

  await animateTo(points.tubeEntry, 400);
  await animateTo(points.tubeMid, 360);
  state.stepText = "외부 컵 배출";
  state.sensor = "감지됨";
  renderAll();

  await animateTo(points.cup, 280);

  state.running = false;
  state.awaitingPass = true;
  state.pendingSuccess = true;
  state.statusCode = "PASS WAIT";
  state.statusText = "PASS 확인 대기";
  state.stepText = "배출 완료";
  state.jamLocation = "없음";
  addLog("SENSOR", "토출 센서 감지 확인");
  addLog("PASS", "배출 완료. PASS 버튼으로 현재 사이클을 확정하세요.");
  renderAll();
}

async function runRetry() {
  if (!state.jammed || state.running) return;

  state.running = true;
  state.jammed = false;
  state.retries += 1;
  state.statusCode = "RETRY";
  state.statusText = "재정렬 중";
  state.stepText = "재시도 준비";
  state.sensor = "재정렬";
  state.jamLocation = "복구 중";
  setMode("retry");
  addLog("RETRY", "걸림 구간 흔들림 재정렬 시작");
  renderAll();

  await shakeAt(points.jam);
  await animateTo(points.retryBack, 220);
  await animateTo(points.tubeEntry, 380);
  state.stepText = "수평 토출구 재이동";
  state.sensor = "감지 대기";
  renderAll();

  await animateTo(points.tubeMid, 320);
  await animateTo(points.cup, 260);

  state.running = false;
  state.awaitingPass = true;
  state.pendingSuccess = true;
  state.statusCode = "PASS WAIT";
  state.statusText = "RETRY 완료 · PASS 대기";
  state.stepText = "재시도 성공";
  state.sensor = "감지됨";
  state.jamLocation = "없음";
  addLog("SENSOR", "재시도 후 센서 감지 확인");
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
    addLog("SYSTEM", "모든 발표용 큐 처리가 완료되었습니다.");
  } else {
    state.statusCode = "READY";
    state.statusText = skipped ? "통과 처리 후 다음 큐 대기" : "다음 배출 대기";
    state.stepText = "포켓 정렬 대기";
    setMode("ready");
    placeCapsule(points.start);
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

  addLog("PASS", `${formatCapsule(currentItem)} 사이클을 확정하고 다음 큐로 이동합니다.`);
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
  state.stepText = "포켓 정렬 대기";
  state.jamLocation = "없음";
  state.dispensed = 0;
  state.successfulCycles = 0;
  state.jamEvents = 0;
  state.retries = 0;
  state.logs = [];
  setMode("ready");
  placeCapsule(points.start);
  addLog("SYSTEM", "발표 시나리오를 초기화했습니다.");
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
