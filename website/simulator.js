const DURATION = 6400;

const captions = [
  "4개 돌림판이 회전 대기합니다.",
  "돌림판 아래에서 캡슐이 한 알씩 토출됩니다.",
  "토출된 4알이 가운데 수집부에 모입니다.",
  "모인 4알이 바깥 배출구로 한 번에 빠집니다.",
];

const phases = [
  { name: "ready", step: 0, start: 0, end: 0.18 },
  { name: "select", step: 1, start: 0.18, end: 0.62 },
  { name: "collect", step: 2, start: 0.62, end: 0.78 },
  { name: "eject", step: 3, start: 0.78, end: 1 },
];

const jumpTargets = [0, 0.46, 0.74, 0.96];

const feedWindows = [
  { start: 0.18, end: 0.44 },
  { start: 0.28, end: 0.54 },
  { start: 0.38, end: 0.64 },
  { start: 0.48, end: 0.74 },
];

const exitOffsets = [
  { x: -18, y: -12 },
  { x: 7, y: -18 },
  { x: 18, y: 8 },
  { x: -6, y: 16 },
];

const collectOffsets = [
  { x: -13, y: -9 },
  { x: 9, y: -12 },
  { x: 15, y: 9 },
  { x: -8, y: 14 },
];

const refs = {
  stage: document.querySelector("#device-stage"),
  feedRoutes: [...document.querySelectorAll(".feed-route")],
  outRoute: document.querySelector("#out-route"),
  capsules: [...document.querySelectorAll(".moving-capsule")],
  caption: document.querySelector("#stage-caption"),
  playButton: document.querySelector("#play-button"),
  playLabel: document.querySelector("#play-label"),
  replayButton: document.querySelector("#replay-button"),
  stepButtons: [...document.querySelectorAll(".step-button")],
  stations: [...document.querySelectorAll(".station")],
};

let progress = 0;
let playing = false;
let frameId = 0;
let startedAt = 0;
let playFrom = 0;
let feedLengths = [];
let outLength = 1;

function easeInOut(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function localProgress(value, start, end) {
  return clamp((value - start) / (end - start));
}

function getPhase(value) {
  return phases.find((phase) => value >= phase.start && value <= phase.end) ?? phases.at(-1);
}

function getPoint(path, length, value) {
  return path.getPointAtLength(clamp(value) * length);
}

function getAngle(path, length, value) {
  const current = getPoint(path, length, value);
  const next = getPoint(path, length, Math.min(value + 0.01, 1));
  return (Math.atan2(next.y - current.y, next.x - current.x) * 180) / Math.PI;
}

function setActiveStep(step) {
  refs.stepButtons.forEach((button, index) => {
    button.classList.toggle("is-active", index === step);
  });
  refs.stations.forEach((station, index) => {
    station.classList.toggle("is-active", index === step);
  });
}

function setRouteProgress(feedProgresses, exitProgress) {
  refs.feedRoutes.forEach((route, index) => {
    const length = feedLengths[index];
    route.style.strokeDasharray = `${Math.round(feedProgresses[index] * length)} ${Math.round(length)}`;
  });
  refs.outRoute.style.strokeDasharray = `${Math.round(exitProgress * outLength)} ${Math.round(outLength)}`;
}

function placeCapsules(feedProgresses, exitProgress) {
  refs.capsules.forEach((capsule, index) => {
    const feedRoute = refs.feedRoutes[index];
    const feedLength = feedLengths[index];
    const exitOffset = exitOffsets[index];
    const collectOffset = collectOffsets[index];
    const feedProgress = feedProgresses[index];

    if (exitProgress > 0) {
      const point = getPoint(refs.outRoute, outLength, easeInOut(exitProgress));
      const angle = getAngle(refs.outRoute, outLength, easeInOut(exitProgress));
      capsule.setAttribute(
        "transform",
        `translate(${point.x + exitOffset.x} ${point.y + exitOffset.y}) rotate(${angle})`
      );
      return;
    }

    const easedFeed = easeInOut(feedProgress);
    const point = getPoint(feedRoute, feedLength, easedFeed);
    const angle = getAngle(feedRoute, feedLength, easedFeed);
    const clusterAmount = Math.max(0, (feedProgress - 0.86) / 0.14);
    capsule.setAttribute(
      "transform",
      `translate(${point.x + collectOffset.x * clusterAmount} ${point.y + collectOffset.y * clusterAmount}) rotate(${angle})`
    );
  });
}

function render(value) {
  progress = clamp(value);
  const phase = getPhase(progress);
  const feedProgresses = feedWindows.map((window) => localProgress(progress, window.start, window.end));
  const exitProgress = localProgress(progress, 0.78, 1);

  refs.stage.dataset.phase = phase.name;
  setRouteProgress(feedProgresses, exitProgress);
  placeCapsules(feedProgresses, exitProgress);
  refs.caption.textContent = captions[phase.step];
  setActiveStep(phase.step);
}

function stop() {
  playing = false;
  window.cancelAnimationFrame(frameId);
  refs.stage.classList.remove("is-playing");
  refs.playLabel.textContent = progress >= 1 ? "재생" : "이어보기";
}

function tick(now) {
  const elapsed = now - startedAt;
  const nextProgress = playFrom + elapsed / DURATION;
  render(nextProgress);

  if (nextProgress >= 1) {
    stop();
    return;
  }

  frameId = window.requestAnimationFrame(tick);
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
  refs.stage.classList.add("is-playing");
  refs.playLabel.textContent = "멈춤";
  frameId = window.requestAnimationFrame(tick);
}

function replay() {
  window.cancelAnimationFrame(frameId);
  playing = false;
  render(0);
  play();
}

function jumpToStep(step) {
  stop();
  render(jumpTargets[step] ?? 0);
}

function init() {
  feedLengths = refs.feedRoutes.map((route) => route.getTotalLength());
  outLength = refs.outRoute.getTotalLength();
  setRouteProgress([0, 0, 0, 0], 0);
  refs.playButton.addEventListener("click", play);
  refs.replayButton.addEventListener("click", replay);
  refs.stepButtons.forEach((button) => {
    button.addEventListener("click", () => jumpToStep(Number(button.dataset.step)));
  });
  render(0);
  window.setTimeout(play, 500);
}

init();
