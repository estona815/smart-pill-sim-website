(() => {
'use strict';
const fieldIds = [
'projectName', 'requirements', 'pillShape', 'pillDiameter', 'pillLength',
'slotSize', 'outletWidth', 'motorAngle', 'actuatorErrorDeg',
'powerStability', 'sensorDebounce', 'trialCount', 'seed',
'commonGnd', 'dischargeSensor'
];
const numericFields = new Set([
'pillDiameter', 'pillLength', 'slotSize', 'outletWidth', 'motorAngle',
'actuatorErrorDeg', 'powerStability', 'sensorDebounce', 'trialCount', 'seed'
]);
const els = {};
for (const id of fieldIds) els[id] = document.getElementById(id);
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const simTemplate = {
image: new Image(),
loaded: false
};
simTemplate.image.src = 'assets/ppt-ai-simulator-loop.webp';
simTemplate.image.addEventListener('load', () => {
simTemplate.loaded = true;
if (state.currentSlide === 26) drawScene(.2, state.last);
});
const state = {
wheelAngle: -25,
last: null,
rows: [],
animating: false,
currentSlide: 24,
loopRunning: false,
loopCancelled: false,
speed: 1.5,
singleShotSeed: 815,
singleShotRandom: null
};
const speedButtons = [...document.querySelectorAll('.speed-btn')];
const stepItems = [...document.querySelectorAll('#stepRail [data-step]')];
const params = new URLSearchParams(window.location.search);
const requestedMode = params.get('mode');
const requestedSlide = Number(params.get('slide'));
const shouldPresentationMode = requestedMode === 'presentation' || requestedMode === 'spark';
const isLocalPresentationHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const sparkModeBtn = document.getElementById('sparkModeBtn');
const sparkRunBtn = document.getElementById('sparkRunBtn');
const modeBadge = document.getElementById('modeBadge');
const slideButtons = document.getElementById('slideButtons');
const slideNarrative = document.getElementById('slideNarrative');
const slidePreviewImage = document.getElementById('slidePreviewImage');
const slideBadge = document.getElementById('slideBadge');
if (shouldPresentationMode) document.body.classList.add('presentation-mode');
const slidePresets = {
24: {
name: '24 AI Pipeline',
image: 'assets/ppt-ai-pipeline.webp',
note: '회의 요구사항을 design_params로 정리해 Simulator → Static Checks → validation_report 흐름을 시작하는 단계입니다.',
values: {
pillDiameter: 8.5,
pillLength: 17,
slotSize: 10.5,
outletWidth: 12,
motorAngle: 45,
actuatorErrorDeg: 1.2,
powerStability: 89,
sensorDebounce: 80,
trialCount: 100,
seed: 815,
commonGnd: true,
dischargeSensor: true
}
},
25: {
name: '25 Validation Harness',
image: 'assets/ppt-validation-harness.webp',
note: '동일 기준에서 반복 검증을 실행해 Failure Top3를 만드는 하네스 동작으로 전환합니다.',
values: {
pillDiameter: 9.0,
pillLength: 19,
slotSize: 10,
outletWidth: 11,
motorAngle: 46,
actuatorErrorDeg: 1.8,
powerStability: 82,
sensorDebounce: 95,
trialCount: 100,
seed: 903,
commonGnd: true,
dischargeSensor: true
}
},
26: {
name: '26 AI Simulator Loop',
image: 'assets/ppt-ai-simulator-loop.webp',
note: '토출 1회 후, 100회 검증으로 Loop 결과(성공률/실패 Top3)까지 같은 기준으로 반복 노출합니다.',
values: {
pillDiameter: 8.6,
pillLength: 17,
slotSize: 10.2,
outletWidth: 11.8,
motorAngle: 45,
actuatorErrorDeg: 1.4,
powerStability: 87,
sensorDebounce: 78,
trialCount: 100,
seed: 151,
commonGnd: true,
dischargeSensor: true
}
},
27: {
name: '27 GitHub Evidence',
image: 'assets/ppt-github-evidence.webp',
note: '발표 증빙 카드와 실제 확인 가능한 URL/파일만 분리해서 제시하는 근거 단계입니다.',
values: {
pillDiameter: 8.5,
pillLength: 17,
slotSize: 10.5,
outletWidth: 12,
motorAngle: 45,
actuatorErrorDeg: 1.2,
powerStability: 86,
sensorDebounce: 80,
trialCount: 100,
seed: 815,
commonGnd: true,
dischargeSensor: true
}
},
28: {
name: '28 Project OS',
image: 'assets/ppt-project-os.webp',
note: '회의록/자료/검증 로그/다음 액션 링크를 한 화면에서 보여주는 운영 목업 단계입니다.',
values: {
pillDiameter: 8.3,
pillLength: 16.7,
slotSize: 10.8,
outletWidth: 12.4,
motorAngle: 44,
actuatorErrorDeg: 1,
powerStability: 90,
sensorDebounce: 75,
trialCount: 100,
seed: 271,
commonGnd: true,
dischargeSensor: true
}
}
};
function enterSparkMode() {
document.body.classList.add('presentation-mode');
if (!params.get('mode')) {
params.set('mode', 'spark');
window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}
modeBadge.textContent = `${state.speed.toFixed(1)}x Spark Ready`;
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function getConfig() {
const cfg = {};
for (const id of fieldIds) {
const el = els[id];
if (el.type === 'checkbox') cfg[id] = el.checked;
else cfg[id] = numericFields.has(id) ? Number(el.value) : el.value;
}
return cfg;
}
function getSingleShotRandom(cfg) {
const seed = Number.isFinite(cfg.seed) ? cfg.seed : 815;
if (!state.singleShotRandom || state.singleShotSeed !== seed) {
state.singleShotSeed = seed;
state.singleShotRandom = rng(seed >>> 0);
}
return state.singleShotRandom;
}
function applyPreset(slideNumber) {
const preset = slidePresets[slideNumber];
if (!preset) return;
const config = preset.values;
els.pillDiameter.value = String(config.pillDiameter);
els.pillLength.value = String(config.pillLength);
els.slotSize.value = String(config.slotSize);
els.outletWidth.value = String(config.outletWidth);
els.motorAngle.value = String(config.motorAngle);
els.actuatorErrorDeg.value = String(config.actuatorErrorDeg);
els.powerStability.value = String(config.powerStability);
els.sensorDebounce.value = String(config.sensorDebounce);
els.trialCount.value = String(config.trialCount);
els.seed.value = String(config.seed);
els.commonGnd.checked = config.commonGnd;
els.dischargeSensor.checked = config.dischargeSensor;
state.singleShotRandom = null;
slideNarrative.textContent = preset.note;
slidePreviewImage.src = preset.image;
slidePreviewImage.alt = `${preset.name} 슬라이드 요약 미리보기`;
slideBadge.textContent = `슬라이드 ${slideNumber} 적용`;
state.currentSlide = slideNumber;
state.loopCancelled = true;
state.loopRunning = false;
drawScene(.2, state.last);
setStep(0);
updateActiveSlideButton(`slide-${slideNumber}`);
if (slideNumber === 26) {
state.loopCancelled = false;
runValidationLoop(100, 150);
}
}
function updateActiveSlideButton(activeId) {
const slideButtonsNode = [...document.querySelectorAll('#slideButtons button')];
for (const button of slideButtonsNode) {
const isActive = button.id === activeId;
button.classList.toggle('active', isActive);
button.classList.toggle('primary', isActive);
}
}
function animateResult(result, onComplete, durationMs) {
if (state.animating) {
if (onComplete) onComplete();
return;
}
state.animating = true;
const start = performance.now();
const duration = Math.max(120, durationMs || 1200 / state.speed);
function frame(now) {
const p = clamp((now - start) / duration, 0, 1);
setStep(stepFromProgress(p));
drawScene(p, result);
if (p < 1) requestAnimationFrame(frame);
else {
state.animating = false;
setStep(5);
if (onComplete) onComplete();
}
}
requestAnimationFrame(frame);
}
function stopValidationLoop() {
state.loopCancelled = true;
state.loopRunning = false;
}
function runValidationLoop(total = 100, durationMs = 180) {
stopValidationLoop();
const cfg = getConfig();
const random = rng(cfg.seed || 815);
const limit = clamp(Math.round(total || cfg.trialCount || 100), 1, 1000);
const rows = [];
let index = 1;
state.rows = rows;
state.loopCancelled = false;
state.loopRunning = true;
const runNext = () => {
if (state.loopCancelled || index > limit) {
state.loopRunning = false;
if (!rows.length) return;
state.last = rows[rows.length - 1];
updateMetrics(rows);
drawScene(1, state.last);
slideNarrative.textContent = `검증 루프 완료 · ${rows.length}회 실행`;
return;
}
const result = simulateOne(cfg, random, index);
rows.push(result);
state.last = result;
animateResult(result, () => {
updateMetrics(rows);
index += 1;
if (state.loopCancelled) return;
runNext();
}, Math.max(60, durationMs / state.speed));
const progress = Math.round((index / limit) * 100);
slideNarrative.textContent = `AI 검증 루프 진행 중 · ${index} / ${limit} (${progress}%)`;
if (index === 1) slideNarrative.textContent = `${slideNarrative.textContent} · 1회부터 즉시 재생`;
};
runNext();
}
function rng(seed) {
let t = seed >>> 0;
return () => {
t += 0x6D2B79F5;
let r = Math.imul(t ^ (t >>> 15), 1 | t);
r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
};
}
function riskModel(cfg) {
const fitRisk = clamp((cfg.pillLength - cfg.slotSize * 1.9) / 18, 0, .28)
+ clamp((cfg.pillDiameter - cfg.outletWidth) / 12, 0, .24);
const powerRisk = clamp((82 - cfg.powerStability) / 100, 0, .25);
const angleRisk = clamp((cfg.actuatorErrorDeg - 1.4) / 12, 0, .18);
const sensorRisk = cfg.dischargeSensor ? clamp((55 - cfg.sensorDebounce) / 240, 0, .12) : .24;
const gndRisk = cfg.commonGnd ? 0 : .20;
return { fitRisk, powerRisk, angleRisk, sensorRisk, gndRisk };
}
function simulateOne(cfg, random, index = 1) {
const risk = riskModel(cfg);
const totalRisk = clamp(risk.fitRisk + risk.powerRisk + risk.angleRisk + risk.sensorRisk + risk.gndRisk, .02, .86);
const roll = random();
let status = 'success';
let reason = '정상 토출';
if (roll < totalRisk) {
const buckets = [
['알약 걸림', risk.fitRisk + .08],
['IR 감지 실패', risk.sensorRisk + .05],
['전원 강하', risk.powerRisk + .04],
['구동 위치 오차', risk.angleRisk + .04],
['공통 GND 점검', risk.gndRisk + .02]
];
const sum = buckets.reduce((a, b) => a + b[1], 0);
let pick = random() * sum;
for (const [name, weight] of buckets) {
pick -= weight;
if (pick <= 0) { reason = name; break; }
}
status = reason === 'IR 감지 실패' ? 'sensor_fail' : reason === '알약 걸림' ? 'jam' : reason === '전원 강하' ? 'power_drop' : 'motor_error';
}
return {
trial: index,
status,
reason,
dropDetected: status === 'success',
motorAngle: cfg.motorAngle,
pillOrientation: 'horizontal',
timestamp: new Date().toISOString()
};
}
function runMany() {
stopValidationLoop();
const cfg = getConfig();
const random = rng(cfg.seed || 815);
const total = clamp(Math.round(cfg.trialCount || 100), 1, 1000);
const rows = [];
for (let i = 1; i <= total; i++) rows.push(simulateOne(cfg, random, i));
state.rows = rows;
state.last = rows[rows.length - 1];
updateMetrics(rows);
drawScene(.85, state.last);
setStep(5);
}
function updateMetrics(rows) {
const ok = rows.filter(r => r.status === 'success').length;
const rate = ok / rows.length;
const counts = {};
for (const r of rows) if (r.status !== 'success') counts[r.reason] = (counts[r.reason] || 0) + 1;
const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
document.getElementById('overallResult').textContent = rate >= .86 ? 'PASS' : rate >= .72 ? 'REVIEW' : 'FAIL';
document.getElementById('overallNote').textContent = rate >= .86 ? '발표용 기준 통과' : '설계 보정 후 재검증 필요';
document.getElementById('successRate').textContent = `${(rate * 100).toFixed(1)}%`;
document.getElementById('successCount').textContent = `${ok} / ${rows.length}`;
document.getElementById('failureList').innerHTML = top.length
? top.map(([k, v]) => `<li>${k} · ${v}회</li>`).join('')
: '<li>실패 없음</li>';
}
function setStep(index) {
for (const item of stepItems) {
item.classList.toggle('active', Number(item.dataset.step) <= index);
}
}
function stepFromProgress(progress) {
if (progress < .12) return 0;
if (progress < .38) return 1;
if (progress < .58) return 2;
if (progress < .78) return 3;
if (progress < .92) return 4;
return 5;
}
function easeOutCubic(v) {
const t = clamp(v, 0, 1);
return 1 - Math.pow(1 - t, 3);
}
function easeInOutSine(v) {
const t = clamp(v, 0, 1);
return -(Math.cos(Math.PI * t) - 1) / 2;
}
function drawCapsule(x, y, len, h, angle, fill = '#0f766e', alpha = 1) {
ctx.save();
ctx.globalAlpha = alpha;
ctx.translate(x, y);
ctx.rotate(angle);
const r = h / 2;
const shadow = ctx.createLinearGradient(-len / 2, -h / 2, len / 2, h / 2);
shadow.addColorStop(0, 'rgba(15,24,40,.03)');
shadow.addColorStop(.5, 'rgba(15,24,40,.06)');
shadow.addColorStop(1, 'rgba(15,24,40,.03)');
ctx.fillStyle = '#f8fbff';
ctx.beginPath();
ctx.roundRect(-len / 2, -h / 2, len, h, r);
ctx.fill();
ctx.fillStyle = fill;
ctx.shadowColor = 'rgba(8,56,48,.45)';
ctx.shadowBlur = 6;
ctx.beginPath();
ctx.roundRect(-len / 2, -h / 2, len / 2, h, r);
ctx.fill();
ctx.shadowBlur = 0;
ctx.strokeStyle = 'rgba(15,35,60,.24)';
ctx.lineWidth = 2;
ctx.strokeRect(-len / 2 + r, -h / 2, len - h, h);
ctx.restore();
}
function renderWheel(cx, cy, outer, inner, angle, progress) {
const spokeCount = 4;
const speedAngle = progress * 88;
ctx.save();
ctx.translate(cx, cy);
ctx.rotate((state.wheelAngle + speedAngle) * Math.PI / 180);
const bodyGrad = ctx.createRadialGradient(-26, -26, inner * .25, 0, 0, outer);
bodyGrad.addColorStop(0, '#1e3a63');
bodyGrad.addColorStop(1, '#111d2f');
ctx.fillStyle = bodyGrad;
ctx.beginPath();
ctx.arc(0, 0, outer, 0, Math.PI * 2);
ctx.fill();
ctx.beginPath();
ctx.arc(0, 0, inner, 0, Math.PI * 2);
ctx.fillStyle = '#23314a';
ctx.fill();
for (let i = 0; i < spokeCount; i++) {
const a = (i / spokeCount) * Math.PI * 2;
const x = Math.cos(a) * (outer * .74);
const y = Math.sin(a) * (outer * .74);
ctx.save();
ctx.translate(x, y);
ctx.rotate(a + Math.PI / 2);
const slotFill = i === 0 ? '#0fb3a1' : '#0d5f77';
const pulse = i === 0 ? 0.24 + Math.sin(progress * Math.PI * 4) * 0.2 : 0;
ctx.beginPath();
ctx.roundRect(-44, -17, 88, 34, 17);
ctx.fillStyle = slotFill;
ctx.fill();
drawCapsule(0, 0, 66, 20, 0, i % 2 ? '#0f9f8f' : '#10b6a7', clamp(.86 + pulse, .65, 1));
ctx.restore();
}
ctx.restore();
}
function drawMachineFrame(slideRefVisible = false) {
if (slideRefVisible && simTemplate.loaded) {
const frameW = Math.min(canvas.width - 36, 1004);
const frameH = Math.round(frameW * 9 / 16);
const x = Math.round((canvas.width - frameW) / 2);
const y = Math.round((canvas.height - frameH) / 2 + 6);
ctx.save();
ctx.globalAlpha = 0.9;
ctx.drawImage(simTemplate.image, x, y, frameW, frameH);
ctx.restore();
return { x, y, w: frameW, h: frameH };
}
return null;
}
function renderLoopScene(progress = 0, result) {
const cfg = getConfig();
const activeStep = stepFromProgress(progress);
const bounds = drawMachineFrame(true);
const frame = bounds ? bounds : { x: 0, y: 0, w: canvas.width, h: canvas.height };
const p = clamp(progress, 0, 1);
const phase = {
rotate: { start: 0.08, end: 0.30 },
align: { start: 0.30, end: 0.48 },
drop: { start: 0.48, end: 0.72 },
detect: { start: 0.72, end: 0.88 },
record: { start: 0.88, end: 1 }
};
const phaseProgress = (from, to) => clamp((p - from) / (to - from), 0, 1);
const rotateP = phaseProgress(phase.rotate.start, phase.rotate.end);
const alignP = phaseProgress(phase.align.start, phase.align.end);
const dropP = phaseProgress(phase.drop.start, phase.drop.end);
const detectP = phaseProgress(phase.detect.start, phase.detect.end);
const cx = frame.x + frame.w * 0.47;
const cy = frame.y + frame.h * 0.62;
const outer = Math.min(frame.w * 0.21, frame.h * 0.33);
const inner = Math.max(34, outer * 0.45);
const outletX = frame.x + frame.w * 0.79;
const outletY = frame.y + frame.h * 0.64;
const spin = (rotateP * 80 + alignP * 90) + Math.sin(p * Math.PI * 0.2) * 2;
const slotAngleBase = -Math.PI / 2 + (spin * Math.PI / 180);
const slots = [];
for (let i = 0; i < 4; i++) {
const a = slotAngleBase + (i * Math.PI / 2);
slots.push({
x: cx + Math.cos(a) * (outer * 0.73),
y: cy + Math.sin(a) * (outer * 0.73)
});
}
const activeSlot = slots[0];
const targetX = outletX + 20;
const targetY = outletY + 24;
const pathP = easeOutCubic(dropP);
const aligned = activeStep >= 1;
const detectActive = p >= phase.detect.start && p <= phase.detect.end;
const recorded = p >= phase.record.start;
if (!bounds) {
ctx.fillStyle = '#f4f8ff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
}
ctx.save();
ctx.font = '800 18px system-ui';
ctx.fillStyle = '#0a2038';
ctx.fillText('AI 시뮬레이터 검증 루프 · 토출 시퀀스', frame.x + 26, frame.y + 34);
for (const slot of slots) {
ctx.save();
ctx.globalAlpha = 0.56;
ctx.beginPath();
ctx.roundRect(slot.x - 58, slot.y - 16, 116, 32, 16);
ctx.fillStyle = 'rgba(13, 95, 119, 0.24)';
ctx.fill();
drawCapsule(slot.x, slot.y, 72, 21, 0, '#0f9f8f', 0.85);
ctx.restore();
}
renderWheel(cx, cy, outer, inner, state.wheelAngle + spin, p);
ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
ctx.setLineDash([8, 8]);
ctx.lineWidth = 5;
ctx.beginPath();
ctx.moveTo(activeSlot.x, activeSlot.y + 6);
ctx.quadraticCurveTo(
(activeSlot.x + targetX) * 0.6,
(activeSlot.y + targetY) * 0.6,
targetX,
targetY
);
ctx.stroke();
ctx.setLineDash([]);
const dropX = aligned
? activeSlot.x + (targetX - activeSlot.x) * pathP
: activeSlot.x;
const dropY = aligned
? activeSlot.y + (targetY - activeSlot.y) * pathP + Math.sin(pathP * Math.PI) * 8 * (1 + alignP)
: activeSlot.y;
const trayPulse = clamp(dropP - 0.32, 0, 1) * 12;
const irPulse = detectActive ? 0.45 + Math.sin(detectP * Math.PI * 10) * 0.4 : 0.2;
if (alignP > 0.02) drawCapsule(dropX, dropY + trayPulse, 86, 23, 0, '#0f9f8f', 1);
ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
ctx.beginPath();
ctx.roundRect(outletX - 66, outletY + 30, 142, 18, 10);
ctx.fill();
ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
ctx.stroke();
ctx.beginPath();
ctx.roundRect(targetX - 2, targetY - 12, 72, 58, 14);
ctx.fillStyle = 'rgba(14, 165, 233, .2)';
ctx.fill();
ctx.strokeStyle = '#7dd3fc';
ctx.stroke();
const irY = targetY + 18;
ctx.setLineDash([9, 8]);
ctx.lineWidth = 4;
ctx.beginPath();
ctx.moveTo(targetX - 24, irY);
ctx.lineTo(targetX + 22, irY);
ctx.strokeStyle = detectActive ? 'rgba(245, 158, 11, 0.95)' : 'rgba(245, 158, 11, 0.35)';
ctx.stroke();
ctx.setLineDash([]);
ctx.beginPath();
ctx.arc(targetX + 26, irY, 10 + irPulse * 3, 0, Math.PI * 2);
ctx.fillStyle = detectActive ? '#f59e0b' : 'rgba(253, 186, 116, .65)';
ctx.fill();
ctx.fillStyle = '#0b2036';
ctx.font = '700 11px system-ui';
ctx.fillText('IR', targetX + 21, irY + 28);
if (result && result.status !== 'success' && detectActive) {
ctx.strokeStyle = 'rgba(239, 68, 76, .55)';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(targetX + 26, irY);
ctx.lineTo(targetX + 26, irY + 16);
ctx.lineTo(targetX + 8, irY + 30);
ctx.stroke();
}
const panel = {
x: frame.x + frame.w - 252,
y: frame.y + 30,
w: 236,
h: 214
};
ctx.fillStyle = 'rgba(255,255,255,.9)';
ctx.strokeStyle = 'rgba(204,218,236,.9)';
ctx.beginPath();
ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 16);
ctx.fill();
ctx.stroke();
ctx.fillStyle = '#0f172a';
ctx.font = '900 16px system-ui';
ctx.fillText('Validation Harness', panel.x + 14, panel.y + 30);
const pass = !result || result.status === 'success';
ctx.fillStyle = pass ? '#dcfce7' : '#fff7ed';
ctx.beginPath();
ctx.roundRect(panel.x + 12, panel.y + 44, 108, 40, 12);
ctx.fill();
ctx.fillStyle = pass ? '#059669' : '#f59e0b';
ctx.font = '900 22px system-ui';
ctx.fillText(pass ? 'PASS' : 'RECORD', panel.x + 21, panel.y + 72);
const lines = [
`status: ${result ? result.status : 'ready'}`,
`step: ${['idle','rotate','align','drop','detect','record'][activeStep]}`,
`gnd: ${cfg.commonGnd ? 'connected' : 'unchecked'}`,
`sensor: ${cfg.dischargeSensor ? 'enabled' : 'disabled'}`,
`slot_size: ${cfg.slotSize.toFixed(1)} mm`,
`outlet_width: ${cfg.outletWidth.toFixed(1)} mm`,
`motion: ${detectActive ? 'sensor window on' : recorded ? 'stored' : 'running'}`
];
ctx.fillStyle = '#1f2937';
ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
lines.forEach((line, i) => ctx.fillText(line, panel.x + 12, panel.y + 108 + i * 14));
if (result && result.status !== 'success' && recorded) {
ctx.fillStyle = '#b91c1c';
ctx.font = '700 12px system-ui';
ctx.fillText(`실패 사유: ${result.reason}`, panel.x + 20, panel.y + 168);
}
if (recorded) {
ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
ctx.beginPath();
ctx.arc(panel.x + 198, panel.y + 172, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.8 * easeInOutSine(alignP), false);
ctx.stroke();
}
ctx.restore();
}
function drawGenericScene(progress = 0, result) {
const cfg = getConfig();
ctx.clearRect(0, 0, canvas.width, canvas.height);
const activeStep = stepFromProgress(progress);
ctx.fillStyle = '#f8fbfd';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#061b33';
ctx.font = '800 26px system-ui';
ctx.fillText('Horizontal Capsule Dispense Simulation', 34, 48);
ctx.fillStyle = '#64748b';
ctx.font = '15px system-ui';
ctx.fillText('발표용 시뮬레이션 · 규칙·확률 기반 사전 검토 · 실제 물리시험과 구분', 34, 76);
const cx = 430, cy = 310, outer = 190, inner = 88;
ctx.save();
ctx.translate(cx, cy);
ctx.rotate((state.wheelAngle + progress * 46) * Math.PI / 180);
ctx.fillStyle = '#172334';
ctx.beginPath(); ctx.arc(0, 0, outer, 0, Math.PI * 2); ctx.fill();
ctx.fillStyle = '#263346';
ctx.beginPath(); ctx.arc(0, 0, inner, 0, Math.PI * 2); ctx.fill();
for (let i = 0; i < 12; i++) {
const a = (i / 12) * Math.PI * 2;
const x = Math.cos(a) * 136;
const y = Math.sin(a) * 136;
ctx.save();
ctx.translate(x, y);
ctx.rotate(a + Math.PI / 2);
ctx.fillStyle = '#0d1724';
ctx.beginPath(); ctx.roundRect(-46, -18, 92, 36, 18); ctx.fill();
drawCapsule(0, 0, 70, 24, 0, i % 3 === 0 ? '#0f9f8f' : '#0f766e');
ctx.restore();
}
ctx.restore();
ctx.fillStyle = 'rgba(148,163,184,.2)';
ctx.beginPath(); ctx.roundRect(360, 456, 150, 82, 24); ctx.fill();
ctx.strokeStyle = '#38bdf8';
ctx.lineWidth = 3;
ctx.strokeRect(385, 462, 100, 68);
const travel = progress < .58 ? 0 : clamp((progress - .58) / .38, 0, 1);
const pillX = 418 + travel * 185;
const pillY = 476 + Math.sin(travel * Math.PI) * 16 + travel * 22;
drawCapsule(pillX, pillY, 76, 26, 0, '#0f9f8f');
ctx.strokeStyle = activeStep >= 4 ? '#f59e0b' : 'rgba(245,158,11,.34)';
ctx.lineWidth = activeStep >= 4 ? 5 : 3;
ctx.beginPath();
ctx.setLineDash([9, 9]);
ctx.moveTo(518, 462);
ctx.lineTo(518, 530);
ctx.stroke();
ctx.setLineDash([]);
ctx.fillStyle = activeStep >= 4 ? '#f59e0b' : '#fed7aa';
ctx.beginPath(); ctx.arc(518, 498, 12, 0, Math.PI * 2); ctx.fill();
ctx.fillStyle = '#061b33';
ctx.font = '800 14px system-ui';
ctx.fillText('IR', 508, 535);
const panelX = 690;
ctx.fillStyle = '#fff';
ctx.beginPath(); ctx.roundRect(panelX, 126, 300, 340, 22); ctx.fill();
ctx.strokeStyle = '#dce5ef'; ctx.stroke();
ctx.fillStyle = '#061b33'; ctx.font = '900 20px system-ui';
ctx.fillText('Validation Harness', panelX + 24, 162);
const pass = !result || result.status === 'success';
ctx.fillStyle = pass ? '#dcfce7' : '#fff7ed';
ctx.beginPath(); ctx.roundRect(panelX + 24, 188, 120, 54, 16); ctx.fill();
ctx.fillStyle = pass ? '#16a34a' : '#f59e0b';
ctx.font = '900 26px system-ui';
ctx.fillText(pass ? 'PASS' : 'REVIEW', panelX + 42, 223);
const lines = [
`pill_orientation: horizontal`,
`slot_size_mm: ${cfg.slotSize}`,
`outlet_width_mm: ${cfg.outletWidth}`,
`common_gnd: ${cfg.commonGnd}`,
`ir_sensor: ${cfg.dischargeSensor}`,
`speed: ${state.speed.toFixed(1)}x`,
`result: ${result ? result.reason : 'ready'}`
];
ctx.fillStyle = '#334155'; ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
lines.forEach((line, i) => ctx.fillText(line, panelX + 24, 282 + i * 26));
}
function drawScene(progress = 0, result) {
if (state.currentSlide === 26 && simTemplate.loaded) {
renderLoopScene(progress, result);
return;
}
drawGenericScene(progress, result);
}
function animateOne() {
if (state.animating) return;
stopValidationLoop();
const cfg = getConfig();
const result = simulateOne(cfg, getSingleShotRandom(cfg), 1);
state.last = result;
animateResult(result, () => updateMetrics([result]), 1200 / state.speed);
}
function download(name, type, content) {
const blob = new Blob([content], { type });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = name; a.click();
URL.revokeObjectURL(url);
}
function saveJson() {
const cfg = getConfig();
download('design_params.json', 'application/json', JSON.stringify(cfg, null, 2));
}
function saveCsv() {
const rows = state.rows.length ? state.rows : [simulateOne(getConfig(), rng(815), 1)];
const header = 'trial,status,reason,dropDetected,motorAngle,pillOrientation,timestamp';
const body = rows.map(r => [r.trial, r.status, r.reason, r.dropDetected, r.motorAngle, r.pillOrientation, r.timestamp].join(',')).join('\n');
download('summary_100trials.csv', 'text/csv', `${header}\n${body}`);
}
function savePng() {
canvas.toBlob(blob => {
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url; a.download = 'nutronics-horizontal-capsule-sim.png'; a.click();
URL.revokeObjectURL(url);
});
}
function loadExample() {
els.pillDiameter.value = 8.5;
els.pillLength.value = 17;
els.slotSize.value = 10.5;
els.outletWidth.value = 12;
els.motorAngle.value = 45;
els.actuatorErrorDeg.value = 1.2;
els.powerStability.value = 86;
els.sensorDebounce.value = 80;
els.trialCount.value = 100;
els.seed.value = 815;
state.singleShotRandom = null;
els.commonGnd.checked = true;
els.dischargeSensor.checked = true;
setStep(0);
drawScene(.2, null);
}
function setSpeed(speed) {
state.speed = speed;
for (const button of speedButtons) {
button.classList.toggle('active', Number(button.dataset.speed) === speed);
}
document.getElementById('modeBadge').textContent = `${speed.toFixed(1)}x Demo Ready`;
drawScene(.2, state.last);
}
document.getElementById('runOneBtn').addEventListener('click', animateOne);
document.getElementById('runManyBtn').addEventListener('click', runMany);
document.getElementById('saveJsonBtn').addEventListener('click', saveJson);
document.getElementById('downloadCsvBtn').addEventListener('click', saveCsv);
document.getElementById('downloadPngBtn').addEventListener('click', savePng);
document.getElementById('loadExampleBtn').addEventListener('click', loadExample);
document.getElementById('resetBtn').addEventListener('click', loadExample);
for (const button of speedButtons) {
button.addEventListener('click', () => setSpeed(Number(button.dataset.speed)));
}
if (sparkModeBtn) {
sparkModeBtn.addEventListener('click', () => {
enterSparkMode();
setSpeed(1.5);
});
}
if (sparkRunBtn) {
sparkRunBtn.addEventListener('click', () => {
enterSparkMode();
setSpeed(1.5);
animateOne();
});
}
if (slideButtons) {
for (const button of slideButtons.children) {
button.id = `slide-${button.dataset.slide}`;
button.addEventListener('click', () => {
enterSparkMode();
const slide = Number(button.dataset.slide);
params.set('mode', 'spark');
params.set('slide', String(slide));
window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
applyPreset(slide);
setSpeed(1.5);
});
}
}
for (const id of fieldIds) {
els[id].addEventListener('input', () => drawScene(.2, state.last));
}
if (isLocalPresentationHost || shouldPresentationMode) {
enterSparkMode();
const slide = requestedSlide >= 24 && requestedSlide <= 28 ? requestedSlide : 24;
applyPreset(slide);
} else {
loadExample();
}
setSpeed(1.5);
})();