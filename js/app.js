/* ================================================================
   app.js — Application logic for 智慧工务巡检作业管理系统 demo
   ================================================================ */

'use strict';

/* ── Clock ── */
function updateClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const el = document.getElementById('header-clock');
  if (el) el.textContent = `${dateStr} ${timeStr}`;
}
setInterval(updateClock, 1000);
updateClock();

/* ── Unit tab switching ── */
function switchUnit(unit) {
  currentUnit = parseInt(unit);
  document.querySelectorAll('.unit-tab').forEach(t => {
    t.classList.toggle('active', parseInt(t.dataset.unit) === currentUnit);
  });
  updateParamPanel();
}

/* ── Process sub-nav switching ── */
function switchProcess(proc) {
  currentProcess = proc;
  document.querySelectorAll('.subnav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.process === proc);
  });
  document.querySelectorAll('.process-view').forEach(v => {
    v.classList.toggle('active', v.dataset.process === proc);
  });
}

/* ── Param panel update ── */
function updateParamPanel() {
  const v = ProcessValues.get(currentUnit);
  setVal('pp-setpoint',    v.param1Target.toFixed(1));
  setVal('pp-instant',     v.param2Target.toFixed(2));
  setVal('pp-target',      v.param1Target.toFixed(2));
  setVal('pp-predict',     v.param1Pred.toFixed(2));
  setVal('pp-limitA',      v.limitA.toFixed(2));
  setVal('pp-limitB',      v.limitB.toFixed(2));
  setVal('pp-total',       v.total.toFixed(2));
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── Process flow realtime animation ── */
let pvInterval = null;
function startProcessAnimation() {
  if (pvInterval) clearInterval(pvInterval);
  pvInterval = setInterval(() => {
    const v = ProcessValues.get(currentUnit);
    // Update readout boxes
    for (let i = 0; i < 4; i++) {
      setVal(`freq-out-${i+1}`, v.freq[i].toFixed(2) + 'hz');
      setVal(`freq-act-${i+1}`, (v.freq[i] * 0.70).toFixed(2) + 'hz');
    }
    setVal('flow-val-1', v.flow1.toFixed(2));
    setVal('flow-val-2', v.flow2.toFixed(2));
    setVal('pres-val-1', v.pres1.toFixed(2));
    setVal('pres-val-2', v.pres2.toFixed(2));
    // process B
    for (let i = 0; i < 4; i++) {
      setVal(`b-freq-out-${i+1}`, (v.freq[i] * 0.9).toFixed(2) + 'hz');
      setVal(`b-freq-act-${i+1}`, (v.freq[i] * 0.70).toFixed(2) + 'hz');
    }
    setVal('b-flow-val-1', v.flow1.toFixed(2));
    setVal('b-pres-val-1', (v.pres2).toFixed(2));
    setVal('b-pres-val-2', v.pres2.toFixed(2));
    updateParamPanel();
  }, 2500);
}

/* ── Modal system ── */
function openModal(id) {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('active');
    onModalOpen(id);
  }
}
function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

function onModalOpen(id) {
  setTimeout(() => {
    if (id === 'modal-data') {
      // Switch to model analysis tab by default
      switchModalTab('data', 'model-analysis');
    } else if (id === 'modal-model') {
      renderModelChart();
      renderModelTable();
    } else if (id === 'modal-alarm') {
      renderAlarmTable(1);
    } else if (id === 'modal-log') {
      renderLogTable(1);
    }
    resizeAll();
  }, 80);
}

/* ── Modal tab switching ── */
function switchModalTab(modal, tabId) {
  document.querySelectorAll(`[data-modal="${modal}"].modal-tab`).forEach(t => {
    t.classList.toggle('active', t.dataset.tabId === tabId);
  });
  document.querySelectorAll(`[data-modal="${modal}"].tab-panel`).forEach(p => {
    p.classList.toggle('active', p.dataset.panelId === tabId);
  });

  setTimeout(() => {
    resizeAll();
    if (tabId === 'model-analysis') {
      renderModelAnalysisCharts(currentUnit);
    } else if (tabId === 'benchmark') {
      const sel = document.getElementById('benchmark-param');
      renderBenchmarkChart(sel ? sel.value : null);
    }
  }, 60);
}

/* ── Query buttons ── */
function doQuery(chartType) {
  const overlay = document.getElementById(`loading-${chartType}`);
  if (overlay) { overlay.classList.add('active'); overlay.style.display = 'flex'; }
  setTimeout(() => {
    if (overlay) { overlay.classList.remove('active'); overlay.style.display = 'none'; }
    if (chartType === 'model') {
      const unitSel = document.getElementById('da-unit');
      renderModelAnalysisCharts(unitSel ? (parseInt(unitSel.value) || currentUnit) : currentUnit);
    } else if (chartType === 'benchmark') {
      const sel = document.getElementById('benchmark-param');
      renderBenchmarkChart(sel ? sel.value : null);
    } else if (chartType === 'alarm') {
      renderAlarmTable(1);
    } else if (chartType === 'log') {
      renderLogTable(1);
    }
  }, 550);
}

/* ── Alarm Table ── */
let alarmPage = 1;
const ALARM_PAGE_SIZE = 8;

function renderAlarmTable(page) {
  alarmPage = page;
  const tbody = document.getElementById('alarm-tbody');
  if (!tbody) return;
  const total = ALARM_DATA.length;
  const start = (page - 1) * ALARM_PAGE_SIZE;
  const rows  = ALARM_DATA.slice(start, start + ALARM_PAGE_SIZE);
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td><span class="tag-${typeClass(r.type)}">${r.type}</span></td>
      <td>${r.time}</td>
      <td style="font-size:11px;">${r.point}</td>
      <td style="font-size:11px;">${r.desc}</td>
      <td>${r.recovery || '<span style="color:var(--alarm)">未恢复</span>'}</td>
    </tr>
  `).join('');
  renderPagination('alarm-pg', total, ALARM_PAGE_SIZE, page, p => renderAlarmTable(p));
}

function typeClass(t) {
  if (t === '超限' || t === '通信故障') return 'alarm';
  if (t === '离线') return 'offline';
  return 'normal';
}

/* ── Log Table ── */
let logPage = 1;
const LOG_PAGE_SIZE = 14;

function renderLogTable(page) {
  logPage = page;
  const tbody = document.getElementById('log-tbody');
  if (!tbody) return;
  const total = LOG_DATA.length;
  const start = (page - 1) * LOG_PAGE_SIZE;
  const rows  = LOG_DATA.slice(start, start + LOG_PAGE_SIZE);
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${r.name}</td>
      <td>${r.start}</td>
      <td>${r.end || ''}</td>
      <td>${r.dur}</td>
    </tr>
  `).join('');
  renderPagination('log-pg', total, LOG_PAGE_SIZE, page, p => renderLogTable(p));
}

/* ── Model Table ── */
function renderModelTable() {
  const tbody = document.getElementById('model-tbody');
  if (!tbody) return;
  tbody.innerHTML = MODEL_VERSIONS.map(m => `
    <tr>
      <td style="color:var(--cyan)">${m.ver}</td>
      <td>${m.date}</td>
      <td style="color:var(--safe)">${m.rmse}</td>
      <td style="color:var(--blue-bright)">${m.mae}</td>
      <td>${m.status === 'running'
        ? '<span class="badge-running"><span class="status-dot" style="width:5px;height:5px;margin-right:3px;display:inline-block;"></span>运行中</span>'
        : '<span class="badge-stopped">已停用</span>'
      }</td>
    </tr>
  `).join('');
}

/* ── Pagination helper ── */
function renderPagination(containerId, total, pageSize, currentPage, onPage) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const totalPages = Math.ceil(total / pageSize);
  let html = `<span>共${total}条</span>`;
  html += `<button class="pg-btn" onclick="(${onPage.toString()})(${Math.max(1, currentPage-1)})">&#8249;</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="pg-btn${i === currentPage ? ' active' : ''}" onclick="(${onPage.toString()})(${i})">${i}</button>`;
  }
  html += `<button class="pg-btn" onclick="(${onPage.toString()})(${Math.min(totalPages, currentPage+1)})">&#8250;</button>`;
  html += `<span>前往</span><input class="pg-jump" type="number" min="1" max="${totalPages}" value="${currentPage}" onchange="(${onPage.toString()})(Math.min(${totalPages},Math.max(1,parseInt(this.value)||1)))"><span>页</span>`;
  container.innerHTML = html;
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function () {
  // Default states
  switchUnit(3);
  switchProcess('A');
  startProcessAnimation();

  // Escape key closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });

  // Click outside modal window closes it
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => {
      if (e.target === m) closeAllModals();
    });
  });
});
