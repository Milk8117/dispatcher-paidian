/**
 * UserProfile - 统一用户画像模块
 * 聚合各模块localStorage数据，为AI引擎提供统一上下文
 *
 * 架构：
 *   8大数据源 → build()聚合 → 画像对象 → getSummary()摘要 → AI Prompt
 */
(function() {
  'use strict';

  var PROFILE_CACHE_KEY = 'mijieai_user_profile';
  var cachedProfile = null;

  // ==================== 安全读取工具 ====================

  function safeGetJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return fallback;
  }

  function padNum(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + padNum(d.getMonth() + 1) + '-' + padNum(d.getDate());
  }

  function monthStartStr() {
    var d = new Date();
    return d.getFullYear() + '-' + padNum(d.getMonth() + 1) + '-01';
  }

  function daysAgoStr(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.getFullYear() + '-' + padNum(d.getMonth() + 1) + '-' + padNum(d.getDate());
  }

  // ==================== 各维度构建 ====================

  function buildHealth() {
    var conditions = [];
    var symptoms = [];
    var dietary = { flavor: [], dislike: [], allergies: [] };

    // 从 health_profile 获取慢病和症状
    try {
      var hp = safeGetJSON('mijieai_health_profile', {});
      if (hp.screened) {
        conditions = hp.conditions || [];
        symptoms = hp.symptoms || [];
      }
    } catch(e) {}

    // 从 preferences.taste 获取饮食偏好
    try {
      var prefs = safeGetJSON('mijieai_preferences', {});
      if (prefs.taste) {
        dietary.flavor = prefs.taste.flavor || [];
        dietary.dislike = prefs.taste.dislike || [];
        dietary.allergies = prefs.taste.allergies || [];
      }
    } catch(e) {}

    return {
      conditions: conditions,
      symptoms: symptoms,
      dietary: dietary
    };
  }

  function buildFinance() {
    var monthlyIncome = 0;
    var monthlyExpense = 0;
    var categoryMap = {};
    var mStart = monthStartStr();

    try {
      var txList = safeGetJSON('mijieai_daily_tx', []);
      if (Array.isArray(txList)) {
        txList.forEach(function(t) {
          if (!t.date || t.date < mStart) return;
          if (t.type === 'income') {
            monthlyIncome += (Number(t.amount) || 0);
          } else if (t.type === 'expense') {
            var amt = Number(t.amount) || 0;
            monthlyExpense += amt;
            var cat = t.category || t.ctField || '其他';
            categoryMap[cat] = (categoryMap[cat] || 0) + amt;
          }
        });
      }
    } catch(e) {}

    // 支出最多的3个分类
    var topCategories = [];
    var catArr = [];
    var catKeys = Object.keys(categoryMap);
    for (var i = 0; i < catKeys.length; i++) {
      catArr.push({ name: catKeys[i], amount: categoryMap[catKeys[i]] });
    }
    catArr.sort(function(a, b) { return b.amount - a.amount; });
    for (var j = 0; j < Math.min(3, catArr.length); j++) {
      topCategories.push(catArr[j]);
    }

    // 储蓄率
    var savingsRate = 0;
    if (monthlyIncome > 0) {
      savingsRate = Math.round((monthlyIncome - monthlyExpense) / monthlyIncome * 100);
    }

    // 收支趋势
    var recentTrend = '';
    var diff = monthlyIncome - monthlyExpense;
    if (monthlyIncome === 0 && monthlyExpense === 0) {
      recentTrend = '无记录';
    } else if (diff > 0) {
      recentTrend = '盈余';
    } else if (diff < 0) {
      recentTrend = '赤字';
    } else {
      recentTrend = '持平';
    }

    return {
      monthlyIncome: monthlyIncome,
      monthlyExpense: monthlyExpense,
      topCategories: topCategories,
      savingsRate: savingsRate,
      recentTrend: recentTrend
    };
  }

  function buildLifestyle() {
    var wakeTime = '';
    var sleepTime = '';
    var commute = '';
    var avgSleepHours = 0;
    var avgWaterCups = 0;
    var exerciseFrequency = '';

    // 从 preferences.routine 获取作息
    try {
      var prefs = safeGetJSON('mijieai_preferences', {});
      if (prefs.routine) {
        wakeTime = prefs.routine.wake_time || '';
        sleepTime = prefs.routine.sleep_time || '';
        commute = prefs.routine.commute || '';
      }
    } catch(e) {}

    // 从 behavior_log 计算最近7天平均
    try {
      var log = safeGetJSON('mijieai_behavior_log', []);
      if (Array.isArray(log) && log.length > 0) {
        var sevenDaysAgo = daysAgoStr(7);
        var recent = [];
        for (var i = 0; i < log.length; i++) {
          var entry = log[i];
          if (entry.timestamp && entry.timestamp >= sevenDaysAgo) {
            recent.push(entry);
          }
        }

        // 平均睡眠
        if (recent.length > 0) {
          var totalSleep = 0;
          var sleepCount = 0;
          var totalWater = 0;
          var waterCount = 0;
          var exerciseDays = 0;

          for (var j = 0; j < recent.length; j++) {
            var r = recent[j];
            if (r.sleep && r.sleep.hours) {
              totalSleep += Number(r.sleep.hours) || 0;
              sleepCount++;
            }
            if (r.water && r.water.cups) {
              totalWater += Number(r.water.cups) || 0;
              waterCount++;
            }
            if (r.exercise && r.exercise.length > 0) {
              exerciseDays++;
            }
          }

          if (sleepCount > 0) {
            avgSleepHours = Math.round(totalSleep / sleepCount * 10) / 10;
          }
          if (waterCount > 0) {
            avgWaterCups = Math.round(totalWater / waterCount);
          }

          // 运动频率描述
          if (recent.length > 0) {
            var ratio = exerciseDays / recent.length;
            if (ratio >= 0.8) {
              exerciseFrequency = '每天运动';
            } else if (ratio >= 0.5) {
              exerciseFrequency = '经常运动(每周' + Math.round(exerciseDays / recent.length * 7) + '天)';
            } else if (ratio >= 0.2) {
              exerciseFrequency = '偶尔运动(每周' + Math.max(1, Math.round(exerciseDays / recent.length * 7)) + '天)';
            } else if (exerciseDays > 0) {
              exerciseFrequency = '较少运动';
            } else {
              exerciseFrequency = '暂无运动记录';
            }
          }
        }
      }
    } catch(e) {}

    return {
      wakeTime: wakeTime,
      sleepTime: sleepTime,
      commute: commute,
      avgSleepHours: avgSleepHours,
      avgWaterCups: avgWaterCups,
      exerciseFrequency: exerciseFrequency
    };
  }

  function buildEmotional() {
    var recentMood = null;
    var moodTrend = '';
    var avgScore = 0;
    var commonTriggers = [];

    try {
      var moodLog = safeGetJSON('mijieai_mood_log', []);
      if (Array.isArray(moodLog) && moodLog.length > 0) {
        // 最近一次情绪
        var latest = moodLog[moodLog.length - 1];
        recentMood = { mood: latest.mood, score: latest.score, date: latest.date };

        // 最近7天数据
        var sevenDaysAgo = daysAgoStr(7);
        var recent = [];
        for (var i = 0; i < moodLog.length; i++) {
          if (moodLog[i].date && moodLog[i].date >= sevenDaysAgo) {
            recent.push(moodLog[i]);
          }
        }

        if (recent.length > 0) {
          // 平均分数
          var totalScore = 0;
          for (var j = 0; j < recent.length; j++) {
            totalScore += (Number(recent[j].score) || 0);
          }
          avgScore = Math.round(totalScore / recent.length * 10) / 10;

          // 情绪趋势：比较前一半和后一半的平均分
          if (recent.length >= 2) {
            var mid = Math.floor(recent.length / 2);
            var firstHalf = 0;
            var secondHalf = 0;
            for (var k = 0; k < mid; k++) {
              firstHalf += (Number(recent[k].score) || 0);
            }
            for (var m = mid; m < recent.length; m++) {
              secondHalf += (Number(recent[m].score) || 0);
            }
            firstHalf = firstHalf / mid;
            secondHalf = secondHalf / (recent.length - mid);
            var diff = secondHalf - firstHalf;
            if (diff > 0.3) {
              moodTrend = 'improving';
            } else if (diff < -0.3) {
              moodTrend = 'declining';
            } else {
              moodTrend = 'stable';
            }
          } else {
            moodTrend = 'stable';
          }

          // 常见触发因素
          var triggerMap = {};
          for (var n = 0; n < moodLog.length; n++) {
            var t = moodLog[n].trigger;
            if (t && t.trim()) {
              triggerMap[t.trim()] = (triggerMap[t.trim()] || 0) + 1;
            }
          }
          var triggerArr = [];
          var triggerKeys = Object.keys(triggerMap);
          for (var p = 0; p < triggerKeys.length; p++) {
            triggerArr.push({ name: triggerKeys[p], count: triggerMap[triggerKeys[p]] });
          }
          triggerArr.sort(function(a, b) { return b.count - a.count; });
          for (var q = 0; q < Math.min(5, triggerArr.length); q++) {
            commonTriggers.push(triggerArr[q].name);
          }
        }
      }
    } catch(e) {}

    return {
      recentMood: recentMood,
      moodTrend: moodTrend,
      avgScore: avgScore,
      commonTriggers: commonTriggers
    };
  }

  function buildSchedule() {
    var activeTasks = 0;
    var overdueTasks = 0;
    var topGroups = [];
    var today = todayStr();

    try {
      var tasks = safeGetJSON('mijieai_schedule', []);
      if (Array.isArray(tasks)) {
        var groupMap = {};

        for (var i = 0; i < tasks.length; i++) {
          var t = tasks[i];
          if (t.status !== 'done') {
            activeTasks++;
            // 过期判断
            if (t.date && t.date < today) {
              overdueTasks++;
            }
          }
          // 分组统计（所有未完成的任务）
          if (t.status !== 'done' && t.group) {
            groupMap[t.group] = (groupMap[t.group] || 0) + 1;
          }
        }

        var gArr = [];
        var gKeys = Object.keys(groupMap);
        for (var j = 0; j < gKeys.length; j++) {
          gArr.push({ name: gKeys[j], count: groupMap[gKeys[j]] });
        }
        gArr.sort(function(a, b) { return b.count - a.count; });
        for (var k = 0; k < Math.min(3, gArr.length); k++) {
          topGroups.push(gArr[k]);
        }
      }
    } catch(e) {}

    return {
      activeTasks: activeTasks,
      overdueTasks: overdueTasks,
      topGroups: topGroups
    };
  }

  function buildFamily() {
    var children = [];
    var hasEducationPlan = false;

    try {
      var familyEdu = safeGetJSON('mijieai_family_edu', {});
      if (familyEdu.children && Array.isArray(familyEdu.children)) {
        children = familyEdu.children;
        hasEducationPlan = children.length > 0;
      }
    } catch(e) {}

    return {
      children: children,
      hasEducationPlan: hasEducationPlan
    };
  }

  function buildPreferences() {
    var brands = {};
    var content = {};
    var shoppingStyle = {};

    try {
      var prefs = safeGetJSON('mijieai_preferences', {});
      if (prefs.brands) brands = prefs.brands;
      if (prefs.content) content = prefs.content;
      if (prefs.shopping_style) shoppingStyle = prefs.shopping_style;
    } catch(e) {}

    return {
      brands: brands,
      content: content,
      shoppingStyle: shoppingStyle
    };
  }

  // ==================== 数据完整度 ====================

  function calcCompleteness(profile) {
    // 定义所有字段及其权重（总分100）
    var checks = [
      { path: 'health.conditions', weight: 10 },
      { path: 'health.dietary.flavor', weight: 5 },
      { path: 'finance.monthlyIncome', weight: 10, check: function(v) { return v > 0; } },
      { path: 'finance.monthlyExpense', weight: 10, check: function(v) { return v > 0; } },
      { path: 'lifestyle.wakeTime', weight: 5 },
      { path: 'lifestyle.avgSleepHours', weight: 10, check: function(v) { return v > 0; } },
      { path: 'lifestyle.avgWaterCups', weight: 5, check: function(v) { return v > 0; } },
      { path: 'lifestyle.exerciseFrequency', weight: 5, check: function(v) { return v && v !== '暂无运动记录'; } },
      { path: 'emotional.recentMood', weight: 10 },
      { path: 'schedule.activeTasks', weight: 5, check: function(v) { return v > 0; } },
      { path: 'family.children', weight: 5, check: function(v) { return Array.isArray(v) && v.length > 0; } },
      { path: 'preferences.brands', weight: 5, check: function(v) { return Object.keys(v).length > 0; } },
      { path: 'preferences.content', weight: 5, check: function(v) { return Object.keys(v).length > 0; } },
      { path: 'preferences.shoppingStyle', weight: 5, check: function(v) { return Object.keys(v).length > 0; } },
      { path: 'health.symptoms', weight: 5 }
    ];

    var score = 0;
    var populatedFields = [];

    for (var i = 0; i < checks.length; i++) {
      var c = checks[i];
      var parts = c.path.split('.');
      var val = profile;
      for (var j = 0; j < parts.length; j++) {
        if (val === undefined || val === null) { val = undefined; break; }
        val = val[parts[j]];
      }

      var hasData = false;
      if (val !== undefined && val !== null && val !== '' && val !== 0) {
        if (c.check) {
          hasData = c.check(val);
        } else if (Array.isArray(val)) {
          hasData = val.length > 0;
        } else if (typeof val === 'object') {
          hasData = Object.keys(val).length > 0;
        } else {
          hasData = true;
        }
      }

      if (hasData) {
        score += c.weight;
        populatedFields.push(c.path);
      }
    }

    return { score: score, fields: populatedFields };
  }

  // ==================== 主构建 ====================

  function build() {
    var health = buildHealth();
    var finance = buildFinance();
    var lifestyle = buildLifestyle();
    var emotional = buildEmotional();
    var schedule = buildSchedule();
    var family = buildFamily();
    var preferences = buildPreferences();

    var completeness = calcCompleteness({
      health: health,
      finance: finance,
      lifestyle: lifestyle,
      emotional: emotional,
      schedule: schedule,
      family: family,
      preferences: preferences
    });

    var profile = {
      health: health,
      finance: finance,
      lifestyle: lifestyle,
      emotional: emotional,
      schedule: schedule,
      family: family,
      preferences: preferences,
      meta: {
        lastUpdated: new Date().toISOString(),
        dataCompleteness: completeness.score,
        populatedFields: completeness.fields
      }
    };

    cachedProfile = profile;
    return profile;
  }

  // ==================== 摘要生成 ====================

  function getSummary() {
    var profile = cachedProfile || build();
    var parts = [];

    // 健康
    if (profile.health.conditions.length > 0) {
      parts.push('用户有' + profile.health.conditions.join('、') + '等慢病');
    }
    if (profile.health.dietary.allergies.length > 0) {
      parts.push('对' + profile.health.dietary.allergies.join('、') + '过敏');
    }

    // 财务
    if (profile.finance.monthlyIncome > 0 || profile.finance.monthlyExpense > 0) {
      var finStr = '本月收支' + profile.finance.recentTrend;
      if (profile.finance.recentTrend === '盈余') {
        finStr += (profile.finance.monthlyIncome - profile.finance.monthlyExpense) + '元';
      } else if (profile.finance.recentTrend === '赤字') {
        finStr += (profile.finance.monthlyExpense - profile.finance.monthlyIncome) + '元';
      }
      finStr += '(收入' + profile.finance.monthlyIncome + '/支出' + profile.finance.monthlyExpense + ')';
      parts.push(finStr);
    }

    // 情绪
    if (profile.emotional.avgScore > 0) {
      var moodDesc = '';
      if (profile.emotional.moodTrend === 'improving') {
        moodDesc = '最近情绪呈上升趋势';
      } else if (profile.emotional.moodTrend === 'declining') {
        moodDesc = '最近情绪呈下降趋势';
      } else {
        moodDesc = '最近情绪总体稳定';
      }
      moodDesc += '(均分' + profile.emotional.avgScore + '/5)';
      parts.push(moodDesc);
    }

    // 生活
    if (profile.lifestyle.avgSleepHours > 0) {
      parts.push('近7天平均睡眠' + profile.lifestyle.avgSleepHours + '小时');
    }

    // 日程
    if (profile.schedule.activeTasks > 0) {
      var schedStr = '今日有' + profile.schedule.activeTasks + '项待办';
      if (profile.schedule.overdueTasks > 0) {
        schedStr += '(含' + profile.schedule.overdueTasks + '项已逾期)';
      }
      parts.push(schedStr);
    }

    // 家庭
    if (profile.family.children.length > 0) {
      parts.push('有' + profile.family.children.length + '个子女');
    }

    var summary = parts.join('，');
    if (summary) {
      summary += '。';
    } else {
      summary = '用户暂无详细数据记录，建议引导用户完善各模块信息。';
    }

    return summary;
  }

  // ==================== 缓存管理 ====================

  function getProfile() {
    if (!cachedProfile) {
      // 尝试从 localStorage 恢复缓存
      try {
        var cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          cachedProfile = JSON.parse(cached);
        }
      } catch(e) {}

      // 仍无则构建
      if (!cachedProfile) {
        build();
      }
    }
    return cachedProfile;
  }

  function refreshCache() {
    build();
    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cachedProfile));
    } catch(e) {}
    return cachedProfile;
  }

  function getCompleteness() {
    var profile = cachedProfile || build();
    return {
      score: profile.meta.dataCompleteness,
      fields: profile.meta.populatedFields
    };
  }

  // ==================== 导出 ====================

  window.UserProfile = {
    build: build,
    getSummary: getSummary,
    getProfile: getProfile,
    refreshCache: refreshCache,
    getCompleteness: getCompleteness
  };

})();
