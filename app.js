(() => {
  'use strict';

  const fieldIds = [
    'projectName', 'requirements', 'pillShape', 'pillCount', 'pillDiameter', 'pillLength', 'pillWeight',
    'hopperAngle', 'friction', 'tolerance', 'slotSize', 'slotCount', 'wheelRadius', 'outletWidth',
    'edgeChamfer', 'topGuard', 'driveMode', 'motorSpeed', 'motorAngle', 'actuatorErrorDeg',
    'backlashDeg', 'powerStability', 'sensorPosition', 'sensorRange', 'sensorResponse', 'sensorDebounce', 'targetCount',
    'trialCount', 'seed', 'designMode', 'controlCode'
  ];

  const numericFields = new Set([
    'pillCount', 'pillDiameter', 'pillLength', 'pillWeight', 'hopperAngle', 'friction', 'tolerance',
    'slotSize', 'slotCount', 'wheelRadius', 'outletWidth', 'edgeChamfer', 'topGuard', 'motorSpeed',
    'motorAngle', 'actuatorErrorDeg', 'backlashDeg', 'powerStability', 'sensorPosition',
    'sensorRange', 'sensorResponse', 'sensorDebounce', 'targetCount', 'trialCount', 'seed'
  ]);

  const els = {};
  for (const id of fieldIds) els[id] = document.getElementById(id);

  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');
  const failureChart = document.getElementById('failureChart');
  const failureCtx = failureChart.getContext('2d');
  const compareChart = document.getElementById('compareChart');
  const compareCtx = compareChart.getContext('2d');

  const state = {
    lastResult: null,
    metrics: null,
    compare: null,
    csvRows: [],
    control: {},
    wheelAngle: -90,
    animating: false
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function fmtPct(value) {
    if (!Number.isFinite(value)) return '0%';
    return `${(value * 100).toFixed(1)}%`;
  }

  function fmt(value, digits = 2) {
    if (!Number.isFinite(value)) return '-';
    return value.toFixed(digits);
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function random() {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normalNoise(random) {
    const u = Math.max(random(), 1e-9);
    const v = Math.max(random(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function getConfig() {
    const config = {};
    for (const id of fieldIds) {
      const el = els[id];
      if (!el) continue;
      if (numericFields.has(id)) {
        config[id] = Number(el.value);
      } else {
        config[id] = el.value;
      }
    }
    config.control = parseControlCode(config.controlCode || '');
    return config;
  }

  function setConfig(partial) {
    for (const [key, value] of Object.entries(partial)) {
      const el = els[key];
      if (!el) continue;
      el.value = value;
    }
    updateModeBadge();
    applyControlCode(false);
    drawStatic();
  }

  function parseControlCode(text) {
    const parsed = {
      retry: 0,
      motorRamp: 0.5,
      doubleDetect: false,
      sensorCheck: true,
      alarmOnFail: true,
      jamRecovery: false
    };
    const lines = String(text || '').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('//')) continue;
      const idx = line.indexOf('=');
      if (idx < 1) continue;
      const key = line.slice(0, idx).trim();
      const rawValue = line.slice(idx + 1).trim();
      let value = rawValue;
      if (/^(true|false)$/i.test(rawValue)) value = /^true$/i.test(rawValue);
      else if (!Number.isNaN(Number(rawValue)) && rawValue !== '') value = Number(rawValue);
      parsed[key] = value;
    }
    parsed.retry = clamp(Math.round(Number(parsed.retry) || 0), 0, 3);
    parsed.motorRamp = clamp(Number(parsed.motorRamp) || 0, 0, 1);
    parsed.doubleDetect = Boolean(parsed.doubleDetect);
    parsed.sensorCheck = parsed.sensorCheck !== false;
    parsed.alarmOnFail = parsed.alarmOnFail !== false;
    parsed.jamRecovery = Boolean(parsed.jamRecovery);
    return parsed;
  }

  function applyControlCode(showMessage = true) {
    const cfg = getConfig();
    state.control = cfg.control;
    if (showMessage) {
      const status = document.getElementById('codeStatus');
      status.textContent = `적용됨: retry=${state.control.retry}, motorRamp=${fmt(state.control.motorRamp, 2)}, doubleDetect=${state.control.doubleDetect}, jamRecovery=${state.control.jamRecovery}`;
    }
  }

  function effectivePillSize(cfg) {
    if (cfg.pillShape === 'round') return cfg.pillDiameter;
    if (cfg.pillShape === 'oval') return Math.max(cfg.pillDiameter, cfg.pillLength * 0.62);
    return Math.max(cfg.pillDiameter, cfg.pillLength * 0.50);
  }

  function getDesignFactors(cfg, random = Math.random, trialIndex = 1, totalTrials = cfg.trialCount || 200) {
    const control = cfg.control || parseControlCode(cfg.controlCode || '');
    const effectiveSize = effectivePillSize(cfg);
    const slotClearance = cfg.slotSize - cfg.pillDiameter;
    const effectiveClearance = cfg.slotSize - effectiveSize;
    const outletClearance = cfg.outletWidth - effectiveSize;
    const desiredAngle = 360 / Math.max(1, cfg.slotCount);
    const configuredAngleError = Math.abs(cfg.motorAngle - desiredAngle);
    const ramp = clamp(control.motorRamp ?? 0.5, 0, 1);
    const rampFactor = 1 - ramp * 0.35;
    const driveModeFactor = cfg.driveMode === 'servo' ? 0.88 : cfg.driveMode === 'manual' ? 1.2 : 1;
    const toleranceNoise = Math.abs(normalNoise(random)) * cfg.tolerance;
    const speedStress = clamp((cfg.motorSpeed - 22) / 65, 0, 0.65);
    const lowAnglePenalty = clamp((26 - cfg.hopperAngle) / 30, 0, 0.7);
    const highAnglePenalty = clamp((cfg.hopperAngle - 52) / 20, 0, 0.25);
    const lowStockPenalty = clamp((7 - cfg.pillCount) / 10, 0, 0.4);
    const shapeSensitivity = cfg.pillShape === 'capsule' ? 1.25 : cfg.pillShape === 'oval' ? 1.12 : 1;
    const shapePenalty = cfg.pillShape === 'capsule' ? 0.08 : cfg.pillShape === 'oval' ? 0.045 : 0;
    const powerWeakness = clamp((100 - cfg.powerStability) / 100, 0, 0.85);
    const trialProgress = clamp((trialIndex - 1) / Math.max(1, totalTrials - 1), 0, 1);
    const cumulativeDrift = trialProgress * clamp(totalTrials / 1000, 0, 1.4) * (0.32 + cfg.backlashDeg * 0.055 + powerWeakness * 0.55);
    const idealSlotClearance = cfg.pillShape === 'capsule' ? cfg.pillDiameter * 0.28 : cfg.pillDiameter * 0.2;
    const idealOutletClearance = effectiveSize * 0.2;
    const slotTooTight = clamp((idealSlotClearance - slotClearance) / Math.max(1.2, idealSlotClearance), 0, 1);
    const slotTooLoose = clamp((slotClearance - idealSlotClearance * 1.9) / Math.max(2, cfg.pillDiameter * 0.45), 0, 1);
    const outletTooTight = clamp((idealOutletClearance - outletClearance) / Math.max(1.2, idealOutletClearance), 0, 1);
    const outletTooWide = clamp((outletClearance - idealOutletClearance * 2.2) / Math.max(2, cfg.pillDiameter * 0.45), 0, 1);
    const tolerancePenalty = clamp(cfg.tolerance / 1.4, 0, 0.75);
    const toleranceNoisePenalty = clamp(toleranceNoise / 5, 0, 0.16);
    const guardMissing = cfg.topGuard ? 0 : 1;
    const edgeLevel = clamp(Number(cfg.edgeChamfer) || 0, 0, 2);
    const dropSpeed = Math.max(0.1, cfg.motorSpeed / 18);
    const passTimeMs = clamp((cfg.sensorRange + cfg.pillDiameter) * 7 / dropSpeed, 8, 280);
    const responsePenalty = clamp((cfg.sensorResponse - passTimeMs) / 140, 0, 0.6);
    const debounceNoisePenalty = cfg.sensorDebounce < 25 ? clamp((25 - cfg.sensorDebounce) / 80, 0, 0.18) : 0;
    const debounceMergePenalty = cfg.sensorDebounce > 150 ? clamp((cfg.sensorDebounce - 150) / 300, 0, 0.32) : 0;
    const rangePenalty = clamp((cfg.pillDiameter * 0.55 - cfg.sensorRange) / 10, 0, 0.38);
    const positionPenalty = clamp(Math.abs(cfg.sensorPosition - 72) / 115, 0, 0.36);

    const cycleTimeSec = clamp((60 / Math.max(1, cfg.motorSpeed)) * (desiredAngle / 360) * 1.2 + 0.45 + cfg.targetCount * 0.18, 0.45, 8.0);

    return {
      control,
      effectiveSize,
      slotClearance,
      effectiveClearance,
      outletClearance,
      desiredAngle,
      configuredAngleError,
      ramp,
      rampFactor,
      driveModeFactor,
      toleranceNoise,
      tolerancePenalty,
      toleranceNoisePenalty,
      speedStress,
      lowAnglePenalty,
      highAnglePenalty,
      lowStockPenalty,
      shapeSensitivity,
      shapePenalty,
      powerWeakness,
      cumulativeDrift,
      idealSlotClearance,
      idealOutletClearance,
      slotTooTight,
      slotTooLoose,
      outletTooTight,
      outletTooWide,
      guardMissing,
      edgeLevel,
      dropSpeed,
      passTimeMs,
      responsePenalty,
      debounceNoisePenalty,
      debounceMergePenalty,
      rangePenalty,
      positionPenalty,
      cycleTimeSec
    };
  }

  function calcFillProbability(cfg, f) {
    // 미배출은 슬롯 여유, 저장통 경사각, 마찰, 재고, 공차, 알약 형태와 전원 약화가 나쁘면 증가한다.
    const fitBonus = clamp((f.slotClearance - f.idealSlotClearance * 0.55) / Math.max(2, cfg.pillDiameter * 0.55), -0.34, 0.2);
    let fillP = 0.84 + fitBonus;
    fillP -= f.slotTooTight * 0.5 * f.shapeSensitivity;
    fillP -= f.lowAnglePenalty * 0.34 + f.highAnglePenalty * 0.08;
    fillP -= cfg.friction * 0.24 + f.lowStockPenalty * 0.35 + f.tolerancePenalty * 0.09 + f.toleranceNoisePenalty;
    fillP -= f.shapePenalty + f.powerWeakness * 0.12;
    fillP += cfg.topGuard ? 0.025 : -0.02;
    return clamp(fillP, 0.03, 0.98);
  }

  function calcDoubleProbability(cfg, f) {
    // 중복 배출은 슬롯/배출구가 과하게 크거나 차단판이 없고 속도가 빠르면 증가한다.
    let doubleP = 0.012;
    doubleP += f.slotTooLoose * 0.38;
    doubleP += f.outletTooWide * 0.18;
    doubleP += f.guardMissing * 0.14;
    doubleP += f.speedStress * 0.08;
    doubleP += cfg.targetCount > 1 ? 0.03 * (cfg.targetCount - 1) : 0;
    doubleP -= cfg.topGuard ? 0.08 : 0;
    doubleP -= f.edgeLevel * 0.01;
    return clamp(doubleP, 0.003, 0.7);
  }

  function calcJamProbability(cfg, f) {
    // 걸림은 배출구가 유효 알약 크기에 근접하거나 좁고, 마찰과 공차가 함께 높고, 속도가 빠르면 증가한다.
    const frictionToleranceCoupling = cfg.friction * f.tolerancePenalty * 0.22;
    let jamP = 0.035;
    jamP += f.outletTooTight * 0.52 * f.shapeSensitivity;
    jamP += f.slotTooTight * 0.18;
    jamP += cfg.friction * 0.26 + f.tolerancePenalty * 0.13 + frictionToleranceCoupling;
    jamP += f.speedStress * 0.22 + f.shapePenalty + f.lowAnglePenalty * 0.08;
    jamP -= f.edgeLevel * 0.065;
    jamP -= f.ramp * 0.045;
    jamP -= f.control.jamRecovery ? 0.035 : 0;
    return clamp(jamP, 0.004, 0.82);
  }

  function calcSensorProbability(cfg, f) {
    // 센서 실패는 감지 범위, 위치, 반응시간, 디바운스, 낙하 속도 조건이 나쁠수록 증가한다.
    let sensorP = 0.965;
    sensorP -= f.responsePenalty + f.rangePenalty + f.positionPenalty;
    sensorP -= f.debounceNoisePenalty + f.debounceMergePenalty;
    sensorP -= f.speedStress * 0.04;
    if (f.control.sensorCheck === false) sensorP -= 0.2;
    return clamp(sensorP, 0.12, 0.995);
  }

  function calcIndexingProbability(cfg, f) {
    // 구동 위치 오차는 슬롯각 불일치, 구동각 오차, 백래시, 속도, 전원 약화, 원점 보정 부재에 따른 누적 드리프트로 증가한다.
    const actuatorRandomError = cfg.actuatorErrorDeg * f.driveModeFactor * f.rampFactor + f.toleranceNoise * 0.55;
    const backlashError = Math.max(0, cfg.backlashDeg) * (0.6 + f.speedStress * 0.5);
    const speedAlignmentError = f.speedStress * 2.2 * (1 - f.ramp * 0.32);
    const powerAlignmentError = f.powerWeakness * 3.4;
    const indexingAngleError = f.configuredAngleError + actuatorRandomError + backlashError + speedAlignmentError + powerAlignmentError + f.cumulativeDrift;
    const motorFailP = clamp((indexingAngleError - 2.4) / 9.5, 0, 0.74) + f.powerWeakness * 0.1;
    return { indexingAngleError, motorFailP: clamp(motorFailP, 0, 0.86) };
  }

  function calcProbabilities(cfg, random = Math.random, trialIndex = 1, totalTrials = cfg.trialCount || 200) {
    const f = getDesignFactors(cfg, random, trialIndex, totalTrials);
    const indexing = calcIndexingProbability(cfg, f);
    return {
      fillP: calcFillProbability(cfg, f),
      doubleP: calcDoubleProbability(cfg, f),
      jamP: calcJamProbability(cfg, f),
      sensorP: calcSensorProbability(cfg, f),
      motorFailP: indexing.motorFailP,
      indexingAngleError: indexing.indexingAngleError,
      desiredAngle: f.desiredAngle,
      slotClearance: f.slotClearance,
      effectiveClearance: f.effectiveClearance,
      outletClearance: f.outletClearance,
      cycleTimeSec: f.cycleTimeSec,
      factors: f
    };
  }

  function simulateSingle(cfg, random, trialIndex = 1, totalTrials = cfg.trialCount || 200) {
    const probs = calcProbabilities(cfg, random, trialIndex, totalTrials);
    const control = cfg.control || parseControlCode(cfg.controlCode || '');
    let attempts = 0;
    let filled = false;
    let motorFailed = false;
    let noDropReason = '';

    const maxAttempts = 1 + (Number(control.retry) || 0);
    while (attempts < maxAttempts && !filled && !motorFailed) {
      attempts += 1;
      motorFailed = random() < probs.motorFailP;
      if (motorFailed) {
        noDropReason = '구동각 오차/유격/출력 부족으로 슬롯-배출구 미정렬';
        break;
      }
      filled = random() < probs.fillP;
      if (!filled) noDropReason = '슬롯 충전 실패';
    }

    let actualDrop = 0;
    let sensorCount = 0;
    let status = 'success';
    let reason = '정상 배출';
    let jam = false;
    let doubleDrop = false;
    let sensorFail = false;

    if (!filled || motorFailed) {
      status = motorFailed ? 'motor_error' : 'no_drop';
      reason = noDropReason || '미배출';
    } else {
      doubleDrop = random() < probs.doubleP;
      actualDrop = doubleDrop ? 2 : 1;
      jam = random() < probs.jamP;

      if (jam) {
        actualDrop = 0;
        status = 'jam';
        reason = '배출구 걸림';
      } else {
        const detected = random() < probs.sensorP;
        if (!detected) {
          sensorFail = true;
          sensorCount = 0;
          status = 'sensor_fail';
          reason = '실제 배출은 되었지만 센서 감지 실패';
        } else {
          if (doubleDrop) {
            const separateDropP = clamp(0.72 + cfg.sensorRange / 80 - probs.factors.debounceMergePenalty * 0.8 - probs.factors.speedStress * 0.18, 0.25, 0.96);
            sensorCount = control.doubleDetect && random() < separateDropP ? 2 : 1;
            status = 'double_drop';
            reason = control.doubleDetect ? '중복 배출 감지됨' : '중복 배출을 1회로 오인식할 위험';
          } else {
            sensorCount = 1;
            status = 'success';
            reason = '목표 1개 배출 및 센서 감지 성공';
          }
        }
      }
    }

    const correct = actualDrop === cfg.targetCount && sensorCount === cfg.targetCount && status === 'success';
    if (actualDrop === cfg.targetCount && sensorCount !== cfg.targetCount && status !== 'jam') {
      sensorFail = true;
      if (status === 'success') {
        status = 'sensor_fail';
        reason = '센서 카운트와 실제 배출 수량 불일치';
      }
    }

    const duration = probs.cycleTimeSec * attempts + Math.abs(normalNoise(random)) * 0.08;
    const indexingAngleError = probs.indexingAngleError + Math.abs(normalNoise(random)) * cfg.actuatorErrorDeg * 0.2;

    return {
      trial: trialIndex,
      status,
      reason,
      correct,
      actualDrop,
      sensorCount,
      jam,
      doubleDrop,
      sensorFail,
      motorFailed,
      attempts,
      duration,
      indexingAngleError,
      probs
    };
  }

  function aggregateResults(results, cfg) {
    const total = results.length;
    const counts = {
      success: 0,
      no_drop: 0,
      double_drop: 0,
      jam: 0,
      sensor_fail: 0,
      motor_error: 0
    };
    let sumDuration = 0;
    let sumIndexingAngle = 0;
    let sensorDetectable = 0;
    let sensorDetected = 0;

    for (const r of results) {
      if (r.correct) counts.success += 1;
      if (r.status === 'no_drop') counts.no_drop += 1;
      if (r.status === 'double_drop') counts.double_drop += 1;
      if (r.status === 'jam') counts.jam += 1;
      if (r.status === 'sensor_fail') counts.sensor_fail += 1;
      if (r.status === 'motor_error') counts.motor_error += 1;
      if (r.actualDrop > 0) {
        sensorDetectable += 1;
        if (r.sensorCount > 0) sensorDetected += 1;
      }
      sumDuration += r.duration;
      sumIndexingAngle += r.indexingAngleError;
    }

    const failure = total - counts.success;
    return {
      total,
      counts,
      successRate: total ? counts.success / total : 0,
      noDropRate: total ? counts.no_drop / total : 0,
      doubleRate: total ? counts.double_drop / total : 0,
      jamRate: total ? counts.jam / total : 0,
      sensorFailRate: total ? counts.sensor_fail / total : 0,
      motorErrorRate: total ? counts.motor_error / total : 0,
      failureRate: total ? failure / total : 0,
      avgDuration: total ? sumDuration / total : 0,
      avgIndexingAngleError: total ? sumIndexingAngle / total : 0,
      sensorSuccessRate: sensorDetectable ? sensorDetected / sensorDetectable : 0,
      topCauses: getTopFailureCauses(cfg, counts, total),
      cfg
    };
  }

  function getTopFailureCauses(cfg, counts, total) {
    const p = calcProbabilities(cfg, mulberry32((cfg.seed || 1) + 909), Math.max(1, Math.round((cfg.trialCount || 200) * 0.7)), cfg.trialCount || 200);
    const f = p.factors;
    const candidates = [
      {
        label: '슬롯 충전 조건',
        score: (counts.no_drop / Math.max(1, total)) + f.slotTooTight * 0.28 + f.lowAnglePenalty * 0.18 + f.lowStockPenalty * 0.12 + cfg.friction * 0.08,
        detail: `슬롯 여유 ${fmt(p.slotClearance, 2)}mm, 경사각 ${cfg.hopperAngle}°, 마찰 ${fmt(cfg.friction, 2)}`
      },
      {
        label: '중복 배출 조건',
        score: (counts.double_drop / Math.max(1, total)) + f.slotTooLoose * 0.24 + f.outletTooWide * 0.12 + f.guardMissing * 0.1,
        detail: `슬롯 과여유 ${fmt(f.slotTooLoose * 100, 0)}%, 배출구 과여유 ${fmt(f.outletTooWide * 100, 0)}%, 차단판 ${cfg.topGuard ? '있음' : '없음'}`
      },
      {
        label: '배출구 걸림 조건',
        score: (counts.jam / Math.max(1, total)) + f.outletTooTight * 0.3 + cfg.friction * 0.1 + f.tolerancePenalty * 0.08 + f.speedStress * 0.08,
        detail: `배출구 여유 ${fmt(p.outletClearance, 2)}mm, 모서리 보정 ${cfg.edgeChamfer}, 속도 ${cfg.motorSpeed}rpm`
      },
      {
        label: 'IR 센서 감지 조건',
        score: (counts.sensor_fail / Math.max(1, total)) + f.rangePenalty * 0.18 + f.positionPenalty * 0.16 + f.responsePenalty * 0.16 + f.debounceMergePenalty * 0.12,
        detail: `센서 위치 ${cfg.sensorPosition}mm, 범위 ${cfg.sensorRange}mm, 반응 ${cfg.sensorResponse}ms, 디바운스 ${cfg.sensorDebounce}ms`
      },
      {
        label: '구동 위치 안정성',
        score: (counts.motor_error / Math.max(1, total)) + clamp(p.indexingAngleError / 12, 0, 0.5) + f.powerWeakness * 0.14 + f.cumulativeDrift * 0.06,
        detail: `구동각 오차 ${fmt(p.indexingAngleError, 2)}°, 전원 안정성 ${cfg.powerStability}%, 반복 누적 ${fmt(f.cumulativeDrift, 2)}°`
      }
    ];
    return candidates.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  function runBatch(configOverride = null, seedOffset = 0) {
    const cfg = { ...getConfig(), ...(configOverride || {}) };
    cfg.control = parseControlCode(cfg.controlCode || '');
    if (configOverride && configOverride.control) cfg.control = configOverride.control;
    const trialCount = clamp(Math.round(cfg.trialCount || 200), 10, 5000);
    const random = mulberry32((Math.round(cfg.seed || 1) + seedOffset) >>> 0);
    const results = [];
    for (let i = 0; i < trialCount; i += 1) {
      results.push(simulateSingle(cfg, random, i + 1, trialCount));
    }
    const metrics = aggregateResults(results, cfg);
    return { cfg, results, metrics };
  }

  function runMany() {
    applyControlCode(false);
    const batch = runBatch();
    state.metrics = batch.metrics;
    state.csvRows = batch.results.map(r => ({
      trial: r.trial,
      mode: batch.cfg.designMode,
      status: r.status,
      reason: r.reason,
      actualDrop: r.actualDrop,
      sensorCount: r.sensorCount,
      durationSec: r.duration.toFixed(3),
      indexingAngleErrorDeg: r.indexingAngleError.toFixed(3),
      fillP: r.probs.fillP.toFixed(4),
      doubleP: r.probs.doubleP.toFixed(4),
      jamP: r.probs.jamP.toFixed(4),
      sensorP: r.probs.sensorP.toFixed(4),
      motorFailP: r.probs.motorFailP.toFixed(4)
    }));
    updateMetrics(batch.metrics);
    updateTopCauses(batch.metrics);
    updateDiagnosis(batch.metrics);
    drawFailureChart(batch.metrics);
    state.lastResult = batch.results[batch.results.length - 1];
    updateLastResult(state.lastResult);
    drawStatic(state.lastResult);
  }

  function runCompare() {
    const base = getConfig();
    const effectiveSize = effectivePillSize(base);
    const idealSlotSize = clamp(base.pillDiameter + base.pillDiameter * 0.28, base.pillDiameter + 1.2, base.pillDiameter + 4.5);
    const idealOutletWidth = clamp(effectiveSize + effectiveSize * 0.2, effectiveSize + 1.4, effectiveSize + 5.5);
    const idealSensorRange = clamp(base.pillDiameter * 0.8, 6, 16);
    const idealAngle = 360 / Math.max(1, base.slotCount);
    const beforeConfig = {
      ...base,
      designMode: 'before',
      slotSize: Math.max(3, Math.min(base.slotSize, idealSlotSize) - 1.0),
      outletWidth: Math.max(3, Math.min(base.outletWidth, idealOutletWidth) - 0.8),
      motorAngle: base.motorAngle,
      motorSpeed: Math.min(120, base.motorSpeed + 10),
      actuatorErrorDeg: base.actuatorErrorDeg + 0.6,
      backlashDeg: base.backlashDeg + 0.5,
      powerStability: Math.max(35, base.powerStability - 15),
      sensorPosition: base.sensorPosition + 18,
      sensorRange: Math.max(1, Math.min(base.sensorRange, idealSensorRange) - 2),
      edgeChamfer: 0,
      topGuard: 0
    };
    const afterConfig = {
      ...base,
      designMode: 'after',
      slotSize: idealSlotSize,
      outletWidth: idealOutletWidth,
      motorAngle: idealAngle,
      motorSpeed: clamp(base.motorSpeed, 8, 22),
      actuatorErrorDeg: Math.max(0.2, base.actuatorErrorDeg),
      backlashDeg: Math.max(0, base.backlashDeg),
      powerStability: Math.max(75, base.powerStability),
      sensorPosition: 72,
      sensorRange: idealSensorRange,
      sensorResponse: Math.min(base.sensorResponse, 24),
      sensorDebounce: clamp(base.sensorDebounce, 40, 120),
      edgeChamfer: Math.max(1, base.edgeChamfer),
      topGuard: 1
    };
    const before = runBatch(beforeConfig, 11);
    const after = runBatch(afterConfig, 19);
    state.compare = { before: before.metrics, after: after.metrics };
    drawCompareChart(state.compare);
    document.getElementById('summaryBadge').textContent = `개선 전 ${fmtPct(before.metrics.successRate)} → 개선 후 ${fmtPct(after.metrics.successRate)}`;
    document.getElementById('summaryBadge').className = 'badge success';
  }

  function updateMetrics(m) {
    document.getElementById('mTotal').textContent = String(m.total);
    document.getElementById('mSuccess').textContent = fmtPct(m.successRate);
    document.getElementById('mNoDrop').textContent = fmtPct(m.noDropRate);
    document.getElementById('mDouble').textContent = fmtPct(m.doubleRate);
    document.getElementById('mJam').textContent = fmtPct(m.jamRate);
    document.getElementById('mSensorFail').textContent = fmtPct(m.sensorFailRate);
    document.getElementById('mAvgTime').textContent = `${fmt(m.avgDuration, 2)}s`;
    document.getElementById('mMotorErr').textContent = `${fmt(m.avgIndexingAngleError, 2)}°`;
    const badge = document.getElementById('summaryBadge');
    badge.textContent = m.successRate >= 0.9 ? '양호' : m.successRate >= 0.75 ? '보완 필요' : '위험';
    badge.className = m.successRate >= 0.9 ? 'badge success' : 'badge';
  }

  function updateTopCauses(m) {
    const list = document.getElementById('topCauseList');
    list.innerHTML = '';
    for (const cause of m.topCauses || []) {
      const li = document.createElement('li');
      li.textContent = `${cause.label}: ${cause.detail}`;
      list.appendChild(li);
    }
  }

  function updateLastResult(r) {
    const statusMap = {
      success: '정상 배출',
      no_drop: '미배출',
      double_drop: '중복 배출',
      jam: '걸림',
      sensor_fail: '센서 실패',
      motor_error: '구동 위치 오차'
    };
    document.getElementById('lastStatus').textContent = r ? `${statusMap[r.status] || r.status} · ${r.reason}` : '대기 중';
    document.getElementById('lastDrop').textContent = r ? `${r.actualDrop}개` : '-';
    document.getElementById('lastSensor').textContent = r ? `${r.sensorCount}회` : '-';
    document.getElementById('lastMotorError').textContent = r ? `${fmt(r.indexingAngleError, 2)}°` : '-';
  }

  function updateDiagnosis(m) {
    const cfg = m.cfg;
    const rows = [];
    const p = calcProbabilities(cfg, mulberry32(cfg.seed + 777));
    const f = p.factors;
    rows.push(['슬롯 크기 적정성', `${fmt(p.slotClearance, 2)} mm`, f.slotTooTight > 0.35 ? '슬롯이 작아 미배출 또는 걸림 위험이 큼' : f.slotTooLoose > 0.35 ? '슬롯이 커서 중복 배출 위험 확인 필요' : '1개 정량 배출에 비교적 적합']);
    rows.push(['배출구 폭 적정성', `${fmt(p.outletClearance, 2)} mm`, f.outletTooTight > 0.3 ? '배출구 걸림 위험이 있으므로 폭 또는 모서리 보정 필요' : f.outletTooWide > 0.4 ? '배출구가 넓어 중복 배출 가능성을 함께 확인해야 함' : '배출구 여유는 기본 조건 충족']);
    rows.push(['저장통 경사각 적정성', `${fmt(cfg.hopperAngle, 1)}°`, f.lowAnglePenalty > 0.25 ? '경사각이 낮아 슬롯 충전 실패 가능성이 큼' : f.highAnglePenalty > 0.15 ? '경사각이 높아 알약 압착/쏠림을 확인해야 함' : '슬롯 충전에 무리 없는 범위']);
    rows.push(['IR 센서 위치 적정성', `${cfg.sensorPosition} mm / 범위 ${cfg.sensorRange} mm`, p.sensorP < 0.82 ? '센서 위치, 범위, 반응 시간, 디바운스를 보정해야 함' : '배출 확인용으로 사용 가능']);
    rows.push(['구동각/슬롯각 일치', `${fmt(p.desiredAngle, 2)}° / 설정 ${fmt(cfg.motorAngle, 2)}°`, Math.abs(cfg.motorAngle - p.desiredAngle) > 2 ? '슬롯 개수 기준 목표각과 설정각 차이 큼' : '슬롯 1칸 회전 조건에 근접']);
    rows.push(['원점 보정 센서 미사용 누적 오차', `${fmt(f.cumulativeDrift, 2)}°`, f.cumulativeDrift > 0.45 ? '반복 횟수가 많을수록 위치 누적 오차 점검 필요' : '발표용 반복 조건에서는 누적 위험이 낮은 편']);
    rows.push(['외장 구동 드라이버 미사용 안정성', `${cfg.powerStability}%`, cfg.powerStability < 70 ? '전원 안정성이 낮아 구동 위치 오차와 미배출 위험 증가' : '현재 전원 안정성 가정은 기본 조건 충족']);
    rows.push(['예상 제작 반복 감소', `${Math.max(1, Math.round(m.failureRate * 6))}회 수준 문제 사전 발견`, '실제 출력 전에 주요 실패 유형을 먼저 확인하는 근거로 사용']);

    const tbody = document.getElementById('diagnosisTable');
    tbody.innerHTML = '';
    for (const row of rows) {
      const tr = document.createElement('tr');
      row.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
  }

  function drawFailureChart(m) {
    const data = [
      ['미배출', m.counts.no_drop],
      ['중복', m.counts.double_drop],
      ['걸림', m.counts.jam],
      ['센서 실패', m.counts.sensor_fail],
      ['구동 오차', m.counts.motor_error],
      ['정상', m.counts.success]
    ];
    drawBarChart(failureCtx, failureChart.width, failureChart.height, data, '회');
  }

  function drawCompareChart(compare = state.compare) {
    if (!compare) {
      drawGroupedBarChart(compareCtx, compareChart.width, compareChart.height, defaultCompareData(null), '%', 100);
      return;
    }
    drawGroupedBarChart(compareCtx, compareChart.width, compareChart.height, defaultCompareData(compare), '%', 100);
  }

  function defaultCompareData(compare) {
    if (!compare) {
      return [
        { label: '정상', before: 0, after: 0 },
        { label: '미배출', before: 0, after: 0 },
        { label: '중복', before: 0, after: 0 },
        { label: '걸림', before: 0, after: 0 },
        { label: '센서', before: 0, after: 0 },
        { label: '구동', before: 0, after: 0 }
      ];
    }
    return [
      { label: '정상', before: compare.before.successRate * 100, after: compare.after.successRate * 100 },
      { label: '미배출', before: compare.before.noDropRate * 100, after: compare.after.noDropRate * 100 },
      { label: '중복', before: compare.before.doubleRate * 100, after: compare.after.doubleRate * 100 },
      { label: '걸림', before: compare.before.jamRate * 100, after: compare.after.jamRate * 100 },
      { label: '센서', before: compare.before.sensorFailRate * 100, after: compare.after.sensorFailRate * 100 },
      { label: '구동', before: compare.before.motorErrorRate * 100, after: compare.after.motorErrorRate * 100 }
    ];
  }

  function drawBarChart(c, w, h, data, suffix = '', forcedMax = null) {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    const margin = { left: 48, right: 24, top: 18, bottom: 46 };
    const plotW = w - margin.left - margin.right;
    const plotH = h - margin.top - margin.bottom;
    const maxValue = forcedMax || Math.max(1, ...data.map(d => d[1])) * 1.18;

    c.strokeStyle = '#d9e0ee';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(margin.left, margin.top);
    c.lineTo(margin.left, margin.top + plotH);
    c.lineTo(margin.left + plotW, margin.top + plotH);
    c.stroke();

    c.fillStyle = '#667085';
    c.font = '12px system-ui, sans-serif';
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    for (let i = 0; i <= 4; i += 1) {
      const value = maxValue * i / 4;
      const y = margin.top + plotH - (value / maxValue) * plotH;
      c.strokeStyle = '#edf1f7';
      c.beginPath();
      c.moveTo(margin.left, y);
      c.lineTo(margin.left + plotW, y);
      c.stroke();
      c.fillText(String(Math.round(value)), margin.left - 8, y);
    }

    const barGap = 14;
    const barW = Math.max(20, (plotW - barGap * (data.length + 1)) / data.length);
    data.forEach((d, i) => {
      const x = margin.left + barGap + i * (barW + barGap);
      const barH = (d[1] / maxValue) * plotH;
      const y = margin.top + plotH - barH;
      const gradient = c.createLinearGradient(0, y, 0, y + barH);
      gradient.addColorStop(0, '#2563eb');
      gradient.addColorStop(1, '#93c5fd');
      c.fillStyle = gradient;
      c.fillRect(x, y, barW, barH);
      c.fillStyle = '#1d2433';
      c.font = '700 12px system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      const labelValue = suffix === '%' ? `${d[1].toFixed(1)}%` : `${Math.round(d[1])}${suffix}`;
      c.fillText(labelValue, x + barW / 2, y - 6);
      c.fillStyle = '#667085';
      c.font = '12px system-ui, sans-serif';
      c.textBaseline = 'top';
      c.fillText(d[0], x + barW / 2, margin.top + plotH + 10);
    });
  }

  function drawGroupedBarChart(c, w, h, data, suffix = '', forcedMax = null) {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    const margin = { left: 48, right: 90, top: 18, bottom: 58 };
    const plotW = w - margin.left - margin.right;
    const plotH = h - margin.top - margin.bottom;
    const maxValue = forcedMax || Math.max(1, ...data.flatMap(d => [d.before, d.after])) * 1.18;

    c.strokeStyle = '#d9e0ee';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(margin.left, margin.top);
    c.lineTo(margin.left, margin.top + plotH);
    c.lineTo(margin.left + plotW, margin.top + plotH);
    c.stroke();

    c.fillStyle = '#667085';
    c.font = '12px system-ui, sans-serif';
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    for (let i = 0; i <= 4; i += 1) {
      const value = maxValue * i / 4;
      const y = margin.top + plotH - (value / maxValue) * plotH;
      c.strokeStyle = '#edf1f7';
      c.beginPath();
      c.moveTo(margin.left, y);
      c.lineTo(margin.left + plotW, y);
      c.stroke();
      c.fillText(String(Math.round(value)), margin.left - 8, y);
    }

    const groupGap = 13;
    const groupW = Math.max(44, (plotW - groupGap * (data.length + 1)) / data.length);
    const barW = Math.max(12, (groupW - 6) / 2);
    data.forEach((d, i) => {
      const x = margin.left + groupGap + i * (groupW + groupGap);
      const beforeH = (d.before / maxValue) * plotH;
      const afterH = (d.after / maxValue) * plotH;
      const beforeY = margin.top + plotH - beforeH;
      const afterY = margin.top + plotH - afterH;
      c.fillStyle = '#94a3b8';
      c.fillRect(x, beforeY, barW, beforeH);
      c.fillStyle = '#2563eb';
      c.fillRect(x + barW + 6, afterY, barW, afterH);
      c.fillStyle = '#1d2433';
      c.font = '700 10px system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.fillText(`${Math.round(d.before)}${suffix}`, x + barW / 2, beforeY - 4);
      c.fillText(`${Math.round(d.after)}${suffix}`, x + barW + 6 + barW / 2, afterY - 4);
      c.fillStyle = '#667085';
      c.font = '12px system-ui, sans-serif';
      c.textBaseline = 'top';
      c.fillText(d.label, x + groupW / 2, margin.top + plotH + 10);
    });

    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillStyle = '#94a3b8';
    c.fillRect(w - 78, 26, 12, 12);
    c.fillStyle = '#334155';
    c.font = '12px system-ui, sans-serif';
    c.fillText('개선 전', w - 60, 32);
    c.fillStyle = '#2563eb';
    c.fillRect(w - 78, 48, 12, 12);
    c.fillStyle = '#334155';
    c.fillText('개선 후', w - 60, 54);
  }

  function drawStatic(result = state.lastResult) {
    const cfg = getConfig();
    updateModeBadge();
    drawScene({ cfg, result, progress: 1, animDropY: null });
  }

  function drawScene({ cfg, result, progress, animDropY }) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // background
    ctx.fillStyle = '#fbfdff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#eef4ff';
    roundRect(ctx, 24, 24, 572, 504, 18, true, false);
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 620, 24, 256, 504, 18, true, false);

    drawHopper(cfg);
    drawWheel(cfg, progress);
    drawOutletAndSensor(cfg, result, progress, animDropY);
    drawInfoPanel(cfg, result);
  }

  function drawHopper(cfg) {
    ctx.save();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(76, 74);
    ctx.lineTo(390, 74);
    ctx.lineTo(332, 196);
    ctx.lineTo(138, 196);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1d2433';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText('알약 저장통', 92, 60);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#667085';
    ctx.fillText(`저장량 ${cfg.pillCount}개 · 경사각 ${cfg.hopperAngle}° · 마찰 ${cfg.friction}`, 92, 214);

    const count = Math.min(28, Math.max(6, cfg.pillCount));
    const random = mulberry32(1234 + Math.round(cfg.pillCount));
    for (let i = 0; i < count; i += 1) {
      const x = 110 + random() * 250;
      const y = 90 + random() * 82;
      drawPillIcon(ctx, x, y, cfg.pillShape, 7 + random() * 3, i % 2 ? '#fef3c7' : '#dbeafe', '#2563eb');
    }
    ctx.restore();
  }

  function drawWheel(cfg, progress) {
    const cx = 248;
    const cy = 315;
    const r = 104;
    const slots = Math.max(2, Math.round(cfg.slotCount));
    const desired = 360 / slots;
    const angle = (state.wheelAngle + desired * progress) * Math.PI / 180;

    ctx.save();
    ctx.fillStyle = '#dbeafe';
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#bfdbfe';
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.stroke();

    for (let i = 0; i < slots; i += 1) {
      const a = angle + i * Math.PI * 2 / slots;
      const sx = cx + Math.cos(a) * 72;
      const sy = cy + Math.sin(a) * 72;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 2;
      roundRect(ctx, -17, -12, 34, 24, 10, true, true);
      if (i === 0 && progress < 0.7) {
        drawPillIcon(ctx, 0, 0, cfg.pillShape, 8, '#fef3c7', '#d97706');
      }
      ctx.restore();
    }

    ctx.fillStyle = '#1d2433';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText('회전 슬롯 휠', 74, 292);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#667085';
    ctx.fillText(`슬롯 ${slots}개 · 설정각 ${cfg.motorAngle}° · 목표각 ${(360 / slots).toFixed(1)}°`, 74, 480);
    ctx.restore();
  }

  function drawOutletAndSensor(cfg, result, progress, animDropY) {
    const outletX = 248;
    const outletY = 425;
    const sensorY = 430 + cfg.sensorPosition * 0.58;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    roundRect(ctx, outletX - 46, outletY, 92, 50, 10, true, true);
    ctx.fillStyle = '#1d2433';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText('배출구', outletX - 28, outletY - 10);

    // drop guide
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(outletX, outletY + 50);
    ctx.lineTo(outletX, 535);
    ctx.stroke();
    ctx.setLineDash([]);

    // sensor beam
    const beamActive = result && (result.status === 'success' || result.status === 'double_drop');
    ctx.strokeStyle = beamActive ? '#16a34a' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(outletX - 74, sensorY);
    ctx.lineTo(outletX + 74, sensorY);
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#475569';
    roundRect(ctx, outletX - 98, sensorY - 12, 22, 24, 6, true, true);
    roundRect(ctx, outletX + 76, sensorY - 12, 22, 24, 6, true, true);
    ctx.fillStyle = '#1d2433';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillText('IR Break Beam 센서', outletX - 70, sensorY + 32);

    if (result) {
      if (result.status === 'jam') {
        drawPillIcon(ctx, outletX, outletY + 24, cfg.pillShape, 12, '#fee2e2', '#dc2626');
        drawTag('JAM', outletX + 54, outletY + 24, '#dc2626');
      } else if (result.status === 'no_drop' || result.status === 'motor_error') {
        drawTag(result.status === 'motor_error' ? 'ANGLE ERROR' : 'NO DROP', outletX + 54, outletY + 24, '#d97706');
      } else if (progress > 0.55 || animDropY !== null) {
        const y = animDropY ?? clamp(outletY + 58 + (progress - 0.55) * 280, outletY + 58, 532);
        const count = result.actualDrop || 1;
        for (let i = 0; i < count; i += 1) {
          drawPillIcon(ctx, outletX + (i - (count - 1) / 2) * 24, y - i * 8, cfg.pillShape, 11, result.status === 'sensor_fail' ? '#fee2e2' : '#dcfce7', result.status === 'sensor_fail' ? '#dc2626' : '#16a34a');
        }
      }
    }
    ctx.restore();
  }

  function drawInfoPanel(cfg, result) {
    const x = 646;
    let y = 58;
    ctx.save();
    ctx.fillStyle = '#1d2433';
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText('입력 기반 판정', x, y);
    y += 26;
    const probs = calcProbabilities(cfg, mulberry32(cfg.seed + 555));
    const lines = [
      `프로젝트: ${cfg.projectName.slice(0, 22)}`,
      `알약: ${shapeLabel(cfg.pillShape)} / ${cfg.pillDiameter}×${cfg.pillLength}mm`,
      `슬롯: ${cfg.slotSize}mm / ${cfg.slotCount}칸`,
      `배출구: ${cfg.outletWidth}mm`,
      `구동부: ${driveModeLabel(cfg.driveMode)} / ${cfg.motorSpeed}rpm`,
      `구동각: ${cfg.motorAngle}° / 유격 ${cfg.backlashDeg}°`,
      `센서: 범위 ${cfg.sensorRange}mm / 반응 ${cfg.sensorResponse}ms`,
      `충전확률: ${fmtPct(probs.fillP)}`,
      `중복확률: ${fmtPct(probs.doubleP)}`,
      `걸림확률: ${fmtPct(probs.jamP)}`,
      `센서감지확률: ${fmtPct(probs.sensorP)}`
    ];
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#334155';
    for (const line of lines) {
      ctx.fillText(line, x, y);
      y += 24;
    }
    y += 8;
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#d9e0ee';
    roundRect(ctx, x - 8, y, 220, 104, 14, true, true);
    ctx.fillStyle = result ? statusColor(result.status) : '#667085';
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.fillText(result ? statusLabel(result.status) : '대기 중', x, y + 28);
    ctx.fillStyle = '#334155';
    ctx.font = '13px system-ui, sans-serif';
    wrapText(ctx, result ? result.reason : '입력값을 조정한 뒤 시뮬레이션을 실행하세요.', x, y + 52, 200, 20);
    ctx.restore();
  }

  function drawPillIcon(c, x, y, shape, size, fill, stroke) {
    c.save();
    c.translate(x, y);
    c.fillStyle = fill;
    c.strokeStyle = stroke;
    c.lineWidth = 1.5;
    if (shape === 'capsule') {
      c.rotate(-0.35);
      roundRect(c, -size * 1.35, -size * 0.58, size * 2.7, size * 1.16, size * 0.58, true, true);
      c.beginPath();
      c.moveTo(0, -size * 0.58);
      c.lineTo(0, size * 0.58);
      c.stroke();
    } else if (shape === 'oval') {
      c.scale(1.45, 0.85);
      c.beginPath();
      c.arc(0, 0, size, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    } else {
      c.beginPath();
      c.arc(0, 0, size, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.restore();
  }

  function drawTag(text, x, y, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText(text, x, y + 4);
    ctx.restore();
  }

  function roundRect(c, x, y, width, height, radius, fill, stroke) {
    const r = Math.min(radius, width / 2, height / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + width, y, x + width, y + height, r);
    c.arcTo(x + width, y + height, x, y + height, r);
    c.arcTo(x, y + height, x, y, r);
    c.arcTo(x, y, x + width, y, r);
    c.closePath();
    if (fill) c.fill();
    if (stroke) c.stroke();
  }

  function wrapText(c, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(' ');
    let line = '';
    for (const word of words) {
      const test = line + word + ' ';
      if (c.measureText(test).width > maxWidth && line) {
        c.fillText(line, x, y);
        line = word + ' ';
        y += lineHeight;
      } else {
        line = test;
      }
    }
    c.fillText(line, x, y);
  }

  function statusLabel(status) {
    return {
      success: '정상 배출',
      no_drop: '미배출',
      double_drop: '중복 배출',
      jam: '알약 걸림',
      sensor_fail: '센서 감지 실패',
      motor_error: '구동 위치 오차'
    }[status] || status;
  }

  function statusColor(status) {
    return {
      success: '#16a34a',
      no_drop: '#d97706',
      double_drop: '#7c3aed',
      jam: '#dc2626',
      sensor_fail: '#ef4444',
      motor_error: '#d97706'
    }[status] || '#667085';
  }

  function shapeLabel(shape) {
    return { round: '원형', oval: '타원형', capsule: '캡슐형' }[shape] || shape;
  }

  function driveModeLabel(mode) {
    return { servo: '서보형', rotary: '회전 모듈', manual: '수동 가상' }[mode] || mode;
  }

  function animateOne() {
    if (state.animating) return;
    applyControlCode(false);
    const cfg = getConfig();
    const random = mulberry32((cfg.seed + Date.now()) >>> 0);
    const result = simulateSingle(cfg, random, 1);
    state.lastResult = result;
    updateLastResult(result);
    state.animating = true;
    const start = performance.now();
    const duration = 1200;
    const startAngle = state.wheelAngle;
    const desired = 360 / Math.max(2, cfg.slotCount);

    function frame(now) {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const dropY = t > 0.55 ? 475 + (t - 0.55) * 240 : null;
      drawScene({ cfg, result, progress: eased, animDropY: dropY });
      if (t < 1) requestAnimationFrame(frame);
      else {
        state.wheelAngle = startAngle + desired;
        state.animating = false;
        drawStatic(result);
      }
    }
    requestAnimationFrame(frame);
  }

  function updateModeBadge() {
    const cfg = getConfig();
    const badge = document.getElementById('modeBadge');
    badge.textContent = cfg.designMode === 'after' ? '개선 후' : '개선 전';
    badge.className = cfg.designMode === 'after' ? 'badge success' : 'badge';
  }

  function toCsv(rows) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escapeCell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [headers.join(','), ...rows.map(row => headers.map(h => escapeCell(row[h])).join(','))].join('\n');
  }

  function downloadFile(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadCsv() {
    if (!state.csvRows.length) runMany();
    downloadFile('pill_dispenser_sim_results.csv', 'text/csv;charset=utf-8', toCsv(state.csvRows));
  }

  function downloadPng() {
    const link = document.createElement('a');
    link.download = 'pill_dispenser_sim_scene.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function saveJson() {
    const cfg = getConfig();
    downloadFile('pill_dispenser_config.json', 'application/json;charset=utf-8', JSON.stringify(cfg, null, 2));
  }

  async function copyJson() {
    const json = JSON.stringify(getConfig(), null, 2);
    document.getElementById('jsonInput').value = json;
    try {
      await navigator.clipboard.writeText(json);
    } catch (_) {
      // clipboard may be blocked when opened as file://
    }
  }

  function applyJson() {
    const text = document.getElementById('jsonInput').value.trim();
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      setConfig(parsed);
      alert('JSON 설정을 적용했습니다.');
    } catch (err) {
      alert(`JSON 형식 오류: ${err.message}`);
    }
  }

  function loadExample() {
    setConfig({
      projectName: '취약계층용 스마트 캡슐 알약 디스펜서',
      requirements: 'Raspberry Pi 5, 9인치 HDMI 터치스크린, 서보형 회전 구동부, IR Break Beam 센서, 회전 슬롯 휠, 알약 저장통, 배출구, 상부 차단판, 3D 프린팅 구조물, 알약 회수 트레이, 부저 또는 LED 알림',
      pillShape: 'capsule',
      pillCount: 24,
      pillDiameter: 8.5,
      pillLength: 17.0,
      pillWeight: 0.7,
      hopperAngle: 32,
      friction: 0.34,
      tolerance: 0.25,
      slotSize: 10.5,
      slotCount: 8,
      wheelRadius: 55,
      outletWidth: 12,
      edgeChamfer: 1,
      topGuard: 1,
      driveMode: 'servo',
      motorSpeed: 18,
      motorAngle: 45,
      actuatorErrorDeg: 1.2,
      backlashDeg: 0.8,
      powerStability: 85,
      sensorPosition: 72,
      sensorRange: 8,
      sensorResponse: 20,
      sensorDebounce: 60,
      targetCount: 1,
      trialCount: 200,
      seed: 20260512,
      designMode: 'after',
      controlCode: 'retry=1\nmotorRamp=0.75\ndoubleDetect=true\nsensorCheck=true\nalarmOnFail=true\njamRecovery=false'
    });
    runMany();
    runCompare();
  }

  function resetDefaults() {
    if (!confirm('입력값을 기본값으로 초기화할까요?')) return;
    loadExample();
  }

  function bindEvents() {
    document.getElementById('runOneBtn').addEventListener('click', animateOne);
    document.getElementById('runManyBtn').addEventListener('click', runMany);
    document.getElementById('compareBtn').addEventListener('click', runCompare);
    document.getElementById('downloadCsvBtn').addEventListener('click', downloadCsv);
    document.getElementById('downloadPngBtn').addEventListener('click', downloadPng);
    document.getElementById('saveJsonBtn').addEventListener('click', saveJson);
    document.getElementById('copyJsonBtn').addEventListener('click', copyJson);
    document.getElementById('applyJsonBtn').addEventListener('click', applyJson);
    document.getElementById('loadExampleBtn').addEventListener('click', loadExample);
    document.getElementById('resetBtn').addEventListener('click', resetDefaults);
    document.getElementById('applyCodeBtn').addEventListener('click', () => applyControlCode(true));
    for (const id of fieldIds) {
      const el = els[id];
      if (!el) continue;
      el.addEventListener('change', () => {
        updateModeBadge();
        drawStatic();
      });
      if (id !== 'controlCode' && id !== 'requirements') {
        el.addEventListener('input', () => drawStatic());
      }
    }
  }

  function init() {
    bindEvents();
    applyControlCode(false);
    updateModeBadge();
    drawStatic();
    drawFailureChart({ counts: { no_drop: 0, motor_error: 0, double_drop: 0, jam: 0, sensor_fail: 0, success: 0 } });
    drawCompareChart(null);
  }

  init();
})();
