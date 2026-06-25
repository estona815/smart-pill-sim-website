const channelConfig = [
  { id: "CH0", name: "비타민", color: "#d6a232", accent: "#f4c44a", targetAngle: 90 },
  { id: "CH1", name: "미네랄", color: "#e7edf4", accent: "#ffffff", targetAngle: 0 },
  { id: "CH2", name: "오메가3", color: "#e4b33e", accent: "#ffd86f", targetAngle: 270 },
  { id: "CH3", name: "프로바이오틱", color: "#e8d8bb", accent: "#fff0db", targetAngle: 180 },
];

const scenarios = {
  presentation_ready: {
    label: "기본 발표 시나리오",
    description:
      "7월 2일 발표 현장에서 그대로 보여주기 좋은 기본 루프입니다. 각 채널을 1회씩 순서대로 배출하며 로터 정렬, IR 감지, SQLite 저장 흐름을 설명할 수 있습니다.",
    notes: [
      "발표용 대표 시나리오",
      "4채널 전체를 한 번씩 순회",
      "IR / Hall / SQLite 흐름 설명에 적합",
    ],
    baseStock: { CH0: 5, CH1: 4, CH2: 5, CH3: 4 },
    queue: [
      { channel: "CH0", quantity: 1 },
      { channel: "CH2", quantity: 1 },
      { channel: "CH1", quantity: 1 },
      { channel: "CH3", quantity: 1 },
    ],
    jamRuns: [],
    autoRetry: false,
  },
  omega_focus: {
    label: "오메가3 반복 검증",
    description:
      "오메가3 채널을 중심으로 반복 배출을 검증하는 시나리오입니다. 동일 채널 재정렬과 다회 배출 상황을 설명할 때 적합합니다.",
    notes: ["동일 채널 반복 배출", "다회 정렬 동작 확인", "큐 기반 자동 실행"],
    baseStock: { CH0: 4, CH1: 4, CH2: 7, CH3: 4 },
    queue: [
      { channel: "CH2", quantity: 1 },
      { channel: "CH2", quantity: 2 },
      { channel: "CH0", quantity: 1 },
    ],
    jamRuns: [],
    autoRetry: false,
  },
  jam_recovery: {
    label: "Jam 복구 시나리오",
    description:
      "첫 배출에서 포켓 걸림을 발생시킨 뒤, 재정렬과 재시도로 복구하는 흐름입니다. 발표에서 실패 대응 로직과 검증 로그를 보여주기 좋습니다.",
    notes: ["첫 사이클에서 의도적 Jam", "자동 재시도 포함", "Validation RETRY → PASS 흐름"],
    baseStock: { CH0: 5, CH1: 5, CH2: 4, CH3: 4 },
    queue: [
      { channel: "CH0", quantity: 1 },
      { channel: "CH1", quantity: 1 },
      { channel: "CH3", quantity: 1 },
    ],
    jamRuns: [1],
    autoRetry: true,
  },
  mixed_schedule: {
    label: "복합 스케줄 시나리오",
    description:
      "아침/점심/저녁 배출 큐를 가정한 복합 시나리오입니다. 여러 채널과 수량을 섞어 보여주며 발표 후 서비스 확장 방향까지 연결할 수 있습니다.",
    notes: ["다채널 · 다수량 혼합", "큐 시각화 강조", "복약 스케줄 확장 설명용"],
    baseStock: { CH0: 6, CH1: 5, CH2: 6, CH3: 5 },
    queue: [
      { channel: "CH0", quantity: 1 },
      { channel: "CH1", quantity: 1 },
      { channel: "CH2", quantity: 2 },
      { channel: "CH3", quantity: 1 },
    ],
    jamRuns: [],
    autoRetry: false,
  },
};

const refs = {
  scenarioSelect: document.querySelector("#scenario-select"),
  capsuleSelector: document.querySelector("#capsule-selector"),
  queueBody: document.querySelector("#queue-body"),
  queueSummary: document.querySelector("#queue-summary"),
  scenarioName: document.querySelector("#scenario-name"),
  scenarioDescription: document.querySelector("#scenario-description"),
  scenarioNotes: document.querySelector("#scenario-notes"),
  runCycle: document.querySelector("#run-cycle"),
  nextDispense: document.querySelector("#next-dispense"),
  jamTest: document.querySelector("#jam-test"),
  resetSim: document.querySelector("#reset-sim"),
  qtyMinus: document.querySelector("#qty-minus"),
  qtyPlus: document.querySelector("#qty-plus"),
  manualQty: document.querySelector("#manual-qty"),
  rotorDisc: document.querySelector("#rotor-disc"),
  beamLine: document.querySelector("#beam-line"),
  capsuleFlightLayer: document.querySelector("#capsule-flight-layer"),
  telemetryAngle: document.querySelector("#telemetry-angle"),
  telemetryTarget: document.querySelector("#telemetry-target"),
  telemetryServo: document.querySelector("#telemetry-servo"),
  telemetryDispense: document.querySelector("#telemetry-dispense"),
  telemetryTotal: document.querySelector("#telemetry-total"),
  telemetryFault: document.querySelector("#telemetry-fault"),
  irStatusBadge: document.querySelector("#ir-status-badge"),
  irStatusText: document.querySelector("#ir-status-text"),
  irBeamText: document.querySelector("#ir-beam-text"),
  hallStatusBadge: document.querySelector("#hall-status-badge"),
  hallStatusText: document.querySelector("#hall-status-text"),
  powerStatusBadge: document.querySelector("#power-status-badge"),
  powerVoltage: document.querySelector("#power-voltage"),
  powerCurrent: document.querySelector("#power-current"),
  powerHeadroom: document.querySelector("#power-headroom"),
  powerBarFill: document.querySelector("#power-bar-fill"),
  validationBadge: document.querySelector("#validation-badge"),
  validationIcon: document.querySelector("#validation-icon"),
  validationTitle: document.querySelector("#validation-title"),
  validationMessage: document.querySelector("#validation-message"),
  checkAccuracy: document.querySelector("#check-accuracy"),
  checkDispense: document.querySelector("#check-dispense"),
  checkIr: document.querySelector("#check-ir"),
  checkDb: document.querySelector("#check-db"),
  eventLog: document.querySelector("#event-log"),
  logCount: document.querySelector("#log-count"),
  channelLegend: document.querySelector("#channel-legend"),
  connectionList: document.querySelector("#connection-list"),
  presentationMode: document.querySelector("#presentation-mode"),
  simClockDate: document.querySelector("#sim-clock-date"),
  simClockTime: document.querySelector("#sim-clock-time"),
};

const state = {
  scenarioId: "presentation_ready",
  channels: [],
  queue: [],
  manualChannel: "CH0",
  manualQuantity: 1,
  currentAngle: 0,
  targetAngle: 0,
  servoState: "대기",
  dispenseState: "대기",
  totalDispenses: 0,
  faultState: "없음",
  irStatus: "대기",
  hallState: "정상",
  hallStatus: "현재 위치: CH1 (0°)",
  validationStatus: "READY",
  validationTitle: "준비 완료",
  validationMessage:
    "시뮬레이션 대기 중입니다. 자동 사이클 실행 또는 다음 배출을 눌러 시작하세요.",
  validationChecks: {
    accuracy: "대기",
    dispense: "대기",
    ir: "대기",
    db: "대기",
  },
  power: {
    voltage: 5.08,
    current: 1.32,
    headroom: 3.68,
    loadPercent: 26,
  },
  logs: [],
  isRunning: false,
  autoMode: false,
  forceJamNext: false,
  pendingRetryItem: null,
  attemptCount: 0,
  presentationMode: false,
};

const connections = [
  { label: "Raspberry Pi 5", status: "연결됨" },
  { label: "PCA9685 (16ch)", status: "연결됨" },
  { label: "IR 센서 (SEN0503)", status: "정상" },
  { label: "SQLite DB", status: "연결됨" },
];

const simClockBase = new Date("2026-07-02T10:24:36.120").getTime();
const simClockRealStart = Date.now();

function getSimNow() {
  return new Date(simClockBase + (Date.now() - simClockRealStart));
}

function formatClockTime(date) {
  return date.toLocaleTimeString("ko-KR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatLogTime(date) {
  const time = date.toLocaleTimeString("ko-KR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${time}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getChannel(channelId) {
  return state.channels.find((channel) => channel.id === channelId);
}

function getChannelConfig(channelId) {
  return channelConfig.find((channel) => channel.id === channelId);
}

function seededQueue(queue) {
  const base = getSimNow().getTime();
  return queue.map((item, index) => ({
    ...item,
    id: `queue-${index + 1}`,
    status: "대기",
    eta: new Date(base + index * 6000),
  }));
}

function resetScenario(nextScenarioId = state.scenarioId) {
  const scenario = scenarios[nextScenarioId];
  state.scenarioId = nextScenarioId;
  state.channels = channelConfig.map((channel) => ({
    ...channel,
    stock: scenario.baseStock[channel.id],
  }));
  state.queue = seededQueue(scenario.queue);
  state.manualChannel = scenario.queue[0]?.channel ?? "CH0";
  state.manualQuantity = scenario.queue[0]?.quantity ?? 1;
  state.currentAngle = 0;
  state.targetAngle = 0;
  state.servoState = "대기";
  state.dispenseState = "대기";
  state.totalDispenses = 0;
  state.faultState = "없음";
  state.irStatus = "대기";
  state.hallState = "정상";
  state.hallStatus = "현재 위치: CH1 (0°)";
  state.validationStatus = "READY";
  state.validationTitle = "준비 완료";
  state.validationMessage =
    "시뮬레이션 대기 중입니다. 자동 사이클 실행 또는 다음 배출을 눌러 시작하세요.";
  state.validationChecks = {
    accuracy: "대기",
    dispense: "대기",
    ir: "대기",
    db: "대기",
  };
  state.power = {
    voltage: 5.08,
    current: 1.32,
    headroom: 3.68,
    loadPercent: 26,
  };
  state.logs = [];
  state.isRunning = false;
  state.autoMode = false;
  state.forceJamNext = false;
  state.pendingRetryItem = null;
  state.attemptCount = 0;

  addLog("SYSTEM", `${scenario.label} 로드 완료`);
  renderAll();
}

function addLog(type, message) {
  state.logs.unshift({
    type,
    message,
    time: formatLogTime(getSimNow()),
  });
  state.logs = state.logs.slice(0, 12);
}

function renderScenarioSelect() {
  refs.scenarioSelect.innerHTML = Object.entries(scenarios)
    .map(
      ([id, scenario]) =>
        `<option value="${id}" ${id === state.scenarioId ? "selected" : ""}>${scenario.label}</option>`
    )
    .join("");
}

function renderChannelLegend() {
  refs.channelLegend.innerHTML = state.channels
    .map(
      (channel) => `
        <span class="legend-chip">
          <span class="legend-dot" style="--dot:${channel.color};"></span>
          ${channel.id} ${channel.name}
        </span>
      `
    )
    .join("");
}

function renderCapsuleSelector() {
  refs.capsuleSelector.innerHTML = state.channels
    .map((channel) => {
      const isSelected = channel.id === state.manualChannel;
      return `
        <button
          type="button"
          class="capsule-option ${isSelected ? "is-selected" : ""}"
          data-channel="${channel.id}"
        >
          <span class="capsule-swatch" style="--capsule:${channel.color}; --capsule-accent:${channel.accent};"></span>
          <span class="capsule-copy">
            <strong>${channel.id}</strong>
            <small>${channel.name}</small>
          </span>
          <span class="capsule-stock">${channel.stock}정</span>
        </button>
      `;
    })
    .join("");

  refs.capsuleSelector.querySelectorAll("[data-channel]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.isRunning) return;
      state.manualChannel = button.dataset.channel;
      renderCapsuleSelector();
    });
  });
}

function renderConnections() {
  refs.connectionList.innerHTML = connections
    .map(
      (connection) => `
        <li>
          <span>${connection.label}</span>
          <strong>${connection.status}</strong>
        </li>
      `
    )
    .join("");
}

function buildPills(stock, channel) {
  const pillCount = Math.max(1, Math.min(stock, 3));
  return new Array(pillCount)
    .fill(0)
    .map(
      (_, index) => `
        <span
          class="pill"
          style="--pill:${channel.color}; --pill-accent:${channel.accent}; --offset:${index};"
        ></span>
      `
    )
    .join("");
}

function renderRotor() {
  refs.rotorDisc.style.transform = `translate(-50%, -50%) rotate(${state.currentAngle}deg)`;

  refs.rotorDisc.querySelectorAll(".rotor-slot").forEach((slot) => {
    const channelId = slot.dataset.channel;
    const channel = getChannel(channelId);
    const inner = slot.querySelector(".slot-inner");
    const isTarget = channelId === state.manualChannel;
    inner.style.transform = `rotate(${-state.currentAngle}deg)`;
    slot.classList.toggle("is-target", isTarget);
    slot.querySelector(".slot-pills").innerHTML = buildPills(channel.stock, channel);
    slot.querySelector(".slot-code").textContent = channel.id;
    slot.querySelector(".slot-name").textContent = channel.name;
    slot.querySelector(".slot-stock").textContent = `${channel.stock}정`;
  });
}

function renderQueue() {
  refs.queueBody.innerHTML = state.queue
    .map((item, index) => {
      const channel = getChannelConfig(item.channel);
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.channel}</td>
          <td>${channel.name}</td>
          <td>${item.quantity}</td>
          <td>${formatClockTime(item.eta)}</td>
          <td><span class="queue-status queue-status-${statusClass(item.status)}">${item.status}</span></td>
        </tr>
      `;
    })
    .join("");

  const pending = state.queue.filter((item) => item.status !== "완료").length;
  refs.queueSummary.textContent = `대기 ${pending}건`;
}

function statusClass(status) {
  return (
    {
      대기: "pending",
      진행: "active",
      완료: "done",
      재시도: "retry",
    }[status] || "pending"
  );
}

function renderScenarioInfo() {
  const scenario = scenarios[state.scenarioId];
  refs.scenarioName.textContent = scenario.label;
  refs.scenarioDescription.textContent = scenario.description;
  refs.scenarioNotes.innerHTML = scenario.notes.map((note) => `<li>${note}</li>`).join("");
}

function renderTelemetry() {
  refs.manualQty.textContent = String(state.manualQuantity);
  refs.telemetryAngle.textContent = `${Math.round(normalizeAngle(state.currentAngle))}°`;
  refs.telemetryTarget.textContent = `${state.manualChannel} (${getChannel(state.manualChannel).name})`;
  refs.telemetryServo.textContent = state.servoState;
  refs.telemetryDispense.textContent = state.dispenseState;
  refs.telemetryTotal.textContent = `${state.totalDispenses}`;
  refs.telemetryFault.textContent = state.faultState;
}

function renderSensors() {
  refs.irStatusBadge.textContent = state.irStatus;
  refs.irStatusText.textContent = `IR 감지 상태: ${state.irStatus}`;
  refs.irBeamText.textContent = state.irStatus === "감지됨" ? "빔 차단 확인" : "빔 대기";
  refs.hallStatusBadge.textContent = state.hallState;
  refs.hallStatusText.textContent = state.hallStatus;

  refs.powerStatusBadge.textContent = "정상";
  refs.powerVoltage.textContent = `${state.power.voltage.toFixed(2)} V`;
  refs.powerCurrent.textContent = `${state.power.current.toFixed(2)} A`;
  refs.powerHeadroom.textContent = `${state.power.headroom.toFixed(2)} A`;
  refs.powerBarFill.style.width = `${state.power.loadPercent}%`;

  refs.beamLine.classList.toggle("is-active", state.irStatus === "감지됨");
}

function renderValidation() {
  refs.validationBadge.textContent = state.validationStatus;
  refs.validationBadge.dataset.state = state.validationStatus;
  refs.validationTitle.textContent = state.validationTitle;
  refs.validationMessage.textContent = state.validationMessage;
  refs.checkAccuracy.textContent = state.validationChecks.accuracy;
  refs.checkDispense.textContent = state.validationChecks.dispense;
  refs.checkIr.textContent = state.validationChecks.ir;
  refs.checkDb.textContent = state.validationChecks.db;
  refs.validationIcon.textContent =
    state.validationStatus === "PASS"
      ? "✓"
      : state.validationStatus === "RETRY"
        ? "!"
        : "•";
  refs.validationIcon.dataset.state = state.validationStatus;
}

function renderLogs() {
  refs.logCount.textContent = `${state.logs.length} events`;
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

function renderClock() {
  const now = getSimNow();
  refs.simClockDate.textContent = "2026-07-02";
  refs.simClockTime.textContent = formatClockTime(now);
}

function renderAll() {
  renderScenarioSelect();
  renderChannelLegend();
  renderCapsuleSelector();
  renderConnections();
  renderRotor();
  renderQueue();
  renderScenarioInfo();
  renderTelemetry();
  renderSensors();
  renderValidation();
  renderLogs();
  renderClock();
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function shortestAngleDelta(from, to) {
  const normalizedFrom = normalizeAngle(from);
  const normalizedTo = normalizeAngle(to);
  let delta = normalizedTo - normalizedFrom;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function animateRotor(targetAngle) {
  return new Promise((resolve) => {
    const startAngle = state.currentAngle;
    const delta = shortestAngleDelta(startAngle, targetAngle);
    const duration = 900;
    const start = performance.now();

    state.servoState = "회전 중";
    state.dispenseState = "정렬 중";
    state.hallState = "탐색";
    state.hallStatus = `목표 위치 ${state.manualChannel} (${targetAngle}°) 정렬 중`;
    renderTelemetry();
    renderSensors();

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      state.currentAngle = startAngle + delta * eased;
      renderRotor();
      renderTelemetry();
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        state.currentAngle = targetAngle;
        state.servoState = "정렬 완료";
        state.hallState = "정상";
        state.hallStatus = `현재 위치: ${state.manualChannel} (${targetAngle}°)`;
        renderRotor();
        renderTelemetry();
        renderSensors();
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

function createFlightCapsule(channelId) {
  const channel = getChannelConfig(channelId);
  const capsule = document.createElement("span");
  capsule.className = "flight-capsule";
  capsule.style.setProperty("--pill", channel.color);
  capsule.style.setProperty("--pill-accent", channel.accent);
  refs.capsuleFlightLayer.appendChild(capsule);
  requestAnimationFrame(() => capsule.classList.add("is-moving"));
  setTimeout(() => capsule.remove(), 900);
}

async function animateDispense(item) {
  for (let index = 0; index < item.quantity; index += 1) {
    createFlightCapsule(item.channel);
    state.irStatus = "감지됨";
    renderSensors();
    await delay(360);
  }
  await delay(180);
  state.irStatus = "대기";
  renderSensors();
}

function updateQueueStatus(itemId, status) {
  state.queue = state.queue.map((item) =>
    item.id === itemId ? { ...item, status } : item
  );
}

function getNextPendingQueueItem() {
  return state.queue.find((item) => item.status === "대기" || item.status === "재시도");
}

function shouldJam(attempt, isRetry) {
  if (isRetry) return false;
  if (state.forceJamNext) {
    state.forceJamNext = false;
    return true;
  }
  const scenario = scenarios[state.scenarioId];
  return scenario.jamRuns.includes(attempt);
}

async function runCycle(item, options = {}) {
  if (state.isRunning) return;

  state.isRunning = true;
  state.attemptCount += 1;
  const attempt = state.attemptCount;
  const isRetry = Boolean(options.retry);
  const queueItem = item.id ? item : null;
  const channel = getChannel(item.channel);

  state.manualChannel = item.channel;
  state.manualQuantity = item.quantity;
  state.targetAngle = getChannelConfig(item.channel).targetAngle;
  state.faultState = "없음";
  state.validationStatus = "CHECK";
  state.validationTitle = "검증 진행 중";
  state.validationMessage = `${channel.name} ${item.quantity}정 배출 루프를 실행하고 있습니다.`;
  state.validationChecks = {
    accuracy: "진행 중",
    dispense: "대기",
    ir: "대기",
    db: "대기",
  };
  if (queueItem) updateQueueStatus(queueItem.id, "진행");

  addLog("SYSTEM", `${channel.name} ${item.quantity}정 자동 사이클 시작`);
  addLog("SERVO", `목표 각도 ${state.targetAngle}° → ${item.channel}`);
  renderAll();

  await animateRotor(state.targetAngle);
  addLog("HALL", `위치 감지: ${item.channel} (${state.targetAngle}°)`);

  if (shouldJam(attempt, isRetry)) {
    state.servoState = "대기";
    state.dispenseState = "재시도 필요";
    state.faultState = "Jam 감지";
    state.irStatus = "미감지";
    state.validationStatus = "RETRY";
    state.validationTitle = "재정렬 필요";
    state.validationMessage =
      "포켓에서 캡슐 걸림이 감지되었습니다. 재정렬 후 다시 실행하면 PASS로 복구됩니다.";
    state.validationChecks = {
      accuracy: "재정렬",
      dispense: "재시도",
      ir: "미감지",
      db: "대기",
    };
    if (queueItem) updateQueueStatus(queueItem.id, "재시도");
    state.pendingRetryItem = { ...item, id: queueItem?.id ?? `retry-${Date.now()}` };
    addLog("FAULT", `${channel.name} 포켓 걸림 감지`);
    addLog("SYSTEM", "Jam Test 또는 시나리오 실패 루프가 발생했습니다.");
    state.isRunning = false;
    renderAll();

    if (options.auto && scenarios[state.scenarioId].autoRetry) {
      await delay(900);
      addLog("SYSTEM", "포켓 재정렬 후 자동 재시도");
      renderAll();
      await runCycle(state.pendingRetryItem, { auto: true, retry: true });
    } else if (options.auto) {
      await delay(800);
      processAutoQueue();
    }
    return;
  }

  state.dispenseState = "배출 중";
  state.validationChecks.dispense = "진행 중";
  state.validationChecks.ir = "진행 중";
  renderAll();
  addLog("DISPENSE", `${channel.name} ${item.quantity}정 배출 시작`);

  await animateDispense(item);
  addLog("IR", "센서 감지 확인");

  channel.stock = Math.max(0, channel.stock - item.quantity);
  state.totalDispenses += item.quantity;
  state.servoState = "대기";
  state.dispenseState = "완료";
  state.faultState = "없음";
  state.validationStatus = "PASS";
  state.validationTitle = "PASS";
  state.validationMessage = "모든 검증을 통과했습니다.";
  state.validationChecks = {
    accuracy: "100%",
    dispense: "성공",
    ir: "성공",
    db: "성공",
  };
  state.pendingRetryItem = null;
  if (queueItem) updateQueueStatus(queueItem.id, "완료");
  addLog("DB", "SQLite 기록 저장 완료");
  addLog("SYSTEM", "사이클 완료");
  state.isRunning = false;
  renderAll();

  if (options.auto) {
    await delay(700);
    processAutoQueue();
  }
}

function createManualItem() {
  return {
    id: `manual-${Date.now()}`,
    channel: state.manualChannel,
    quantity: state.manualQuantity,
    status: "대기",
    eta: getSimNow(),
  };
}

async function processAutoQueue() {
  if (state.isRunning) return;
  const retryItem = state.pendingRetryItem;
  const nextItem = retryItem ?? getNextPendingQueueItem();
  if (!nextItem) {
    state.autoMode = false;
    addLog("SYSTEM", "자동 사이클 종료");
    renderAll();
    return;
  }
  await runCycle(nextItem, { auto: true, retry: Boolean(retryItem) });
}

function bindEvents() {
  refs.scenarioSelect.addEventListener("change", (event) => {
    resetScenario(event.target.value);
  });

  refs.qtyMinus.addEventListener("click", () => {
    if (state.isRunning) return;
    state.manualQuantity = Math.max(1, state.manualQuantity - 1);
    renderTelemetry();
  });

  refs.qtyPlus.addEventListener("click", () => {
    if (state.isRunning) return;
    state.manualQuantity = Math.min(3, state.manualQuantity + 1);
    renderTelemetry();
  });

  refs.runCycle.addEventListener("click", async () => {
    if (state.isRunning) return;
    state.autoMode = true;
    if (!getNextPendingQueueItem() && !state.pendingRetryItem) {
      resetScenario(state.scenarioId);
    }
    await processAutoQueue();
  });

  refs.nextDispense.addEventListener("click", async () => {
    if (state.isRunning) return;
    const item = state.pendingRetryItem ?? getNextPendingQueueItem() ?? createManualItem();
    await runCycle(item, { retry: Boolean(state.pendingRetryItem) });
  });

  refs.jamTest.addEventListener("click", () => {
    state.forceJamNext = true;
    addLog("SYSTEM", "Jam Test 활성화: 다음 배출에서 포켓 걸림을 시뮬레이션합니다.");
    renderLogs();
  });

  refs.resetSim.addEventListener("click", () => {
    resetScenario(state.scenarioId);
  });

  refs.presentationMode.addEventListener("click", () => {
    state.presentationMode = !state.presentationMode;
    document.body.classList.toggle("presentation-mode", state.presentationMode);
    refs.presentationMode.textContent = state.presentationMode ? "일반 모드" : "발표 모드";
  });
}

function init() {
  bindEvents();
  resetScenario("presentation_ready");
  setInterval(renderClock, 1000);
}

init();
