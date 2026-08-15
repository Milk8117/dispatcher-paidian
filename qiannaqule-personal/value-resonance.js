/**
 * ValueResonance — MiRun AI 价值共振模块
 *
 * 共生内核 L3 核心模块：
 *   用户主动设定自己的价值观/人生原则，系统定期对比行为数据与价值观的偏差，
 *   温和提醒用户回归自己认同的方向。
 *
 * 模块名：value_resonance
 * 全局挂载：window.ValueResonance
 *
 * 数据存储（DataStore 字段映射）：
 *   principles — mijieai_value_principles  价值观原则数组
 *   checks     — mijieai_value_checks       偏差检查记录数组
 *   settings   — mijieai_value_settings     设置对象
 *
 * 核心能力：
 *   1. 原则管理：增删改查、分类、优先级、启停
 *   2. 预设模板：12 条常见人生原则供用户一键添加
 *   3. 偏差检测：基于健康/财务/成长等模块数据，对比原则计算偏差
 *   4. 偏差记录：每次检测结果存档，最多保留 50 条
 *   5. UI 面板：三 Tab 设计（我的原则 / 偏差提醒 / 预设模板）
 *   6. Push 集成：检测到偏差时生成 insight_alert 推送
 */

(function(global) {
  'use strict';

  // ==================== 注册 DataStore 模块 ====================
  var MODULE_NAME = 'value_resonance';
  var FIELD_PRINCIPLES = 'principles';
  var FIELD_CHECKS = 'checks';
  var FIELD_SETTINGS = 'settings';

  if (global.DataStore && DataStore.registerModule) {
    DataStore.registerModule(MODULE_NAME, {
      principles: 'mijieai_value_principles',
      checks: 'mijieai_value_checks',
      settings: 'mijieai_value_settings'
    });
  }

  // ==================== 常量与配置 ====================

  var CATEGORIES = {
    health:       { label: '健康',   color: '#10b981', bg: '#ecfdf5', auto: true  },
    career:       { label: '职业成长', color: '#3b82f6', bg: '#eff6ff', auto: true  },
    family:       { label: '家庭关系', color: '#f59e0b', bg: '#fffbeb', auto: false },
    finance:      { label: '财务',   color: '#8b5cf6', bg: '#f5f3ff', auto: true  },
    growth:       { label: '成长',   color: '#06b6d4', bg: '#ecfeff', auto: true  },
    relationship: { label: '关系',   color: '#ec4899', bg: '#fdf2f8', auto: false },
    freedom:      { label: '自由',   color: '#6366f1', bg: '#eef2ff', auto: false },
    meaning:      { label: '意义价值', color: '#f97316', bg: '#fff7ed', auto: false }
  };

  var DEVIATION_LEVELS = {
    none:   { label: '一致',   color: '#10b981', bg: '#d1fae5' },
    low:    { label: '轻微偏离', color: '#f59e0b', bg: '#fef3c7' },
    medium: { label: '中度偏离', color: '#ef4444', bg: '#fee2e2' },
    high:   { label: '严重偏离', color: '#b91c1c', bg: '#fecaca' }
  };

  var DEFAULT_SETTINGS = {
    checkFrequency: 'weekly',
    checkDayOfWeek: 1,
    checkTime: '09:00',
    enabled: true,
    hasOnboarded: false
  };

  var MAX_CHECKS = 50;

  // ==================== 预设原则模板 ====================

  var PRESET_PRINCIPLES = [
    { id: 'preset_h1', statement: '健康是一切的基础', category: 'health', priority: 5,
      desc: '每周至少运动3次，睡眠不少于7小时' },
    { id: 'preset_h2', statement: '身体是最诚实的反馈', category: 'health', priority: 4,
      desc: '倾听身体的信号，不舒服就休息' },
    { id: 'preset_c1', statement: '做有长期价值的事', category: 'career', priority: 5,
      desc: '不做只赚快钱的选择，看重复利效应' },
    { id: 'preset_c2', statement: '持续学习', category: 'growth', priority: 4,
      desc: '每天花30分钟学习新东西' },
    { id: 'preset_f1', statement: '量入为出', category: 'finance', priority: 4,
      desc: '每月储蓄率不低于30%' },
    { id: 'preset_f2', statement: '不懂不投', category: 'finance', priority: 5,
      desc: '投资只投自己看得懂的领域' },
    { id: 'preset_fam1', statement: '家人优先', category: 'family', priority: 5,
      desc: '陪伴家人的时间不能被工作挤占' },
    { id: 'preset_r1', statement: '真诚待人', category: 'relationship', priority: 4,
      desc: '不做损害人际关系的短期利益选择' },
    { id: 'preset_fr1', statement: '时间比钱重要', category: 'freedom', priority: 4,
      desc: '能用钱买时间的，就不要用时间换钱' },
    { id: 'preset_fr2', statement: '自己做决定', category: 'freedom', priority: 5,
      desc: '不因为别人的期待而活' },
    { id: 'preset_m1', statement: '创造价值', category: 'meaning', priority: 5,
      desc: '做对别人有用的事' },
    { id: 'preset_m2', statement: '保持好奇', category: 'meaning', priority: 3,
      desc: '永远对世界保持探索欲' }
  ];

  // ==================== 工具函数 ====================

  function genId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  function now() {
    return Date.now();
  }

  function todayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function esc(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function daysAgoStr(days) {
    var d = new Date(Date.now() - days * 86400000);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  // ==================== 数据读写 ====================

  function loadPrinciples() {
    try {
      return DataStore.load(MODULE_NAME, FIELD_PRINCIPLES, []) || [];
    } catch(e) { return []; }
  }

  function savePrinciples(data) {
    try { DataStore.save(MODULE_NAME, FIELD_PRINCIPLES, data); } catch(e) {}
  }

  function loadChecks() {
    try {
      return DataStore.load(MODULE_NAME, FIELD_CHECKS, []) || [];
    } catch(e) { return []; }
  }

  function saveChecks(data) {
    try {
      if (data.length > MAX_CHECKS) data = data.slice(0, MAX_CHECKS);
      DataStore.save(MODULE_NAME, FIELD_CHECKS, data);
    } catch(e) {}
  }

  function loadSettings() {
    try {
      var s = DataStore.load(MODULE_NAME, FIELD_SETTINGS, null);
      if (!s) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      // 合并默认值
      for (var k in DEFAULT_SETTINGS) {
        if (DEFAULT_SETTINGS.hasOwnProperty(k) && s[k] === undefined) {
          s[k] = DEFAULT_SETTINGS[k];
        }
      }
      return s;
    } catch(e) { return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); }
  }

  function saveSettings(data) {
    try { DataStore.save(MODULE_NAME, FIELD_SETTINGS, data); } catch(e) {}
  }

  // 安全读取其他模块的原始 localStorage 数据
  function safeGetJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch(e) { return fallback; }
  }

  // ==================== 原则管理 ====================

  function addPrinciple(statement, category, priority) {
    var principles = loadPrinciples();
    var p = {
      id: genId('pri'),
      statement: statement || '',
      category: category || 'growth',
      priority: priority || 3,
      createdAt: now(),
      lastCheckDate: null,
      status: 'active'
    };
    principles.push(p);
    savePrinciples(principles);
    return p;
  }

  function updatePrinciple(id, updates) {
    var principles = loadPrinciples();
    for (var i = 0; i < principles.length; i++) {
      if (principles[i].id === id) {
        for (var k in updates) {
          if (updates.hasOwnProperty(k)) {
            principles[i][k] = updates[k];
          }
        }
        savePrinciples(principles);
        return principles[i];
      }
    }
    return null;
  }

  function deletePrinciple(id) {
    var principles = loadPrinciples();
    var filtered = [];
    for (var i = 0; i < principles.length; i++) {
      if (principles[i].id !== id) filtered.push(principles[i]);
    }
    savePrinciples(filtered);
    // 同时清理相关检查记录
    var checks = loadChecks();
    var filteredChecks = [];
    for (var j = 0; j < checks.length; j++) {
      if (checks[j].principleId !== id) filteredChecks.push(checks[j]);
    }
    saveChecks(filteredChecks);
  }

  function togglePrincipleStatus(id) {
    var principles = loadPrinciples();
    for (var i = 0; i < principles.length; i++) {
      if (principles[i].id === id) {
        principles[i].status = principles[i].status === 'active' ? 'paused' : 'active';
        savePrinciples(principles);
        return principles[i];
      }
    }
    return null;
  }

  function getSortedPrinciples() {
    var principles = loadPrinciples();
    return principles.sort(function(a, b) {
      // 活跃优先
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      // 优先级高的在前
      if (b.priority !== a.priority) return b.priority - a.priority;
      // 创建时间早的在前
      return a.createdAt - b.createdAt;
    });
  }

  function getPrincipleById(id) {
    var principles = loadPrinciples();
    for (var i = 0; i < principles.length; i++) {
      if (principles[i].id === id) return principles[i];
    }
    return null;
  }

  function addPresets(presetIds) {
    var added = [];
    for (var i = 0; i < presetIds.length; i++) {
      var preset = null;
      for (var j = 0; j < PRESET_PRINCIPLES.length; j++) {
        if (PRESET_PRINCIPLES[j].id === presetIds[i]) {
          preset = PRESET_PRINCIPLES[j];
          break;
        }
      }
      if (preset) {
        var p = addPrinciple(preset.statement, preset.category, preset.priority);
        added.push(p);
      }
    }
    // 标记已完成引导
    var settings = loadSettings();
    settings.hasOnboarded = true;
    saveSettings(settings);
    return added;
  }

  // ==================== 偏差检测引擎 ====================

  /**
   * 对所有 active 且支持自动检测的原则执行偏差检查
   * 返回检查结果数组（同时写入 checks 存储）
   */
  function runDeviationCheck() {
    var principles = loadPrinciples().filter(function(p) { return p.status === 'active'; });
    var today = todayStr();
    var newChecks = [];
    var updatedPrinciples = false;

    for (var i = 0; i < principles.length; i++) {
      var p = principles[i];
      var result = checkSinglePrinciple(p);
      if (!result) continue; // 数据不足或不支持自动检测

      var check = {
        id: genId('chk'),
        principleId: p.id,
        date: today,
        deviation: result.deviation,
        evidence: result.evidence || [],
        summary: result.summary || '',
        userAcknowledged: false,
        createdAt: now()
      };
      newChecks.push(check);

      // 更新最后检查日期
      p.lastCheckDate = today;
      updatedPrinciples = true;
    }

    if (newChecks.length > 0) {
      var checks = loadChecks();
      checks = newChecks.concat(checks); // 新的在前
      saveChecks(checks);
    }
    if (updatedPrinciples) savePrinciples(principles);

    return newChecks;
  }

  /**
   * 单条原则检测
   * 返回 { deviation, evidence, summary } 或 null（数据不足/不支持）
   */
  function checkSinglePrinciple(principle) {
    var cat = CATEGORIES[principle.category];
    if (!cat || !cat.auto) return null;

    switch (principle.category) {
      case 'health':  return checkHealthDeviation(principle);
      case 'finance': return checkFinanceDeviation(principle);
      case 'growth':
      case 'career':  return checkGrowthDeviation(principle);
      default:        return null;
    }
  }

  // --- 健康类检测 ---
  function checkHealthDeviation(principle) {
    var evidence = [];
    var deviation = 'none';

    // 数据源：health-bridge 优先，其次 behavior-log
    var healthRecords = safeGetJSON('mijieai_health_data', []);
    var behaviorLog = safeGetJSON('mijieai_behavior_log', []);

    var sevenDaysAgo = daysAgoStr(7);
    var fourteenDaysAgo = daysAgoStr(14);

    // 统计近7天运动次数
    var exerciseDays7d = 0;
    var totalSleepHours = 0;
    var sleepDays = 0;

    // 从 health-bridge 取
    for (var i = 0; i < healthRecords.length; i++) {
      var r = healthRecords[i];
      if (!r.date || r.date < sevenDaysAgo) continue;
      if (r.exercise && r.exercise.length > 0) exerciseDays7d++;
      if (r.sleep && r.sleep.total !== undefined && r.sleep.total !== null) {
        totalSleepHours += r.sleep.total;
        sleepDays++;
      }
    }

    // 从 behavior-log 补充
    for (var j = 0; j < behaviorLog.length; j++) {
      var b = behaviorLog[j];
      if (!b.date || b.date < sevenDaysAgo) continue;
      if (b.exercise && b.exercise.length > 0) {
        // 避免和 health-bridge 重复计数：如果当天 health 里已经有运动就跳过
        var foundInHealth = false;
        for (var k = 0; k < healthRecords.length; k++) {
          if (healthRecords[k].date === b.date &&
              healthRecords[k].exercise &&
              healthRecords[k].exercise.length > 0) {
            foundInHealth = true;
            break;
          }
        }
        if (!foundInHealth) exerciseDays7d++;
      }
    }

    // 计算平均睡眠
    var avgSleep = sleepDays > 0 ? (totalSleepHours / sleepDays) : null;

    // 偏差判断
    var hasExerciseData = (healthRecords.length > 0 &&
      healthRecords.some(function(r) { return r.date && r.date >= sevenDaysAgo; })) ||
      behaviorLog.some(function(b) { return b.date && b.date >= sevenDaysAgo; });

    if (!hasExerciseData && avgSleep === null) {
      return null; // 数据完全不足
    }

    if (hasExerciseData && exerciseDays7d < 2) {
      evidence.push('近7天仅运动 ' + exerciseDays7d + ' 次，低于推荐的 2-3 次');
      deviation = 'medium';
    }

    if (avgSleep !== null && avgSleep < 6.5) {
      evidence.push('近7天平均睡眠约 ' + avgSleep.toFixed(1) + ' 小时，低于 6.5 小时');
      if (deviation === 'medium') {
        deviation = 'high';
      } else {
        deviation = 'medium';
      }
    }

    // 进一步判断是否连续两周（升级为 high）
    if (deviation === 'medium') {
      var twoWeekExercise = 0;
      var twoWeekTotalSleep = 0;
      var twoWeekSleepDays = 0;
      for (var m = 0; m < healthRecords.length; m++) {
        var hr = healthRecords[m];
        if (!hr.date || hr.date < fourteenDaysAgo || hr.date >= sevenDaysAgo) continue;
        if (hr.exercise && hr.exercise.length > 0) twoWeekExercise++;
        if (hr.sleep && hr.sleep.total) {
          twoWeekTotalSleep += hr.sleep.total;
          twoWeekSleepDays++;
        }
      }
      var prevWeekAvgSleep = twoWeekSleepDays > 0 ? (twoWeekTotalSleep / twoWeekSleepDays) : null;

      // 如果上周也运动不足2次 或 上周也睡眠不足，升级为 high
      var consecutiveLow = false;
      if (hasExerciseData && twoWeekExercise < 2) consecutiveLow = true;
      if (prevWeekAvgSleep !== null && prevWeekAvgSleep < 6.5 && avgSleep < 6.5) consecutiveLow = true;

      if (consecutiveLow && evidence.length >= 1) {
        deviation = 'high';
        evidence.push('已连续两周出现偏离，需要关注');
      }
    }

    if (evidence.length === 0) {
      evidence.push('近7天健康数据符合预期');
      return { deviation: 'none', evidence: evidence, summary: '健康状态与原则一致' };
    }

    var summary = evidence[0];
    return { deviation: deviation, evidence: evidence, summary: summary };
  }

  // --- 财务类检测 ---
  function checkFinanceDeviation(principle) {
    var evidence = [];
    var deviation = 'none';

    var tx = safeGetJSON('mijieai_daily_tx', []);
    if (!tx || tx.length === 0) return null; // 无数据不检测

    // 统计最近自然月收支（取最近30天）
    var thirtyDaysAgo = daysAgoStr(30);
    var totalIncome = 0;
    var totalExpense = 0;
    var hasIncome = false;
    var hasExpense = false;

    for (var i = 0; i < tx.length; i++) {
      var t = tx[i];
      if (!t.date || t.date < thirtyDaysAgo) continue;
      var amt = parseFloat(t.amount) || 0;
      if (t.type === 'income') { totalIncome += amt; hasIncome = true; }
      else if (t.type === 'expense') { totalExpense += amt; hasExpense = true; }
    }

    if (!hasExpense) return null;

    // 储蓄率
    var savingsRate = hasIncome && totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) : null;

    if (savingsRate !== null && savingsRate < 0) {
      // 赤字
      evidence.push('近30天支出（¥' + totalExpense.toFixed(0) + '）超过收入（¥' + totalIncome.toFixed(0) + '），出现赤字');
      // 检查是否连续2个月赤字（简化：按最近60天，每30天一段）
      var sixtyDaysAgo = daysAgoStr(60);
      var prevIncome = 0;
      var prevExpense = 0;
      for (var j = 0; j < tx.length; j++) {
        var t2 = tx[j];
        if (!t2.date || t2.date < sixtyDaysAgo || t2.date >= thirtyDaysAgo) continue;
        var amt2 = parseFloat(t2.amount) || 0;
        if (t2.type === 'income') prevIncome += amt2;
        else if (t2.type === 'expense') prevExpense += amt2;
      }
      if (prevIncome > 0 && prevExpense > prevIncome) {
        evidence.push('已连续2个月出现赤字');
        deviation = 'high';
      } else {
        deviation = 'medium';
      }
    } else if (savingsRate !== null && savingsRate < 0.1) {
      // 储蓄率低于 10%
      evidence.push('近30天储蓄率仅 ' + (savingsRate * 100).toFixed(1) + '%，低于 10% 的健康线');
      deviation = 'high';
    } else if (savingsRate !== null && savingsRate < 0.3) {
      evidence.push('近30天储蓄率 ' + (savingsRate * 100).toFixed(1) + '%，未达 30% 的目标');
      deviation = 'medium';
    }

    if (evidence.length === 0) {
      evidence.push(savingsRate !== null
        ? '近30天储蓄率 ' + (savingsRate * 100).toFixed(1) + '%，符合量入为出原则'
        : '近30天支出稳定');
      return { deviation: 'none', evidence: evidence, summary: '财务状况与原则一致' };
    }

    return { deviation: deviation, evidence: evidence, summary: evidence[0] };
  }

  // --- 成长/职业类检测 ---
  function checkGrowthDeviation(principle) {
    var evidence = [];
    var deviation = 'none';

    var behavior = safeGetJSON('mijieai_behavior_log', []);
    var schedule = safeGetJSON('mijieai_schedule', []);

    var sevenDaysAgo = daysAgoStr(7);
    var thirtyDaysAgo = daysAgoStr(30);

    var learnDays7d = 0;
    var learnDays30d = 0;
    var totalLearnMin = 0;

    // 从 behavior-log 统计学习记录
    for (var i = 0; i < behavior.length; i++) {
      var b = behavior[i];
      if (!b.date || b.date < thirtyDaysAgo) continue;
      if (b.learning && b.learning.length > 0) {
        if (b.date >= sevenDaysAgo) learnDays7d++;
        learnDays30d++;
        for (var j = 0; j < b.learning.length; j++) {
          totalLearnMin += b.learning[j].duration || 0;
        }
      }
    }

    // 从 schedule 补充：完成的"学习"类任务
    for (var k = 0; k < schedule.length; k++) {
      var s = schedule[k];
      if (s.status !== 'done') continue;
      var sDate = s.completedAt ? new Date(s.completedAt).toISOString().slice(0, 10) : s.deadline || s.created;
      if (!sDate || sDate < thirtyDaysAgo) continue;
      // 通过标题关键词判断是否为学习类任务
      var title = (s.title || '').toLowerCase();
      var isLearn = /学|学习|读书|阅读|课程|课|背|听|研究|练|刷/.test(title);
      if (isLearn) {
        // 避免重复计数
        var already = false;
        for (var m = 0; m < behavior.length; m++) {
          if (behavior[m].date === sDate && behavior[m].learning && behavior[m].learning.length > 0) {
            already = true;
            break;
          }
        }
        if (!already) {
          if (sDate >= sevenDaysAgo) learnDays7d++;
          learnDays30d++;
        }
      }
    }

    var hasData = learnDays30d > 0 || behavior.length > 0;
    if (!hasData) return null; // 完全无数据

    // 偏差判断
    if (learnDays7d === 0 && learnDays30d > 0) {
      // 近一周没学，但30天内有，算 low
      evidence.push('近7天没有学习记录，需要保持节奏');
      deviation = 'low';
    } else if (learnDays30d === 0 && behavior.length >= 3) {
      // 整整30天没有学习记录
      evidence.push('近30天没有任何学习记录，偏离了持续成长的原则');
      deviation = 'high';
    } else if (learnDays7d === 0 && learnDays30d < 2) {
      evidence.push('近两周学习记录很少，学习频率偏低');
      deviation = 'medium';
    }

    if (evidence.length === 0) {
      var avgMinPerWeek = learnDays30d > 0 ? Math.round(totalLearnMin / 4.3) : 0;
      evidence.push('近30天有 ' + learnDays30d + ' 天学习记录，保持得不错');
      if (avgMinPerWeek > 0) evidence.push('平均每周约 ' + avgMinPerWeek + ' 分钟学习投入');
      return { deviation: 'none', evidence: evidence, summary: '成长节奏与原则一致' };
    }

    return { deviation: deviation, evidence: evidence, summary: evidence[0] };
  }

  // 获取某条原则最新的检查结果
  function getLatestCheck(principleId) {
    var checks = loadChecks();
    for (var i = 0; i < checks.length; i++) {
      if (checks[i].principleId === principleId) return checks[i];
    }
    return null;
  }

  // 确认收到某条检查
  function acknowledgeCheck(checkId) {
    var checks = loadChecks();
    for (var i = 0; i < checks.length; i++) {
      if (checks[i].id === checkId) {
        checks[i].userAcknowledged = true;
        saveChecks(checks);
        return checks[i];
      }
    }
    return null;
  }

  // 获取未确认的偏差数量
  function getUnacknowledgedCount() {
    var checks = loadChecks();
    var count = 0;
    for (var i = 0; i < checks.length; i++) {
      if (!checks[i].userAcknowledged && checks[i].deviation !== 'none') count++;
    }
    return count;
  }

  // ==================== PushEngine 集成 ====================

  /**
   * 执行一次偏差检查，并将 medium/high 的偏离生成洞察推送
   * 返回生成的推送条数
   *
   * 供外部（定时任务/首页加载后）调用：ValueResonance.checkAndPush()
   */
  function checkAndPush() {
    var settings = loadSettings();
    if (!settings.enabled) return 0;

    // 频率控制：根据设置的频率判断今天是否需要检查
    if (!shouldCheckToday(settings)) return 0;

    var today = todayStr();

    // 今天已检查过就不重复
    var checks = loadChecks();
    var checkedToday = checks.some(function(c) { return c.date === today; });
    if (checkedToday) return 0;

    var newChecks = runDeviationCheck();
    var pushCount = 0;

    for (var i = 0; i < newChecks.length; i++) {
      var chk = newChecks[i];
      if (chk.deviation === 'none' || chk.deviation === 'low') continue;

      var principle = getPrincipleById(chk.principleId);
      if (!principle) continue;

      var pushed = _pushDeviationAlert(principle, chk);
      if (pushed) pushCount++;
    }

    return pushCount;
  }

  function shouldCheckToday(settings) {
    if (settings.checkFrequency === 'daily') return true;
    if (settings.checkFrequency === 'weekly') {
      var d = new Date().getDay(); // 0=周日
      var targetDay = settings.checkDayOfWeek || 1; // 1=周一
      // 转换：JS 中周日=0，我们设定中周一=1
      var jsDay = targetDay === 7 ? 0 : targetDay;
      return d === jsDay;
    }
    return true;
  }

  function _pushDeviationAlert(principle, check) {
    // 尝试使用 PushEngine，如果不存在则直接返回 false
    if (!global.PushEngine || !PushEngine.addPushLog) return false;

    var dedupeKey = 'value_resonance_' + principle.id + '_' + check.deviation;

    // 去重：同类同原则同等级24小时内不重复
    if (PushEngine.wasPushedRecently &&
        PushEngine.wasPushedRecently('insight_alert', dedupeKey)) {
      return false;
    }

    var severity = check.deviation === 'high' ? 3 : 2;
    var titlePrefix = check.deviation === 'high' ? '提醒：' : '注意：';

    var pushItem = {
      id: genId('push'),
      type: 'insight_alert',
      dedupeKey: dedupeKey,
      title: titlePrefix + '你说过「' + principle.statement + '」',
      content: check.summary + ' 要不要调整一下节奏？',
      severity: severity,
      category: 'behavior',
      data: { principleId: principle.id, checkId: check.id, source: 'value_resonance' },
      timestamp: Date.now(),
      date: todayStr(),
      read: false,
      feedback: null,
      feedbackReasons: [],
      feedbackTime: null,
      feedbackNote: ''
    };

    try {
      PushEngine.addPushLog(pushItem);
      // 尝试触发浏览器通知
      if (PushEngine.sendBrowserNotification) {
        PushEngine.sendBrowserNotification(pushItem.title, pushItem.content);
      }
      return true;
    } catch(e) {
      return false;
    }
  }

  // ==================== UI 渲染 ====================

  var panelEl = null;
  var currentTab = 'principles';
  var selectedPresets = {}; // 预设选中状态
  var editingPrincipleId = null; // 正在编辑的原则ID

  function ensurePanel() {
    if (panelEl) return panelEl;

    panelEl = document.createElement('div');
    panelEl.className = 'vr-panel';
    panelEl.id = 'valueResonancePanel';
    panelEl.innerHTML = [
      '<div class="vr-panel-inner">',
      '  <div class="vr-header">',
      '    <div class="vr-header-left">',
      '      <div class="vr-header-title">价值罗盘</div>',
      '    </div>',
      '    <button class="vr-header-btn vr-close-btn" id="vrCloseBtn" aria-label="关闭">',
      '      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      '    </button>',
      '  </div>',
      '  <div class="vr-tabs">',
      '    <div class="vr-tab vr-tab-active" data-tab="principles">我的原则</div>',
      '    <div class="vr-tab" data-tab="deviations">偏差提醒</div>',
      '    <div class="vr-tab" data-tab="presets">预设模板</div>',
      '  </div>',
      '  <div class="vr-body" id="vrBody"></div>',
      '  <div class="vr-footer" id="vrFooter"></div>',
      '</div>',
      // 添加原则弹窗
      '<div class="vr-modal" id="vrAddModal" style="display:none">',
      '  <div class="vr-modal-mask"></div>',
      '  <div class="vr-modal-body">',
      '    <div class="vr-modal-title" id="vrModalTitle">添加原则</div>',
      '    <div class="vr-modal-field">',
      '      <label>原则陈述</label>',
      '      <input type="text" id="vrPrincipleStatement" placeholder="例如：健康是一切的基础" maxlength="50" />',
      '    </div>',
      '    <div class="vr-modal-field">',
      '      <label>分类</label>',
      '      <select id="vrPrincipleCategory"></select>',
      '    </div>',
      '    <div class="vr-modal-field">',
      '      <label>优先级</label>',
      '      <div class="vr-priority-stars" id="vrPriorityStars"></div>',
      '    </div>',
      '    <div class="vr-modal-actions">',
      '      <button class="vr-btn vr-btn-secondary" id="vrCancelAddBtn">取消</button>',
      '      <button class="vr-btn vr-btn-primary" id="vrConfirmAddBtn">保存</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    injectStyles();
    document.body.appendChild(panelEl);

    // 绑定事件
    panelEl.querySelector('#vrCloseBtn').addEventListener('click', closePanel);
    var tabs = panelEl.querySelectorAll('.vr-tab');
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener('click', function() {
        switchTab(this.getAttribute('data-tab'));
      });
    }
    panelEl.querySelector('#vrCancelAddBtn').addEventListener('click', hideAddModal);
    panelEl.querySelector('#vrConfirmAddBtn').addEventListener('click', handleConfirmAdd);

    return panelEl;
  }

  function injectStyles() {
    if (document.getElementById('vr-styles')) return;
    var style = document.createElement('style');
    style.id = 'vr-styles';
    style.textContent = [
      /* 入口卡片 */
      '.vr-entry-card { display:flex; align-items:center; gap:12px; background:#fff; border-radius:14px; padding:14px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.05),0 4px 14px rgba(0,0,0,0.04); border:1px solid #f3f4f6; margin-bottom:10px; cursor:pointer; transition:all .2s; }',
      '.vr-entry-card:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,0,0,0.08); }',
      '.vr-entry-card:active { transform:scale(0.98); }',
      '.vr-entry-icon { width:40px; height:40px; border-radius:10px; background:#f5f3ff; display:flex; align-items:center; justify-content:center; flex-shrink:0; }',
      '.vr-entry-body { flex:1; min-width:0; }',
      '.vr-entry-title { font-size:15px; font-weight:600; color:#1a1a2e; margin-bottom:3px; }',
      '.vr-entry-desc { font-size:12px; color:#6b7280; line-height:1.4; }',
      '.vr-entry-arrow { flex-shrink:0; }',

      /* 全屏面板 */
      '.vr-panel { position:fixed; inset:0; z-index:9999; background:#fff; display:flex; flex-direction:column; animation:vrSlideIn .3s ease; }',
      '@keyframes vrSlideIn { from { transform:translateY(100%); } to { transform:translateY(0); } }',
      '.vr-panel-inner { display:flex; flex-direction:column; height:100%; }',

      /* 顶部栏 */
      '.vr-header { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #f1f5f9; background:#fff; flex-shrink:0; }',
      '.vr-header-left { display:flex; align-items:center; gap:8px; flex:1; min-width:0; }',
      '.vr-header-title { font-size:17px; font-weight:600; color:#1a1a2e; }',
      '.vr-header-btn { background:none; border:none; padding:6px; cursor:pointer; border-radius:8px; transition:background .2s; }',
      '.vr-header-btn:hover { background:#f1f5f9; }',

      /* Tab 栏 */
      '.vr-tabs { display:flex; padding:0 16px; border-bottom:1px solid #f1f5f9; background:#fff; flex-shrink:0; gap:4px; }',
      '.vr-tab { flex:1; text-align:center; padding:12px 0; font-size:14px; color:#6b7280; cursor:pointer; position:relative; font-weight:500; transition:color .2s; }',
      '.vr-tab-active { color:#8b5cf6; font-weight:600; }',
      '.vr-tab-active::after { content:""; position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:28px; height:3px; background:linear-gradient(90deg,#8b5cf6,#6366f1); border-radius:2px; }',

      /* 主体区 */
      '.vr-body { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:16px; }',

      /* 底部栏 */
      '.vr-footer { padding:10px 16px calc(env(safe-area-inset-bottom, 8px) + 10px); border-top:1px solid #f1f5f9; background:#fff; flex-shrink:0; }',

      /* 原则卡片 */
      '.vr-principle-card { background:#fff; border:1px solid #f3f4f6; border-radius:12px; padding:14px; margin-bottom:10px; transition:all .2s; }',
      '.vr-principle-card:hover { border-color:#c4b5fd; }',
      '.vr-principle-card.paused { opacity:0.5; }',
      '.vr-principle-top { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:8px; }',
      '.vr-principle-statement { font-size:15px; font-weight:600; color:#1e293b; line-height:1.5; flex:1; }',
      '.vr-principle-actions { display:flex; gap:4px; flex-shrink:0; }',
      '.vr-principle-action-btn { background:none; border:none; padding:4px; cursor:pointer; border-radius:6px; color:#94a3b8; transition:all .2s; }',
      '.vr-principle-action-btn:hover { background:#f1f5f9; color:#475569; }',
      '.vr-principle-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }',
      '.vr-category-tag { display:inline-block; padding:2px 10px; border-radius:10px; font-size:11px; font-weight:500; }',
      '.vr-priority-dots { display:inline-flex; gap:2px; }',
      '.vr-priority-dot { width:8px; height:8px; border-radius:50%; background:#e2e8f0; }',
      '.vr-priority-dot.active { background:#8b5cf6; }',
      '.vr-deviation-badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:500; }',
      '.vr-principle-date { font-size:11px; color:#94a3b8; margin-left:auto; }',

      /* 空状态 */
      '.vr-empty { text-align:center; padding:40px 20px; color:#94a3b8; }',
      '.vr-empty-icon { margin-bottom:12px; opacity:0.5; }',
      '.vr-empty-title { font-size:14px; font-weight:500; margin-bottom:4px; color:#6b7280; }',
      '.vr-empty-desc { font-size:12px; line-height:1.6; }',

      /* 添加按钮 */
      '.vr-add-btn { display:flex; align-items:center; justify-content:center; gap:8px; background:linear-gradient(135deg, #8b5cf6, #6366f1); color:#fff; border:none; border-radius:12px; padding:14px; font-size:15px; font-weight:600; cursor:pointer; transition:all .2s; box-shadow:0 4px 12px rgba(139,92,246,0.3); width:100%; }',
      '.vr-add-btn:hover { transform:translateY(-1px); box-shadow:0 6px 16px rgba(139,92,246,0.4); }',
      '.vr-add-btn:active { transform:scale(0.98); }',

      /* 偏差提醒卡片 */
      '.vr-deviation-card { background:#fff; border:1px solid #f3f4f6; border-radius:12px; padding:14px; margin-bottom:10px; }',
      '.vr-deviation-card.high { border-left:4px solid #ef4444; }',
      '.vr-deviation-card.medium { border-left:4px solid #f59e0b; }',
      '.vr-deviation-card.low { border-left:4px solid #10b981; }',
      '.vr-deviation-card.none { border-left:4px solid #10b981; }',
      '.vr-deviation-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }',
      '.vr-deviation-principle { font-size:14px; font-weight:600; color:#1e293b; flex:1; }',
      '.vr-deviation-summary { font-size:13px; color:#475569; line-height:1.6; margin-bottom:10px; }',
      '.vr-deviation-evidence { font-size:12px; color:#6b7280; line-height:1.6; background:#f8fafc; border-radius:8px; padding:8px 10px; margin-bottom:10px; }',
      '.vr-deviation-evidence-item { margin-bottom:4px; }',
      '.vr-deviation-evidence-item:last-child { margin-bottom:0; }',
      '.vr-deviation-footer { display:flex; align-items:center; justify-content:space-between; }',
      '.vr-deviation-date { font-size:11px; color:#94a3b8; }',
      '.vr-ack-btn { background:#f5f3ff; color:#8b5cf6; border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:500; cursor:pointer; transition:all .2s; }',
      '.vr-ack-btn:hover { background:#ede9fe; }',
      '.vr-ack-btn.acked { background:#f3f4f6; color:#94a3b8; cursor:default; }',

      /* 预设模板 */
      '.vr-preset-card { background:#fff; border:1px solid #f3f4f6; border-radius:12px; padding:12px 14px; margin-bottom:8px; display:flex; align-items:flex-start; gap:10px; cursor:pointer; transition:all .2s; }',
      '.vr-preset-card:hover { border-color:#c4b5fd; background:#faf5ff; }',
      '.vr-preset-card.selected { border-color:#8b5cf6; background:#f5f3ff; }',
      '.vr-preset-check { width:20px; height:20px; border:2px solid #d1d5db; border-radius:6px; flex-shrink:0; margin-top:1px; display:flex; align-items:center; justify-content:center; transition:all .2s; }',
      '.vr-preset-card.selected .vr-preset-check { background:#8b5cf6; border-color:#8b5cf6; }',
      '.vr-preset-content { flex:1; min-width:0; }',
      '.vr-preset-statement { font-size:14px; font-weight:600; color:#1e293b; margin-bottom:4px; }',
      '.vr-preset-desc { font-size:12px; color:#6b7280; line-height:1.5; }',
      '.vr-preset-category { display:inline-block; padding:1px 8px; border-radius:8px; font-size:10px; font-weight:500; margin-top:6px; }',
      '.vr-preset-section-title { font-size:13px; font-weight:600; color:#6b7280; margin:16px 2px 8px; letter-spacing:0.5px; }',
      '.vr-preset-section-title:first-child { margin-top:0; }',

      /* 弹窗 */
      '.vr-modal { position:fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center; }',
      '.vr-modal-mask { position:absolute; inset:0; background:rgba(0,0,0,0.4); }',
      '.vr-modal-body { position:relative; background:#fff; border-radius:16px; padding:20px; width:90%; max-width:400px; box-shadow:0 20px 60px rgba(0,0,0,0.2); animation:vrModalIn .25s ease; }',
      '@keyframes vrModalIn { from { transform:scale(0.9); opacity:0; } to { transform:scale(1); opacity:1; } }',
      '.vr-modal-title { font-size:17px; font-weight:600; color:#1a1a2e; margin-bottom:16px; }',
      '.vr-modal-field { margin-bottom:14px; }',
      '.vr-modal-field label { display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:6px; }',
      '.vr-modal-field input, .vr-modal-field select { width:100%; border:1.5px solid #e2e8f0; border-radius:10px; padding:10px 12px; font-size:14px; outline:none; font-family:inherit; background:#f8fafc; transition:border-color .2s; box-sizing:border-box; }',
      '.vr-modal-field input:focus, .vr-modal-field select:focus { border-color:#8b5cf6; background:#fff; }',
      '.vr-priority-stars { display:flex; gap:8px; }',
      '.vr-priority-star { width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#d1d5db; transition:all .2s; }',
      '.vr-priority-star.active { color:#f59e0b; }',
      '.vr-priority-star svg { width:24px; height:24px; }',
      '.vr-modal-actions { display:flex; gap:10px; margin-top:20px; }',
      '.vr-btn { flex:1; padding:12px; border-radius:10px; border:none; font-size:14px; font-weight:600; cursor:pointer; transition:all .2s; }',
      '.vr-btn-primary { background:linear-gradient(135deg, #8b5cf6, #6366f1); color:#fff; }',
      '.vr-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(139,92,246,0.3); }',
      '.vr-btn-secondary { background:#f3f4f6; color:#4b5563; }',
      '.vr-btn-secondary:hover { background:#e5e7eb; }',

      /* 引导提示 */
      '.vr-onboard-tip { background:linear-gradient(135deg, #f5f3ff, #ede9fe); border-radius:12px; padding:14px 16px; margin-bottom:16px; }',
      '.vr-onboard-title { font-size:14px; font-weight:600; color:#7c3aed; margin-bottom:4px; }',
      '.vr-onboard-desc { font-size:12px; color:#6d28d9; line-height:1.6; }',

      /* 立即检查按钮 */
      '.vr-check-now-btn { background:#f5f3ff; color:#8b5cf6; border:1px solid #ddd6fe; padding:8px 14px; border-radius:8px; font-size:12px; font-weight:500; cursor:pointer; transition:all .2s; display:inline-flex; align-items:center; gap:6px; }',
      '.vr-check-now-btn:hover { background:#ede9fe; }',
      '.vr-check-now-btn:active { transform:scale(0.97); }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ==================== 面板控制 ====================

  function openPanel() {
    ensurePanel();
    panelEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    switchTab('principles');
  }

  function closePanel() {
    if (!panelEl) return;
    panelEl.style.display = 'none';
    document.body.style.overflow = '';
    editingPrincipleId = null;
  }

  function switchTab(tabName) {
    currentTab = tabName;
    var tabs = panelEl.querySelectorAll('.vr-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('vr-tab-active');
      if (tabs[i].getAttribute('data-tab') === tabName) {
        tabs[i].classList.add('vr-tab-active');
      }
    }
    renderBody();
    renderFooter();
  }

  function renderBody() {
    var body = panelEl.querySelector('#vrBody');
    if (!body) return;

    if (currentTab === 'principles') {
      renderPrinciplesTab(body);
    } else if (currentTab === 'deviations') {
      renderDeviationsTab(body);
    } else if (currentTab === 'presets') {
      renderPresetsTab(body);
    }
  }

  function renderFooter() {
    var footer = panelEl.querySelector('#vrFooter');
    if (!footer) return;

    if (currentTab === 'principles') {
      footer.innerHTML = '';
      var btn = document.createElement('button');
      btn.className = 'vr-add-btn';
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>添加原则</span>';
      btn.addEventListener('click', function() { showAddModal(); });
      footer.appendChild(btn);
    } else if (currentTab === 'presets') {
      var selectedCount = Object.keys(selectedPresets).filter(function(k) { return selectedPresets[k]; }).length;
      footer.innerHTML = '';
      var addBtn = document.createElement('button');
      addBtn.className = 'vr-add-btn';
      addBtn.disabled = selectedCount === 0;
      addBtn.innerHTML = '<span>添加选中的 ' + selectedCount + ' 条原则</span>';
      addBtn.style.opacity = selectedCount === 0 ? '0.5' : '1';
      addBtn.style.cursor = selectedCount === 0 ? 'not-allowed' : 'pointer';
      addBtn.addEventListener('click', function() {
        if (selectedCount === 0) return;
        handleAddSelectedPresets();
      });
      footer.appendChild(addBtn);
    } else {
      footer.innerHTML = '';
    }
  }

  // --- Tab1: 我的原则 ---
  function renderPrinciplesTab(container) {
    var principles = getSortedPrinciples();
    var settings = loadSettings();
    var html = '';

    // 引导提示
    if (!settings.hasOnboarded && principles.length === 0) {
      html += '<div class="vr-onboard-tip">';
      html += '  <div class="vr-onboard-title">欢迎来到价值罗盘</div>';
      html += '  <div class="vr-onboard-desc">设定你认同的人生原则，系统会温和地提醒你与自己保持一致。<br/>可以先去「预设模板」选几条，也可以自己添加。</div>';
      html += '</div>';
    }

    // 检查按钮
    if (principles.length > 0) {
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
      html += '  <span style="font-size:13px;font-weight:600;color:#6b7280;">共 ' + principles.length + ' 条原则</span>';
      html += '  <button class="vr-check-now-btn" id="vrCheckNowBtn">';
      html += '    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>';
      html += '    立即检查';
      html += '  </button>';
      html += '</div>';
    }

    if (principles.length === 0) {
      html += '<div class="vr-empty">';
      html += '  <div class="vr-empty-icon">';
      html += '    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
      html += '  </div>';
      html += '  <div class="vr-empty-title">还没有任何原则</div>';
      html += '  <div class="vr-empty-desc">添加你认同的人生原则<br/>让自己的行为与价值观保持一致</div>';
      html += '</div>';
    } else {
      for (var i = 0; i < principles.length; i++) {
        var p = principles[i];
        var cat = CATEGORIES[p.category] || { label: p.category, color: '#6b7280', bg: '#f3f4f6' };
        var latestCheck = getLatestCheck(p.id);
        var devLevel = latestCheck ? DEVIATION_LEVELS[latestCheck.deviation] : null;

        html += '<div class="vr-principle-card ' + (p.status === 'paused' ? 'paused' : '') + '" data-id="' + p.id + '">';
        html += '  <div class="vr-principle-top">';
        html += '    <div class="vr-principle-statement">' + esc(p.statement) + '</div>';
        html += '    <div class="vr-principle-actions">';
        html += '      <button class="vr-principle-action-btn vr-edit-btn" title="编辑">';
        html += '        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        html += '      </button>';
        html += '      <button class="vr-principle-action-btn vr-toggle-btn" title="' + (p.status === 'active' ? '暂停' : '启用') + '">';
        if (p.status === 'active') {
          html += '      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        } else {
          html += '      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
        }
        html += '      </button>';
        html += '      <button class="vr-principle-action-btn vr-delete-btn" title="删除">';
        html += '        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/></svg>';
        html += '      </button>';
        html += '    </div>';
        html += '  </div>';
        html += '  <div class="vr-principle-meta">';
        html += '    <span class="vr-category-tag" style="background:' + cat.bg + ';color:' + cat.color + ';">' + cat.label + '</span>';
        html += '    <span class="vr-priority-dots" title="优先级 ' + p.priority + '/5">';
        for (var s = 1; s <= 5; s++) {
          html += '<span class="vr-priority-dot' + (s <= p.priority ? ' active' : '') + '"></span>';
        }
        html += '    </span>';
        if (devLevel) {
          html += '    <span class="vr-deviation-badge" style="background:' + devLevel.bg + ';color:' + devLevel.color + ';">' + devLevel.label + '</span>';
        }
        if (p.lastCheckDate) {
          html += '    <span class="vr-principle-date">上次检查 ' + p.lastCheckDate + '</span>';
        }
        html += '  </div>';
        html += '</div>';
      }
    }

    container.innerHTML = html;

    // 绑定立即检查
    var checkBtn = container.querySelector('#vrCheckNowBtn');
    if (checkBtn) {
      checkBtn.addEventListener('click', function() {
        runDeviationCheck();
        renderPrinciplesTab(container);
      });
    }

    // 绑定原则卡片操作
    var cards = container.querySelectorAll('.vr-principle-card');
    for (var c = 0; c < cards.length; c++) {
      (function(card) {
        var id = card.getAttribute('data-id');
        var editBtn = card.querySelector('.vr-edit-btn');
        var toggleBtn = card.querySelector('.vr-toggle-btn');
        var deleteBtn = card.querySelector('.vr-delete-btn');

        if (editBtn) editBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          var p = getPrincipleById(id);
          if (p) showAddModal(p);
        });
        if (toggleBtn) toggleBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          togglePrincipleStatus(id);
          renderPrinciplesTab(container);
        });
        if (deleteBtn) deleteBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (confirm('确定删除这条原则吗？')) {
            deletePrinciple(id);
            renderPrinciplesTab(container);
          }
        });
      })(cards[c]);
    }
  }

  // --- Tab2: 偏差提醒 ---
  function renderDeviationsTab(container) {
    var checks = loadChecks();
    var html = '';

    if (checks.length === 0) {
      html += '<div class="vr-empty">';
      html += '  <div class="vr-empty-icon">';
      html += '    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
      html += '  </div>';
      html += '  <div class="vr-empty-title">暂无偏差检查记录</div>';
      html += '  <div class="vr-empty-desc">系统会定期检测你的行为数据<br/>与原则的偏离程度</div>';
      html += '</div>';
    } else {
      for (var i = 0; i < checks.length; i++) {
        var chk = checks[i];
        var principle = getPrincipleById(chk.principleId);
        var devLevel = DEVIATION_LEVELS[chk.deviation] || DEVIATION_LEVELS.none;
        var principleText = principle ? principle.statement : '（已删除的原则）';

        html += '<div class="vr-deviation-card ' + chk.deviation + '" data-id="' + chk.id + '">';
        html += '  <div class="vr-deviation-header">';
        html += '    <div class="vr-deviation-principle">' + esc(principleText) + '</div>';
        html += '    <span class="vr-deviation-badge" style="background:' + devLevel.bg + ';color:' + devLevel.color + ';">' + devLevel.label + '</span>';
        html += '  </div>';
        html += '  <div class="vr-deviation-summary">' + esc(chk.summary) + '</div>';
        if (chk.evidence && chk.evidence.length > 0) {
          html += '  <div class="vr-deviation-evidence">';
          for (var e = 0; e < chk.evidence.length; e++) {
            html += '    <div class="vr-deviation-evidence-item">· ' + esc(chk.evidence[e]) + '</div>';
          }
          html += '  </div>';
        }
        html += '  <div class="vr-deviation-footer">';
        html += '    <span class="vr-deviation-date">' + chk.date + '</span>';
        if (chk.deviation !== 'none') {
          html += '    <button class="vr-ack-btn' + (chk.userAcknowledged ? ' acked' : '') + '" data-check-id="' + chk.id + '">';
          html += chk.userAcknowledged ? '已确认' : '确认收到';
          html += '    </button>';
        }
        html += '  </div>';
        html += '</div>';
      }
    }

    container.innerHTML = html;

    // 绑定确认按钮
    var ackBtns = container.querySelectorAll('.vr-ack-btn');
    for (var b = 0; b < ackBtns.length; b++) {
      ackBtns[b].addEventListener('click', function() {
        var checkId = this.getAttribute('data-check-id');
        if (checkId && !this.classList.contains('acked')) {
          acknowledgeCheck(checkId);
          renderDeviationsTab(container);
        }
      });
    }
  }

  // --- Tab3: 预设模板 ---
  function renderPresetsTab(container) {
    var html = '';
    var categories = [];
    var seen = {};
    for (var i = 0; i < PRESET_PRINCIPLES.length; i++) {
      var cat = PRESET_PRINCIPLES[i].category;
      if (!seen[cat]) {
        seen[cat] = true;
        categories.push(cat);
      }
    }

    for (var c = 0; c < categories.length; c++) {
      var catKey = categories[c];
      var catMeta = CATEGORIES[catKey] || { label: catKey, color: '#6b7280', bg: '#f3f4f6' };
      var items = PRESET_PRINCIPLES.filter(function(p) { return p.category === catKey; });
      html += '<div class="vr-preset-section-title">' + catMeta.label + '</div>';

      for (var j = 0; j < items.length; j++) {
        var p = items[j];
        var isSelected = !!selectedPresets[p.id];
        html += '<div class="vr-preset-card' + (isSelected ? ' selected' : '') + '" data-preset-id="' + p.id + '">';
        html += '  <div class="vr-preset-check">';
        if (isSelected) {
          html += '    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        }
        html += '  </div>';
        html += '  <div class="vr-preset-content">';
        html += '    <div class="vr-preset-statement">' + esc(p.statement) + '</div>';
        html += '    <div class="vr-preset-desc">' + esc(p.desc || '') + '</div>';
        html += '    <span class="vr-preset-category" style="background:' + catMeta.bg + ';color:' + catMeta.color + ';">优先级 ' + p.priority + '/5</span>';
        html += '  </div>';
        html += '</div>';
      }
    }

    container.innerHTML = html;

    // 绑定点击
    var cards = container.querySelectorAll('.vr-preset-card');
    for (var k = 0; k < cards.length; k++) {
      cards[k].addEventListener('click', function() {
        var pid = this.getAttribute('data-preset-id');
        selectedPresets[pid] = !selectedPresets[pid];
        renderPresetsTab(container);
        renderFooter();
      });
    }
  }

  // --- 添加/编辑原则弹窗 ---
  var currentPriority = 3;

  function showAddModal(principle) {
    var modal = panelEl.querySelector('#vrAddModal');
    var titleEl = panelEl.querySelector('#vrModalTitle');
    var statementInput = panelEl.querySelector('#vrPrincipleStatement');
    var categorySelect = panelEl.querySelector('#vrPrincipleCategory');

    // 填充分类选项
    categorySelect.innerHTML = '';
    for (var key in CATEGORIES) {
      if (CATEGORIES.hasOwnProperty(key)) {
        var opt = document.createElement('option');
        opt.value = key;
        opt.textContent = CATEGORIES[key].label;
        categorySelect.appendChild(opt);
      }
    }

    if (principle) {
      editingPrincipleId = principle.id;
      titleEl.textContent = '编辑原则';
      statementInput.value = principle.statement;
      categorySelect.value = principle.category;
      currentPriority = principle.priority;
    } else {
      editingPrincipleId = null;
      titleEl.textContent = '添加原则';
      statementInput.value = '';
      categorySelect.value = 'growth';
      currentPriority = 3;
    }

    renderPriorityStars();
    modal.style.display = 'flex';
    setTimeout(function() { statementInput.focus(); }, 100);
  }

  function hideAddModal() {
    var modal = panelEl.querySelector('#vrAddModal');
    if (modal) modal.style.display = 'none';
    editingPrincipleId = null;
  }

  function renderPriorityStars() {
    var container = panelEl.querySelector('#vrPriorityStars');
    if (!container) return;

    var html = '';
    var starSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    for (var i = 1; i <= 5; i++) {
      html += '<div class="vr-priority-star' + (i <= currentPriority ? ' active' : '') + '" data-level="' + i + '">' + starSvg + '</div>';
    }
    container.innerHTML = html;

    var stars = container.querySelectorAll('.vr-priority-star');
    for (var s = 0; s < stars.length; s++) {
      stars[s].addEventListener('click', function() {
        currentPriority = parseInt(this.getAttribute('data-level'));
        renderPriorityStars();
      });
    }
  }

  function handleConfirmAdd() {
    var statementInput = panelEl.querySelector('#vrPrincipleStatement');
    var categorySelect = panelEl.querySelector('#vrPrincipleCategory');
    var statement = statementInput.value.trim();

    if (!statement) {
      statementInput.style.borderColor = '#ef4444';
      statementInput.focus();
      return;
    }

    if (editingPrincipleId) {
      updatePrinciple(editingPrincipleId, {
        statement: statement,
        category: categorySelect.value,
        priority: currentPriority
      });
    } else {
      addPrinciple(statement, categorySelect.value, currentPriority);
    }

    hideAddModal();
    renderPrinciplesTab(panelEl.querySelector('#vrBody'));
  }

  function handleAddSelectedPresets() {
    var selectedIds = Object.keys(selectedPresets).filter(function(k) { return selectedPresets[k]; });
    if (selectedIds.length === 0) return;

    addPresets(selectedIds);
    selectedPresets = {};
    switchTab('principles');
  }

  // ==================== 首页入口卡片 ====================

  function renderEntryCard(container) {
    if (!container) return;

    var card = document.createElement('div');
    card.className = 'vr-entry-card';
    card.innerHTML = [
      '<div class="vr-entry-icon">',
      '  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#8b5cf6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
      '    <circle cx="12" cy="12" r="10"/>',
      '    <polygon points="12 6 14 12 18 12 15 16 16 22 12 18 8 22 9 16 6 12 10 12 12 6"/>',
      '  </svg>',
      '</div>',
      '<div class="vr-entry-body">',
      '  <div class="vr-entry-title">价值罗盘</div>',
      '  <div class="vr-entry-desc">做你说过的自己</div>',
      '</div>',
      '<div class="vr-entry-arrow">',
      '  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
      '</div>'
    ].join('');

    card.addEventListener('click', function() {
      openPanel();
    });

    container.appendChild(card);
  }

  // ==================== 对外 API ====================

  global.ValueResonance = {
    // 数据
    getPrinciples: getSortedPrinciples,
    getPrincipleById: getPrincipleById,
    addPrinciple: addPrinciple,
    updatePrinciple: updatePrinciple,
    deletePrinciple: deletePrinciple,
    togglePrincipleStatus: togglePrincipleStatus,
    addPresets: addPresets,

    // 检测
    runDeviationCheck: runDeviationCheck,
    checkSinglePrinciple: checkSinglePrinciple,
    getLatestCheck: getLatestCheck,
    getChecks: loadChecks,
    acknowledgeCheck: acknowledgeCheck,
    getUnacknowledgedCount: getUnacknowledgedCount,

    // 设置
    getSettings: loadSettings,
    updateSettings: function(updates) {
      var s = loadSettings();
      for (var k in updates) {
        if (updates.hasOwnProperty(k)) s[k] = updates[k];
      }
      saveSettings(s);
      return s;
    },

    // Push 集成
    checkAndPush: checkAndPush,

    // UI
    openPanel: openPanel,
    closePanel: closePanel,
    renderEntryCard: renderEntryCard,

    // 常量（供外部参考）
    CATEGORIES: CATEGORIES,
    DEVIATION_LEVELS: DEVIATION_LEVELS,
    PRESET_PRINCIPLES: PRESET_PRINCIPLES
  };

})(window);
