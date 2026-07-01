const DURATION = 6800;

const captions = [
  "약통에서 한 알이 준비됩니다.",
  "안쪽 회전판이 한 알만 골라냅니다.",
  "아래 통로를 따라 컵 쪽으로 내려갑니다.",
  "컵에 딱 떨어집니다.",
];

const desktopRoute = [
  { x: 75, y: 30, rotation: -12 },
  { x: 66, y: 43, rotation: 20 },
  { x: 51, y: 58, rotation: 62 },
  { x: 52, y: 75, rotation: 92 },
];

const mobileRoute = [
  { x: 63, y: 27, rotation: -12 },
  { x: 54, y: 43, rotation: 20 },
  { x: 44, y: 59, rotation: 62 },
  { x: 43, y: 77, rotation: 92 },
];

const phaseBoundaries = [
  { name: "idle", step: 0, start: 0, end: 0.22 },
  { name: "align", step: 1, start: 0.22, end: 0.43 },
  { name: "drop", step: 2, start: 0.43, end: 0.8 },
  { name: "finish", step: 3, start: 0.8, end: 1 },
];

const refs = {
  stage: document.querySelector("#dispense-stage"),
  capsule: document.querySelector("#capsule"),
  caption: document.querySelector("#stage-caption"),
  playButton: document.querySelector("#play-button"),
  replayButton: document.querySelector("#replay-button"),
  filmProgress: document.querySelector("#film-progress"),
  flowPath: document.querySelector("#flow-path"),
  flowShadow: document.querySelector(".flow-shadow"),
  stepButtons: [...document.querySelectorAll(".step-pill")],
  focusPoints: [...document.querySelectorAll(".focus-point")],
};

let progress = 0;
let playing = false;
let frameId = 0;
let startedAt = 0;
let playFrom = 0;

function easeInOut(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function getRoute() {
  return window.matchMedia("(max-width: 760px)").matches ? mobileRoute : desktopRoute;
}

function getRoutePath(points = getRoute()) {
  const [start, gate, chute, cup] = points;
  return [
    `M${start.x} ${start.y}`,
    `C${start.x - 5} ${start.y + 4} ${gate.x + 2} ${gate.y - 4} ${gate.x} ${gate.y}`,
    `C${gate.x - 5} ${gate.y + 4} ${chute.x + 4} ${chute.y - 6} ${chute.x} ${chute.y}`,
    `C${chute.x - 4} ${chute.y + 6} ${cup.x - 4} ${cup.y - 5} ${cup.x} ${cup.y}`,
  ].join(" ");
}

function setSvgPath() {
  const d = getRoutePath();
  refs.flowPath.setAttribute("d", d);
  refs.flowShadow.setAttribute("d", d);
}

function getPhase(value) {
  return phaseBoundaries.find((phase) => value >= phase.start && value <= phase.end) ?? phaseBoundaries.at(-1);
}

function localProgress(value, start, end) {
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / (end - start);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function getCapsulePosition(value) {
  const route = getRoute();
  const segments = [
    { from: route[0], to: route[1], start: 0, end: 0.42 },
    { from: route[1], to: route[2], start: 0.42, end: 0.72 },
    { from: route[2], to: route[3], start: 0.72, end: 1 },
  ];
  const segment = segments.find((item) => value <= item.end) ?? segments.at(-1);
  const amount = easeInOut(localProgress(value, segment.start, segment.end));
  return {
    x: lerp(segment.from.x, segment.to.x, amount),
    y: lerp(segment.from.y, segment.to.y, amount),
    rotation: lerp(segment.from.rotation, segment.to.rotation, amount),
  };
}

function renderStep(activeStep) {
  refs.stepButtons.forEach((button, index) => {
    button.classList.toggle("is-active", index === activeStep);
  });
  refs.focusPoints.forEach((point, index) => {
    point.classList.toggle("is-active", index === activeStep);
  });
}

function render(value) {
  progress = Math.max(0, Math.min(1, value));
  const phase = getPhase(progress);
  const capsule = getCapsulePosition(progress);

  refs.stage.dataset.phase = phase.name;
  refs.stage.style.setProperty("--path-progress", Math.round(progress * 100));
  refs.flowPath.style.strokeDasharray = `${Math.round(progress * 100)} 100`;
  refs.capsule.style.left = `${capsule.x}%`;
  refs.capsule.style.top = `${capsule.y}%`;
  refs.capsule.style.transform = `translate(-50%, -50%) rotate(${capsule.rotation}deg)`;
  refs.filmProgress.style.width = `${Math.round(progress * 100)}%`;
  refs.caption.textContent = captions[phase.step];
  renderStep(phase.step);
}

function stop() {
  playing = false;
  cancelAnimationFrame(frameId);
  refs.playButton.textContent = progress >= 1 ? "재생" : "이어보기";
}

function tick(now) {
  const elapsed = now - startedAt;
  const nextProgress = playFrom + elapsed / DURATION;
  render(nextProgress);

  if (nextProgress >= 1) {
    stop();
    return;
  }

  frameId = requestAnimationFrame(tick);
}

function play() {
  if (playing) {
    stop();
    return;
  }

  if (progress >= 1) {
    render(0);
  }

  playing = true;
  playFrom = progress;
  startedAt = performance.now();
  refs.playButton.textContent = "멈춤";
  frameId = requestAnimationFrame(tick);
}

function replay() {
  cancelAnimationFrame(frameId);
  playing = false;
  render(0);
  play();
}

function jumpToStep(step) {
  stop();
  const phase = phaseBoundaries[step];
  render(phase.start + 0.015);
}

refs.playButton.addEventListener("click", play);
refs.replayButton.addEventListener("click", replay);
refs.stepButtons.forEach((button) => {
  button.addEventListener("click", () => jumpToStep(Number(button.dataset.step)));
});

window.addEventListener("resize", () => {
  setSvgPath();
  render(progress);
});

setSvgPath();
render(0);
window.setTimeout(play, 450);
