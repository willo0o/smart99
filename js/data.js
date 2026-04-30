/* ================================================================
   data.js — Simulated data for 智慧工务巡检作业管理系统 demo
   ================================================================ */

'use strict';

/* ── Unit base config ── */
const UNIT_BASE = {
  1: { param1: 35.2, param2: 42.0, flow1: 38.5, flow2: 30.3, pres1: 100.0, pres2: 38.5, freq: [55.17, 30.33, 28.33, 27.33] },
  2: { param1: 48.6, param2: 38.1, flow1: 42.1, flow2: 28.7, pres1: 95.0,  pres2: 42.1, freq: [48.22, 32.10, 25.88, 30.11] },
  3: { param1: 38.4, param2: 45.2, flow1: 36.8, flow2: 27.5, pres1: 105.0, pres2: 36.8, freq: [51.14, 28.50, 27.20, 33.44] }
};

let currentUnit = 3;
let currentProcess = 'A'; // 'A' or 'B'

function rand(base, pct = 0.05) {
  return (base * (1 + (Math.random() * 2 - 1) * pct)).toFixed(2);
}
function randInt(base, delta = 2) {
  return Math.round(base + (Math.random() * 2 - 1) * delta);
}

/* ── Process flow realtime values ── */
const ProcessValues = {
  get: function (unit) {
    const b = UNIT_BASE[unit];
    return {
      freq:  b.freq.map(f => parseFloat(rand(f, 0.04))),
      flow1: parseFloat(rand(b.flow1, 0.04)),
      flow2: parseFloat(rand(b.flow2, 0.04)),
      pres1: parseFloat(rand(b.pres1, 0.03)),
      pres2: parseFloat(rand(b.pres2, 0.04)),
      param1Real:   parseFloat(rand(b.param1, 0.08)),
      param1Target: 40.0,
      param1Pred:   parseFloat(rand(b.param1 * 0.95, 0.05)),
      param2Real:   parseFloat(rand(b.param2, 0.08)),
      param2Target: 100.0,
      param2Pred:   parseFloat(rand(b.param2 * 0.95, 0.05)),
      limitA: 49.32,
      limitB: 49.36,
      total:  parseFloat(rand(38.5, 0.03))
    };
  }
};

/* ── Generate 24h time-series for charts ── */
function generate24hData(baseVal, variance, points = 288) {
  const actual = [], predicted = [];
  const times = [];
  for (let i = 0; i < points; i++) {
    const t = i * (86400 / points);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    times.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);

    // Simulate realistic pattern with spikes
    let noise = (Math.random() - 0.5) * variance;
    let spike = 0;
    if (i > 120 && i < 140) spike = baseVal * 2; // midday spike
    let v = Math.max(0, baseVal + noise + spike);
    actual.push(parseFloat(v.toFixed(2)));
    predicted.push(parseFloat((v * (0.92 + Math.random() * 0.12) + (Math.random() - 0.5) * 3).toFixed(2)));
  }
  return { times, actual, predicted };
}

/* ── Generate benchmark data (normalized 0-1) ── */
function generateBenchmarkData(points = 288) {
  const times = [], vals = [];
  for (let i = 0; i < points; i++) {
    const t = i * (86400 / points);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    times.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    // normalized 0-1 with some spikes
    let v = 0.05 + Math.random() * 0.08;
    if (i > 60 && i < 80) v += 0.6 + Math.random() * 0.3;
    vals.push(parseFloat(Math.min(1, v).toFixed(4)));
  }
  return { times, vals };
}

/* ── Alarm records ── */
const ALARM_DATA = [
  { id:1,  type:'离线',   time:'2024-08-28 16:55:41', point:'SC.process.P01_CT602',      desc:'DATA_P01_CT602',       recovery:'' },
  { id:2,  type:'离线',   time:'2024-08-28 10:53:33', point:'SC.3TX.C_FT_102_1BC',       desc:'DATA_C_FT_102_1BC',    recovery:'2024-08-28 10:52:05' },
  { id:3,  type:'超限',   time:'2024-09-12 08:21:07', point:'SC.process.P02_FT201',      desc:'DATA_P02_FT201',       recovery:'2024-09-12 08:45:20' },
  { id:4,  type:'数据异常',time:'2024-10-03 14:30:52', point:'DATA_MAN31MCS03',           desc:'DATA_MAN31MCS03',      recovery:'2024-10-03 15:00:00' },
  { id:5,  type:'通信故障',time:'2024-11-15 09:00:18', point:'SC.process.CT_701',         desc:'DATA_CT_701',          recovery:'' },
  { id:6,  type:'超限',   time:'2024-12-01 22:11:43', point:'DATA_A04A001_VA',            desc:'DATA_A04A001_VA',      recovery:'2024-12-01 22:38:00' },
  { id:7,  type:'离线',   time:'2025-01-08 07:45:00', point:'SC.3TX.C_NOX_102_1BC',      desc:'DATA_NOX_102_1BC',     recovery:'2025-01-08 08:00:00' },
  { id:8,  type:'数据异常',time:'2025-01-20 13:28:39', point:'DATA_SCS32SCS0302',         desc:'DATA_SCS32SCS0302',    recovery:'' },
  { id:9,  type:'超限',   time:'2025-02-04 05:17:55', point:'SC.process.P03_CT302',      desc:'DATA_P03_CT302',       recovery:'2025-02-04 06:00:00' },
  { id:10, type:'通信故障',time:'2025-02-18 11:52:20', point:'DATA_MAN32MCS06A',          desc:'DATA_MAN32MCS06A',     recovery:'2025-02-18 12:10:00' },
  { id:11, type:'离线',   time:'2025-03-01 16:40:00', point:'SC.process.P01_CT101',      desc:'DATA_P01_CT101',       recovery:'' },
  { id:12, type:'超限',   time:'2025-03-10 03:22:10', point:'DATA_SCS32SCS0501',         desc:'DATA_SCS32SCS0501',    recovery:'2025-03-10 03:55:00' },
  { id:13, type:'数据异常',time:'2025-03-22 20:05:44', point:'SC.3TX.C_FT_201_2BC',      desc:'DATA_C_FT_201_2BC',   recovery:'' },
  { id:14, type:'通信故障',time:'2025-04-01 09:11:30', point:'DATA_MAN2PC_ZZ',            desc:'DATA_MAN2PC_ZZ',       recovery:'2025-04-01 09:30:00' },
  { id:15, type:'超限',   time:'2025-04-15 18:44:08', point:'SC.process.P02_CT502',      desc:'DATA_P02_CT502',       recovery:'2025-04-15 19:10:00' }
];

/* ── Control log records ── */
const LOG_DATA = [
  { id:1,  name:'CTRL_MAN_2PC_ZZ',    start:'2025-03-05 10:10:28', end:'',                    dur:'' },
  { id:2,  name:'DATA_MAN31MCS03',    start:'2025-03-05 10:03:46', end:'',                    dur:'' },
  { id:3,  name:'DATA_MAN31MCS02',    start:'2025-03-05 10:03:44', end:'',                    dur:'' },
  { id:4,  name:'DATA_H02TK20AA101',  start:'2025-03-05 10:03:41', end:'2025-03-05 10:06:43', dur:'3分钟' },
  { id:5,  name:'DATA_MAN_2PC',       start:'2025-03-05 10:03:39', end:'',                    dur:'' },
  { id:6,  name:'DATA_SCS32SCS0501',  start:'2025-03-05 10:03:35', end:'',                    dur:'' },
  { id:7,  name:'DATA_A04A001_VA',    start:'2025-03-05 10:03:33', end:'',                    dur:'' },
  { id:8,  name:'DATA_MAN32MCS06A',   start:'2025-03-05 10:03:31', end:'2025-03-05 10:04:20', dur:'1分钟' },
  { id:9,  name:'DATA_SCS32SCS0302',  start:'2025-03-05 10:03:18', end:'2025-03-05 10:04:13', dur:'1分钟' },
  { id:10, name:'工艺流程A',           start:'2025-01-10 16:48:20', end:'2025-01-10 16:48:20', dur:'' },
  { id:11, name:'工艺流程A',           start:'2025-01-10 16:43:46', end:'2025-01-10 16:48:20', dur:'4分钟' },
  { id:12, name:'工艺流程A',           start:'2025-01-10 16:43:46', end:'2025-01-10 16:48:20', dur:'4分钟' },
  { id:13, name:'工艺流程A',           start:'2025-01-10 16:43:25', end:'2025-01-10 16:48:20', dur:'4分钟' },
  { id:14, name:'工艺流程A',           start:'2025-01-10 16:42:44', end:'2025-01-10 16:43:25', dur:'1分钟' },
  { id:15, name:'工艺流程B',           start:'2025-01-08 14:22:10', end:'2025-01-08 14:26:10', dur:'4分钟' },
  { id:16, name:'工艺流程B',           start:'2025-01-08 14:15:00', end:'2025-01-08 14:19:00', dur:'4分钟' },
  { id:17, name:'CTRL_PUMP_01',       start:'2025-01-06 08:10:00', end:'2025-01-06 08:13:00', dur:'3分钟' },
  { id:18, name:'CTRL_PUMP_02',       start:'2025-01-06 08:09:55', end:'2025-01-06 08:13:00', dur:'3分钟' },
  { id:19, name:'DATA_MAN31MCS01',    start:'2025-01-05 12:00:00', end:'',                    dur:'' },
  { id:20, name:'工艺流程A',           start:'2025-01-04 09:30:00', end:'2025-01-04 09:33:00', dur:'3分钟' },
  { id:21, name:'工艺流程B',           start:'2025-01-03 07:00:00', end:'2025-01-03 07:04:00', dur:'4分钟' },
  { id:22, name:'DATA_SCS32SCS0401',  start:'2025-01-02 21:15:00', end:'',                    dur:'' },
  { id:23, name:'CTRL_VALVE_03',      start:'2025-01-02 20:55:00', end:'2025-01-02 20:58:00', dur:'3分钟' },
  { id:24, name:'工艺流程A',           start:'2025-01-01 16:00:00', end:'2025-01-01 16:04:00', dur:'4分钟' },
  { id:25, name:'工艺流程B',           start:'2024-12-31 10:10:00', end:'2024-12-31 10:14:00', dur:'4分钟' },
  { id:26, name:'DATA_MAN32MCS05A',   start:'2024-12-30 15:20:00', end:'',                    dur:'' },
  { id:27, name:'CTRL_MAN_3PC_ZZ',    start:'2024-12-29 08:00:00', end:'2024-12-29 08:04:00', dur:'4分钟' }
];

/* ── Model versions ── */
const MODEL_VERSIONS = [
  { ver:'V11', date:'2026-04-01', rmse:'1.24', mae:'0.87', status:'running' },
  { ver:'V10', date:'2026-03-15', rmse:'1.68', mae:'1.12', status:'stopped' },
  { ver:'V9',  date:'2026-02-28', rmse:'1.92', mae:'1.38', status:'stopped' },
  { ver:'V8',  date:'2026-02-10', rmse:'2.15', mae:'1.55', status:'stopped' },
  { ver:'V7',  date:'2026-01-20', rmse:'2.44', mae:'1.72', status:'stopped' },
  { ver:'V6',  date:'2025-12-30', rmse:'2.78', mae:'1.90', status:'stopped' },
  { ver:'V5',  date:'2025-12-05', rmse:'3.10', mae:'2.21', status:'stopped' },
  { ver:'V4',  date:'2025-11-15', rmse:'3.55', mae:'2.50', status:'stopped' },
  { ver:'V3',  date:'2025-10-28', rmse:'4.02', mae:'2.88', status:'stopped' },
  { ver:'V2',  date:'2025-10-10', rmse:'4.80', mae:'3.20', status:'stopped' },
  { ver:'V1',  date:'2025-09-20', rmse:'5.64', mae:'3.90', status:'stopped' }
];

/* ── Dropdown options ── */
const BENCHMARK_PARAMS = [
  '总排放量当前小时均值',
  '出口烟气参数1折算值',
  '出口烟气参数1含量',
  '出口烟气参数2含量',
  '出口烟气参数2折算值',
  '出口烟气流量',
  '监测点位A均值',
  '监测点位B均值'
];

const PROCESS_OPTIONS = ['工艺流程A', '工艺流程B'];
const UNIT_OPTIONS    = ['1#机组', '2#机组', '3#机组'];
const ALARM_TYPES     = ['离线', '超限', '数据异常', '通信故障'];
const ALARM_POINTS    = [
  'SC.process.P01_CT602', 'SC.3TX.C_FT_102_1BC',
  'DATA_MAN31MCS03', 'SC.process.P02_FT201'
];
