/**
 * UserProfile - 统一用户画像模块
 * 聚合各模块localStorage数据，为AI引擎提供统一上下文
 *
 * 架构：
 *   8大数据源 → build()聚合 → 画像对象 → getSummary()摘要 → AI Prompt
 */
(function() {
  'use strict';

  // 注册本模块到 DataStore
  if (window.DataStore && DataStore.registerModule) {
    DataStore.registerModule('user_profile', {
      cache: 'mijieai_user_profile'
    });
  }

  var MODULE = 'user_profile';
  var FIELD_CACHE = 'cache';

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

  // ==================== 决策画像维度 ====================

  // 价值标签关键词词典（类别 → 匹配关键词）
  var VALUE_KEYWORDS = {
    '稳定性': ['稳定', '安全感', '确定', '风险低', '不折腾', '稳', '安稳', '保险', '踏实', '保障'],
    '成长性': ['成长', '发展', '前景', '空间', '提升', '学习', '进步', '潜力', '上升', '突破'],
    '收入/财富': ['钱', '收入', '工资', '薪资', '财富', '回报', '赚钱', '收益', '利润', '薪资', '薪水', '待遇'],
    '自由/时间': ['自由', '时间', '轻松', '不加班', 'work-life', '平衡', '弹性', '闲', '节奏', '作息'],
    '意义/价值': ['意义', '价值', '兴趣', '热爱', '喜欢', '成就感', '梦想', '追求', '使命', '热情'],
    '家庭/陪伴': ['家庭', '陪伴', '孩子', '家人', '父母', '亲情', '顾家', '团聚']
  };

  // 风险倾向关键词
  var RISK_KEYWORDS = {
    conservative: ['稳定', '保险', '安全', '稳妥', '不冒风险', '求稳', '保守', '踏实', '无风险', '低风险'],
    aggressive: ['冒险', '搏一把', '赌', '高风险', '创业', '投资', 'all in', '激进', '冲', '挑战', '尝试', '机遇', '机会']
  };

  // 感性倾向关键词
  var EMOTIONAL_KEYWORDS = ['我感觉', '我觉得', '喜欢', '热爱', '讨厌', '害怕', '担心', '开心', '难过', '心动', '直觉', '心里面', '情感', '感受'];

  // 话题领域关键词
  var TOPIC_KEYWORDS = {
    '职业': ['工作', 'offer', '辞职', '跳槽', '创业', '职业', '行业', '公司', '职场', '转行', '晋升', '加薪', '同事', '老板', '面试', '实习'],
    '财务': ['投资', '理财', '股票', '基金', '买房', '贷款', '保险', '钱', '财富', '存款', '还债', '房贷', '消费'],
    '健康': ['健康', '身体', '体检', '生病', '医疗', '运动', '减肥', '饮食', '作息', '失眠'],
    '感情/家庭': ['感情', '恋爱', '结婚', '孩子', '家庭', '父母', '分手', '相亲', '婚姻', '伴侣', '对象'],
    '生活': ['搬家', '租房', '买车', '旅行', '宠物', '城市', '选择城市', '生活方式', '社交']
  };

  /**
   * 从文本中匹配价值标签，返回命中的价值类别数组
   * @param {string} text
   * @returns {string[]} 命中的价值类别
   */
  function matchValueCategories(text) {
    if (!text) return [];
    var hits = [];
    var categories = Object.keys(VALUE_KEYWORDS);
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var kws = VALUE_KEYWORDS[cat];
      for (var j = 0; j < kws.length; j++) {
        if (text.indexOf(kws[j]) !== -1) {
          if (hits.indexOf(cat) === -1) {
            hits.push(cat);
          }
          break;
        }
      }
    }
    return hits;
  }

  /**
   * 解析 valueRankings 字段
   * 兼容三种情况：
   *   1. 已解析的对象数组 [{value, position}]
   *   2. 文本数组，形如 ["1. 稳定性", "2. 成长性"] 或纯文本项
   *   3. 纯字符串（Markdown列表或段落）
   * 返回: [{ value: '稳定性', position: 1 }, ...]
   */
  function parseValueRankings(valueRankings, fallbackText) {
    var result = [];
    var textSource = '';

    // 情况1：对象数组
    if (Array.isArray(valueRankings) && valueRankings.length > 0 &&
        typeof valueRankings[0] === 'object' && valueRankings[0].value) {
      for (var i = 0; i < valueRankings.length; i++) {
        var item = valueRankings[i];
        result.push({
          value: item.value || item.name || '',
          position: item.position || item.rank || (i + 1)
        });
      }
      return result;
    }

    // 情况2：字符串数组
    if (Array.isArray(valueRankings) && valueRankings.length > 0 &&
        typeof valueRankings[0] === 'string') {
      textSource = valueRankings.join('\n');
    }

    // 情况3：纯字符串
    if (typeof valueRankings === 'string' && valueRankings.trim()) {
      textSource = valueRankings;
    }

    // 如果 valueRankings 为空，用 fallbackText（决策档案全文）兜底
    if (!textSource && fallbackText) {
      textSource = fallbackText;
    }

    if (!textSource) return result;

    // 尝试从文本中提取有序列表（"1. xxx"、"2. xxx"格式）
    var lines = textSource.split(/\n|；|;|，/);
    var rankPattern = /^\s*(\d+)[.、\)）]\s*(.+?)\s*$/;
    var foundOrdered = false;

    for (var k = 0; k < lines.length; k++) {
      var line = lines[k].trim();
      var m = line.match(rankPattern);
      if (m) {
        var pos = parseInt(m[1]);
        var content = m[2].trim();
        // 匹配价值类别
        var cats = matchValueCategories(content);
        for (var l = 0; l < cats.length; l++) {
          result.push({ value: cats[l], position: pos });
        }
        if (cats.length > 0) foundOrdered = true;
      }
    }

    // 如果有序列表没匹配到价值类别，用全文关键词匹配
    if (result.length === 0) {
      var allCats = matchValueCategories(textSource);
      for (var n = 0; n < allCats.length; n++) {
        // 没有位置信息，给一个默认中间位置
        result.push({ value: allCats[n], position: 3 });
      }
    }

    return result;
  }

  /**
   * 统计所有决策的价值排序
   */
  function aggregateValueRankings(sessions) {
    var statMap = {}; // value -> { count, posSum }

    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      if (s.status !== 'completed') continue;

      var rankings = parseValueRankings(s.valueRankings, s.finalSummary);
      for (var j = 0; j < rankings.length; j++) {
        var r = rankings[j];
        if (!r.value) continue;
        if (!statMap[r.value]) {
          statMap[r.value] = { count: 0, posSum: 0 };
        }
        statMap[r.value].count++;
        statMap[r.value].posSum += (r.position || 3);
      }
    }

    var arr = [];
    var keys = Object.keys(statMap);
    for (var k = 0; k < keys.length; k++) {
      var v = keys[k];
      arr.push({
        value: v,
        count: statMap[v].count,
        avgPosition: Math.round(statMap[v].posSum / statMap[v].count * 10) / 10
      });
    }

    // 按出现次数降序，次数相同按平均排名升序（越靠前越重要）
    arr.sort(function(a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return a.avgPosition - b.avgPosition;
    });

    return arr;
  }

  /**
   * 推断风险偏好
   * 返回 { preference: 'conservative'|'moderate'|'aggressive', score: 0-1, evidence: [] }
   */
  function inferRiskPreference(sessions) {
    var score = 0.5; // 默认中性
    var evidence = [];
    var conservativeHits = 0;
    var aggressiveHits = 0;
    var completedCount = 0;

    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      if (s.status !== 'completed') continue;
      completedCount++;

      var fullText = (s.title || '') + ' ' + (s.finalSummary || '') + ' ' + (s.decisionMade || '');
      // 收集各轮用户回答
      for (var r = 0; r < s.rounds.length; r++) {
        if (s.rounds[r].userAnswer) {
          fullText += ' ' + s.rounds[r].userAnswer;
        }
      }

      // 统计保守关键词命中
      var consKws = RISK_KEYWORDS.conservative;
      for (var c = 0; c < consKws.length; c++) {
        if (fullText.indexOf(consKws[c]) !== -1) {
          conservativeHits++;
          break; // 每个决策最多计一次
        }
      }

      // 统计激进关键词命中
      var aggKws = RISK_KEYWORDS.aggressive;
      for (var a = 0; a < aggKws.length; a++) {
        if (fullText.indexOf(aggKws[a]) !== -1) {
          aggressiveHits++;
          break; // 每个决策最多计一次
        }
      }

      // 话题是高风险领域（创业、投资）加激进分
      var highRiskTopics = ['创业', '投资', '股票', '基金', '辞职创业', 'all in'];
      for (var h = 0; h < highRiskTopics.length; h++) {
        if (fullText.indexOf(highRiskTopics[h]) !== -1) {
          aggressiveHits += 0.5;
          break;
        }
      }
    }

    var totalHits = conservativeHits + aggressiveHits;
    if (totalHits > 0) {
      score = aggressiveHits / totalHits; // 0 = 全保守, 1 = 全激进
    }

    // 构造证据
    if (conservativeHits > 0) {
      evidence.push(Math.round(conservativeHits * 10) / 10 + '次决策中出现稳定/保守倾向表述');
    }
    if (aggressiveHits > 0) {
      evidence.push(Math.round(aggressiveHits * 10) / 10 + '次决策中出现冒险/进取倾向表述');
    }

    var preference = 'moderate';
    if (score > 0.6) {
      preference = 'aggressive';
    } else if (score < 0.4) {
      preference = 'conservative';
    }

    // 数据量不足时强制 moderate，降低置信度
    if (completedCount < 2) {
      preference = 'moderate';
      if (evidence.length === 0) {
        evidence.push('决策样本不足，暂以稳健为默认值');
      }
    }

    return {
      preference: preference,
      score: Math.round(score * 100) / 100,
      evidence: evidence
    };
  }

  /**
   * 推断决策风格
   */
  function inferDecisionStyle(sessions) {
    var style = {
      isAnalytical: false,
      isEmotional: false,
      isImpulsive: false,
      evidence: []
    };

    var completed = [];
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].status === 'completed') completed.push(sessions[i]);
    }

    if (completed.length === 0) return style;

    var totalRounds = 0;
    var totalAnswerLen = 0;
    var emotionalHitCount = 0;
    var quickDecisions = 0;

    for (var j = 0; j < completed.length; j++) {
      var s = completed[j];
      totalRounds += (s.currentRound || s.rounds.length || 1);

      var ansLen = 0;
      var emoHit = false;
      for (var r = 0; r < s.rounds.length; r++) {
        var ans = s.rounds[r].userAnswer || '';
        ansLen += ans.length;
        // 检查感性词汇
        for (var k = 0; k < EMOTIONAL_KEYWORDS.length; k++) {
          if (ans.indexOf(EMOTIONAL_KEYWORDS[k]) !== -1) {
            emoHit = true;
            break;
          }
        }
      }
      totalAnswerLen += ansLen;
      if (emoHit) emotionalHitCount++;

      // 一轮就完成（或回答极短）= 冲动型特征
      var roundCount = s.currentRound || s.rounds.length || 1;
      if (roundCount <= 1 || ansLen < 20) {
        quickDecisions++;
      }
    }

    var avgRounds = totalRounds / completed.length;
    var avgAnswerLen = totalAnswerLen / completed.length;

    // 分析型：平均轮次 >= 3 或 平均回答长度 >= 100
    if (avgRounds >= 3 || avgAnswerLen >= 100) {
      style.isAnalytical = true;
      style.evidence.push('平均每轮决策走' + Math.round(avgRounds * 10) / 10 + '轮，回答较详尽');
    }

    // 感性型：超过一半决策含感性表达
    if (completed.length > 0 && emotionalHitCount / completed.length >= 0.5) {
      style.isEmotional = true;
      style.evidence.push(emotionalHitCount + '次决策中出现感性表述');
    }

    // 冲动型：超过一半决策一轮完事或回答很短
    if (completed.length > 0 && quickDecisions / completed.length >= 0.5) {
      style.isImpulsive = true;
      style.evidence.push(quickDecisions + '次决策较为快速直接');
    }

    // 如果数据不足，不做过度推断
    if (completed.length < 2) {
      style.evidence.push('样本量少，风格判断仅供参考');
    }

    return style;
  }

  /**
   * 识别决策话题领域
   */
  function identifyTopics(sessions) {
    var topicCount = {};
    var topicKeys = Object.keys(TOPIC_KEYWORDS);

    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      var text = (s.title || '') + ' ' + (s.finalSummary || '');
      for (var j = 0; j < topicKeys.length; j++) {
        var topic = topicKeys[j];
        var kws = TOPIC_KEYWORDS[topic];
        for (var k = 0; k < kws.length; k++) {
          if (text.indexOf(kws[k]) !== -1) {
            topicCount[topic] = (topicCount[topic] || 0) + 1;
            break;
          }
        }
      }
    }

    var arr = [];
    var keys = Object.keys(topicCount);
    for (var m = 0; m < keys.length; m++) {
      arr.push({ topic: keys[m], count: topicCount[keys[m]] });
    }
    arr.sort(function(a, b) { return b.count - a.count; });

    return arr;
  }

  function buildDecision() {
    var sessions = [];

    // 从 DataStore 读取决策会话
    try {
      if (window.DataStore && typeof DataStore.load === 'function') {
        sessions = DataStore.load('decision_forge', 'sessions', []) || [];
      }
    } catch(e) {}

    // 兜底：直接读 localStorage
    if (!sessions || sessions.length === 0) {
      try {
        var raw = localStorage.getItem('mijieai_decision_sessions');
        if (raw) sessions = JSON.parse(raw) || [];
      } catch(e) {}
    }

    if (!Array.isArray(sessions)) sessions = [];

    var totalDecisions = sessions.length;
    var completedSessions = sessions.filter(function(s) { return s.status === 'completed'; });
    var completedDecisions = completedSessions.length;

    // 平均轮次
    var avgRounds = 0;
    if (completedDecisions > 0) {
      var totalR = 0;
      for (var i = 0; i < completedSessions.length; i++) {
        totalR += (completedSessions[i].currentRound || (completedSessions[i].rounds && completedSessions[i].rounds.length) || 1);
      }
      avgRounds = Math.round(totalR / completedDecisions * 10) / 10;
    }

    // 价值排序
    var valueRankings = aggregateValueRankings(sessions);
    var topValues = valueRankings.slice(0, 3).map(function(v) { return v.value; });

    // 风险偏好
    var riskInfo = inferRiskPreference(sessions);

    // 决策风格
    var decisionStyle = inferDecisionStyle(sessions);

    // 话题领域
    var commonTopics = identifyTopics(sessions);

    // 最近一次决策
    var lastDecision = null;
    if (sessions.length > 0) {
      var latest = sessions[0]; // sessions 是倒序的（unshift）
      var dateStr = '';
      if (latest.updatedAt) {
        var d = new Date(latest.updatedAt);
        dateStr = d.getFullYear() + '-' + padNum(d.getMonth() + 1) + '-' + padNum(d.getDate());
      }
      lastDecision = {
        title: latest.title || '',
        date: dateStr,
        status: latest.status || 'active'
      };
    }

    // 置信度：基于完成决策数
    // 0个: 0, 1个: 0.2, 3个: 0.5, 5个: 0.7, 10个+: 0.9
    var confidence = 0;
    if (completedDecisions >= 10) {
      confidence = 0.9;
    } else if (completedDecisions >= 5) {
      confidence = 0.5 + (completedDecisions - 5) * 0.08;
    } else if (completedDecisions >= 3) {
      confidence = 0.3 + (completedDecisions - 3) * 0.1;
    } else if (completedDecisions >= 1) {
      confidence = 0.1 + (completedDecisions - 1) * 0.2;
    }
    confidence = Math.round(confidence * 100) / 100;

    return {
      totalDecisions: totalDecisions,
      completedDecisions: completedDecisions,
      avgRoundsPerDecision: avgRounds,
      valueRankings: valueRankings,
      topValues: topValues,
      riskPreference: riskInfo.preference,
      riskEvidence: riskInfo.evidence,
      decisionStyle: decisionStyle,
      commonTopics: commonTopics,
      lastDecision: lastDecision,
      confidence: confidence
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
      { path: 'health.symptoms', weight: 5 },
      // 决策画像维度（共10分）
      { path: 'decision.completedDecisions', weight: 4, check: function(v) { return v > 0; } },
      { path: 'decision.topValues', weight: 3, check: function(v) { return Array.isArray(v) && v.length > 0; } },
      { path: 'decision.commonTopics', weight: 3, check: function(v) { return Array.isArray(v) && v.length > 0; } }
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
    var decision = buildDecision();

    var profile = {
      health: health,
      finance: finance,
      lifestyle: lifestyle,
      emotional: emotional,
      schedule: schedule,
      family: family,
      preferences: preferences,
      decision: decision,
      meta: {
        lastUpdated: new Date().toISOString(),
        dataCompleteness: 0,
        populatedFields: []
      }
    };

    var completeness = calcCompleteness(profile);
    profile.meta.dataCompleteness = completeness.score;
    profile.meta.populatedFields = completeness.fields;

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

    // 决策画像（只有有数据时才输出）
    if (profile.decision && profile.decision.completedDecisions >= 1) {
      var dec = profile.decision;
      parts.push('做过' + dec.completedDecisions + '个决策');

      if (dec.topValues && dec.topValues.length > 0) {
        parts.push('最看重：' + dec.topValues.join('、'));
      }

      // 决策风格描述
      var styleDesc = '';
      if (dec.decisionStyle && dec.decisionStyle.isAnalytical) {
        styleDesc += '分析型';
      }
      if (dec.decisionStyle && dec.decisionStyle.isEmotional) {
        styleDesc += (styleDesc ? '+感性' : '感性型');
      }
      if (dec.decisionStyle && dec.decisionStyle.isImpulsive) {
        styleDesc += (styleDesc ? '+冲动' : '冲动型');
      }
      if (styleDesc) {
        parts.push('决策风格偏' + styleDesc);
      } else {
        parts.push('决策风格偏综合型');
      }

      // 风险偏好
      var riskDesc = '';
      if (dec.riskPreference === 'conservative') {
        riskDesc = '稳健保守';
      } else if (dec.riskPreference === 'aggressive') {
        riskDesc = '积极进取';
      } else {
        riskDesc = '稳健适中';
      }
      parts.push('风险偏好偏' + riskDesc);
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
      // 尝试从 DataStore 恢复缓存
      try {
        var cached = DataStore.load(MODULE, FIELD_CACHE, null);
        if (cached) {
          cachedProfile = cached;
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
      DataStore.save(MODULE, FIELD_CACHE, cachedProfile);
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
