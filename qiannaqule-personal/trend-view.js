/**
 * TrendView - MiRun AI 趋势洞察面板 (v2.0.0)
 *
 * 职责：
 * 1. 跨模块月度全景报告：财务 / 收支 / 健康 / 情绪
 * 2. 五Tab切换：财务诊断 · 收支趋势 · 健康数据 · 情绪曲线 · 月度报告
 * 3. AI月度洞察：聚合多模块数据，生成深度洞察总结
 * 4. 首页入口卡片：快速预览核心指标
 *
 * 依赖：DataStore v2, DiagnosisEngine, HealthBridge, AiEngine
 * 数据key前缀：mijieai_ (保持不变)
 *
 * 调用：
 *   TrendView.render(containerId)          - 渲染完整趋势洞察面板
 *   TrendView.renderEntryCard(containerId) - 渲染首页入口卡片
 *   TrendView.switchTab(tabName)           - 切换Tab
 *   TrendView.generateMonthlyReport()      - 生成月度报告(异步)
 */

(function(global) {
  'use strict';

  // ==================== 版本 ====================
  var VERSION = '2.0.0';

  // ==================== Tab 定义 ====================
  var TABS = [
    { id: 'finance',  label: '财务诊断', icon: 'finance',  color: '#f59e0b' },
    { id: 'income',   label: '收支趋势', icon: 'wallet',   color: '#10b981' },
    { id: 'health',   label: '健康数据', icon: 'heart',    color: '#ef4444' },
    { id: 'mood',     label: '情绪曲线', icon: 'smile',    color: '#8b5cf6' },
    { id: 'report',   label: '月度报告', icon: 'fileText', color: '#3b82f6' }
  ];

  // ==================== SVG 图标库 (Lucide 线性风格) ====================
  var ICONS = {
    finance: '<path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>',
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    arrowUp: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    arrowDown: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    sparkles: '<path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    barChart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    pieChart: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    bookOpen: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
  };

  function svgIcon(name, size, color, strokeWidth) {
    size = size || 16;
    color = color || 'currentColor';
    strokeWidth = strokeWidth || 1.8;
    var paths = ICONS[name] || '';
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth +
      '" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }

  // ==================== 财务维度常量 ====================
  var DIM_NAMES = [
    '资产负债健康度', '流动性安全度', '收入结构合理性',
    '支出与储蓄率', '资产配置均衡度', '风险保障充足度'
  ];

  var KEY_METRICS = [
    { key: 'income',           label: '月收入',       unit: '元',   format: 'money',  positive: true  },
    { key: 'expense',          label: '月支出',       unit: '元',   format: 'money',  positive: false },
    { key: 'savingsRate',      label: '储蓄率',       unit: '%',    format: 'pct',    positive: true  },
    { key: 'debtAssetRatio',   label: '资产负债率',   unit: '%',    format: 'pct',    positive: false },
    { key: 'otherIncomeRatio', label: '非工资收入占比', unit: '%',   format: 'pct',    positive: true  },
    { key: 'savingsMonths',    label: '应急储备月数',  unit: '个月',  format: 'num',    positive: true  },
    { key: 'totalAssets',      label: '总资产',       unit: '元',   format: 'money',  positive: true  },
    { key: 'debt',             label: '总负债',       unit: '元',   format: 'money',  positive: false }
  ];

  var MOOD_LABELS = [
    { score: 1, label: '很差', color: '#ef4444' },
    { score: 2, label: '低落', color: '#f97316' },
    { score: 3, label: '一般', color: '#eab308' },
    { score: 4, label: '不错', color: '#22c55e' },
    { score: 5, label: '很好', color: '#06b6d4' }
  ];

  // ==================== 工具函数 ====================
  function formatMoney(val) {
    if (val === undefined || val === null) return '--';
    if (Math.abs(val) >= 10000) {
      return (val / 10000).toFixed(1) + '万';
    }
    return Math.round(val).toLocaleString ? Math.round(val).toLocaleString() : String(Math.round(val));
  }

  function formatPct(val) {
    if (val === undefined || val === null) return '--';
    return (val * 100).toFixed(1);
  }

  function formatValue(val, format) {
    if (val === undefined || val === null) return '--';
    switch (format) {
      case 'money': return formatMoney(val);
      case 'pct':   return formatPct(val);
      default:      return String(Math.round(val));
    }
  }

  function calcDiff(current, previous) {
    if (current === undefined || previous === undefined || current === null || previous === null) return null;
    return current - previous;
  }

  function arrowHtml(diff, positiveGood) {
    if (diff === null || diff === 0) return '<span class="tv-arrow tv-neutral">→</span>';
    var isGood = positiveGood ? diff > 0 : diff < 0;
    if (diff > 0) {
      return '<span class="tv-arrow ' + (isGood ? 'tv-up-good' : 'tv-up-bad') + '">↑</span>';
    }
    return '<span class="tv-arrow ' + (isGood ? 'tv-down-good' : 'tv-down-bad') + '">↓</span>';
  }

  function diffHtml(diff, format, positiveGood) {
    if (diff === null) return '<span class="tv-diff tv-neutral">--</span>';
    var isGood = positiveGood ? diff > 0 : diff < 0;
    var sign = diff > 0 ? '+' : '';
    var cls = diff === 0 ? 'tv-neutral' : (isGood ? 'tv-good' : 'tv-bad');
    var absVal = Math.abs(diff);
    var formatted = format === 'pct' ? formatPct(absVal) :
                    format === 'money' ? formatMoney(absVal) :
                    String(Math.round(absVal));
    return '<span class="tv-diff ' + cls + '">' + sign + (diff < 0 ? '-' : '') + formatted + '</span>';
  }

  function gradeColor(grade) {
    switch (grade) {
      case 'A': return '#22c55e';
      case 'B': return '#3b82f6';
      case 'C': return '#eab308';
      case 'D': return '#f97316';
      case 'F': return '#ef4444';
      default:  return '#94a3b8';
    }
  }

  function gradeLabelFromGrade(grade) {
    switch (grade) {
      case 'A': return 'A 财务健康';
      case 'B': return 'B 基本健康';
      case 'C': return 'C 需要改善';
      case 'D': return 'D 风险较高';
      case 'F': return 'F 财务危险';
      default:  return '--';
    }
  }

  function gradeClass(grade) {
    return 'tv-grade-' + grade;
  }

  function periodLabel(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '月';
  }

  function formatTime(ts) {
    var d = new Date(ts);
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var hour = d.getHours().toString().padStart(2, '0');
    var min = d.getMinutes().toString().padStart(2, '0');
    return month + '月' + day + '日 ' + hour + ':' + min;
  }

  function getMonthKey(date) {
    var d = date instanceof Date ? date : new Date(date);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function getCurrentMonthKey() {
    return getMonthKey(new Date());
  }

  function getPrevMonthKey() {
    var d = new Date();
    d.setDate(0); // 上月最后一天
    return getMonthKey(d);
  }

  function monthLabel(key) {
    var parts = key.split('-');
    return parseInt(parts[1], 10) + '月';
  }

  function esc(s) {
    var el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
  }

  // ==================== 数据获取层 ====================

  /** 获取财务诊断历史 */
  function getDiagnosisHistory() {
    try {
      if (global.DiagnosisEngine && typeof global.DiagnosisEngine.getHistory === 'function') {
        return global.DiagnosisEngine.getHistory() || [];
      }
      if (global.DataStore) {
        return global.DataStore.load('wealth_ct', 'diagnosis_history', []) || [];
      }
    } catch(e) { console.warn('[TrendView] 获取诊断历史失败', e); }
    return [];
  }

  /** 获取收支记录 */
  function getTxRecords() {
    try {
      if (global.DataStore) {
        return global.DataStore.load('daily_tx', 'records', []) || [];
      }
      var raw = localStorage.getItem('mijieai_daily_tx');
      return raw ? JSON.parse(raw) : [];
    } catch(e) { console.warn('[TrendView] 获取收支记录失败', e); }
    return [];
  }

  /** 获取健康记录 */
  function getHealthRecords() {
    try {
      if (global.HealthBridge && typeof global.HealthBridge.getRecentDays === 'function') {
        // 返回最近90天
        return global.HealthBridge.getRecentDays(90) || [];
      }
      if (global.DataStore) {
        return global.DataStore.load('health', 'records', []) || [];
      }
    } catch(e) { console.warn('[TrendView] 获取健康记录失败', e); }
    return [];
  }

  /** 获取情绪日志 */
  function getMoodLogs() {
    try {
      var raw = localStorage.getItem('mijieai_mood_log');
      return raw ? JSON.parse(raw) : [];
    } catch(e) { console.warn('[TrendView] 获取情绪日志失败', e); }
    return [];
  }

  /** 获取行为日志 */
  function getBehaviorLogs() {
    try {
      var raw = localStorage.getItem('mijieai_behavior_log');
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  // ==================== 数据聚合 ====================

  /** 按月汇总收支 */
  function aggregateTxByMonth(records) {
    var months = {};
    records.forEach(function(tx) {
      var dateStr = tx.date || tx.createdAt;
      if (!dateStr) return;
      var mk = getMonthKey(dateStr);
      if (!months[mk]) {
        months[mk] = { month: mk, income: 0, expense: 0, count: 0, categories: {} };
      }
      var m = months[mk];
      m.count++;
      if (tx.type === 'income') {
        m.income += parseFloat(tx.amount) || 0;
      } else {
        m.expense += parseFloat(tx.amount) || 0;
        var cat = tx.ctField || tx.subCategory || '其他';
        m.categories[cat] = (m.categories[cat] || 0) + (parseFloat(tx.amount) || 0);
      }
    });
    // 转为数组并排序
    return Object.keys(months).sort().map(function(k) { return months[k]; });
  }

  /** 获取指定月份的收支分类汇总 */
  function getTxCategoryBreakdown(records, monthKey) {
    var categories = {};
    records.forEach(function(tx) {
      if (tx.type !== 'expense') return;
      var dateStr = tx.date || tx.createdAt;
      if (!dateStr) return;
      if (getMonthKey(dateStr) !== monthKey) return;
      var cat = tx.ctField || tx.subCategory || '其他';
      categories[cat] = (categories[cat] || 0) + (parseFloat(tx.amount) || 0);
    });
    // 转为数组并排序
    return Object.keys(categories)
      .map(function(k) { return { category: k, amount: categories[k] }; })
      .sort(function(a, b) { return b.amount - a.amount; });
  }

  /** 按月聚合健康数据 */
  function aggregateHealthByMonth(records) {
    var months = {};
    records.forEach(function(r) {
      if (!r.date) return;
      var mk = getMonthKey(r.date);
      if (!months[mk]) {
        months[mk] = {
          month: mk,
          days: 0,
          totalSteps: 0, stepsDays: 0,
          totalSleep: 0, sleepDays: 0,
          totalDeepSleep: 0, deepDays: 0,
          totalHR: 0, hrDays: 0,
          totalActive: 0, activeDays: 0,
          totalDistance: 0, distDays: 0
        };
      }
      var m = months[mk];
      m.days++;
      if (r.steps > 0) { m.totalSteps += r.steps; m.stepsDays++; }
      if (r.sleep && r.sleep.total > 0) { m.totalSleep += r.sleep.total; m.sleepDays++; }
      if (r.sleep && r.sleep.deep > 0) { m.totalDeepSleep += r.sleep.deep; m.deepDays++; }
      if (r.heartRate && r.heartRate.avg > 0) { m.totalHR += r.heartRate.avg; m.hrDays++; }
      if (r.activeMinutes > 0) { m.totalActive += r.activeMinutes; m.activeDays++; }
      if (r.distance > 0) { m.totalDistance += r.distance; m.distDays++; }
    });
    return Object.keys(months).sort().map(function(k) {
      var m = months[k];
      return {
        month: m.month,
        days: m.days,
        avgSteps: m.stepsDays > 0 ? Math.round(m.totalSteps / m.stepsDays) : 0,
        avgSleep: m.sleepDays > 0 ? Math.round(m.totalSleep / m.sleepDays * 10) / 10 : 0,
        avgDeepSleep: m.deepDays > 0 ? Math.round(m.totalDeepSleep / m.deepDays * 10) / 10 : 0,
        avgHeartRate: m.hrDays > 0 ? Math.round(m.totalHR / m.hrDays) : 0,
        avgActiveMinutes: m.activeDays > 0 ? Math.round(m.totalActive / m.activeDays) : 0,
        avgDistance: m.distDays > 0 ? Math.round(m.totalDistance / m.distDays * 10) / 10 : 0
      };
    });
  }

  /** 按月聚合情绪数据 */
  function aggregateMoodByMonth(logs) {
    var months = {};
    logs.forEach(function(entry) {
      var ts = entry.timestamp;
      if (!ts) return;
      var mk = getMonthKey(new Date(ts));
      if (!months[mk]) {
        months[mk] = { month: mk, count: 0, totalScore: 0, distribution: {}, events: [] };
      }
      var m = months[mk];
      m.count++;
      if (entry.score) {
        m.totalScore += entry.score;
        var s = String(entry.score);
        m.distribution[s] = (m.distribution[s] || 0) + 1;
      }
      if (entry.event && m.events.length < 10) {
        m.events.push(entry.event);
      }
    });
    return Object.keys(months).sort().map(function(k) {
      var m = months[k];
      return {
        month: m.month,
        count: m.count,
        avgScore: m.count > 0 ? Math.round(m.totalScore / m.count * 10) / 10 : 0,
        distribution: m.distribution,
        events: m.events
      };
    });
  }

  // ==================== 样式注入 ====================
  var _stylesInjected = false;
  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;

    var css = [
      /* ===== 趋势面板容器 ===== */
      '.tv-panel { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; color: #1a2a3a; }',

      /* ===== Tab 栏 ===== */
      '.tv-tabs { display: flex; gap: 4px; background: #f1f5f9; border-radius: 12px; padding: 4px; margin-bottom: 16px; overflow-x: auto; -webkit-overflow-scrolling: touch; }',
      '.tv-tab { flex: 1; min-width: 64px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px; border-radius: 10px; cursor: pointer; transition: all 0.2s; font-size: 0.75rem; color: #64748b; white-space: nowrap; }',
      '.tv-tab:hover { background: #e2e8f0; color: #334155; }',
      '.tv-tab.active { background: #fff; color: #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,0.08); font-weight: 600; }',
      '.tv-tab-icon { display: flex; align-items: center; justify-content: center; }',

      /* ===== 卡片 ===== */
      '.tv-card { background: #fff; border-radius: 14px; padding: 18px 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02); }',
      '.tv-card-title { display: flex; align-items: center; gap: 6px; font-size: 0.9rem; font-weight: 700; color: #1e293b; margin-bottom: 14px; }',
      '.tv-card-title svg { flex-shrink: 0; }',
      '.tv-card-subtitle { font-size: 0.78rem; color: #64748b; font-weight: 400; margin-left: auto; }',

      /* ===== 空状态 ===== */
      '.tv-empty { text-align: center; padding: 30px 20px; color: #94a3b8; }',
      '.tv-empty-icon { margin-bottom: 8px; opacity: 0.6; }',
      '.tv-empty-text { font-size: 0.85rem; margin-bottom: 4px; }',
      '.tv-empty-hint { font-size: 0.75rem; color: #cbd5e1; }',

      /* ===== 箭头 & 差值 ===== */
      '.tv-arrow { font-size: 0.85rem; font-weight: 700; }',
      '.tv-up-good { color: #22c55e; }',
      '.tv-up-bad { color: #ef4444; }',
      '.tv-down-good { color: #22c55e; }',
      '.tv-down-bad { color: #ef4444; }',
      '.tv-neutral { color: #94a3b8; }',
      '.tv-diff { font-size: 0.78rem; font-weight: 600; }',
      '.tv-good { color: #22c55e; }',
      '.tv-bad { color: #ef4444; }',

      /* ===== 财务趋势 ===== */
      '.tv-score-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }',
      '.tv-score-block { text-align: center; flex: 1; }',
      '.tv-score-label { font-size: 0.75rem; color: #64748b; margin-bottom: 4px; }',
      '.tv-score-value { font-size: 2rem; font-weight: 800; line-height: 1.2; }',
      '.tv-score-grade { display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }',
      '.tv-grade-A { background: #dcfce7; color: #166534; }',
      '.tv-grade-B { background: #dbeafe; color: #1e40af; }',
      '.tv-grade-C { background: #fef9c3; color: #854d0e; }',
      '.tv-grade-D { background: #ffedd5; color: #9a3412; }',
      '.tv-grade-F { background: #fee2e2; color: #991b1b; }',
      '.tv-score-arrow { text-align: center; }',
      '.tv-arrow-big { font-size: 1.5rem; display: block; margin-bottom: 2px; }',
      '.tv-diff-big { font-size: 0.85rem; font-weight: 700; }',

      /* ===== 维度对比 ===== */
      '.tv-dim-legend { display: flex; gap: 12px; margin-bottom: 12px; font-size: 0.72rem; color: #64748b; }',
      '.tv-legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }',
      '.tv-dim-row { margin-bottom: 10px; }',
      '.tv-dim-name { font-size: 0.78rem; color: #475569; margin-bottom: 4px; font-weight: 500; }',
      '.tv-dim-bars { display: flex; flex-direction: column; gap: 3px; margin-bottom: 3px; }',
      '.tv-dim-bar-wrap { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }',
      '.tv-dim-bar { height: 100%; border-radius: 4px; transition: width 0.6s ease; }',
      '.tv-dim-bar-prev { background: #93c5fd; }',
      '.tv-dim-bar-curr { background: #f97316; }',
      '.tv-dim-scores { display: flex; align-items: center; gap: 6px; font-size: 0.72rem; }',
      '.tv-dim-pscore { color: #6b7280; }',
      '.tv-dim-sep { color: #cbd5e1; }',
      '.tv-dim-cscore { color: #1e293b; font-weight: 600; }',
      '.tv-dim-diff { font-weight: 600; }',

      /* ===== 指标网格 ===== */
      '.tv-metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }',
      '.tv-metric-item { background: #f8fafc; border-radius: 10px; padding: 10px 12px; }',
      '.tv-metric-label { font-size: 0.72rem; color: #64748b; margin-bottom: 4px; }',
      '.tv-metric-values { font-size: 0.9rem; font-weight: 700; color: #1e293b; margin-bottom: 2px; }',
      '.tv-metric-prev { color: #94a3b8; font-weight: 500; }',
      '.tv-metric-sep { color: #cbd5e1; margin: 0 4px; font-weight: 400; }',
      '.tv-metric-change { display: flex; align-items: center; gap: 4px; font-size: 0.72rem; color: #64748b; }',
      '.tv-metric-unit { margin-left: auto; }',

      /* ===== 历史列表 ===== */
      '.tv-history-list { display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; }',
      '.tv-history-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #f8fafc; border-radius: 8px; }',
      '.tv-history-left { display: flex; align-items: center; gap: 8px; }',
      '.tv-history-time { font-size: 0.78rem; color: #475569; }',
      '.tv-history-tag { font-size: 0.65rem; padding: 1px 6px; border-radius: 4px; font-weight: 600; }',
      '.tv-tag-auto { background: #e0f2fe; color: #0369a1; }',
      '.tv-tag-manual { background: #fef3c7; color: #92400e; }',
      '.tv-history-right { display: flex; align-items: center; gap: 6px; }',
      '.tv-history-score { font-size: 0.85rem; font-weight: 700; }',
      '.tv-history-grade { font-size: 0.65rem; padding: 1px 6px; border-radius: 4px; font-weight: 600; }',

      /* ===== 收支趋势 ===== */
      '.tv-income-overview { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; }',
      '.tv-income-stat { text-align: center; padding: 10px; background: #f8fafc; border-radius: 10px; }',
      '.tv-income-stat-label { font-size: 0.7rem; color: #64748b; margin-bottom: 4px; }',
      '.tv-income-stat-value { font-size: 1.05rem; font-weight: 700; }',
      '.tv-income-stat.income .tv-income-stat-value { color: #059669; }',
      '.tv-income-stat.expense .tv-income-stat-value { color: #dc2626; }',
      '.tv-income-stat.balance .tv-income-stat-value { color: #2563eb; }',

      /* 柱状图（纯CSS） */
      '.tv-bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 160px; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }',
      '.tv-bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }',
      '.tv-bar-col { display: flex; align-items: flex-end; gap: 3px; height: 120px; }',
      '.tv-bar { width: 12px; border-radius: 4px 4px 0 0; transition: height 0.6s ease; min-height: 2px; }',
      '.tv-bar.income { background: linear-gradient(180deg, #34d399, #10b981); }',
      '.tv-bar.expense { background: linear-gradient(180deg, #f87171, #ef4444); }',
      '.tv-bar-label { font-size: 0.68rem; color: #64748b; }',

      /* 分类占比 */
      '.tv-category-list { display: flex; flex-direction: column; gap: 8px; }',
      '.tv-category-item { display: flex; align-items: center; gap: 8px; }',
      '.tv-cat-color { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }',
      '.tv-cat-name { flex: 1; font-size: 0.78rem; color: #475569; }',
      '.tv-cat-bar { flex: 2; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }',
      '.tv-cat-bar-fill { height: 100%; border-radius: 3px; }',
      '.tv-cat-amount { width: 60px; text-align: right; font-size: 0.78rem; font-weight: 600; color: #1e293b; }',
      '.tv-cat-pct { width: 36px; text-align: right; font-size: 0.7rem; color: #64748b; }',

      /* ===== 健康数据 ===== */
      '.tv-health-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }',
      '.tv-health-item { background: #f8fafc; border-radius: 10px; padding: 12px; }',
      '.tv-health-item-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }',
      '.tv-health-item-label { font-size: 0.72rem; color: #64748b; }',
      '.tv-health-item-value { font-size: 1.2rem; font-weight: 700; color: #1e293b; }',
      '.tv-health-item-unit { font-size: 0.7rem; color: #94a3b8; font-weight: 400; margin-left: 2px; }',
      '.tv-health-item-trend { font-size: 0.7rem; margin-top: 2px; }',

      /* 健康趋势折线（用柱状简化） */
      '.tv-health-trend { margin-top: 12px; }',
      '.tv-ht-title { font-size: 0.78rem; font-weight: 600; color: #334155; margin-bottom: 8px; }',
      '.tv-ht-chart { display: flex; align-items: flex-end; gap: 3px; height: 80px; }',
      '.tv-ht-bar { flex: 1; background: linear-gradient(180deg, #fda4af, #f43f5e); border-radius: 3px 3px 0 0; min-height: 3px; }',
      '.tv-ht-bar.steps { background: linear-gradient(180deg, #86efac, #22c55e); }',
      '.tv-ht-bar.sleep { background: linear-gradient(180deg, #c4b5fd, #8b5cf6); }',
      '.tv-ht-labels { display: flex; gap: 3px; margin-top: 4px; }',
      '.tv-ht-label { flex: 1; text-align: center; font-size: 0.6rem; color: #94a3b8; }',

      /* ===== 情绪 ===== */
      '.tv-mood-overview { display: flex; align-items: center; gap: 16px; margin-bottom: 14px; }',
      '.tv-mood-score-big { width: 80px; height: 80px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #c4b5fd, #8b5cf6); color: #fff; flex-shrink: 0; }',
      '.tv-mood-score-num { font-size: 1.6rem; font-weight: 800; line-height: 1; }',
      '.tv-mood-score-label { font-size: 0.7rem; opacity: 0.9; margin-top: 2px; }',
      '.tv-mood-summary { flex: 1; }',
      '.tv-mood-summary-row { display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px; }',
      '.tv-mood-summary-label { color: #64748b; }',
      '.tv-mood-summary-val { color: #1e293b; font-weight: 600; }',

      /* 情绪分布 */
      '.tv-mood-distribution { display: flex; gap: 4px; margin-bottom: 14px; }',
      '.tv-mood-bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }',
      '.tv-mood-bar-col { width: 100%; height: 80px; background: #f1f5f9; border-radius: 6px; display: flex; align-items: flex-end; overflow: hidden; }',
      '.tv-mood-bar-fill { width: 100%; border-radius: 6px 6px 0 0; transition: height 0.6s ease; }',
      '.tv-mood-bar-label { font-size: 0.68rem; color: #64748b; }',
      '.tv-mood-bar-count { font-size: 0.65rem; color: #94a3b8; }',

      /* 情绪事件 */
      '.tv-mood-events { display: flex; flex-direction: column; gap: 6px; }',
      '.tv-mood-event-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #f8fafc; border-radius: 8px; }',
      '.tv-mood-event-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }',
      '.tv-mood-event-text { flex: 1; font-size: 0.78rem; color: #334155; }',
      '.tv-mood-event-date { font-size: 0.68rem; color: #94a3b8; }',

      /* ===== 月度报告 ===== */
      '.tv-report-header { text-align: center; padding: 20px 0 14px; }',
      '.tv-report-month { font-size: 1.2rem; font-weight: 800; color: #1e293b; }',
      '.tv-report-subtitle { font-size: 0.78rem; color: #64748b; margin-top: 4px; }',

      '.tv-report-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }',
      '.tv-stat-card { padding: 12px; background: #f8fafc; border-radius: 10px; }',
      '.tv-stat-card-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }',
      '.tv-stat-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }',
      '.tv-stat-icon.orange { background: #ffedd5; }',
      '.tv-stat-icon.green { background: #dcfce7; }',
      '.tv-stat-icon.red { background: #fee2e2; }',
      '.tv-stat-icon.purple { background: #f3e8ff; }',
      '.tv-stat-label { font-size: 0.75rem; color: #475569; font-weight: 600; }',
      '.tv-stat-value { font-size: 1.1rem; font-weight: 700; color: #1e293b; }',
      '.tv-stat-unit { font-size: 0.7rem; color: #94a3b8; font-weight: 400; }',
      '.tv-stat-sub { font-size: 0.7rem; color: #64748b; margin-top: 2px; }',

      /* AI 洞察 */
      '.tv-ai-section { background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%); border-radius: 14px; padding: 16px; margin-bottom: 12px; border: 1px solid #dbeafe; }',
      '.tv-ai-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }',
      '.tv-ai-icon { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, #8b5cf6, #3b82f6); display: flex; align-items: center; justify-content: center; }',
      '.tv-ai-title { font-size: 0.9rem; font-weight: 700; color: #1e293b; }',
      '.tv-ai-subtitle { font-size: 0.72rem; color: #6366f1; }',
      '.tv-ai-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px; background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: #fff; border: none; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer; margin-left: auto; transition: all 0.2s; }',
      '.tv-ai-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }',
      '.tv-ai-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }',
      '.tv-ai-content { font-size: 0.82rem; color: #334155; line-height: 1.7; }',
      '.tv-ai-content p { margin-bottom: 8px; }',
      '.tv-ai-content p:last-child { margin-bottom: 0; }',
      '.tv-ai-content strong { color: #1e293b; }',
      '.tv-ai-loading { display: flex; align-items: center; gap: 10px; padding: 12px 0; color: #6366f1; font-size: 0.8rem; }',
      '.tv-ai-spinner { width: 18px; height: 18px; border: 2px solid #c7d2fe; border-top-color: #6366f1; border-radius: 50%; animation: tv-spin 0.8s linear infinite; }',
      '@keyframes tv-spin { to { transform: rotate(360deg); } }',
      '.tv-ai-error { color: #dc2626; font-size: 0.78rem; padding: 8px 0; }',

      /* ===== 首页入口卡片 ===== */
      '.tv-entry-card { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 14px; padding: 16px; color: #fff; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }',
      '.tv-entry-card:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(30,41,59,0.3); }',
      '.tv-entry-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }',
      '.tv-entry-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; }',
      '.tv-entry-title { font-size: 0.95rem; font-weight: 700; }',
      '.tv-entry-subtitle { font-size: 0.7rem; color: #94a3b8; }',
      '.tv-entry-metrics { display: flex; gap: 12px; }',
      '.tv-entry-metric { flex: 1; }',
      '.tv-entry-metric-label { font-size: 0.68rem; color: #94a3b8; margin-bottom: 2px; }',
      '.tv-entry-metric-value { font-size: 0.9rem; font-weight: 700; }',
      '.tv-entry-arrow { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); opacity: 0.5; }',
      '.tv-entry-decor { position: absolute; right: -20px; bottom: -20px; width: 100px; height: 100px; border-radius: 50%; background: rgba(249, 115, 22, 0.2); }',

      /* ===== 月份选择器 ===== */
      '.tv-month-selector { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 12px; }',
      '.tv-month-btn { width: 28px; height: 28px; border-radius: 8px; background: #f1f5f9; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; transition: all 0.2s; }',
      '.tv-month-btn:hover { background: #e2e8f0; color: #1e293b; }',
      '.tv-month-btn:disabled { opacity: 0.4; cursor: not-allowed; }',
      '.tv-month-display { font-size: 0.85rem; font-weight: 600; color: #1e293b; min-width: 80px; text-align: center; }',

      /* ===== Tab content 动画 ===== */
      '.tv-tab-content { animation: tv-fadeIn 0.3s ease; }',
      '@keyframes tv-fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }',

      /* ===== 响应式 ===== */
      '@media (max-width: 360px) {',
      '  .tv-metrics-grid { grid-template-columns: 1fr; }',
      '  .tv-health-grid { grid-template-columns: 1fr; }',
      '  .tv-report-stats { grid-template-columns: 1fr; }',
      '}'
    ].join('\n');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ==================== 当前状态 ====================
  var _state = {
    activeTab: 'finance',
    selectedMonth: getCurrentMonthKey(),
    aiInsightCache: {}, // { 'YYYY-MM': 'insight text' }
    aiLoading: false,
    container: null
  };

  // ==================== Tab 内容渲染 ====================

  /** 渲染财务诊断Tab */
  function renderFinanceTab() {
    var history = getDiagnosisHistory();

    if (!history || history.length < 2) {
      return '<div class="tv-card">' +
        '<h3 class="tv-card-title">' + svgIcon('finance', 16, '#f59e0b') + '财务诊断趋势</h3>' +
        '<div class="tv-empty">' +
        '<div class="tv-empty-icon">' + svgIcon('barChart', 28, '#cbd5e1') + '</div>' +
        '<div class="tv-empty-text">至少需要2次诊断记录才能对比</div>' +
        '<div class="tv-empty-hint">完成第2次体检后，即可查看趋势变化</div>' +
        '</div></div>';
    }

    var prev = history[history.length - 2];
    var curr = history[history.length - 1];

    var html = '';
    html += renderScoreTrend(prev, curr);
    html += renderDimensionComparison(prev, curr);
    html += renderMetricsTrend(prev, curr);
    html += renderHistoryList(history);
    return html;
  }

  function renderScoreTrend(prev, curr) {
    var diff = calcDiff(curr.total, prev.total);
    var isUp = diff > 0;
    var isDown = diff < 0;
    var arrowIcon = isUp ? '↑' : (isDown ? '↓' : '→');
    var diffSign = diff > 0 ? '+' : '';
    var arrowCls = diff > 0 ? 'tv-up-good' : (diff < 0 ? 'tv-down-bad' : 'tv-neutral');

    var html = '<div class="tv-card">';
    html += '<h3 class="tv-card-title">' + svgIcon('finance', 16, '#f59e0b') + '总分趋势</h3>';
    html += '<div class="tv-score-row">';
    // 上期
    html += '<div class="tv-score-block">';
    html += '<div class="tv-score-label">' + periodLabel(prev.timestamp) + '</div>';
    html += '<div class="tv-score-value" style="color:' + gradeColor(prev.grade) + '">' + prev.total + '</div>';
    html += '<div class="tv-score-grade ' + gradeClass(prev.grade) + '">' + (prev.gradeLabel || gradeLabelFromGrade(prev.grade)) + '</div>';
    html += '</div>';
    // 箭头
    html += '<div class="tv-score-arrow">';
    html += '<span class="tv-arrow-big ' + arrowCls + '">' + arrowIcon + '</span>';
    html += '<div class="tv-diff-big ' + arrowCls + '">' + diffSign + diff + '</div>';
    html += '</div>';
    // 本期
    html += '<div class="tv-score-block">';
    html += '<div class="tv-score-label">' + periodLabel(curr.timestamp) + '</div>';
    html += '<div class="tv-score-value" style="color:' + gradeColor(curr.grade) + '">' + curr.total + '</div>';
    html += '<div class="tv-score-grade ' + gradeClass(curr.grade) + '">' + (curr.gradeLabel || gradeLabelFromGrade(curr.grade)) + '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderDimensionComparison(prev, curr) {
    function dimMap(record) {
      var map = {};
      (record.dimensions || []).forEach(function(d) { map[d.name] = d.score; });
      return map;
    }
    var prevMap = dimMap(prev);
    var currMap = dimMap(curr);

    var html = '<div class="tv-card">';
    html += '<h3 class="tv-card-title">' + svgIcon('target', 16, '#ef4444') + '六维度对比</h3>';
    html += '<div class="tv-dim-legend">';
    html += '<span><span class="tv-legend-dot" style="background:#93c5fd"></span>' + periodLabel(prev.timestamp) + '</span>';
    html += '<span><span class="tv-legend-dot" style="background:#f97316"></span>' + periodLabel(curr.timestamp) + '</span>';
    html += '</div>';

    DIM_NAMES.forEach(function(name) {
      var pScore = prevMap[name] !== undefined ? prevMap[name] : 0;
      var cScore = currMap[name] !== undefined ? currMap[name] : 0;
      var diff = cScore - pScore;
      var diffCls = diff > 0 ? 'tv-good' : (diff < 0 ? 'tv-bad' : 'tv-neutral');
      var diffSign = diff > 0 ? '+' : '';

      html += '<div class="tv-dim-row">';
      html += '<div class="tv-dim-name">' + name + '</div>';
      html += '<div class="tv-dim-bars">';
      html += '<div class="tv-dim-bar-wrap"><div class="tv-dim-bar tv-dim-bar-prev" style="width:' + pScore + '%"></div></div>';
      html += '<div class="tv-dim-bar-wrap"><div class="tv-dim-bar tv-dim-bar-curr" style="width:' + cScore + '%;background:' + (diff >= 0 ? '#f97316' : '#ef4444') + '"></div></div>';
      html += '</div>';
      html += '<div class="tv-dim-scores">';
      html += '<span class="tv-dim-pscore">' + pScore + '</span>';
      html += '<span class="tv-dim-sep">→</span>';
      html += '<span class="tv-dim-cscore">' + cScore + '</span>';
      html += '<span class="tv-dim-diff ' + diffCls + '">' + diffSign + diff + '</span>';
      html += '</div>';
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  function renderMetricsTrend(prev, curr) {
    var html = '<div class="tv-card">';
    html += '<h3 class="tv-card-title">' + svgIcon('barChart', 16, '#f59e0b') + '关键指标变化</h3>';
    html += '<div class="tv-metrics-grid">';

    KEY_METRICS.forEach(function(metric) {
      var prevVal = prev.metrics ? prev.metrics[metric.key] : undefined;
      var currVal = curr.metrics ? curr.metrics[metric.key] : undefined;
      var diff = calcDiff(currVal, prevVal);

      html += '<div class="tv-metric-item">';
      html += '<div class="tv-metric-label">' + metric.label + '</div>';
      html += '<div class="tv-metric-values">';
      html += '<span class="tv-metric-prev">' + formatValue(prevVal, metric.format) + '</span>';
      html += '<span class="tv-metric-sep">→</span>';
      html += '<span class="tv-metric-curr">' + formatValue(currVal, metric.format) + '</span>';
      html += '</div>';
      html += '<div class="tv-metric-change">';
      html += arrowHtml(diff, metric.positive);
      html += diffHtml(diff, metric.format, metric.positive);
      html += '<span class="tv-metric-unit">' + metric.unit + '</span>';
      html += '</div>';
      html += '</div>';
    });

    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderHistoryList(history) {
    var html = '<div class="tv-card">';
    html += '<h3 class="tv-card-title">' + svgIcon('calendar', 16, '#6b7280') + '诊断历史</h3>';

    if (history.length === 0) {
      html += '<div class="tv-empty"><div class="tv-empty-text">暂无诊断记录</div></div>';
    } else {
      html += '<div class="tv-history-list">';
      var sorted = history.slice().reverse();
      sorted.forEach(function(record) {
        var tagLabel = record.tag === 'auto' ? '自动' : '手动';
        var tagCls = record.tag === 'auto' ? 'tv-tag-auto' : 'tv-tag-manual';
        html += '<div class="tv-history-item">';
        html += '<div class="tv-history-left">';
        html += '<span class="tv-history-time">' + formatTime(record.timestamp) + '</span>';
        html += '<span class="tv-history-tag ' + tagCls + '">' + tagLabel + '</span>';
        html += '</div>';
        html += '<div class="tv-history-right">';
        html += '<span class="tv-history-score" style="color:' + gradeColor(record.grade) + '">' + record.total + '分</span>';
        html += '<span class="tv-history-grade ' + gradeClass(record.grade) + '">' + (record.gradeLabel || gradeLabelFromGrade(record.grade)) + '</span>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /** 渲染收支趋势Tab */
  function renderIncomeTab() {
    var records = getTxRecords();
    var monthly = aggregateTxByMonth(records);

    if (monthly.length === 0) {
      return '<div class="tv-card">' +
        '<h3 class="tv-card-title">' + svgIcon('wallet', 16, '#10b981') + '收支趋势</h3>' +
        '<div class="tv-empty">' +
        '<div class="tv-empty-icon">' + svgIcon('wallet', 28, '#cbd5e1') + '</div>' +
        '<div class="tv-empty-text">暂无收支记录</div>' +
        '<div class="tv-empty-hint">记一笔账，开始追踪你的收支</div>' +
        '</div></div>';
    }

    var html = '';

    // 最近月份概览
    var latest = monthly[monthly.length - 1];
    var prevMonth = monthly.length >= 2 ? monthly[monthly.length - 2] : null;
    var balance = latest.income - latest.expense;
    var balanceDiff = prevMonth ? (latest.income - latest.expense) - (prevMonth.income - prevMonth.expense) : null;

    html += '<div class="tv-card">';
    html += '<h3 class="tv-card-title">' + svgIcon('wallet', 16, '#10b981') + '本月收支概览<span class="tv-card-subtitle">' + monthLabel(latest.month) + '</span></h3>';
    html += '<div class="tv-income-overview">';
    html += '<div class="tv-income-stat income">';
    html += '<div class="tv-income-stat-label">总收入</div>';
    html += '<div class="tv-income-stat-value">' + formatMoney(latest.income) + '</div>';
    html += '<div class="tv-metric-change" style="justify-content:center">' +
      arrowHtml(prevMonth ? calcDiff(latest.income, prevMonth.income) : null, true) +
      diffHtml(prevMonth ? calcDiff(latest.income, prevMonth.income) : null, 'money', true) + '</div>';
    html += '</div>';
    html += '<div class="tv-income-stat expense">';
    html += '<div class="tv-income-stat-label">总支出</div>';
    html += '<div class="tv-income-stat-value">' + formatMoney(latest.expense) + '</div>';
    html += '<div class="tv-metric-change" style="justify-content:center">' +
      arrowHtml(prevMonth ? calcDiff(latest.expense, prevMonth.expense) : null, false) +
      diffHtml(prevMonth ? calcDiff(latest.expense, prevMonth.expense) : null, 'money', false) + '</div>';
    html += '</div>';
    html += '<div class="tv-income-stat balance">';
    html += '<div class="tv-income-stat-label">结余</div>';
    html += '<div class="tv-income-stat-value">' + formatMoney(balance) + '</div>';
    html += '<div class="tv-metric-change" style="justify-content:center">' +
      arrowHtml(balanceDiff, true) +
      diffHtml(balanceDiff, 'money', true) + '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // 月度趋势柱状图（最近6个月）
    var recent6 = monthly.slice(-6);
    var maxVal = 0;
    recent6.forEach(function(m) {
      if (m.income > maxVal) maxVal = m.income;
      if (m.expense > maxVal) maxVal = m.expense;
    });
    if (maxVal === 0) maxVal = 1;

    html += '<div class="tv-card">';
    html += '<h3 class="tv-card-title">' + svgIcon('barChart', 16, '#3b82f6') + '月度趋势<span class="tv-card-subtitle">近6个月</span></h3>';
    html += '<div class="tv-bar-chart">';
    recent6.forEach(function(m) {
      var incomeH = Math.max(2, Math.round(m.income / maxVal * 100));
      var expenseH = Math.max(2, Math.round(m.expense / maxVal * 100));
      html += '<div class="tv-bar-group">';
      html += '<div class="tv-bar-col">';
      html += '<div class="tv-bar income" style="height:' + incomeH + '%"></div>';
      html += '<div class="tv-bar expense" style="height:' + expenseH + '%"></div>';
      html += '</div>';
      html += '<div class="tv-bar-label">' + monthLabel(m.month) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div style="display:flex;gap:12px;justify-content:center;margin-top:8px;font-size:0.7rem;color:#64748b">';
    html += '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#10b981;margin-right:4px;vertical-align:middle"></span>收入</span>';
    html += '<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#ef4444;margin-right:4px;vertical-align:middle"></span>支出</span>';
    html += '</div>';
    html += '</div>';

    // 本月支出分类
    var breakdown = getTxCategoryBreakdown(records, latest.month);
    if (breakdown.length > 0) {
      var catColors = ['#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#dc2626', '#b91c1c', '#0ea5e9', '#14b8a6'];
      html += '<div class="tv-card">';
      html += '<h3 class="tv-card-title">' + svgIcon('pieChart', 16, '#8b5cf6') + '支出分类<span class="tv-card-subtitle">' + monthLabel(latest.month) + ' · 共' + breakdown.length + '类</span></h3>';
      html += '<div class="tv-category-list">';
      var totalExp = latest.expense || 1;
      breakdown.forEach(function(item, idx) {
        var pct = Math.round(item.amount / totalExp * 100);
        var color = catColors[idx % catColors.length];
        html += '<div class="tv-category-item">';
        html += '<div class="tv-cat-color" style="background:' + color + '"></div>';
        html += '<div class="tv-cat-name">' + esc(item.category) + '</div>';
        html += '<div class="tv-cat-bar"><div class="tv-cat-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
        html += '<div class="tv-cat-pct">' + pct + '%</div>';
        html += '<div class="tv-cat-amount">' + formatMoney(item.amount) + '</div>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
    }

    return html;
  }

  /** 渲染健康数据Tab */
  function renderHealthTab() {
    var records = getHealthRecords();
    var monthly = aggregateHealthByMonth(records);

    if (monthly.length === 0 || records.length === 0) {
      return '<div class="tv-card">' +
        '<h3 class="tv-card-title">' + svgIcon('heart', 16, '#ef4444') + '健康数据</h3>' +
        '<div class="tv-empty">' +
        '<div class="tv-empty-icon">' + svgIcon('heart', 28, '#cbd5e1') + '</div>' +
        '<div class="tv-empty-text">暂无健康数据</div>' +
        '<div class="tv-empty-hint">导入健康数据或手动记录，开始追踪你的身体状态</div>' +
        '</div></div>';
    }

    var html = '';
    var latest = monthly[monthly.length - 1];
    var prevMonth = monthly.length >= 2 ? monthly[monthly.length - 2] : null;

    // 核心指标
    html += '<div class="tv-card">';
    html += '<h3 class="tv-card-title">' + svgIcon('heart', 16, '#ef4444') + '本月健康概览<span class="tv-card-subtitle">' + monthLabel(latest.month) + ' · ' + latest.days + '天记录</span></h3>';
    html += '<div class="tv-health-grid">';

    // 步数
    var stepsDiff = prevMonth ? calcDiff(latest.avgSteps, prevMonth.avgSteps) : null;
    html += '<div class="tv-health-item">';
    html += '<div class="tv-health-item-header">' + svgIcon('activity', 14, '#22c55e') + '<span class="tv-health-item-label">日均步数</span></div>';
    html += '<div class="tv-health-item-value">' + latest.avgSteps.toLocaleString() + '<span class="tv-health-item-unit">步</span></div>';
    html += '<div class="tv-health-item-trend">' + arrowHtml(stepsDiff, true) + diffHtml(stepsDiff, 'num', true) + ' 较上月</div>';
    html += '</div>';

    // 睡眠
    var sleepDiff = prevMonth ? calcDiff(latest.avgSleep, prevMonth.avgSleep) : null;
    html += '<div class="tv-health-item">';
    html += '<div class="tv-health-item-header">' + svgIcon('moon', 14, '#8b5cf6') + '<span class="tv-health-item-label">日均睡眠</span></div>';
    html += '<div class="tv-health-item-value">' + latest.avgSleep + '<span class="tv-health-item-unit">小时</span></div>';
    html += '<div class="tv-health-item-trend">' + arrowHtml(sleepDiff, true) + diffHtml(sleepDiff, 'num', true) + ' 较上月</div>';
    html += '</div>';

    // 心率
    var hrDiff = prevMonth ? calcDiff(latest.avgHeartRate, prevMonth.avgHeartRate) : null;
    html += '<div class="tv-health-item">';
    html += '<div class="tv-health-item-header">' + svgIcon('heart', 14, '#ef4444') + '<span class="tv-health-item-label">平均心率</span></div>';
    html += '<div class="tv-health-item-value">' + latest.avgHeartRate + '<span class="tv-health-item-unit">bpm</span></div>';
    html += '<div class="tv-health-item-trend">' + arrowHtml(hrDiff, false) + diffHtml(hrDiff, 'num', false) + ' 较上月</div>';
    html += '</div>';

    // 运动
    var activeDiff = prevMonth ? calcDiff(latest.avgActiveMinutes, prevMonth.avgActiveMinutes) : null;
    html += '<div class="tv-health-item">';
    html += '<div class="tv-health-item-header">' + svgIcon('zap', 14, '#f59e0b') + '<span class="tv-health-item-label">日均运动</span></div>';
    html += '<div class="tv-health-item-value">' + latest.avgActiveMinutes + '<span class="tv-health-item-unit">分钟</span></div>';
    html += '<div class="tv-health-item-trend">' + arrowHtml(activeDiff, true) + diffHtml(activeDiff, 'num', true) + ' 较上月</div>';
    html += '</div>';

    html += '</div>';
    html += '</div>';

    // 步数趋势（最近30天）
    var recent30 = records.slice(-30);
    if (recent30.length > 0) {
      var maxSteps = 0;
      recent30.forEach(function(r) { if (r.steps > maxSteps) maxSteps = r.steps; });
      if (maxSteps === 0) maxSteps = 1;

      html += '<div class="tv-card">';
      html += '<h3 class="tv-card-title">' + svgIcon('activity', 16, '#22c55e') + '步数趋势<span class="tv-card-subtitle">最近' + recent30.length + '天</span></h3>';
      html += '<div class="tv-ht-chart">';
      recent30.forEach(function(r) {
        var h = Math.max(2, Math.round((r.steps || 0) / maxSteps * 100));
        html += '<div class="tv-ht-bar steps" style="height:' + h + '%"></div>';
      });
      html += '</div>';
      html += '<div class="tv-ht-labels">';
      var step = Math.ceil(recent30.length / 5);
      for (var i = 0; i < recent30.length; i += step) {
        html += '<span class="tv-ht-label">' + (recent30[i].date || '').substr(5) + '</span>';
      }
      html += '</div>';
      html += '</div>';
    }

    // 睡眠趋势（最近30天）
    var hasSleep = recent30.some(function(r) { return r.sleep && r.sleep.total > 0; });
    if (hasSleep) {
      var maxSleep = 0;
      recent30.forEach(function(r) {
        var s = r.sleep ? r.sleep.total : 0;
        if (s > maxSleep) maxSleep = s;
      });
      if (maxSleep === 0) maxSleep = 10;

      html += '<div class="tv-card">';
      html += '<h3 class="tv-card-title">' + svgIcon('moon', 16, '#8b5cf6') + '睡眠趋势<span class="tv-card-subtitle">最近' + recent30.length + '天</span></h3>';
      html += '<div class="tv-ht-chart">';
      recent30.forEach(function(r) {
        var s = r.sleep ? r.sleep.total : 0;
        var h = Math.max(2, Math.round(s / maxSleep * 100));
        html += '<div class="tv-ht-bar sleep" style="height:' + h + '%"></div>';
      });
      html += '</div>';
      html += '<div class="tv-ht-labels">';
      var step2 = Math.ceil(recent30.length / 5);
      for (var j = 0; j < recent30.length; j += step2) {
        html += '<span class="tv-ht-label">' + (recent30[j].date || '').substr(5) + '</span>';
      }
      html += '</div>';
      html += '</div>';
    }

    return html;
  }

  /** 渲染情绪Tab */
  function renderMoodTab() {
    var logs = getMoodLogs();
    var monthly = aggregateMoodByMonth(logs);

    if (monthly.length === 0 || logs.length === 0) {
      return '<div class="tv-card">' +
        '<h3 class="tv-card-title">' + svgIcon('smile', 16, '#8b5cf6') + '情绪曲线</h3>' +
        '<div class="tv-empty">' +
        '<div class="tv-empty-icon">' + svgIcon('smile', 28, '#cbd5e1') + '</div>' +
        '<div class="tv-empty-text">暂无情绪记录</div>' +
        '<div class="tv-empty-hint">记录每一天的心情，看见情绪的轨迹</div>' +
        '</div></div>';
    }

    var html = '';
    var latest = monthly[monthly.length - 1];
    var prevMonth = monthly.length >= 2 ? monthly[monthly.length - 2] : null;

    // 情绪概览
    var scoreLabel = MOOD_LABELS[Math.min(4, Math.max(0, Math.round(latest.avgScore) - 1))];
    var scoreColor = scoreLabel ? scoreLabel.color : '#94a3b8';
    var scoreLabelText = scoreLabel ? scoreLabel.label : '--';

    html += '<div class="tv-card">';
    html += '<h3 class="tv-card-title">' + svgIcon('smile', 16, '#8b5cf6') + '本月情绪概览<span class="tv-card-subtitle">' + monthLabel(latest.month) + ' · 共' + latest.count + '条记录</span></h3>';
    html += '<div class="tv-mood-overview">';
    html += '<div class="tv-mood-score-big" style="background:linear-gradient(135deg, ' + scoreColor + '99, ' + scoreColor + ')">';
    html += '<div class="tv-mood-score-num">' + latest.avgScore + '</div>';
    html += '<div class="tv-mood-score-label">平均分</div>';
    html += '</div>';
    html += '<div class="tv-mood-summary">';
    html += '<div class="tv-mood-summary-row"><span class="tv-mood-summary-label">情绪状态</span><span class="tv-mood-summary-val" style="color:' + scoreColor + '">' + scoreLabelText + '</span></div>';
    html += '<div class="tv-mood-summary-row"><span class="tv-mood-summary-label">记录天数</span><span class="tv-mood-summary-val">' + latest.count + '天</span></div>';
    if (prevMonth) {
      var scoreDiff = calcDiff(latest.avgScore, prevMonth.avgScore);
      html += '<div class="tv-mood-summary-row"><span class="tv-mood-summary-label">较上月</span><span class="tv-mood-summary-val">' +
        arrowHtml(scoreDiff, true) + diffHtml(scoreDiff, 'num', true) + ' 分</span></div>';
    }
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // 情绪分布
    html += '<div class="tv-card">';
    html += '<h3 class="tv-card-title">' + svgIcon('barChart', 16, '#a855f7') + '情绪分布</h3>';
    html += '<div class="tv-mood-distribution">';

    var maxCount = 0;
    MOOD_LABELS.forEach(function(m) {
      var c = latest.distribution[String(m.score)] || 0;
      if (c > maxCount) maxCount = c;
    });
    if (maxCount === 0) maxCount = 1;

    MOOD_LABELS.forEach(function(m) {
      var count = latest.distribution[String(m.score)] || 0;
      var h = Math.max(2, Math.round(count / maxCount * 100));
      html += '<div class="tv-mood-bar-item">';
      html += '<div class="tv-mood-bar-col"><div class="tv-mood-bar-fill" style="height:' + h + '%;background:' + m.color + '"></div></div>';
      html += '<div class="tv-mood-bar-count">' + count + '</div>';
      html += '<div class="tv-mood-bar-label">' + m.label + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    // 月度趋势（近6个月平均分）
    if (monthly.length >= 2) {
      var recent6 = monthly.slice(-6);
      var maxAvg = 5;
      html += '<div class="tv-card">';
      html += '<h3 class="tv-card-title">' + svgIcon('activity', 16, '#8b5cf6') + '情绪趋势<span class="tv-card-subtitle">近6个月</span></h3>';
      html += '<div class="tv-bar-chart">';
      recent6.forEach(function(m) {
        var h = Math.max(2, Math.round(m.avgScore / maxAvg * 100));
        var ml = MOOD_LABELS[Math.min(4, Math.max(0, Math.round(m.avgScore) - 1))];
        var color = ml ? ml.color : '#94a3b8';
        html += '<div class="tv-bar-group">';
        html += '<div class="tv-bar-col" style="height:120px;justify-content:flex-end">';
        html += '<div class="tv-bar" style="width:20px;background:linear-gradient(180deg, ' + color + '99, ' + color + ');height:' + h + '%"></div>';
        html += '</div>';
        html += '<div class="tv-bar-label">' + monthLabel(m.month) + '</div>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
    }

    // 关键事件
    var recentEvents = logs.slice(-20).reverse().slice(0, 8);
    if (recentEvents.length > 0) {
      html += '<div class="tv-card">';
      html += '<h3 class="tv-card-title">' + svgIcon('bookOpen', 16, '#6366f1') + '情绪事件</h3>';
      html += '<div class="tv-mood-events">';
      recentEvents.forEach(function(entry) {
        var ml = MOOD_LABELS[Math.min(4, Math.max(0, (entry.score || 3) - 1))];
        var color = ml ? ml.color : '#94a3b8';
        var date = entry.timestamp ? new Date(entry.timestamp) : new Date();
        var dateStr = (date.getMonth() + 1) + '/' + date.getDate();
        html += '<div class="tv-mood-event-item">';
        html += '<div class="tv-mood-event-dot" style="background:' + color + '"></div>';
        html += '<div class="tv-mood-event-text">' + esc(entry.event || entry.note || '记录一次心情') + '</div>';
        html += '<div class="tv-mood-event-date">' + dateStr + '</div>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
    }

    return html;
  }

  /** 渲染月度报告Tab */
  function renderReportTab() {
    var monthKey = _state.selectedMonth;
    var html = '';

    // 报告头部 + 月份选择
    var year = parseInt(monthKey.split('-')[0], 10);
    var month = parseInt(monthKey.split('-')[1], 10);
    var prevKey = year + '-' + String(month - 1).padStart(2, '0');
    if (month === 1) prevKey = (year - 1) + '-12';
    var nextKey = year + '-' + String(month + 1).padStart(2, '0');
    if (month === 12) nextKey = (year + 1) + '-01';
    var isCurrent = monthKey === getCurrentMonthKey();

    html += '<div class="tv-card">';
    html += '<div class="tv-report-header">';
    html += '<div class="tv-month-selector">';
    html += '<button class="tv-month-btn" onclick="TrendView._changeMonth(-1)">' + svgIcon('chevronRight', 14, '#64748b', 2) + '</button>';
    html += '<div class="tv-month-display">' + year + '年' + month + '月报告</div>';
    html += '<button class="tv-month-btn" onclick="TrendView._changeMonth(1)" ' + (isCurrent ? 'disabled' : '') + '>' + svgIcon('chevronRight', 14, '#64748b', 2) + '</button>';
    html += '</div>';
    html += '<div class="tv-report-subtitle">数据驱动 · 看见生活的全貌</div>';
    html += '</div>';
    html += '</div>';

    // 数据统计卡片
    var reportData = getMonthlyReportData(monthKey);
    html += renderReportStats(reportData);

    // AI 洞察区
    html += renderAiSection(monthKey, reportData);

    return html;
  }

  /** 获取月度报告数据 */
  function getMonthlyReportData(monthKey) {
    var data = {
      month: monthKey,
      finance: null,
      income: { total: 0, expense: 0, balance: 0, count: 0 },
      health: { days: 0, avgSteps: 0, avgSleep: 0, avgHeartRate: 0, avgActive: 0 },
      mood: { count: 0, avgScore: 0, distribution: {}, events: [] }
    };

    // 财务：找该月的诊断记录（取最后一条）
    var history = getDiagnosisHistory();
    for (var i = history.length - 1; i >= 0; i--) {
      if (getMonthKey(history[i].timestamp) === monthKey) {
        data.finance = history[i];
        break;
      }
    }

    // 收支
    var txRecords = getTxRecords();
    txRecords.forEach(function(tx) {
      var dateStr = tx.date || tx.createdAt;
      if (!dateStr || getMonthKey(dateStr) !== monthKey) return;
      data.income.count++;
      if (tx.type === 'income') {
        data.income.total += parseFloat(tx.amount) || 0;
      } else {
        data.income.expense += parseFloat(tx.amount) || 0;
      }
    });
    data.income.balance = data.income.total - data.income.expense;

    // 健康
    var healthRecords = getHealthRecords();
    var hDays = 0, hSteps = 0, hStepsDays = 0, hSleep = 0, hSleepDays = 0, hHR = 0, hHRDays = 0, hActive = 0, hActiveDays = 0;
    healthRecords.forEach(function(r) {
      if (!r.date || getMonthKey(r.date) !== monthKey) return;
      hDays++;
      if (r.steps > 0) { hSteps += r.steps; hStepsDays++; }
      if (r.sleep && r.sleep.total > 0) { hSleep += r.sleep.total; hSleepDays++; }
      if (r.heartRate && r.heartRate.avg > 0) { hHR += r.heartRate.avg; hHRDays++; }
      if (r.activeMinutes > 0) { hActive += r.activeMinutes; hActiveDays++; }
    });
    data.health = {
      days: hDays,
      avgSteps: hStepsDays > 0 ? Math.round(hSteps / hStepsDays) : 0,
      avgSleep: hSleepDays > 0 ? Math.round(hSleep / hSleepDays * 10) / 10 : 0,
      avgHeartRate: hHRDays > 0 ? Math.round(hHR / hHRDays) : 0,
      avgActiveMinutes: hActiveDays > 0 ? Math.round(hActive / hActiveDays) : 0
    };

    // 情绪
    var moodLogs = getMoodLogs();
    var mCount = 0, mTotal = 0, mDist = {}, mEvents = [];
    moodLogs.forEach(function(entry) {
      if (!entry.timestamp || getMonthKey(new Date(entry.timestamp)) !== monthKey) return;
      mCount++;
      if (entry.score) {
        mTotal += entry.score;
        var s = String(entry.score);
        mDist[s] = (mDist[s] || 0) + 1;
      }
      if (entry.event && mEvents.length < 5) {
        mEvents.push(entry.event);
      }
    });
    data.mood = {
      count: mCount,
      avgScore: mCount > 0 ? Math.round(mTotal / mCount * 10) / 10 : 0,
      distribution: mDist,
      events: mEvents
    };

    return data;
  }

  /** 渲染报告数据统计 */
  function renderReportStats(data) {
    var html = '<div class="tv-card">';
    html += '<h3 class="tv-card-title">' + svgIcon('barChart', 16, '#3b82f6') + '本月数据全景</h3>';
    html += '<div class="tv-report-stats">';

    // 财务评分
    var financeVal = data.finance ? data.finance.total + '分' : '--';
    var financeGrade = data.finance ? (data.finance.gradeLabel || gradeLabelFromGrade(data.finance.grade)) : '暂无诊断';
    html += '<div class="tv-stat-card">';
    html += '<div class="tv-stat-card-header">';
    html += '<div class="tv-stat-icon orange">' + svgIcon('finance', 16, '#f97316') + '</div>';
    html += '<span class="tv-stat-label">财务健康</span>';
    html += '</div>';
    html += '<div class="tv-stat-value">' + financeVal + '</div>';
    html += '<div class="tv-stat-sub">' + esc(financeGrade) + '</div>';
    html += '</div>';

    // 收支结余
    var balanceText = formatMoney(data.income.balance);
    html += '<div class="tv-stat-card">';
    html += '<div class="tv-stat-card-header">';
    html += '<div class="tv-stat-icon green">' + svgIcon('wallet', 16, '#10b981') + '</div>';
    html += '<span class="tv-stat-label">月度结余</span>';
    html += '</div>';
    html += '<div class="tv-stat-value">' + balanceText + '</div>';
    html += '<div class="tv-stat-sub">收入' + formatMoney(data.income.total) + ' · 支出' + formatMoney(data.income.expense) + '</div>';
    html += '</div>';

    // 健康步数
    html += '<div class="tv-stat-card">';
    html += '<div class="tv-stat-card-header">';
    html += '<div class="tv-stat-icon red">' + svgIcon('heart', 16, '#ef4444') + '</div>';
    html += '<span class="tv-stat-label">健康状态</span>';
    html += '</div>';
    html += '<div class="tv-stat-value">' + data.health.avgSteps.toLocaleString() + '<span class="tv-stat-unit">步/日</span></div>';
    html += '<div class="tv-stat-sub">睡眠' + data.health.avgSleep + 'h · 心率' + data.health.avgHeartRate + 'bpm</div>';
    html += '</div>';

    // 情绪
    var moodMl = MOOD_LABELS[Math.min(4, Math.max(0, Math.round(data.mood.avgScore) - 1))];
    var moodLabel = moodMl ? moodMl.label : '--';
    html += '<div class="tv-stat-card">';
    html += '<div class="tv-stat-card-header">';
    html += '<div class="tv-stat-icon purple">' + svgIcon('smile', 16, '#8b5cf6') + '</div>';
    html += '<span class="tv-stat-label">情绪状态</span>';
    html += '</div>';
    html += '<div class="tv-stat-value">' + data.mood.avgScore + '<span class="tv-stat-unit"> / 5分</span></div>';
    html += '<div class="tv-stat-sub">' + esc(moodLabel) + ' · ' + data.mood.count + '条记录</div>';
    html += '</div>';

    html += '</div>';
    html += '</div>';
    return html;
  }

  /** 渲染AI洞察区 */
  function renderAiSection(monthKey, data) {
    var html = '<div class="tv-ai-section">';
    html += '<div class="tv-ai-header">';
    html += '<div class="tv-ai-icon">' + svgIcon('sparkles', 18, '#fff') + '</div>';
    html += '<div>';
    html += '<div class="tv-ai-title">AI 月度洞察</div>';
    html += '<div class="tv-ai-subtitle">基于你的多维度数据，生成个性化总结</div>';
    html += '</div>';
    html += '<button class="tv-ai-btn" onclick="TrendView._generateAiInsight(\'' + monthKey + '\')" id="tvAiBtn">' + svgIcon('zap', 12, '#fff') + '生成洞察</button>';
    html += '</div>';

    // 如果已有缓存，直接显示
    if (_state.aiInsightCache[monthKey]) {
      html += '<div class="tv-ai-content">' + _state.aiInsightCache[monthKey] + '</div>';
    } else {
      html += '<div class="tv-ai-content" id="tvAiContent">';
      html += '<p style="color:#64748b;font-size:0.8rem">点击右上角按钮，AI将基于本月的财务、收支、健康和情绪数据，为你生成一份深度洞察报告。</p>';
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /** 生成AI月度洞察 */
  async function generateAiInsight(monthKey) {
    var btn = document.getElementById('tvAiBtn');
    var content = document.getElementById('tvAiContent');

    if (_state.aiLoading) return;
    _state.aiLoading = true;
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="tv-ai-spinner" style="width:12px;height:12px;border-width:2px;margin-right:4px;display:inline-block;vertical-align:middle"></div>生成中...'; }
    if (content) { content.innerHTML = '<div class="tv-ai-loading"><div class="tv-ai-spinner"></div>AI正在分析你的月度数据...</div>'; }

    try {
      var data = getMonthlyReportData(monthKey);
      var prompt = buildInsightPrompt(monthKey, data);

      var result = null;
      if (global.AiEngine && typeof global.AiEngine.isConfigured === 'function' && global.AiEngine.isConfigured()) {
        // 使用AiEngine (走内部降级链)
        // 注意：AiEngine 内部的 callLLMWithFallback 不是直接暴露的，我们用 analyze 方式
        // 这里直接调用 fetch AI API 的方式
        result = await callAiDirect(prompt);
      } else {
        throw new Error('未配置AI服务');
      }

      if (result && result.trim()) {
        // 简单的HTML格式化：分段 + 加粗处理
        var formatted = formatInsightResult(result);
        _state.aiInsightCache[monthKey] = formatted;
        if (content) { content.innerHTML = formatted; }
      } else {
        throw new Error('AI返回内容为空');
      }
    } catch(e) {
      console.warn('[TrendView] AI洞察生成失败:', e);
      if (content) {
        content.innerHTML = '<div class="tv-ai-error">洞察生成失败：' + esc(e.message || '未知错误') + '。请检查AI配置后重试。</div>';
      }
    } finally {
      _state.aiLoading = false;
      if (btn) { btn.disabled = false; btn.innerHTML = svgIcon('zap', 12, '#fff') + '重新生成'; }
    }
  }

  /** 构建洞察Prompt */
  function buildInsightPrompt(monthKey, data) {
    var year = monthKey.split('-')[0];
    var month = monthKey.split('-')[1];
    var dateLabel = year + '年' + parseInt(month, 10) + '月';

    var prompt = '你是一位贴心的生活洞察顾问。请根据以下用户的' + dateLabel + '多维度数据，生成一份温暖、有洞察力的月度总结报告。\n\n';
    prompt += '【数据概览】\n';

    // 财务
    prompt += '📊 财务健康：';
    if (data.finance) {
      prompt += '总分' + data.finance.total + '分，等级' + (data.finance.gradeLabel || data.finance.grade);
      if (data.finance.metrics) {
        var m = data.finance.metrics;
        if (m.savingsRate !== undefined) prompt += '，储蓄率' + formatPct(m.savingsRate) + '%';
        if (m.debtAssetRatio !== undefined) prompt += '，资产负债率' + formatPct(m.debtAssetRatio) + '%';
      }
      if (data.finance.dimensions && data.finance.dimensions.length > 0) {
        var bestDim = data.finance.dimensions.reduce(function(a, b) { return a.score > b.score ? a : b; });
        var worstDim = data.finance.dimensions.reduce(function(a, b) { return a.score < b.score ? a : b; });
        prompt += '。最强维度：' + bestDim.name + '(' + bestDim.score + '分)；最弱维度：' + worstDim.name + '(' + worstDim.score + '分)';
      }
    } else {
      prompt += '本月暂无诊断记录';
    }
    prompt += '\n';

    // 收支
    prompt += '💰 收支情况：总收入' + formatMoney(data.income.total) + '元，总支出' + formatMoney(data.income.expense) + '元，结余' + formatMoney(data.income.balance) + '元，共' + data.income.count + '笔交易。\n';

    // 健康
    prompt += '❤️ 健康数据：';
    if (data.health.days > 0) {
      prompt += '共' + data.health.days + '天记录。日均步数' + data.health.avgSteps + '步，睡眠' + data.health.avgSleep + '小时，平均心率' + data.health.avgHeartRate + 'bpm，日均运动' + data.health.avgActiveMinutes + '分钟。';
    } else {
      prompt += '本月暂无健康数据记录。';
    }
    prompt += '\n';

    // 情绪
    prompt += '😊 情绪状态：';
    if (data.mood.count > 0) {
      prompt += '共' + data.mood.count + '条记录，平均' + data.mood.avgScore + '分(满分5)。';
      // 找最多的情绪
      var maxMood = 0, maxMoodLabel = '';
      MOOD_LABELS.forEach(function(ml) {
        var c = data.mood.distribution[String(ml.score)] || 0;
        if (c > maxMood) { maxMood = c; maxMoodLabel = ml.label; }
      });
      if (maxMoodLabel) prompt += '最常见的情绪是' + maxMoodLabel + '。';
      if (data.mood.events.length > 0) {
        prompt += ' 关键事件：' + data.mood.events.join('、') + '。';
      }
    } else {
      prompt += '本月暂无情绪记录。';
    }
    prompt += '\n\n';

    prompt += '【输出要求】\n';
    prompt += '1. 用温暖亲切的语气，像朋友一样总结\n';
    prompt += '2. 分3-4个段落：本月亮点、值得关注、跨维度关联发现、下月建议\n';
    prompt += '3. 每段3-4句话，不超过300字\n';
    prompt += '4. 重点突出数据之间的关联性（如：支出高的日子情绪如何？睡眠和运动的关系？）\n';
    prompt += '5. 使用HTML标签格式化，用<strong>加粗关键词，用<p>分段\n';
    prompt += '6. 不要使用markdown格式，直接输出HTML内容\n';
    prompt += '7. 如果某个维度没有数据，就跳过不提，不要编造\n';

    return prompt;
  }

  /** 直接调用AI API (走AiEngine的配置) */
  async function callAiDirect(prompt) {
    try {
      // 获取AiEngine配置
      var cfg = null;
      if (global.AiEngine && typeof global.AiEngine.getConfig === 'function') {
        cfg = global.AiEngine.getConfig();
      }

      if (!cfg || !cfg.providers) {
        // 尝试从DataStore读取
        if (global.DataStore) {
          cfg = global.DataStore.load('ai_engine', 'config', null);
        }
      }

      if (!cfg || !cfg.providers) {
        throw new Error('未找到AI配置');
      }

      // 找第一个有key的provider
      var provider = null;
      var providers = cfg.providers || {};
      for (var pid in providers) {
        if (providers[pid] && providers[pid].apiKey) {
          // 获取provider的完整信息
          var providerList = [];
          if (global.AiEngine && typeof global.AiEngine.getProviders === 'function') {
            providerList = global.AiEngine.getProviders();
          }
          for (var i = 0; i < providerList.length; i++) {
            if (providerList[i].id === pid) {
              provider = Object.assign({}, providerList[i], providers[pid]);
              break;
            }
          }
          if (provider) break;
        }
      }

      if (!provider) {
        throw new Error('未配置有效的AI API Key');
      }

      var apiBase = provider.apiBase;
      var model = provider.model || provider.defaultModel;
      var apiKey = provider.apiKey;

      if (!apiBase || !model || !apiKey) {
        throw new Error('AI配置不完整');
      }

      // 调用API
      var response = await fetch(apiBase + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: '你是一位温暖贴心的生活洞察顾问，擅长从数据中发现生活的规律和美好。' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('API请求失败: ' + response.status);
      }

      var result = await response.json();
      if (result.choices && result.choices.length > 0 && result.choices[0].message) {
        return result.choices[0].message.content || '';
      }
      throw new Error('API返回格式异常');
    } catch(e) {
      throw e;
    }
  }

  /** 格式化洞察结果为HTML */
  function formatInsightResult(text) {
    if (!text) return '';
    // 去掉markdown代码块
    text = text.replace(/```html?\s*/gi, '').replace(/```\s*/g, '');
    // 如果已经有HTML标签，直接返回
    if (/<p>|<strong>|<br/.test(text)) {
      return text;
    }
    // 纯文本分段
    var lines = text.split(/\n+/).filter(function(l) { return l.trim().length > 0; });
    return lines.map(function(l) { return '<p>' + l + '</p>'; }).join('');
  }

  // ==================== 首页入口卡片 ====================
  function renderEntryCard(containerId) {
    injectStyles();
    var container = document.getElementById(containerId);
    if (!container) {
      console.warn('[TrendView] 入口卡片容器不存在:', containerId);
      return;
    }

    // 快速统计
    var dxHistory = getDiagnosisHistory();
    var txRecords = getTxRecords();
    var moodLogs = getMoodLogs();

    var latestDx = dxHistory.length > 0 ? dxHistory[dxHistory.length - 1] : null;
    var dxScore = latestDx ? latestDx.total + '分' : '--';

    // 本月收支
    var currMonth = getCurrentMonthKey();
    var monthIncome = 0, monthExpense = 0;
    txRecords.forEach(function(tx) {
      var dateStr = tx.date || tx.createdAt;
      if (!dateStr || getMonthKey(dateStr) !== currMonth) return;
      if (tx.type === 'income') monthIncome += parseFloat(tx.amount) || 0;
      else monthExpense += parseFloat(tx.amount) || 0;
    });
    var balance = monthIncome - monthExpense;

    // 本月情绪
    var moodCount = 0;
    var moodTotal = 0;
    moodLogs.forEach(function(e) {
      if (!e.timestamp || getMonthKey(new Date(e.timestamp)) !== currMonth) return;
      if (e.score) { moodCount++; moodTotal += e.score; }
    });
    var avgMood = moodCount > 0 ? (Math.round(moodTotal / moodCount * 10) / 10) + '分' : '--';

    var html = '<div class="tv-entry-card" onclick="TrendView.openInsightPanel()">';
    html += '<div class="tv-entry-decor"></div>';
    html += '<div class="tv-entry-header">';
    html += '<div class="tv-entry-icon">' + svgIcon('sparkles', 20, '#fff') + '</div>';
    html += '<div>';
    html += '<div class="tv-entry-title">趋势洞察</div>';
    html += '<div class="tv-entry-subtitle">月度全景 · AI 智能解读</div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="tv-entry-metrics">';
    html += '<div class="tv-entry-metric">';
    html += '<div class="tv-entry-metric-label">财务健康</div>';
    html += '<div class="tv-entry-metric-value">' + dxScore + '</div>';
    html += '</div>';
    html += '<div class="tv-entry-metric">';
    html += '<div class="tv-entry-metric-label">本月结余</div>';
    html += '<div class="tv-entry-metric-value">' + formatMoney(balance) + '</div>';
    html += '</div>';
    html += '<div class="tv-entry-metric">';
    html += '<div class="tv-entry-metric-label">情绪均分</div>';
    html += '<div class="tv-entry-metric-value">' + avgMood + '</div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="tv-entry-arrow">' + svgIcon('chevronRight', 18, '#fff') + '</div>';
    html += '</div>';

    container.innerHTML = html;
  }

  // ==================== 主渲染 ====================
  function render(containerId) {
    injectStyles();
    var container = document.getElementById(containerId);
    if (!container) {
      console.warn('[TrendView] 容器不存在:', containerId);
      return;
    }
    _state.container = container;

    var html = '<div class="tv-panel">';

    // Tab 栏
    html += '<div class="tv-tabs">';
    TABS.forEach(function(tab) {
      var activeCls = _state.activeTab === tab.id ? ' active' : '';
      html += '<div class="tv-tab' + activeCls + '" onclick="TrendView.switchTab(\'' + tab.id + '\')">';
      html += '<div class="tv-tab-icon">' + svgIcon(tab.icon, 18, _state.activeTab === tab.id ? tab.color : '#94a3b8') + '</div>';
      html += '<div class="tv-tab-label">' + tab.label + '</div>';
      html += '</div>';
    });
    html += '</div>';

    // Tab 内容
    html += '<div class="tv-tab-content" id="tvTabContent">';
    html += renderTabContent(_state.activeTab);
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;
  }

  function renderTabContent(tabId) {
    switch (tabId) {
      case 'finance': return renderFinanceTab();
      case 'income':  return renderIncomeTab();
      case 'health':  return renderHealthTab();
      case 'mood':    return renderMoodTab();
      case 'report':  return renderReportTab();
      default:        return renderFinanceTab();
    }
  }

  /** 切换Tab */
  function switchTab(tabId) {
    _state.activeTab = tabId;

    // 更新Tab样式
    var tabs = document.querySelectorAll('.tv-tab');
    tabs.forEach(function(tabEl, idx) {
      var tab = TABS[idx];
      if (!tab) return;
      var isActive = tab.id === tabId;
      tabEl.classList.toggle('active', isActive);
      var iconEl = tabEl.querySelector('.tv-tab-icon svg');
      if (iconEl) {
        iconEl.setAttribute('stroke', isActive ? tab.color : '#94a3b8');
      }
    });

    // 更新内容
    var content = document.getElementById('tvTabContent');
    if (content) {
      content.innerHTML = renderTabContent(tabId);
      // 重新触发动画
      content.style.animation = 'none';
      content.offsetHeight; // 触发reflow
      content.style.animation = '';
    }
  }

  /** 切换月份（报告Tab用） */
  function changeMonth(delta) {
    var parts = _state.selectedMonth.split('-');
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    month += delta;
    if (month > 12) { month = 1; year++; }
    if (month < 1) { month = 12; year--; }
    var newKey = year + '-' + String(month).padStart(2, '0');

    // 不能超过当前月
    if (newKey > getCurrentMonthKey()) return;

    _state.selectedMonth = newKey;
    // 重新渲染报告tab
    if (_state.activeTab === 'report') {
      var content = document.getElementById('tvTabContent');
      if (content) {
        content.innerHTML = renderReportTab();
      }
    }
  }

  /** 打开趋势洞察面板（从首页入口点击） */
  function openInsightPanel() {
    // 如果有全局switchModule，切换到对应页面
    // 这里我们假设有一个"趋势"页面，或者滚动到趋势面板
    if (global.switchModule) {
      // 切换到相关模块（如财务页的趋势部分）
      global.switchModule('finance');
      // 延迟滚动到趋势面板
      setTimeout(function() {
        var trendEl = document.getElementById('trendPanel') || document.getElementById('trend-view');
        if (trendEl) {
          trendEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  }

  /** 生成AI洞察（UI调用入口） */
  function generateAiInsightFromUI(monthKey) {
    generateAiInsight(monthKey);
  }

  // ==================== 导出 ====================
  var TrendView = {
    version: VERSION,
    render: render,
    switchTab: switchTab,
    renderEntryCard: renderEntryCard,
    openInsightPanel: openInsightPanel,
    generateMonthlyReport: generateAiInsightFromUI,

    // 内部方法（供 onclick 调用）
    _changeMonth: changeMonth,
    _generateAiInsight: generateAiInsightFromUI
  };

  global.TrendView = TrendView;

})(window);
