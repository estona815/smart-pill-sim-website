(() => {
  'use strict';

  const storageKey = 'smart-pill-dashboard-admin-records';
  const fields = ['memberName', 'memberRole', 'itemName', 'itemStatus', 'targetValue', 'measuredValue', 'adminNote'];
  const els = Object.fromEntries(fields.map(id => [id, document.getElementById(id)]));
  const recordsEl = document.getElementById('adminRecords');
  const countBadge = document.getElementById('recordCountBadge');

  function readRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeRecords(records) {
    localStorage.setItem(storageKey, JSON.stringify(records, null, 2));
  }

  function readForm() {
    return {
      id: `record-${Date.now()}`,
      createdAt: new Date().toISOString(),
      memberName: els.memberName.value.trim() || '미지정',
      memberRole: els.memberRole.value,
      itemName: els.itemName.value.trim() || '미지정 항목',
      itemStatus: els.itemStatus.value,
      targetValue: els.targetValue.value.trim(),
      measuredValue: els.measuredValue.value.trim(),
      adminNote: els.adminNote.value.trim()
    };
  }

  function roleLabel(value) {
    return {
      mechanism: '기구/3D 출력',
      power: '전원/배선',
      sensor: '센서/검출',
      ui: '터치 UI/웹',
      report: '보고서/발표'
    }[value] || value;
  }

  function statusLabel(value) {
    return {
      todo: '확인 필요',
      working: '진행 중',
      review: '검토 요청',
      blocked: '막힘'
    }[value] || value;
  }

  function renderRecords() {
    const records = readRecords();
    countBadge.textContent = `${records.length}건`;
    recordsEl.innerHTML = '';
    if (!records.length) {
      recordsEl.innerHTML = '<p class="hint">아직 저장된 팀원 기록이 없습니다.</p>';
      return;
    }
    for (const record of records) {
      const item = document.createElement('article');
      item.className = 'record-item';
      item.innerHTML = `
        <div class="row-between">
          <strong>${record.itemName}</strong>
          <span class="status-pill status-medium">${statusLabel(record.itemStatus)}</span>
        </div>
        <p>${record.memberName} · ${roleLabel(record.memberRole)} · ${new Date(record.createdAt).toLocaleString('ko-KR')}</p>
        <p>목표값: ${record.targetValue || '-'} / 측정값: ${record.measuredValue || '-'}</p>
        <p>${record.adminNote || '메모 없음'}</p>
      `;
      recordsEl.appendChild(item);
    }
  }

  function addRecord() {
    const records = readRecords();
    records.unshift(readForm());
    writeRecords(records);
    renderRecords();
  }

  function clearForm() {
    for (const id of fields) {
      if (els[id].tagName === 'SELECT') els[id].selectedIndex = 0;
      else els[id].value = '';
    }
  }

  function loadExample() {
    els.memberName.value = '팀원 A';
    els.memberRole.value = 'mechanism';
    els.itemName.value = '슬롯 크기';
    els.itemStatus.value = 'review';
    els.targetValue.value = '10.5mm';
    els.measuredValue.value = '10.2mm';
    els.adminNote.value = '캡슐형 알약 기준 슬롯 여유가 부족한지 반복 배출 테스트 전 확인 필요.';
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

  document.getElementById('addRecordBtn').addEventListener('click', addRecord);
  document.getElementById('clearFormBtn').addEventListener('click', clearForm);
  document.getElementById('loadAdminExampleBtn').addEventListener('click', loadExample);
  document.getElementById('saveAdminBtn').addEventListener('click', addRecord);
  document.getElementById('exportAdminBtn').addEventListener('click', () => {
    downloadFile('team-admin-records.json', 'application/json;charset=utf-8', JSON.stringify(readRecords(), null, 2));
  });
  document.getElementById('clearRecordsBtn').addEventListener('click', () => {
    if (!confirm('브라우저에 저장된 팀원 기록을 모두 삭제할까요?')) return;
    writeRecords([]);
    renderRecords();
  });

  renderRecords();
})();
