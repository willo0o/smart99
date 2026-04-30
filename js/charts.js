/* ================================================================
   charts.js — ECharts configuration for 智慧工务巡检作业管理系统
   ================================================================ */

'use strict';

/* ── Theme-aware style helpers ── */
function isLight() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}

function getChartTheme() {
  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: isLight() ? 'rgba(40,80,140,0.75)' : 'rgba(180,210,255,0.7)',
      fontFamily: "'Microsoft YaHei', Arial, sans-serif"
    }
  };
}

function getAxisStyle() {
  if (isLight()) {
    return {
      axisLine:  { lineStyle: { color: 'rgba(0,90,180,0.22)' } },
      axisTick:  { lineStyle: { color: 'rgba(0,90,180,0.22)' } },
      axisLabel: { color: 'rgba(40,80,140,0.70)', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(0,90,180,0.09)', type: 'dashed' } }
    };
  }
  return {
    axisLine:  { lineStyle: { color: 'rgba(0,212,255,0.2)' } },
    axisTick:  { lineStyle: { color: 'rgba(0,212,255,0.2)' } },
    axisLabel: { color: 'rgba(180,210,255,0.65)', fontSize: 10 },
    splitLine: { lineStyle: { color: 'rgba(0,212,255,0.08)', type: 'dashed' } }
  };
}

function getTooltipStyle() {
  if (isLight()) {
    return {
      backgroundColor: 'rgba(240,246,255,0.97)',
      borderColor: 'rgba(0,90,180,0.30)',
      borderWidth: 1,
      textStyle: { color: '#1a2740', fontSize: 12 }
    };
  }
  return {
    backgroundColor: 'rgba(4,14,40,0.92)',
    borderColor: 'rgba(0,212,255,0.35)',
    borderWidth: 1,
    textStyle: { color: '#e0f0ff', fontSize: 12 }
  };
}

function getLegendTextStyle() {
  return { color: isLight() ? 'rgba(40,80,140,0.75)' : 'rgba(180,210,255,0.7)', fontSize: 11 };
}

/* ── Chart instances registry ── */
const Charts = {};

function initOrGet(id) {
  if (Charts[id]) return Charts[id];
  const dom = document.getElementById(id);
  if (!dom) return null;
  const c = echarts.init(dom, null, { renderer: 'canvas' });
  Charts[id] = c;
  window.addEventListener('resize', () => c.resize());
  return c;
}

/* ── Model Analysis — dual stacked charts ── */
function renderModelAnalysisCharts(unit) {
  const b = UNIT_BASE[unit] || UNIT_BASE[3];
  const d1 = generate24hData(b.param1, b.param1 * 0.5, 200);
  const d2 = generate24hData(b.param2, b.param2 * 0.4, 200);

  renderLineChart('chart-param1', d1, '出口参数1浓度 (mg/m³)');
  renderLineChart('chart-param2', d2, '出口参数2浓度 (mg/m³)');

  const rmse1 = (1.1 + Math.random() * 0.5).toFixed(2);
  const mae1  = (0.7 + Math.random() * 0.4).toFixed(2);
  const rmse2 = (1.2 + Math.random() * 0.6).toFixed(2);
  const mae2  = (0.8 + Math.random() * 0.5).toFixed(2);
  setEl('rmse-val', rmse1);
  setEl('mae-val',  mae1);
  setEl('rmse-val2', rmse2);
  setEl('mae-val2',  mae2);
}

function renderLineChart(domId, data, label) {
  const chart = initOrGet(domId);
  if (!chart) return;

  const AS = getAxisStyle();

  chart.setOption({
    ...getChartTheme(),
    grid: { top: 12, right: 12, bottom: 28, left: 46 },
    tooltip: {
      ...getTooltipStyle(),
      trigger: 'axis',
      formatter: function (params) {
        let s = `<b>${params[0].axisValue}</b><br/>`;
        params.forEach(p => {
          const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:5px;"></span>`;
          s += `${dot}${p.seriesName}: <b>${p.value !== undefined ? p.value : '-'}</b><br/>`;
        });
        return s;
      }
    },
    legend: { show: false },
    xAxis: {
      type: 'category',
      data: data.times,
      ...AS,
      axisLabel: {
        ...AS.axisLabel,
        interval: Math.ceil(data.times.length / 14) - 1,
        rotate: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '',
      min: 0,
      max: Math.ceil(Math.max(...data.actual, ...data.predicted) * 1.3 / 10) * 10,
      ...AS
    },
    series: [
      {
        name: '实时值',
        type: 'line',
        data: data.actual,
        smooth: false,
        symbol: 'circle',
        symbolSize: 3,
        lineStyle: { color: '#00d4ff', width: 1.5 },
        itemStyle: { color: '#00d4ff' },
        markArea: {
          silent: true,
          data: [[
            { xAxis: data.times[120], itemStyle: { color: 'rgba(0,212,255,0.1)' } },
            { xAxis: data.times[140] }
          ]]
        }
      },
      {
        name: '预测值',
        type: 'line',
        data: data.predicted,
        smooth: false,
        symbol: 'circle',
        symbolSize: 3,
        lineStyle: { color: '#a855f7', width: 1.5, type: 'dashed' },
        itemStyle: { color: '#a855f7' }
      }
    ]
  }, true);
  chart.resize();
}

/* ── Benchmark Analysis — single normalized chart ── */
function renderBenchmarkChart(param) {
  const chart = initOrGet('chart-benchmark');
  if (!chart) return;

  const unitSel    = document.getElementById('bm-unit');
  const processSel = document.getElementById('bm-process');
  const unitVal    = unitSel    ? (parseInt(unitSel.value) || 3) : 3;
  const processVal = processSel ? (processSel.value || '工艺流程A') : '工艺流程A';

  const d = generateBenchmarkData(200, unitVal);
  const maxIdx = d.vals.indexOf(Math.max(...d.vals));

  const label = document.getElementById('bm-chart-label');
  const paramName = param || '总排放量当前小时均值';
  if (label) label.textContent = `${paramName} · ${unitVal}#机组 · ${processVal}`;

  const AS = getAxisStyle();

  chart.setOption({
    ...getChartTheme(),
    grid: { top: 14, right: 14, bottom: 30, left: 46 },
    tooltip: {
      ...getTooltipStyle(),
      trigger: 'axis',
      formatter: params => {
        const p = params[0];
        updatePointInfo(p.axisValue, p.value);
        return `<b>${p.axisValue}</b><br/>
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#00d4ff;margin-right:5px;"></span>
          ${p.value}`;
      }
    },
    xAxis: {
      type: 'category',
      data: d.times,
      ...AS,
      axisLabel: { ...AS.axisLabel, interval: Math.ceil(d.times.length / 14) - 1 }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      ...AS
    },
    series: [{
      name: paramName,
      type: 'line',
      data: d.vals,
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#00d4ff', width: 1.5 },
      itemStyle: { color: '#00d4ff' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(0,212,255,0.18)' },
          { offset: 1, color: 'rgba(0,212,255,0.01)' }
        ]
      }}
    }]
  }, true);
  chart.resize();

  updatePointInfo(d.times[maxIdx], d.vals[maxIdx]);
}

function updatePointInfo(time, val) {
  setEl('point-time', time || '--');
  setEl('point-val',  val !== undefined ? val : '--');
}

/* ── Model chart — RMSE bar by version ── */
function renderModelChart() {
  const chart = initOrGet('chart-model-rmse');
  if (!chart) return;

  const vers  = MODEL_VERSIONS.map(m => m.ver).reverse();
  const rmses = MODEL_VERSIONS.map(m => parseFloat(m.rmse)).reverse();
  const maes  = MODEL_VERSIONS.map(m => parseFloat(m.mae)).reverse();

  const AS = getAxisStyle();

  chart.setOption({
    ...getChartTheme(),
    grid: { top: 24, right: 14, bottom: 34, left: 44 },
    legend: {
      top: 4,
      textStyle: getLegendTextStyle(),
      itemWidth: 14,
      itemHeight: 8
    },
    tooltip: {
      ...getTooltipStyle(),
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: {
      type: 'category',
      data: vers,
      ...AS
    },
    yAxis: {
      type: 'value',
      name: 'Error',
      nameTextStyle: { color: isLight() ? 'rgba(40,80,140,0.5)' : 'rgba(180,210,255,0.5)', fontSize: 10 },
      ...AS
    },
    series: [
      {
        name: 'RMSE',
        type: 'bar',
        data: rmses,
        barWidth: '30%',
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#1a6fff' },
              { offset: 1, color: 'rgba(26,111,255,0.3)' }
            ]
          },
          borderRadius: [2, 2, 0, 0]
        }
      },
      {
        name: 'MAE',
        type: 'bar',
        data: maes,
        barWidth: '30%',
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#00d4ff' },
              { offset: 1, color: 'rgba(0,212,255,0.2)' }
            ]
          },
          borderRadius: [2, 2, 0, 0]
        }
      }
    ]
  }, true);
  chart.resize();
}

/* ── Utility ── */
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function resizeAll() {
  Object.values(Charts).forEach(c => c && c.resize());
}
window.addEventListener('resize', resizeAll);
