/**
 * TrendView - 米界AI财务诊断趋势对比模块
 *
 * 职责：
 * 1. 读取诊断历史，展示"上月 vs 本月"趋势对比
 * 2. 总分趋势（大数字 + 箭头 + 差值）
 * 3. 六维度对比（并排柱状图 + 变化值）
 * 4. 关键指标涨跌（收入、支出、储蓄率、资产负债率等）
 * 5. 诊断历史列表（所有存档记录）
 *
 * 依赖：DataStore, DiagnosisEngine（仅 getHistory）
 * 输入：containerId（DOM 容器 ID）
 * 调用：TrendView.render(containerId)
 */

(function(global) {
  'use strict';

  // ==================== 常量 ====================
  var DIM_NAMES = [
    '资产负债健康度',
    '流动性安全度',
    '收入结构合理性',
    '支出与储蓄率',
    '资产配置均衡度',
    '风险保障充足度'
  ];

  // 关键指标配置
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

  // ==================== 工具函数 ====================

  /** 格式化金额 */
  function formatMoney(val) {
    if (val >= 10000) {
      return (val / 10000).toFixed(1) + '万';
    }
    return val.toLocaleString ? val.toLocaleString() : String(val);
  }

  /** 格式化百分比 */
  function formatPct(val) {
    return (val * 100).toFixed(1);
  }

  /** 格式化数值 */
  function formatValue(val, format) {
    if (val === undefined || val === null) return '--';
    switch (format) {
      case 'money': return formatMoney(val);
      case 'pct':   return formatPct(val);
      default:      return String(Math.round(val));
    }
  }

  /** 计算差值 */
  function calcDiff(current, previous) {
    if (current === undefined || previous === undefined) return null;
    return current - previous;
  }

  /** 变化箭头 HTML */
  function arrowHtml(diff, positiveGood) {
    if (diff === null || diff === 0) return '<span class="trend-arrow trend-neutral">→</span>';
    var isGood = positiveGood ? diff > 0 : diff < 0;
    if (diff > 0) {
      return '<span class="trend-arrow ' + (isGood ? 'trend-up-good' : 'trend-up-bad') + '">↑</span>';
    }
    return '<span class="trend-arrow ' + (isGood ? 'trend-down-good' : 'trend-down-bad') + '">↓</span>';
  }

  /** 差值 HTML */
  function diffHtml(diff, format, positiveGood) {
    if (diff === null) return '<span class="trend-diff trend-neutral">--</span>';
    var isGood = positiveGood ? diff > 0 : diff < 0;
    var sign = diff > 0 ? '+' : '';
    var cls = diff === 0 ? 'trend-neutral' : (isGood ? 'trend-good' : 'trend-bad');
    var formatted = format === 'pct' ? formatPct(diff) : (format === 'money' ? formatMoney(Math.abs(diff)) : String(Math.round(Math.abs(diff))));
    return '<span class="trend-diff ' + cls + '">' + sign + (diff < 0 ? '-' : '') + formatted + '</span>';
  }

  /** 格式化时间 */
  function formatTime(ts) {
    var d = new Date(ts);
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var hour = d.getHours().toString().padStart(2, '0');
    var min = d.getMinutes().toString().padStart(2, '0');
    return month + '月' + day + '日 ' + hour + ':' + min;
  }

  /** 短时间格式（月日） */
  function shortTime(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  /** 获取等级颜色类 */
  function gradeClass(grade) {
    return 'grade-' + grade;
  }

  /** 获取等级对应颜色 */
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

  /** 从 grade 码推导等级标签（兼容旧记录无 gradeLabel 字段） */
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

  /** 维度条形图颜色 */
  function dimBarColor(score) {
    if (score >= 80) return 'linear-gradient(90deg, #22c55e, #4ade80)';
    if (score >= 60) return 'linear-gradient(90deg, #3b82f6, #60a5fa)';
    if (score >= 40) return 'linear-gradient(90deg, #eab308, #facc15)';
    if (score >= 20) return 'linear-gradient(90deg, #f97316, #fb923c)';
    return 'linear-gradient(90deg, #ef4444, #f87171)';
  }

  /** 上一期标签 */
  function periodLabel(ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + '月';
  }


  // ==================== 渲染：总分趋势 ====================
  function renderScoreTrend(prev, curr) {
    var diff = calcDiff(curr.total, prev.total);
    var isUp = diff > 0;
    var isDown = diff < 0;
    var arrowIcon = isUp ? '↑' : (isDown ? '↓' : '→');
    var diffSign = diff > 0 ? '+' : '';

    var html = '<div class="trend-card trend-score-card">';
    html += '<h3 class="trend-card-title">📈 总分趋势</h3>';
    html += '<div class="trend-score-row">';

    // 上月
    html += '<div class="trend-score-block">';
    html += '<div class="trend-score-label">' + periodLabel(prev.timestamp) + '</div>';
    html += '<div class="trend-score-value" style="color:' + gradeColor(prev.grade) + '">' + prev.total + '</div>';
    html += '<div class="trend-score-grade ' + gradeClass(prev.grade) + '">' + (prev.gradeLabel || gradeLabelFromGrade(prev.grade)) + '</div>';
    html += '</div>';

    // 箭头
    html += '<div class="trend-score-arrow">';
    var arrowCls = diff > 0 ? 'trend-up-good' : (diff < 0 ? 'trend-down-bad' : 'trend-neutral');
    html += '<span class="trend-arrow-big ' + arrowCls + '">' + arrowIcon + '</span>';
    html += '<div class="trend-diff-big ' + arrowCls + '">' + diffSign + diff + '</div>';
    html += '</div>';

    // 本月
    html += '<div class="trend-score-block">';
    html += '<div class="trend-score-label">' + periodLabel(curr.timestamp) + '</div>';
    html += '<div class="trend-score-value" style="color:' + gradeColor(curr.grade) + '">' + curr.total + '</div>';
    html += '<div class="trend-score-grade ' + gradeClass(curr.grade) + '">' + (curr.gradeLabel || gradeLabelFromGrade(curr.grade)) + '</div>';
    html += '</div>';

    html += '</div>';
    html += '</div>';
    return html;
  }


  // ==================== 渲染：六维度对比 ====================
  function renderDimensionComparison(prev, curr) {
    // 建立维度名称 → 分数映射
    function dimMap(record) {
      var map = {};
      (record.dimensions || []).forEach(function(d) { map[d.name] = d.score; });
      return map;
    }

    var prevMap = dimMap(prev);
    var currMap = dimMap(curr);

    var html = '<div class="trend-card trend-dim-card">';
    html += '<h3 class="trend-card-title">🎯 六维度对比</h3>';

    // 图例
    html += '<div class="trend-dim-legend">';
    html += '<span class="trend-legend-item"><span class="trend-legend-dot" style="background:#93c5fd"></span>' + periodLabel(prev.timestamp) + '</span>';
    html += '<span class="trend-legend-item"><span class="trend-legend-dot" style="background:#FF6B35"></span>' + periodLabel(curr.timestamp) + '</span>';
    html += '</div>';

    DIM_NAMES.forEach(function(name) {
      var pScore = prevMap[name] !== undefined ? prevMap[name] : 0;
      var cScore = currMap[name] !== undefined ? currMap[name] : 0;
      var diff = cScore - pScore;

      html += '<div class="trend-dim-row">';
      html += '<div class="trend-dim-name">' + name + '</div>';
      html += '<div class="trend-dim-bars">';
      // 上月柱
      html += '<div class="trend-dim-bar-wrap">';
      html += '<div class="trend-dim-bar trend-dim-bar-prev" style="width:' + pScore + '%;background:#93c5fd"></div>';
      html += '</div>';
      // 本月柱
      html += '<div class="trend-dim-bar-wrap">';
      html += '<div class="trend-dim-bar trend-dim-bar-curr" style="width:' + cScore + '%;background:' + (diff >= 0 ? '#FF6B35' : '#ef4444') + '"></div>';
      html += '</div>';
      html += '</div>';
      // 分数 + 变化
      html += '<div class="trend-dim-scores">';
      html += '<span class="trend-dim-pscore">' + pScore + '</span>';
      html += '<span class="trend-dim-sep">→</span>';
      html += '<span class="trend-dim-cscore">' + cScore + '</span>';
      var diffCls = diff > 0 ? 'trend-good' : (diff < 0 ? 'trend-bad' : 'trend-neutral');
      var diffSign = diff > 0 ? '+' : '';
      html += '<span class="trend-dim-diff ' + diffCls + '">' + diffSign + diff + '</span>';
      html += '</div>';
      html += '</div>';
    });

    html += '</div>';
    return html;
  }


  // ==================== 渲染：关键指标涨跌 ====================
  function renderMetricsTrend(prev, curr) {
    var html = '<div class="trend-card trend-metrics-card">';
    html += '<h3 class="trend-card-title">💰 关键指标变化</h3>';
    html += '<div class="trend-metrics-grid">';

    KEY_METRICS.forEach(function(metric) {
      var prevVal = prev.metrics ? prev.metrics[metric.key] : undefined;
      var currVal = curr.metrics ? curr.metrics[metric.key] : undefined;
      var diff = calcDiff(currVal, prevVal);

      html += '<div class="trend-metric-item">';
      html += '<div class="trend-metric-label">' + metric.label + '</div>';
      html += '<div class="trend-metric-values">';
      html += '<span class="trend-metric-prev">' + formatValue(prevVal, metric.format) + '</span>';
      html += '<span class="trend-metric-sep">→</span>';
      html += '<span class="trend-metric-curr">' + formatValue(currVal, metric.format) + '</span>';
      html += '</div>';
      html += '<div class="trend-metric-change">';
      html += arrowHtml(diff, metric.positive);
      html += diffHtml(diff, metric.format, metric.positive);
      html += '<span class="trend-metric-unit">' + metric.unit + '</span>';
      html += '</div>';
      html += '</div>';
    });

    html += '</div>';
    html += '</div>';
    return html;
  }


  // ==================== 渲染：诊断历史列表 ====================
  function renderHistoryList(history) {
    var html = '<div class="trend-card trend-history-card">';
    html += '<h3 class="trend-card-title">📋 诊断历史</h3>';

    if (history.length === 0) {
      html += '<div class="trend-empty">暂无诊断记录</div>';
    } else {
      html += '<div class="trend-history-list">';
      // 倒序显示（最新在前）
      var sorted = history.slice().reverse();
      sorted.forEach(function(record, idx) {
        var tagLabel = record.tag === 'auto' ? '自动' : '手动';
        var tagCls = record.tag === 'auto' ? 'trend-tag-auto' : 'trend-tag-manual';
        html += '<div class="trend-history-item">';
        html += '<div class="trend-history-left">';
        html += '<span class="trend-history-time">' + formatTime(record.timestamp) + '</span>';
        html += '<span class="trend-history-tag ' + tagCls + '">' + tagLabel + '</span>';
        html += '</div>';
        html += '<div class="trend-history-right">';
        html += '<span class="trend-history-score" style="color:' + gradeColor(record.grade) + '">' + record.total + '分</span>';
        html += '<span class="trend-history-grade ' + gradeClass(record.grade) + '">' + (record.gradeLabel || gradeLabelFromGrade(record.grade)) + '</span>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }


  // ==================== 主渲染 ====================
  /**
   * 渲染趋势对比视图
   * @param {string} containerId - 容器 DOM 元素 ID
   */
  function render(containerId) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.warn('[TrendView] 容器不存在:', containerId);
      return;
    }

    // 获取诊断历史
    var history = [];
    if (global.DiagnosisEngine && typeof global.DiagnosisEngine.getHistory === 'function') {
      history = global.DiagnosisEngine.getHistory();
    } else if (global.DataStore) {
      history = global.DataStore.load('wealth_ct', 'diagnosis_history', []);
    }

    // 不足 2 条记录时显示提示
    if (!history || history.length < 2) {
      container.innerHTML = '<div class="trend-card trend-empty-card">' +
        '<div class="trend-empty-icon">📊</div>' +
        '<div class="trend-empty-text">至少需要2次诊断记录才能对比</div>' +
        '<div class="trend-empty-hint">完成第2次体检后，即可查看趋势变化</div>' +
        '</div>';
      return;
    }

    // 取最近两条记录进行对比
    var prev = history[history.length - 2];
    var curr = history[history.length - 1];

    var html = '';
    html += renderScoreTrend(prev, curr);
    html += renderDimensionComparison(prev, curr);
    html += renderMetricsTrend(prev, curr);
    html += renderHistoryList(history);

    container.innerHTML = html;
  }


  // ==================== 导出 ====================
  var TrendView = {
    version: '1.0.0',
    render: render
  };

  global.TrendView = TrendView;

})(window);
