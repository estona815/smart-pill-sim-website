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
  const state = { wheelAngle: -25, last: null, rows: [], animating: false, speed: 1.5 };
  const speedButtons = [...document.querySelectorAll('.speed-btn')];
  const stepItems = [...document.querySelectorAll('#stepRail [data-step]')];
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'presentation') document.body.classList.add('presentation-mode');

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
  function drawCapsule(x, y, len, h, angle, fill = '#0f766e') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const r = h / 2;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(-len / 2, -h / 2, len, h, r);
    ctx.fill();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(-len / 2, -h / 2, len / 2, h, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,35,60,.24)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-len / 2 + r, -h / 2, len - h, h);
    ctx.restore();
  }
  function drawScene(progress = 0, result) {
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
  function animateOne() {
    if (state.animating) return;
    const cfg = getConfig();
    const result = simulateOne(cfg, rng(Date.now()), 1);
    state.last = result;
    state.animating = true;
    const start = performance.now();
    const duration = 1200 / state.speed;
    function frame(now) {
      const p = clamp((now - start) / duration, 0, 1);
      setStep(stepFromProgress(p));
      drawScene(p, result);
      if (p < 1) requestAnimationFrame(frame);
      else {
        state.animating = false;
        updateMetrics([result]);
        setStep(5);
      }
    }
    requestAnimationFrame(frame);
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
  for (const id of fieldIds) els[id].addEventListener('input', () => drawScene(.2, state.last));
  loadExample();
  setSpeed(1.5);
})();
