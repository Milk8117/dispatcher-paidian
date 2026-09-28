/**
 * InsightEngine — 跨模块洞察引擎
 * 实现财务+情绪+健康联动分析，为AI引擎提供结构化洞察
 *
 * 数据源（只读）：
 *   mijieai_daily_tx       — 收支记录数组
 *   mijieai_mood_log       — 情绪日志数组
 *   mijieai_behavior_log   — 行为日志数组
 *   mijieai_health_profile — 健康画像对象
 *
 * 缓存：
 *   mijieai_insight_cache  — 洞察结果缓存
 *
 * 挂载：window.InsightEngine
 */
(function() {
  'use strict';

  // 注册本模块到 DataStore
  if (window.DataStore && DataStore.registerModule) {
    DataStore.registerModule('insight', {
      cache: 'mijieai_insight_cache'
    });
  }

  var MODULE = 'insight';
  var FIELD_CACHE = 'cache';

  // ==================== 常量 ====================

  var CACHE_KEY = 'mijieai_insight_cache';
  var CACHE_TTL = 30 * 60 * 1000; // 缓存30分钟

  var KEYS = {
    tx:       'mijieai_daily_tx',
    mood:     'mijieai_mood_log',
    behavior: 'mijieai_behavior_log',
    health:   'mijieai_health_profile'
  };

  // 个人消费类目（排除家庭/教育/医疗等非个人消费）
  var PERSONAL_CATEGORIES = [
    'expensePersonal', '餐饮', '购物', '娱乐', '交通', '零食', '咖啡', '外卖', '个人'
  ];

  // ==================== 安全读取工具 ====================

  function safeGetJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return fallback;
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function daysBetween(d1, d2) {
    var a = new Date(d1), b = new Date(d2);
    return Math.round((b - a) / 86400000);
  }

  // ==================== 数据加载（只读，try-catch隔离） ====================

  function loadTransactions() {
    return safeGetJSON(KEYS.tx, []);
  }

  function loadMoodLog() {
    return safeGetJSON(KEYS.mood, []);
  }

  function loadBehaviorLog() {
    return safeGetJSON(KEYS.behavior, []);
  }

  function loadHealthProfile() {
    return safeGetJSON(KEYS.health, { screened: false, conditions: [], symptoms: [] });
  }

  // ==================== 辅助计算 ====================

  /**
   * 获取指定日期范围内的支出记录
   */
  function getExpensesInRange(txList, startDate, endDate) {
    return txList.filter(function(t) {
      return t.type === 'expense' && t.date >= startDate && t.date <= endDate;
    });
  }

  /**
   * 判断是否为个人消费类目
   */
  function isPersonalCategory(ctField) {
    if (!ctField) return true; // 无分类默认算个人
    for (var i = 0; i < PERSONAL_CATEGORIES.length; i++) {
      if (ctField.indexOf(PERSONAL_CATEGORIES[i]) >= 0) return true;
    }
    return false;
  }

  /**
   * 获取消费类目名称（兼容ctField和category字段）
   */
  function getCategoryName(tx) {
    return tx.ctField || tx.category || '未分类';
  }

  /**
   * 计算日均消费
   */
  function calcDailyAvg(expenses, days) {
    if (days <= 0) return 0;
    var total = 0;
    expenses.forEach(function(t) { total += (t.amount || 0); });
    return total / days;
  }

  // ==================== 核心洞察API ====================

  /**
   * getStressSpendingAlert — 压力消费预警
   * 规则：情绪≤2 且 当日个人消费 > 日均个人消费的1.5倍
   */
  function getStressSpendingAlert() {
    var result = { type: 'info', title: '压力消费预警', detail: '暂无压力消费迹象', severity: 1, data: null };

    try {
      var txList = loadTransactions();
      var moodLog = loadMoodLog();
      var today = todayStr();

      // 获取最近30天数据计算日均
      var recent30 = getExpensesInRange(txList, daysAgo(30), today);
      var personalExpenses30 = recent30.filter(function(t) { return isPersonalCategory(getCategoryName(t)); });
      var dailyAvg = calcDailyAvg(personalExpenses30, 30);

      if (dailyAvg <= 0) return result;

      // 查找低情绪日（score<=2）的当日消费
      var alerts = [];
      moodLog.forEach(function(m) {
        if (m.score <= 2) {
          var dayExpenses = txList.filter(function(t) {
            return t.type === 'expense' && t.date === m.date && isPersonalCategory(getCategoryName(t));
          });
          var dayTotal = 0;
          dayExpenses.forEach(function(t) { dayTotal += (t.amount || 0); });

          if (dayTotal > dailyAvg * 1.5) {
            alerts.push({
              date: m.date,
              mood: m.mood,
              moodScore: m.score,
              trigger: m.trigger || '',
              dayExpense: Math.round(dayTotal * 100) / 100,
              dailyAvg: Math.round(dailyAvg * 100) / 100,
              ratio: Math.round(dayTotal / dailyAvg * 10) / 10
            });
          }
        }
      });

      if (alerts.length > 0) {
        // 取最近一条
        var latest = alerts[alerts.length - 1];
        result.type = 'alert';
        result.severity = latest.ratio > 3 ? 3 : 2;
        result.detail = latest.date + '情绪"' + latest.mood + '"(评分' + latest.moodScore + ')，' +
          '当日个人消费¥' + latest.dayExpense + '，为日均¥' + latest.dailyAvg + '的' + latest.ratio + '倍';
        result.data = latest;
      }
    } catch(e) {
      result.type = 'info';
      result.detail = '压力消费分析暂时不可用';
    }

    return result;
  }

  /**
   * getCategoryAnomaly — 品类异常检测
   * 规则：某品类本周消费 > 该品类月均的2倍
   */
  function getCategoryAnomaly() {
    var result = { type: 'info', title: '品类异常检测', detail: '各品类消费正常', severity: 1, data: [] };

    try {
      var txList = loadTransactions();
      var today = todayStr();
      var weekStart = daysAgo(7);
      var monthStart = daysAgo(30);

      // 计算各品类月均
      var monthExpenses = getExpensesInRange(txList, monthStart, today);
      var categoryMonthTotal = {};
      monthExpenses.forEach(function(t) {
        var cat = getCategoryName(t);
        categoryMonthTotal[cat] = (categoryMonthTotal[cat] || 0) + (t.amount || 0);
      });

      // 计算各品类本周消费
      var weekExpenses = getExpensesInRange(txList, weekStart, today);
      var categoryWeekTotal = {};
      weekExpenses.forEach(function(t) {
        var cat = getCategoryName(t);
        categoryWeekTotal[cat] = (categoryWeekTotal[cat] || 0) + (t.amount || 0);
      });

      // 品类月均 = 月总 / 4（4周）
      var anomalies = [];
      Object.keys(categoryWeekTotal).forEach(function(cat) {
        var weekTotal = categoryWeekTotal[cat];
        var monthAvg = (categoryMonthTotal[cat] || 0) / 4;

        if (monthAvg > 0 && weekTotal > monthAvg * 2) {
          anomalies.push({
            category: cat,
            weekTotal: Math.round(weekTotal * 100) / 100,
            monthAvg: Math.round(monthAvg * 100) / 100,
            ratio: Math.round(weekTotal / monthAvg * 10) / 10
          });
        }
      });

      // 按倍数降序排列
      anomalies.sort(function(a, b) { return b.ratio - a.ratio; });

      if (anomalies.length > 0) {
        result.type = 'warning';
        result.severity = anomalies[0].ratio > 4 ? 3 : 2;
        var top = anomalies[0];
        result.detail = '本周"' + top.category + '"消费¥' + top.weekTotal +
          '，为月均¥' + top.monthAvg + '的' + top.ratio + '倍';
        result.data = anomalies;
      }
    } catch(e) {
      result.type = 'info';
      result.detail = '品类异常分析暂时不可用';
    }

    return result;
  }

  /**
   * getMoodExpenseCorrelation — 情绪消费关联
   * 对比低情绪日(score<=2) vs 高情绪日(score>=4) 的日均消费差异
   */
  function getMoodExpenseCorrelation() {
    var result = { type: 'info', title: '情绪消费关联', detail: '情绪与消费数据不足，无法分析', severity: 1, data: null };

    try {
      var txList = loadTransactions();
      var moodLog = loadMoodLog();

      if (moodLog.length < 3) return result;

      var lowMoodDays = [];  // score <= 2
      var highMoodDays = []; // score >= 4

      moodLog.forEach(function(m) {
        if (m.score <= 2) lowMoodDays.push(m.date);
        else if (m.score >= 4) highMoodDays.push(m.date);
      });

      if (lowMoodDays.length === 0 || highMoodDays.length === 0) {
        result.detail = '低情绪或高情绪天数不足，需要更多记录';
        return result;
      }

      // 计算低情绪日日均消费
      var lowTotal = 0, lowCount = 0;
      lowMoodDays.forEach(function(d) {
        var dayExp = txList.filter(function(t) { return t.type === 'expense' && t.date === d; });
        var sum = 0;
        dayExp.forEach(function(t) { sum += (t.amount || 0); });
        lowTotal += sum;
        lowCount++;
      });
      var lowAvg = lowCount > 0 ? lowTotal / lowCount : 0;

      // 计算高情绪日日均消费
      var highTotal = 0, highCount = 0;
      highMoodDays.forEach(function(d) {
        var dayExp = txList.filter(function(t) { return t.type === 'expense' && t.date === d; });
        var sum = 0;
        dayExp.forEach(function(t) { sum += (t.amount || 0); });
        highTotal += sum;
        highCount++;
      });
      var highAvg = highCount > 0 ? highTotal / highCount : 0;

      var diff = lowAvg - highAvg;
      var diffRatio = highAvg > 0 ? Math.round(Math.abs(diff) / highAvg * 100) : 0;

      result.data = {
        lowMoodAvg: Math.round(lowAvg * 100) / 100,
        highMoodAvg: Math.round(highAvg * 100) / 100,
        diff: Math.round(diff * 100) / 100,
        diffRatio: diffRatio,
        lowMoodDays: lowCount,
        highMoodDays: highCount
      };

      if (diff > 0 && diffRatio > 20) {
        // 低情绪日消费更高 → 压力消费倾向
        result.type = 'alert';
        result.severity = diffRatio > 50 ? 3 : 2;
        result.detail = '低情绪日日均消费¥' + result.data.lowMoodAvg +
          '，比高情绪日¥' + result.data.highMoodAvg + '高出' + diffRatio + '%，存在压力消费倾向';
      } else if (diff < 0 && diffRatio > 20) {
        // 高情绪日消费更高 → 情绪高涨消费
        result.type = 'warning';
        result.severity = 1;
        result.detail = '高情绪日日均消费¥' + result.data.highMoodAvg +
          '，比低情绪日¥' + result.data.lowMoodAvg + '高出' + diffRatio + '%，情绪好时消费增加';
      } else {
        result.type = 'info';
        result.detail = '情绪与消费关联不显著（差异' + diffRatio + '%），消费模式稳定';
      }
    } catch(e) {
      result.type = 'info';
      result.detail = '情绪消费关联分析暂时不可用';
    }

    return result;
  }

  /**
   * getDailyWellnessScore — 综合健康度评分
   * 0-100分，综合情绪(30%) + 消费合理性(20%) + 运动(20%) + 睡眠(20%) + 饮水(10%)
   */
  function getDailyWellnessScore() {
    var result = { type: 'info', title: '今日健康度', detail: '数据不足', severity: 1, data: null };

    try {
      var today = todayStr();
      var scores = { mood: 50, expense: 50, exercise: 0, sleep: 50, water: 50 };
      var reasons = [];

      // --- 情绪分（30%） ---
      var moodLog = loadMoodLog();
      var todayMood = null;
      for (var i = moodLog.length - 1; i >= 0; i--) {
        if (moodLog[i].date === today) { todayMood = moodLog[i]; break; }
      }
      if (todayMood) {
        scores.mood = todayMood.score * 20; // 1→20, 5→100
        reasons.push('情绪' + todayMood.mood + '(分' + todayMood.score + ')');
      } else {
        // 取最近3天平均
        var recentScores = [];
        for (var j = moodLog.length - 1; j >= 0 && recentScores.length < 3; j--) {
          recentScores.push(moodLog[j].score);
        }
        if (recentScores.length > 0) {
          var avg = 0;
          recentScores.forEach(function(s) { avg += s; });
          avg = avg / recentScores.length;
          scores.mood = Math.round(avg * 20);
          reasons.push('近期情绪均分' + avg.toFixed(1));
        }
      }

      // --- 消费合理性分（20%） ---
      var txList = loadTransactions();
      var todayExpenses = txList.filter(function(t) { return t.type === 'expense' && t.date === today; });
      var todayExpTotal = 0;
      todayExpenses.forEach(function(t) { todayExpTotal += (t.amount || 0); });

      var recent30Personal = getExpensesInRange(txList, daysAgo(30), today)
        .filter(function(t) { return isPersonalCategory(getCategoryName(t)); });
      var dailyAvgExp = calcDailyAvg(recent30Personal, 30);

      if (dailyAvgExp > 0) {
        var expRatio = todayExpTotal / dailyAvgExp;
        if (expRatio <= 1) {
          scores.expense = 100; // 消费在日均以内，满分
        } else if (expRatio <= 1.5) {
          scores.expense = Math.round(100 - (expRatio - 1) * 80); // 1→100, 1.5→60
        } else if (expRatio <= 2.5) {
          scores.expense = Math.round(60 - (expRatio - 1.5) * 30); // 1.5→60, 2.5→30
        } else {
          scores.expense = Math.max(0, Math.round(30 - (expRatio - 2.5) * 10));
        }
        reasons.push('今日消费¥' + Math.round(todayExpTotal) + '(日均¥' + Math.round(dailyAvgExp) + ')');
      } else {
        scores.expense = 80; // 无日均参考时，无消费给80分
        if (todayExpTotal === 0) reasons.push('今日无消费');
      }

      // --- 运动分（20%） ---
      var behaviorLog = loadBehaviorLog();
      var todayBehavior = null;
      for (var k = 0; k < behaviorLog.length; k++) {
        if (behaviorLog[k].date === today) { todayBehavior = behaviorLog[k]; break; }
      }
      if (todayBehavior && todayBehavior.exercise && todayBehavior.exercise.length > 0) {
        // 有运动记录，基础60分，每项+15，上限100
        scores.exercise = Math.min(100, 60 + todayBehavior.exercise.length * 15);
        var exNames = [];
        todayBehavior.exercise.forEach(function(e) { if (e.type) exNames.push(e.type); });
        reasons.push('运动:' + (exNames.length > 0 ? exNames.join(',') : '已记录'));
      } else {
        scores.exercise = 0;
        reasons.push('今日未运动');
      }

      // --- 睡眠分（20%） ---
      if (todayBehavior && todayBehavior.sleep) {
        var hours = todayBehavior.sleep.hours || 0;
        var quality = todayBehavior.sleep.quality || ''; // 'good','fair','poor'
        if (hours >= 7 && hours <= 9) {
          scores.sleep = quality === 'good' ? 100 : (quality === 'fair' ? 80 : 65);
        } else if (hours >= 6 && hours < 7) {
          scores.sleep = quality === 'good' ? 75 : 55;
        } else if (hours > 9) {
          scores.sleep = 60; // 睡过多
        } else {
          scores.sleep = Math.max(10, Math.round(hours * 10)); // 少于6小时
        }
        reasons.push('睡眠' + hours + 'h(' + (quality || '未知') + ')');
      } else {
        scores.sleep = 40; // 无记录给中间偏低分
      }

      // --- 饮水分（10%） ---
      if (todayBehavior && todayBehavior.water) {
        var water = todayBehavior.water;
        if (water >= 8) scores.water = 100;      // 8杯以上满分
        else if (water >= 6) scores.water = 80;
        else if (water >= 4) scores.water = 60;
        else scores.water = Math.round(water * 15);
        reasons.push('饮水' + water + '杯');
      } else {
        scores.water = 40;
      }

      // --- 加权总分 ---
      var total = Math.round(
        scores.mood * 0.30 +
        scores.expense * 0.20 +
        scores.exercise * 0.20 +
        scores.sleep * 0.20 +
        scores.water * 0.10
      );

      result.data = {
        total: total,
        breakdown: scores,
        reasons: reasons
      };

      if (total >= 80) {
        result.type = 'info';
        result.detail = '今日综合健康度' + total + '分，状态良好（' + reasons.join('；') + '）';
        result.severity = 1;
      } else if (total >= 60) {
        result.type = 'info';
        result.detail = '今日综合健康度' + total + '分，状态一般（' + reasons.join('；') + '）';
        result.severity = 1;
      } else if (total >= 40) {
        result.type = 'warning';
        result.detail = '今日综合健康度' + total + '分，需要关注（' + reasons.join('；') + '）';
        result.severity = 2;
      } else {
        result.type = 'alert';
        result.detail = '今日综合健康度' + total + '分，状态较差，建议调整（' + reasons.join('；') + '）';
        result.severity = 3;
      }
    } catch(e) {
      result.type = 'info';
      result.detail = '健康度评分暂时不可用';
    }

    return result;
  }

  /**
   * generateInsights — 生成所有跨模块洞察
   * 汇总所有洞察结果，写入缓存
   */
  function generateInsights() {
    var insights = [];

    try {
      insights.push(getStressSpendingAlert());
    } catch(e) {}

    try {
      insights.push(getCategoryAnomaly());
    } catch(e) {}

    try {
      insights.push(getMoodExpenseCorrelation());
    } catch(e) {}

    try {
      insights.push(getDailyWellnessScore());
    } catch(e) {}

    // 补充：健康画像风险提醒
    try {
      var hp = loadHealthProfile();
      if (hp.screened && hp.conditions && hp.conditions.length > 0) {
        insights.push({
          type: 'info',
          title: '健康画像提醒',
          detail: '已知健康状况：' + hp.conditions.join('、') +
            (hp.symptoms && hp.symptoms.length > 0 ? '；近期关注：' + hp.symptoms.join('、') : ''),
          severity: 1,
          data: hp
        });
      }
    } catch(e) {}

    // 按severity降序排列（severity高的排前面）
    insights.sort(function(a, b) { return (b.severity || 0) - (a.severity || 0); });

    // 写入缓存
    try {
      var cacheData = {
        timestamp: Date.now(),
        insights: insights
      };
      DataStore.save(MODULE, FIELD_CACHE, cacheData);
    } catch(e) {}

    return insights;
  }

  /**
   * getInsightSummary — 约100字摘要文本，供AI prompt使用
   */
  function getInsightSummary() {
    try {
      // 优先使用缓存
      var cache = DataStore.load(MODULE, FIELD_CACHE, null);
      var insights;
      if (cache && cache.insights && (Date.now() - cache.timestamp) < CACHE_TTL) {
        insights = cache.insights;
      } else {
        insights = generateInsights();
      }

      if (!insights || insights.length === 0) return '';

      // 构建摘要：只包含非info级别或severity>=2的洞察
      var parts = [];
      insights.forEach(function(ins) {
        if (ins.type !== 'info' || ins.severity >= 2) {
          parts.push(ins.title + '：' + ins.detail);
        }
      });

      if (parts.length === 0) {
        // 全部正常时，简要报告健康度
        var wellnessInsight = null;
        insights.forEach(function(ins) {
          if (ins.title === '今日健康度') wellnessInsight = ins;
        });
        if (wellnessInsight && wellnessInsight.data) {
          return '跨模块洞察：今日综合健康度' + wellnessInsight.data.total + '分，各项指标正常，无异常预警。';
        }
        return '跨模块洞察：各项指标正常，无异常预警。';
      }

      var summary = '跨模块洞察：' + parts.join('；') + '。';
      // 截断到约100字
      if (summary.length > 110) {
        summary = summary.substring(0, 107) + '...';
      }
      return summary;
    } catch(e) {
      return '';
    }
  }

  // ==================== 缓存管理 ====================

  function getCachedInsights() {
    var cache = DataStore.load(MODULE, FIELD_CACHE, null);
    if (cache && cache.insights && (Date.now() - cache.timestamp) < CACHE_TTL) {
      return cache.insights;
    }
    return null;
  }

  function clearCache() {
    try {
      DataStore.remove(MODULE, FIELD_CACHE);
    } catch(e) {}
  }

  // ==================== 导出 ====================

  window.InsightEngine = {
    generateInsights: generateInsights,
    getStressSpendingAlert: getStressSpendingAlert,
    getCategoryAnomaly: getCategoryAnomaly,
    getMoodExpenseCorrelation: getMoodExpenseCorrelation,
    getDailyWellnessScore: getDailyWellnessScore,
    getInsightSummary: getInsightSummary,
    getCachedInsights: getCachedInsights,
    clearCache: clearCache
  };

})();
