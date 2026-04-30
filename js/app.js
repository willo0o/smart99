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

/* ── Theme toggle ── */
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  if (next === 'dark') {
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', next);
  }
  localStorage.setItem('theme', next);
  const openModal = document.querySelector('.modal-overlay.active');
  if (openModal) onModalOpen(openModal.id);
}

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

/* ── Setpoint confirm button ── */
function confirmSetpoint() {
  const input = document.getElementById('param-setpoint-input');
  const btn   = document.getElementById('btn-confirm-setpoint');
  if (!input || !btn) return;

  let val = parseFloat(input.value);
  if (isNaN(val) || val < 0) val = 0;
  if (val > 200) val = 200;
  input.value = val.toFixed(1);

  UNIT_BASE[currentUnit].param1 = val;
  setVal('pp-setpoint', val.toFixed(1));

  const orig = btn.textContent;
  btn.textContent = '✓';
  btn.style.color = 'var(--safe)';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = orig;
    btn.style.color = '';
    btn.disabled = false;
  }, 1200);
}

/* ── Process flow realtime animation ── */
let pvInterval = null;
function startProcessAnimation() {
  if (pvInterval) clearInterval(pvInterval);
  pvInterval = setInterval(() => {
    const v = ProcessValues.get(currentUnit);
    for (let i = 0; i < 4; i++) {
      setVal(`freq-out-${i+1}`, v.freq[i].toFixed(2) + 'hz');
      setVal(`freq-act-${i+1}`, (v.freq[i] * 0.70).toFixed(2) + 'hz');
    }
    setVal('flow-val-1', v.flow1.toFixed(2));
    setVal('flow-val-2', v.flow2.toFixed(2));
    setVal('pres-val-1', v.pres1.toFixed(2));
    setVal('pres-val-2', v.pres2.toFixed(2));
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
      switchModalTab('data', 'model-analysis');
    } else if (id === 'modal-model') {
      renderModelChart();
      renderModelTable();
    } else if (id === 'modal-alarm') {
      renderAlarmTable(1);
    } else if (id === 'modal-log') {
      renderLogTable(1);
    } else if (id === 'modal-config') {
      initConfigModal();
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

/* ── Alarm Table (with filtering) ── */
let alarmPage = 1;
const ALARM_PAGE_SIZE = 8;

function renderAlarmTable(page) {
  alarmPage = page;
  const tbody = document.getElementById('alarm-tbody');
  if (!tbody) return;

  const fUnit    = (document.getElementById('al-unit')    || {}).value || '';
  const fProcess = (document.getElementById('al-process') || {}).value || '';
  const fPoint   = (document.getElementById('al-point')   || {}).value || '';
  const fType    = (document.getElementById('al-type')    || {}).value || '';

  const filtered = ALARM_DATA.filter(r =>
    (!fUnit    || r.unit    === fUnit)    &&
    (!fProcess || r.process === fProcess) &&
    (!fPoint   || r.point   === fPoint)   &&
    (!fType    || r.type    === fType)
  );

  const total = filtered.length;
  const start = (page - 1) * ALARM_PAGE_SIZE;
  const rows  = filtered.slice(start, start + ALARM_PAGE_SIZE);

  tbody.innerHTML = rows.length > 0 ? rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td><span class="tag-${typeClass(r.type)}">${r.type}</span></td>
      <td>${r.time}</td>
      <td style="font-size:11px;">${r.point}</td>
      <td style="font-size:11px;">${r.desc}</td>
      <td>${r.recovery || '<span style="color:var(--alarm)">未恢复</span>'}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">暂无数据</td></tr>';

  renderPagination('alarm-pg', total, ALARM_PAGE_SIZE, page, p => renderAlarmTable(p));
}

function typeClass(t) {
  if (t === '超限' || t === '通信故障') return 'alarm';
  if (t === '离线') return 'offline';
  return 'normal';
}

/* ── Log Table (with filtering) ── */
let logPage = 1;
const LOG_PAGE_SIZE = 14;

function renderLogTable(page) {
  logPage = page;
  const tbody = document.getElementById('log-tbody');
  if (!tbody) return;

  const fUnit    = (document.getElementById('lg-unit')    || {}).value || '';
  const fProcess = (document.getElementById('lg-process') || {}).value || '';
  const fPoint   = (document.getElementById('lg-point')   || {}).value || '';

  const filtered = LOG_DATA.filter(r =>
    (!fUnit    || r.unit    === fUnit)    &&
    (!fProcess || r.process === fProcess) &&
    (!fPoint   || r.name    === fPoint)
  );

  const total = filtered.length;
  const start = (page - 1) * LOG_PAGE_SIZE;
  const rows  = filtered.slice(start, start + LOG_PAGE_SIZE);

  tbody.innerHTML = rows.length > 0 ? rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${r.name}</td>
      <td>${r.start}</td>
      <td>${r.end || ''}</td>
      <td>${r.dur}</td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">暂无数据</td></tr>';

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

/* ================================================================
   CONFIG MODAL
   ================================================================ */

let currentConfigId = null;

function switchCfgTab(btn, panelId) {
  document.querySelectorAll('.config-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cfg-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add('active');
}

function initConfigModal() {
  renderConfigSidebar();
  const filter = (document.getElementById('cfg-filter-unit') || {}).value || '';
  const first = PROCESS_CONFIGS.find(p => !filter || p.unit === filter);
  if (first) selectConfigProcess(first.id);
}

function renderConfigSidebar() {
  const list = document.getElementById('config-process-list');
  if (!list) return;
  const filter = (document.getElementById('cfg-filter-unit') || {}).value || '';
  const items  = PROCESS_CONFIGS.filter(p => !filter || p.unit === filter);

  list.innerHTML = items.map(p => `
    <div class="config-process-item${p.id === currentConfigId ? ' active' : ''}"
         onclick="selectConfigProcess('${p.id}')">
      <div style="flex:1;min-width:0;">
        <div class="config-process-item-name">${p.name}</div>
        <div class="config-process-item-meta">${p.unit}#机组 &middot; ${p.basic.type}</div>
      </div>
      <span class="config-status-dot ${p.status}"></span>
    </div>
  `).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px;">暂无流程</div>';
}

function selectConfigProcess(id) {
  currentConfigId = id;
  renderConfigSidebar();
  loadConfigForm(id);
}

function loadConfigForm(id) {
  const proc = PROCESS_CONFIGS.find(p => p.id === id);
  if (!proc) return;

  setInputVal('cfg-code',        proc.basic.code);
  setInputVal('cfg-name',        proc.name);
  setInputVal('cfg-unit',        proc.unit);
  setInputVal('cfg-type',        proc.basic.type);
  setInputVal('cfg-responsible', proc.basic.responsible);
  setInputVal('cfg-contact',     proc.basic.contact);
  setInputVal('cfg-location',    proc.basic.location);
  setInputVal('cfg-startDate',   proc.basic.startDate);
  setInputVal('cfg-remark',      proc.basic.remark);

  renderThresholdTable(proc);
  renderInspectPointsTable(proc);
  renderDevicesTable(proc);
}

function setInputVal(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = val !== undefined ? val : '';
}

function getInputVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function renderThresholdTable(proc) {
  const tbody = document.getElementById('cfg-threshold-tbody');
  if (!tbody) return;
  tbody.innerHTML = (proc.thresholds || []).map((t, i) => `
    <tr>
      <td><input class="cfg-cell-input" value="${t.param}" data-field="param" data-idx="${i}"></td>
      <td><input class="cfg-cell-input" style="width:55px;" value="${t.unit}" data-field="unit" data-idx="${i}"></td>
      <td><input class="cfg-cell-input" style="width:55px;" type="number" value="${t.low}" data-field="low" data-idx="${i}"></td>
      <td><input class="cfg-cell-input" style="width:55px;" type="number" value="${t.high}" data-field="high" data-idx="${i}"></td>
      <td><input class="cfg-cell-input" style="width:55px;" type="number" value="${t.warnLow}" data-field="warnLow" data-idx="${i}"></td>
      <td><input class="cfg-cell-input" style="width:55px;" type="number" value="${t.warnHigh}" data-field="warnHigh" data-idx="${i}"></td>
      <td><button class="cfg-delete-btn" onclick="deleteThresholdRow(${i})">删除</button></td>
    </tr>
  `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:16px;">暂无配置，点击"添加参数"</td></tr>';
}

function renderInspectPointsTable(proc) {
  const tbody = document.getElementById('cfg-points-tbody');
  if (!tbody) return;
  tbody.innerHTML = (proc.inspectPoints || []).map((pt, i) => `
    <tr>
      <td><input class="cfg-cell-input" style="width:70px;" value="${pt.id}" data-field="id" data-idx="${i}"></td>
      <td><input class="cfg-cell-input" value="${pt.name}" data-field="name" data-idx="${i}"></td>
      <td><input class="cfg-cell-input" style="width:180px;font-size:10px;" value="${pt.tag}" data-field="tag" data-idx="${i}"></td>
      <td><input class="cfg-cell-input" style="width:60px;" type="number" value="${pt.interval}" data-field="interval" data-idx="${i}"></td>
      <td style="font-size:11px;color:var(--text-muted);">${pt.lastCheck}</td>
      <td><button class="cfg-delete-btn" onclick="deleteInspectPointRow(${i})">删除</button></td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:16px;">暂无点位，点击"添加点位"</td></tr>';
}

function renderDevicesTable(proc) {
  const tbody = document.getElementById('cfg-devices-tbody');
  if (!tbody) return;
  tbody.innerHTML = (proc.devices || []).map((d, i) => `
    <tr>
      <td><input class="cfg-cell-input" style="width:80px;" value="${d.id}" data-field="id" data-idx="${i}"></td>
      <td><input class="cfg-cell-input" value="${d.name}" data-field="name" data-idx="${i}"></td>
      <td><input class="cfg-cell-input" style="width:80px;" value="${d.type}" data-field="type" data-idx="${i}"></td>
      <td><input class="cfg-cell-input" value="${d.spec}" data-field="spec" data-idx="${i}"></td>
      <td>
        <select class="cfg-cell-input" data-field="status" data-idx="${i}" style="width:70px;">
          <option value="running"${d.status==='running'?' selected':''}>运行中</option>
          <option value="standby"${d.status==='standby'?' selected':''}>备用</option>
          <option value="stopped"${d.status==='stopped'?' selected':''}>停用</option>
        </select>
      </td>
      <td><input class="cfg-cell-input" type="date" value="${d.lastMaintain}" data-field="lastMaintain" data-idx="${i}" style="width:120px;"></td>
      <td><button class="cfg-delete-btn" onclick="deleteDeviceRow(${i})">删除</button></td>
    </tr>
  `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:16px;">暂无设备，点击"添加设备"</td></tr>';
}

function readTableData(tbodyId, fields) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return [];
  const rows = [];
  tbody.querySelectorAll('tr').forEach(tr => {
    const obj = {};
    fields.forEach(f => {
      const input = tr.querySelector(`[data-field="${f}"]`);
      obj[f] = input ? input.value : '';
    });
    if (Object.values(obj).some(v => v !== '')) rows.push(obj);
  });
  return rows;
}

function saveConfigProcess() {
  if (!currentConfigId) return;
  const proc = PROCESS_CONFIGS.find(p => p.id === currentConfigId);
  if (!proc) return;

  proc.basic.code        = getInputVal('cfg-code');
  proc.basic.type        = getInputVal('cfg-type');
  proc.basic.responsible = getInputVal('cfg-responsible');
  proc.basic.contact     = getInputVal('cfg-contact');
  proc.basic.location    = getInputVal('cfg-location');
  proc.basic.startDate   = getInputVal('cfg-startDate');
  proc.basic.remark      = getInputVal('cfg-remark');

  proc.thresholds    = readTableData('cfg-threshold-tbody', ['param','unit','low','high','warnLow','warnHigh']);
  proc.inspectPoints = readTableData('cfg-points-tbody',    ['id','name','tag','interval']);
  proc.devices       = readTableData('cfg-devices-tbody',   ['id','name','type','spec','status','lastMaintain']);

  const btn = document.getElementById('cfg-save-btn');
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '✓ 已保存';
    btn.style.background = 'linear-gradient(135deg, #007840 0%, #00a855 100%)';
    setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 1500);
  }
}

function addThresholdRow() {
  const proc = PROCESS_CONFIGS.find(p => p.id === currentConfigId);
  if (!proc) return;
  proc.thresholds.push({ param:'', unit:'', low:0, high:100, warnLow:0, warnHigh:90 });
  renderThresholdTable(proc);
}

function deleteThresholdRow(idx) {
  const proc = PROCESS_CONFIGS.find(p => p.id === currentConfigId);
  if (!proc) return;
  proc.thresholds.splice(idx, 1);
  renderThresholdTable(proc);
}

function addInspectPointRow() {
  const proc = PROCESS_CONFIGS.find(p => p.id === currentConfigId);
  if (!proc) return;
  proc.inspectPoints.push({ id:'P' + String(Date.now()).slice(-4), name:'', tag:'', interval:30, lastCheck:'--' });
  renderInspectPointsTable(proc);
}

function deleteInspectPointRow(idx) {
  const proc = PROCESS_CONFIGS.find(p => p.id === currentConfigId);
  if (!proc) return;
  proc.inspectPoints.splice(idx, 1);
  renderInspectPointsTable(proc);
}

function addDeviceRow() {
  const proc = PROCESS_CONFIGS.find(p => p.id === currentConfigId);
  if (!proc) return;
  proc.devices.push({ id:'DEV-' + String(Date.now()).slice(-3), name:'', type:'', spec:'', status:'running', lastMaintain:'' });
  renderDevicesTable(proc);
}

function deleteDeviceRow(idx) {
  const proc = PROCESS_CONFIGS.find(p => p.id === currentConfigId);
  if (!proc) return;
  proc.devices.splice(idx, 1);
  renderDevicesTable(proc);
}

function addConfigProcess() {
  const unitFilter = (document.getElementById('cfg-filter-unit') || {}).value || '3';
  const newId = 'proc-new-' + Date.now();
  PROCESS_CONFIGS.push({
    id: newId, name:'新工艺流程', unit: unitFilter, status:'stopped',
    basic: { code:'', type:'', responsible:'', contact:'', location:'', startDate:'', remark:'' },
    thresholds: [], inspectPoints: [], devices: []
  });
  renderConfigSidebar();
  selectConfigProcess(newId);
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function () {
  switchUnit(3);
  switchProcess('A');
  startProcessAnimation();

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });

  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => {
      if (e.target === m) closeAllModals();
    });
  });
});
