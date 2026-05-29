'use strict';

function toNumber(value) {
  const parsed = Number(String(value).replace(/[^\d.+-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function classifyError(errorRate) {
  if (!Number.isFinite(errorRate)) return 'invalid';
  if (errorRate <= 2) return 'excellent';
  if (errorRate <= 5) return 'review';
  if (errorRate <= 10) return 'risk';
  return 'critical';
}

function labelForGrade(grade) {
  return {
    excellent: '양호',
    review: '검토',
    risk: '위험',
    critical: '즉시 수정',
    invalid: '입력 오류'
  }[grade] || grade;
}

function calculateMeasurementError(targetValue, measuredValue, toleranceRate = 5) {
  const target = toNumber(targetValue);
  const measured = toNumber(measuredValue);
  if (!target || measured === null) {
    return {
      ok: false,
      target,
      measured,
      delta: null,
      errorRate: null,
      grade: 'invalid',
      label: labelForGrade('invalid'),
      message: '목표값과 측정값을 숫자로 입력해야 합니다.'
    };
  }
  const delta = measured - target;
  const errorRate = Math.abs(delta / target) * 100;
  const grade = errorRate <= toleranceRate ? classifyError(errorRate) : 'critical';
  return {
    ok: errorRate <= toleranceRate,
    target,
    measured,
    delta,
    errorRate,
    grade,
    label: labelForGrade(grade),
    message: `목표 ${target}, 측정 ${measured}, 오차 ${delta.toFixed(3)}, 오차율 ${errorRate.toFixed(2)}%`
  };
}

function calculateBatchErrors(rows, toleranceRate = 5) {
  return rows.map(row => ({
    ...row,
    result: calculateMeasurementError(row.targetValue, row.measuredValue, row.toleranceRate ?? toleranceRate)
  }));
}

if (typeof module !== 'undefined') {
  module.exports = {
    calculateMeasurementError,
    calculateBatchErrors,
    classifyError,
    labelForGrade
  };
}
