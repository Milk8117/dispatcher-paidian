/**
 * PushEngine — 主动推送引擎
 * 基于跨模块洞察引擎 + 日程/收支/情绪数据变化，主动生成智能推送
 *
 * 推送类型：
 *   1. 每日晨报（daily_briefing）— 每天早上8点左右，汇总昨日关键数据+今日建议
 *   2. 洞察预警（insight_alert）— 检测到异常时主动推送（如：超支预警、情绪低谷、连续熬夜等）
 *   3. 场景建议（scenario_tip）— 基于数据特征给出行动建议（如：周末消费偏高、压力消费模式等）
 *
 * 核心机制：
 *   - 数据指纹（data_fingerprint）：记录上次推送时的关键数据状态，判断是否有新变化
 *   - 推送去重（dedupe_window）：同类洞察在窗口期内不重复推送
 *   - 静默时间（quiet_hours）：晚10点-早7点不推送打扰
 *   - 频率控制：每日最多5条主动推送，避免信息过载
 *   - 反馈闭环（feedback_loop）：用户反馈有用/没用，AI自动校准推送策略（共生内核L1）
 *
 * 数据存储：
 *   mijieai_push_log      — 推送历史记录（用于去重+统计）
 *   mijieai_push_settings — 用户推送偏好设置
 *   mijieai_push_fingerprint — 数据指纹（判断数据是否有变化）
 *   mijieai_push_feedback_stats — 反馈统计数据
 *
 * 挂载：window.PushEngine
 */
(function() {
  'use strict';

  // 注册本模块到 DataStore
  if (window.DataStore && DataStore.registerModule) {
    DataStore.registerModule('push', {
      log: 'mijieai_push_log',
      settings: 'mijieai_push_settings',
      fingerprint: 'mijieai_push_fingerprint',
      feedback_stats: 'mijieai_push_feedback_stats'
    });
  }

  var MODULE = 'push';
  var FIELD_LOG = 'log';
  var FIELD_SETTINGS = 'settings';
  var FIELD_FINGERPRINT = 'fingerprint';
  var FIELD_FEEDBACK_STATS = 'feedback_stats';

  // ==================== 常量 ====================

  var LOG_KEY = 'mijieai_push_log';
  var SETTINGS_KEY = 'mijieai_push_settings';
  var FINGERPRINT_KEY = 'mijieai_push_fingerprint';
  var FEEDBACK_STATS_KEY = 'mijieai_push_feedback_stats';

  // 默认设置
  var DEFAULT_SETTINGS = {
    enabled: true,
    dailyBriefingTime: '08:00',  // 每日晨报时间
    quietHoursStart: '22:00',    // 静默开始
    quietHoursEnd: '07:00',      // 静默结束
    maxPerDay: 5,                // 每日最大推送数
    categories: {
      daily_briefing: true,
      insight_alert: true,
      scenario_tip: true,
      financial: true,
      health: true,
      behavior: true
    },
    suppressedInsights: [],       // 被永久屏蔽的洞察/建议列表 [{type, dedupeKey, reason, suppressedAt}]
    dailyBriefingInterval: 1      // 晨报间隔天数（1=每天，2=每2天）
  };

  // 推送严重度
  var SEVERITY = {
    INFO: 1,      // 普通信息
    WARNING: 2,   // 注意/预警
    CRITICAL: 3   // 重要提醒
  };

  // 去重窗口期（毫秒）
  var DEDUPE_WINDOW = {
    insight_alert: 24 * 60 * 60 * 1000,   // 同类预警24小时内不重复
    scenario_tip: 48 * 60 * 60 * 1000,    // 同类建议48小时内不重复
    daily_briefing: 20 * 60 * 60 * 1000   // 晨报20小时内不重复
  };

  // 反馈原因枚举
  var FEEDBACK_REASONS = {
    INACCURATE: 'inaccurate',
    UNNECESSARY: 'unnecessary',
    BAD_TIMING: 'bad_timing',
    TOO_SHALLOW: 'too_shallow'
  };

  // 反馈原因中文标签
  var FEEDBACK_REASON_LABELS = {
    inaccurate: '内容不准',
    unnecessary: '不需要',
    bad_timing: '时机不对',
    too_shallow: '太浅了'
  };

  // 自校准阈值（保守策略）
  var SUPPRESSION_THRESHOLDS = {
    insight_alert: {
      minUselessCount: 2,     // 至少2次没用才考虑屏蔽
      uselessRate: 0.6        // 没用率≥60%
    },
    scenario_tip: {
      minUselessCount: 3,     // 至少3次没用才考虑屏蔽
      uselessRate: 0.5        // 没用率≥50%
    },
    daily_briefing: {
      consecutiveUseless: 5   // 连续5次没用则降频
    }
  };

  // ==================== 工具函数 ====================

  // ===== push 模块自身数据读写（走 DataStore） =====

  function _loadLog() {
    try { return DataStore.load(MODULE, FIELD_LOG, []) || []; } catch(e) { return []; }
  }
  function _saveLog(data) {
    try { DataStore.save(MODULE, FIELD_LOG, data); } catch(e) {}
  }
  function _loadSettings() {
    try { return DataStore.load(MODULE, FIELD_SETTINGS, null); } catch(e) { return null; }
  }
  function _saveSettings(data) {
    try { DataStore.save(MODULE, FIELD_SETTINGS, data); } catch(e) {}
  }
  function _loadFingerprint() {
    try { return DataStore.load(MODULE, FIELD_FINGERPRINT, null); } catch(e) { return null; }
  }
  function _saveFingerprint(data) {
    try { DataStore.save(MODULE, FIELD_FINGERPRINT, data); } catch(e) {}
  }
  function _loadFeedbackStats() {
    try { return DataStore.load(MODULE, FIELD_FEEDBACK_STATS, null); } catch(e) { return null; }
  }
  function _saveFeedbackStats(data) {
    try { DataStore.save(MODULE, FIELD_FEEDBACK_STATS, data); } catch(e) {}
  }

  // ===== 跨模块读取（只读其他模块数据，直接读 localStorage） =====

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

  function formatTime(d) {
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function isInQuietHours(settings) {
    var now = new Date();
    var currentMin = now.getHours() * 60 + now.getMinutes();
    var startParts = settings.quietHoursStart.split(':');
    var endParts = settings.quietHoursEnd.split(':');
    var startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    var endMin = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

    if (startMin > endMin) {
      // 跨午夜，如22:00-07:00
      return currentMin >= startMin || currentMin < endMin;
    }
    return currentMin >= startMin && currentMin < endMin;
  }

  function genId() {
    return 'push_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  // ==================== 设置管理 ====================

  function getSettings() {
    var saved = _loadSettings();
    if (!saved) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    // 合并默认值（兼容旧版本新增字段）
    var merged = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    for (var k in saved) {
      if (saved.hasOwnProperty(k)) {
        if (typeof saved[k] === 'object' && saved[k] !== null && !Array.isArray(saved[k])) {
          for (var sk in saved[k]) {
            if (saved[k].hasOwnProperty(sk)) {
              merged[k][sk] = saved[k][sk];
            }
          }
        } else {
          merged[k] = saved[k];
        }
      }
    }
    // 确保 suppressedInsights 存在
    if (!Array.isArray(merged.suppressedInsights)) {
      merged.suppressedInsights = [];
    }
    // 确保 dailyBriefingInterval 存在
    if (typeof merged.dailyBriefingInterval !== 'number' || merged.dailyBriefingInterval < 1) {
      merged.dailyBriefingInterval = 1;
    }
    return merged;
  }

  function updateSettings(patch) {
    var current = getSettings();
    for (var k in patch) {
      if (patch.hasOwnProperty(k)) {
        if (typeof patch[k] === 'object' && patch[k] !== null && !Array.isArray(patch[k])) {
          current[k] = current[k] || {};
          for (var sk in patch[k]) {
            if (patch[k].hasOwnProperty(sk)) {
              current[k][sk] = patch[k][sk];
            }
          }
        } else {
          current[k] = patch[k];
        }
      }
    }
    _saveSettings(current);
    return current;
  }

  // ==================== 推送历史管理 ====================

  function getPushLog() {
    return _loadLog();
  }

  function addPushLog(item) {
    var log = _loadLog();
    // 确保新条目有反馈相关字段
    var entry = JSON.parse(JSON.stringify(item));
    entry.feedback = item.feedback || null;
    entry.feedbackReasons = item.feedbackReasons || [];
    entry.feedbackTime = item.feedbackTime || null;
    entry.feedbackNote = item.feedbackNote || '';
    log.unshift(entry);
    // 只保留最近100条
    if (log.length > 100) log = log.slice(0, 100);
    _saveLog(log);
  }

  function getTodayPushCount() {
    var log = getPushLog();
    var today = todayStr();
    var count = 0;
    for (var i = 0; i < log.length; i++) {
      if (log[i].date === today) count++;
      else break; // 按时间倒序，遇到非今天就可以停了
    }
    return count;
  }

  /**
   * 检查某类推送在窗口期内是否已推送过
   */
  function wasPushedRecently(pushType, dedupeKey) {
    var log = getPushLog();
    var now = Date.now();
    var window = DEDUPE_WINDOW[pushType] || (24 * 60 * 60 * 1000);

    for (var i = 0; i < log.length; i++) {
      var item = log[i];
      if (now - item.timestamp > window) break; // 超过窗口期，不用再查
      if (item.type === pushType && item.dedupeKey === dedupeKey) {
        return true;
      }
    }
    return false;
  }

  // ==================== 反馈统计模块 ====================

  /**
   * 获取初始反馈统计结构
   */
  function _getEmptyStats() {
    return {
      totalUseful: 0,
      totalUseless: 0,
      byType: {
        daily_briefing: {
          useful: 0,
          useless: 0,
          reasons: { inaccurate: 0, unnecessary: 0, bad_timing: 0, too_shallow: 0 }
        },
        insight_alert: {
          useful: 0,
          useless: 0,
          reasons: { inaccurate: 0, unnecessary: 0, bad_timing: 0, too_shallow: 0 }
        },
        scenario_tip: {
          useful: 0,
          useless: 0,
          reasons: { inaccurate: 0, unnecessary: 0, bad_timing: 0, too_shallow: 0 }
        }
      },
      byDedupeKey: {}
    };
  }

  /**
   * 获取反馈统计数据
   */
  function getFeedbackStats() {
    var saved = _loadFeedbackStats();
    if (!saved) {
      var empty = _getEmptyStats();
      _saveFeedbackStats(empty);
      return empty;
    }
    // 兼容旧数据，确保结构完整
    var stats = _getEmptyStats();
    if (typeof saved.totalUseful === 'number') stats.totalUseful = saved.totalUseful;
    if (typeof saved.totalUseless === 'number') stats.totalUseless = saved.totalUseless;
    if (saved.byType) {
      for (var t in saved.byType) {
        if (saved.byType.hasOwnProperty(t) && stats.byType[t]) {
          if (typeof saved.byType[t].useful === 'number') stats.byType[t].useful = saved.byType[t].useful;
          if (typeof saved.byType[t].useless === 'number') stats.byType[t].useless = saved.byType[t].useless;
          if (saved.byType[t].reasons) {
            for (var r in saved.byType[t].reasons) {
              if (saved.byType[t].reasons.hasOwnProperty(r) && stats.byType[t].reasons[r] !== undefined) {
                stats.byType[t].reasons[r] = saved.byType[t].reasons[r];
              }
            }
          }
        }
      }
    }
    if (saved.byDedupeKey) {
      stats.byDedupeKey = saved.byDedupeKey;
    }
    return stats;
  }

  /**
   * 保存反馈统计
   */
  function _saveStats(stats) {
    _saveFeedbackStats(stats);
  }

  /**
   * 获取或创建某 dedupeKey 的统计
   */
  function _getOrCreateDedupeStats(stats, dedupeKey) {
    if (!stats.byDedupeKey[dedupeKey]) {
      stats.byDedupeKey[dedupeKey] = {
        useful: 0,
        useless: 0,
        reasons: { inaccurate: 0, unnecessary: 0, bad_timing: 0, too_shallow: 0 }
      };
    }
    return stats.byDedupeKey[dedupeKey];
  }

  /**
   * 记录用户反馈
   * @param {string} pushId - 推送ID
   * @param {string} feedback - 'useful' | 'useless'
   * @param {string[]} [reasons] - 没用的原因数组
   * @param {string} [note] - 可选备注
   * @returns {boolean} 是否成功
   */
  function recordFeedback(pushId, feedback, reasons, note) {
    if (!pushId || (feedback !== 'useful' && feedback !== 'useless')) {
      return false;
    }

    var log = getPushLog();
    var targetIndex = -1;
    var targetItem = null;

    for (var i = 0; i < log.length; i++) {
      if (log[i].id === pushId) {
        targetIndex = i;
        targetItem = log[i];
        break;
      }
    }

    if (!targetItem) return false;

    // 如果已经反馈过，不重复统计（但允许修改反馈，需要先扣除旧的）
    var prevFeedback = targetItem.feedback;
    if (prevFeedback === feedback) {
      // 反馈没变，只更新原因/备注（如果是useless）
      if (feedback === 'useless') {
        targetItem.feedbackReasons = reasons || [];
        targetItem.feedbackNote = note || '';
        targetItem.feedbackTime = Date.now();
        _saveLog(log);
      }
      return true;
    }

    // 如果之前有过反馈，需要先从统计中扣除
    var stats = getFeedbackStats();
    if (prevFeedback === 'useful') {
      stats.totalUseful = Math.max(0, stats.totalUseful - 1);
      if (stats.byType[targetItem.type]) {
        stats.byType[targetItem.type].useful = Math.max(0, stats.byType[targetItem.type].useful - 1);
      }
      if (stats.byDedupeKey[targetItem.dedupeKey]) {
        stats.byDedupeKey[targetItem.dedupeKey].useful = Math.max(0, stats.byDedupeKey[targetItem.dedupeKey].useful - 1);
      }
    } else if (prevFeedback === 'useless') {
      stats.totalUseless = Math.max(0, stats.totalUseless - 1);
      if (stats.byType[targetItem.type]) {
        stats.byType[targetItem.type].useless = Math.max(0, stats.byType[targetItem.type].useless - 1);
        // 扣除旧原因
        var oldReasons = targetItem.feedbackReasons || [];
        for (var orIdx = 0; orIdx < oldReasons.length; orIdx++) {
          var orKey = oldReasons[orIdx];
          if (stats.byType[targetItem.type].reasons[orKey] !== undefined) {
            stats.byType[targetItem.type].reasons[orKey] = Math.max(0, stats.byType[targetItem.type].reasons[orKey] - 1);
          }
        }
      }
      if (stats.byDedupeKey[targetItem.dedupeKey]) {
        stats.byDedupeKey[targetItem.dedupeKey].useless = Math.max(0, stats.byDedupeKey[targetItem.dedupeKey].useless - 1);
        var oldReasons2 = targetItem.feedbackReasons || [];
        for (var orIdx2 = 0; orIdx2 < oldReasons2.length; orIdx2++) {
          var orKey2 = oldReasons2[orIdx2];
          if (stats.byDedupeKey[targetItem.dedupeKey].reasons[orKey2] !== undefined) {
            stats.byDedupeKey[targetItem.dedupeKey].reasons[orKey2] = Math.max(0, stats.byDedupeKey[targetItem.dedupeKey].reasons[orKey2] - 1);
          }
        }
      }
    }

    // 记录新反馈到日志
    targetItem.feedback = feedback;
    targetItem.feedbackReasons = (feedback === 'useless' && reasons) ? reasons : [];
    targetItem.feedbackTime = Date.now();
    targetItem.feedbackNote = note || '';
    _saveLog(log);

    // 更新统计
    var typeStats = stats.byType[targetItem.type];
    if (!typeStats) {
      typeStats = {
        useful: 0,
        useless: 0,
        reasons: { inaccurate: 0, unnecessary: 0, bad_timing: 0, too_shallow: 0 }
      };
      stats.byType[targetItem.type] = typeStats;
    }

    if (feedback === 'useful') {
      stats.totalUseful++;
      typeStats.useful++;
      var dedupeStats = _getOrCreateDedupeStats(stats, targetItem.dedupeKey);
      dedupeStats.useful++;
    } else if (feedback === 'useless') {
      stats.totalUseless++;
      typeStats.useless++;
      var dedupeStats2 = _getOrCreateDedupeStats(stats, targetItem.dedupeKey);
      dedupeStats2.useless++;

      // 记录原因
      var reasonList = reasons || [];
      for (var ri = 0; ri < reasonList.length; ri++) {
        var reasonKey = reasonList[ri];
        if (typeStats.reasons[reasonKey] !== undefined) {
          typeStats.reasons[reasonKey]++;
        }
        if (dedupeStats2.reasons[reasonKey] !== undefined) {
          dedupeStats2.reasons[reasonKey]++;
        }
      }
    }

    _saveStats(stats);

    // 触发自校准检查
    _checkSuppression(targetItem.type, targetItem.dedupeKey, stats);

    return true;
  }

  // ==================== 推送策略自校准 ====================

  /**
   * 检查是否应该屏蔽某类推送
   */
  function _checkSuppression(pushType, dedupeKey, stats) {
    if (!stats) stats = getFeedbackStats();

    // 晨报特殊处理：连续没用次数判断
    if (pushType === 'daily_briefing') {
      _checkDailyBriefingSuppression(stats);
      return;
    }

    var threshold = SUPPRESSION_THRESHOLDS[pushType];
    if (!threshold) return;

    var dedupeStats = stats.byDedupeKey[dedupeKey];
    if (!dedupeStats) return;

    var total = dedupeStats.useful + dedupeStats.useless;
    if (total === 0) return;

    var uselessRate = dedupeStats.useless / total;

    if (dedupeStats.useless >= threshold.minUselessCount && uselessRate >= threshold.uselessRate) {
      _suppressInsight(pushType, dedupeKey, 'useless_rate_' + uselessRate.toFixed(2));
    }
  }

  /**
   * 晨报连续没用检测，触发降频
   */
  function _checkDailyBriefingSuppression(stats) {
    var log = getPushLog();
    var consecutiveUseless = 0;

    // 从最近的晨报开始往前数连续没用的次数
    for (var i = 0; i < log.length; i++) {
      if (log[i].type !== 'daily_briefing') continue;
      if (log[i].feedback === 'useless') {
        consecutiveUseless++;
      } else {
        // 遇到有用或未反馈的，中断连续计数
        break;
      }
    }

    var threshold = SUPPRESSION_THRESHOLDS.daily_briefing;
    if (consecutiveUseless >= threshold.consecutiveUseless) {
      var settings = getSettings();
      var currentInterval = settings.dailyBriefingInterval || 1;
      var newInterval = Math.min(currentInterval + 1, 7); // 最高7天
      if (newInterval > currentInterval) {
        updateSettings({ dailyBriefingInterval: newInterval });
      }
    }
  }

  /**
   * 将某类洞察加入屏蔽列表
   */
  function _suppressInsight(pushType, dedupeKey, reason) {
    var settings = getSettings();
    var suppressed = settings.suppressedInsights || [];

    // 检查是否已在列表中
    for (var i = 0; i < suppressed.length; i++) {
      if (suppressed[i].type === pushType && suppressed[i].dedupeKey === dedupeKey) {
        return; // 已屏蔽
      }
    }

    suppressed.push({
      type: pushType,
      dedupeKey: dedupeKey,
      reason: reason,
      suppressedAt: Date.now()
    });

    updateSettings({ suppressedInsights: suppressed });
  }

  /**
   * 判断某类推送是否被屏蔽
   * @param {string} pushType - 推送类型
   * @param {string} dedupeKey - 去重键
   * @returns {boolean}
   */
  function isSuppressed(pushType, dedupeKey) {
    var settings = getSettings();
    var suppressed = settings.suppressedInsights || [];
    for (var i = 0; i < suppressed.length; i++) {
      if (suppressed[i].type === pushType && suppressed[i].dedupeKey === dedupeKey) {
        return true;
      }
    }
    return false;
  }

  /**
   * 获取已屏蔽列表
   */
  function getSuppressedList() {
    var settings = getSettings();
    return settings.suppressedInsights || [];
  }

  /**
   * 重置所有屏蔽（调试用）
   */
  function resetSuppressedInsights() {
    updateSettings({ suppressedInsights: [] });
  }

  // ==================== 数据指纹 ====================
  // 用于判断关键数据是否有变化，决定是否需要重新生成推送

  function getDataFingerprint() {
    try {
      var tx = safeGetJSON('mijieai_daily_tx', []);
      var mood = safeGetJSON('mijieai_mood_log', []);
      var behavior = safeGetJSON('mijieai_behavior_log', []);
      var schedule = safeGetJSON('mijieai_schedule', []);

      return {
        txCount: tx.length,
        txLatest: tx.length > 0 ? tx[0].date || '' : '',
        moodCount: mood.length,
        moodLatest: mood.length > 0 ? (mood[0].date || mood[0].timestamp || '') : '',
        behaviorCount: behavior.length,
        behaviorLatest: behavior.length > 0 ? (behavior[0].date || '') : '',
        scheduleCount: schedule.length
      };
    } catch(e) {
      return {};
    }
  }

  function hasDataChanged() {
    var prev = _loadFingerprint();
    var current = getDataFingerprint();
    if (!prev) return true; // 第一次，视为有变化

    var changed = false;
    for (var k in current) {
      if (current.hasOwnProperty(k) && current[k] !== prev[k]) {
        changed = true;
        break;
      }
    }
    return changed;
  }

  function saveFingerprint() {
    _saveFingerprint(getDataFingerprint());
  }

  // ==================== 推送生成器 ====================

  /**
   * 生成每日晨报
   */
  function generateDailyBriefing() {
    var settings = getSettings();

    // 检查今天是否已推送过晨报
    if (wasPushedRecently('daily_briefing', 'morning_brief')) return null;

    // 晨报降频检查：根据 dailyBriefingInterval 判断是否到推送日
    var interval = settings.dailyBriefingInterval || 1;
    if (interval > 1) {
      // 找最近一次晨报推送日期
      var log = getPushLog();
      var lastBriefDate = null;
      for (var i = 0; i < log.length; i++) {
        if (log[i].type === 'daily_briefing') {
          lastBriefDate = log[i].date;
          break;
        }
      }
      if (lastBriefDate) {
        var daysSince = Math.floor((Date.now() - new Date(lastBriefDate).getTime()) / 86400000);
        if (daysSince < interval) return null; // 还没到间隔天数
      }
    }

    var insights = [];
    try {
      if (window.InsightEngine) {
        insights = window.InsightEngine.generateInsights() || [];
      }
    } catch(e) {}

    // 今日日程
    var todayTasks = [];
    try {
      var sched = safeGetJSON('mijieai_schedule', []);
      var today = todayStr();
      todayTasks = sched.filter(function(t) {
        return t.date === today && t.status !== 'done';
      });
    } catch(e) {}

    // 今日提醒（还款日等）
    var todayReminders = [];
    try {
      if (window.ReminderEngine) {
        var reminders = window.ReminderEngine.getReminders() || [];
        todayReminders = reminders.filter(function(r) {
          return r.days <= 3; // 3天内的紧急提醒
        });
      }
    } catch(e) {}

    // 组装晨报内容
    var lines = [];
    lines.push('☀️ ' + new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }));
    lines.push('');

    // 关键洞察（取前2条最重要的）
    var topInsights = insights.filter(function(i) { return i.severity >= 2; }).slice(0, 2);
    if (topInsights.length > 0) {
      lines.push('📊 今日关注');
      topInsights.forEach(function(ins) {
        lines.push('・' + ins.title);
        if (ins.detail) lines.push('  ' + ins.detail.substring(0, 50));
      });
      lines.push('');
    }

    // 今日待办
    if (todayTasks.length > 0) {
      lines.push('📋 今日待办（' + todayTasks.length + '）');
      todayTasks.slice(0, 3).forEach(function(t) {
        lines.push('・' + (t.title || t.content || '未命名任务'));
      });
      if (todayTasks.length > 3) lines.push('  等' + todayTasks.length + '项');
      lines.push('');
    }

    // 紧急提醒
    if (todayReminders.length > 0) {
      lines.push('⏰ 近期提醒');
      todayReminders.slice(0, 2).forEach(function(r) {
        lines.push('・' + r.title + '（还剩' + r.days + '天）');
      });
      lines.push('');
    }

    // 如果什么都没有，给个简单问候
    if (topInsights.length === 0 && todayTasks.length === 0 && todayReminders.length === 0) {
      lines.push('今天没有特别需要关注的事项。');
      lines.push('记录一下今天的收支和心情，让数据更完整～');
    }

    return {
      id: genId(),
      type: 'daily_briefing',
      dedupeKey: 'morning_brief',
      title: '每日晨报',
      content: lines.join('\n'),
      severity: SEVERITY.INFO,
      category: 'daily_briefing',
      timestamp: Date.now(),
      date: todayStr(),
      read: false,
      feedback: null,
      feedbackReasons: [],
      feedbackTime: null,
      feedbackNote: ''
    };
  }

  /**
   * 生成洞察预警类推送
   */
  function generateInsightAlerts() {
    var pushes = [];
    var insights = [];

    try {
      if (window.InsightEngine) {
        insights = window.InsightEngine.generateInsights() || [];
      }
    } catch(e) { return pushes; }

    // 只取severity>=2的作为预警推送
    var alerts = insights.filter(function(i) { return i.severity >= 2; });

    for (var i = 0; i < alerts.length; i++) {
      var ins = alerts[i];
      var dedupeKey = ins.title;

      if (wasPushedRecently('insight_alert', dedupeKey)) continue;

      // 自校准过滤：检查是否被屏蔽
      if (isSuppressed('insight_alert', dedupeKey)) continue;

      pushes.push({
        id: genId(),
        type: 'insight_alert',
        dedupeKey: dedupeKey,
        title: ins.title,
        content: ins.detail,
        severity: ins.severity,
        category: ins.category || 'insight_alert',
        data: ins.data || null,
        timestamp: Date.now(),
        date: todayStr(),
        read: false,
        feedback: null,
        feedbackReasons: [],
        feedbackTime: null,
        feedbackNote: ''
      });
    }

    return pushes;
  }

  /**
   * 生成场景建议类推送
   * 基于数据特征给出轻量行动建议
   */
  function generateScenarioTips() {
    var pushes = [];
    var tx = safeGetJSON('mijieai_daily_tx', []);
    var mood = safeGetJSON('mijieai_mood_log', []);
    var behavior = safeGetJSON('mijieai_behavior_log', []);

    // 建议1：连续3天无记录提醒
    var lastTxDate = null;
    if (tx.length > 0) {
      for (var i = 0; i < tx.length; i++) {
        if (tx[i].date) { lastTxDate = tx[i].date; break; }
      }
    }
    if (lastTxDate) {
      var daysSince = Math.floor((Date.now() - new Date(lastTxDate).getTime()) / 86400000);
      if (daysSince >= 3 && !wasPushedRecently('scenario_tip', 'no_record_3d')
          && !isSuppressed('scenario_tip', 'no_record_3d')) {
        pushes.push({
          id: genId(),
          type: 'scenario_tip',
          dedupeKey: 'no_record_3d',
          title: '记录小提醒',
          content: '已经' + daysSince + '天没记收支啦～花30秒补一下，数据越全，AI给的建议越准。',
          severity: SEVERITY.INFO,
          category: 'behavior',
          timestamp: Date.now(),
          date: todayStr(),
          read: false,
          feedback: null,
          feedbackReasons: [],
          feedbackTime: null,
          feedbackNote: ''
        });
      }
    }

    // 建议2：周末消费偏高提醒
    try {
      var now = new Date();
      var dayOfWeek = now.getDay(); // 0=周日, 6=周六
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // 周末，看看昨天的消费是否偏高
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        var yStr = yesterday.getFullYear() + '-' + pad2(yesterday.getMonth() + 1) + '-' + pad2(yesterday.getDate());

        var yesterdayTotal = 0;
        var weekdayAvg = 0;
        var weekdayCount = 0;

        for (var j = 0; j < tx.length; j++) {
          var t = tx[j];
          if (t.type !== 'expense') continue;
          if (t.date === yStr) { yesterdayTotal += Number(t.amount) || 0; }
          // 计算最近2周工作日平均
          var tDate = new Date(t.date);
          var diffDays = Math.floor((now - tDate) / 86400000);
          if (diffDays <= 14 && diffDays >= 0) {
            var dow = tDate.getDay();
            if (dow !== 0 && dow !== 6) {
              weekdayAvg += Number(t.amount) || 0;
              weekdayCount++;
            }
          }
        }

        if (weekdayCount > 5) {
          weekdayAvg = weekdayAvg / (weekdayCount / 5); // 约等于工作日日均
          if (yesterdayTotal > weekdayAvg * 1.5 && yesterdayTotal > 50
              && !wasPushedRecently('scenario_tip', 'weekend_spending')
              && !isSuppressed('scenario_tip', 'weekend_spending')) {
            pushes.push({
              id: genId(),
              type: 'scenario_tip',
              dedupeKey: 'weekend_spending',
              title: '周末消费提醒',
              content: '昨天花了' + yesterdayTotal.toFixed(0) + '元，比工作日平均高出' +
                Math.round((yesterdayTotal / weekdayAvg - 1) * 100) + '%。周末容易放松警惕，要不要看看明细？',
              severity: SEVERITY.INFO,
              category: 'financial',
              timestamp: Date.now(),
              date: todayStr(),
              read: false,
              feedback: null,
              feedbackReasons: [],
              feedbackTime: null,
              feedbackNote: ''
            });
          }
        }
      }
    } catch(e) {}

    // 建议3：情绪连续走低
    try {
      if (mood.length >= 3) {
        var recentMoods = mood.slice(0, 3);
        var lowCount = 0;
        for (var m = 0; m < recentMoods.length; m++) {
          var score = recentMoods[m].score;
          if (score !== undefined && score <= 3) lowCount++;
          else if (recentMoods[m].mood === '低落' || recentMoods[m].mood === '焦虑') lowCount++;
        }
        if (lowCount >= 2 && !wasPushedRecently('scenario_tip', 'mood_low_streak')
            && !isSuppressed('scenario_tip', 'mood_low_streak')) {
          pushes.push({
            id: genId(),
            type: 'scenario_tip',
            dedupeKey: 'mood_low_streak',
            title: '心情有点沉',
            content: '最近几天情绪偏低，要不要试试：1）出门走15分钟 2）给朋友发个消息 3）早睡半小时。有时候最简单的事最管用。',
            severity: SEVERITY.WARNING,
            category: 'health',
            timestamp: Date.now(),
            date: todayStr(),
            read: false,
            feedback: null,
            feedbackReasons: [],
            feedbackTime: null,
            feedbackNote: ''
          });
        }
      }
    } catch(e) {}

    return pushes;
  }

  // ==================== 核心调度 ====================

  /**
   * 检查并生成所有应推送的内容
   * 返回待推送列表（已过滤去重+频率控制）
   */
  function checkAndGenerate() {
    var settings = getSettings();
    if (!settings.enabled) return [];

    // 静默时间不生成
    if (isInQuietHours(settings)) return [];

    // 数据没变化就不重新生成（节省性能）
    // 但每日晨报要按时推，所以不在这里拦截

    var pushes = [];

    // 1. 每日晨报（到点才生成）
    var now = new Date();
    var currentTime = formatTime(now);
    var briefingTime = settings.dailyBriefingTime;

    // 简化判断：如果当前时间 >= 设定时间且在1小时内，且今天还没推过
    try {
      var currentMin = now.getHours() * 60 + now.getMinutes();
      var briefingParts = briefingTime.split(':');
      var briefingMin = parseInt(briefingParts[0]) * 60 + parseInt(briefingParts[1]);

      if (currentMin >= briefingMin && currentMin < briefingMin + 120) {
        var daily = generateDailyBriefing();
        if (daily && settings.categories.daily_briefing) pushes.push(daily);
      }
    } catch(e) {}

    // 2. 洞察预警（有变化才检查）
    if (hasDataChanged()) {
      try {
        var alerts = generateInsightAlerts();
        for (var a = 0; a < alerts.length; a++) {
          if (settings.categories[alerts[a].category] !== false) {
            pushes.push(alerts[a]);
          }
        }
      } catch(e) {}

      // 3. 场景建议
      try {
        var tips = generateScenarioTips();
        for (var t = 0; t < tips.length; t++) {
          if (settings.categories[tips[t].category] !== false && settings.categories.scenario_tip) {
            pushes.push(tips[t]);
          }
        }
      } catch(e) {}

      // 更新指纹
      saveFingerprint();
    }

    // 每日频率控制
    var todayCount = getTodayPushCount();
    var remaining = Math.max(0, settings.maxPerDay - todayCount);
    if (pushes.length > remaining) {
      // 优先保留高严重度的
      pushes.sort(function(a, b) { return (b.severity || 0) - (a.severity || 0); });
      pushes = pushes.slice(0, remaining);
    }

    // 写入推送历史
    for (var i = 0; i < pushes.length; i++) {
      addPushLog({
        id: pushes[i].id,
        type: pushes[i].type,
        dedupeKey: pushes[i].dedupeKey,
        title: pushes[i].title,
        severity: pushes[i].severity,
        category: pushes[i].category,
        timestamp: pushes[i].timestamp,
        date: pushes[i].date,
        feedback: pushes[i].feedback || null,
        feedbackReasons: pushes[i].feedbackReasons || [],
        feedbackTime: pushes[i].feedbackTime || null,
        feedbackNote: pushes[i].feedbackNote || ''
      });
    }

    return pushes;
  }

  /**
   * 获取未读推送数量
   */
  function getUnreadCount() {
    var log = getPushLog();
    var count = 0;
    for (var i = 0; i < log.length; i++) {
      if (!log[i].read) count++;
    }
    return count;
  }

  /**
   * 标记所有推送为已读
   */
  function markAllRead() {
    var log = getPushLog();
    for (var i = 0; i < log.length; i++) {
      log[i].read = true;
    }
    _saveLog(log);
  }

  /**
   * 标记单条为已读
   */
  function markRead(id) {
    var log = getPushLog();
    for (var i = 0; i < log.length; i++) {
      if (log[i].id === id) {
        log[i].read = true;
        break;
      }
    }
    _saveLog(log);
  }

  /**
   * 获取推送列表（用于UI展示）
   */
  function getPushList(limit) {
    var log = getPushLog();
    if (limit && log.length > limit) return log.slice(0, limit);
    return log;
  }

  /**
   * 清空推送历史
   */
  function clearLog() {
    _saveLog([]);
  }

  // ==================== 浏览器通知 ====================

  /**
   * 发送浏览器通知
   */
  function sendBrowserNotification(pushItem) {
    if (!('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    try {
      var n = new Notification(pushItem.title, {
        body: pushItem.content ? pushItem.content.substring(0, 100) : '',
        icon: 'icon.png',
        tag: pushItem.id
      });
      n.onclick = function() {
        window.focus();
        n.close();
      };
      return true;
    } catch(e) {
      return false;
    }
  }

  /**
   * 请求通知权限
   */
  function requestNotificationPermission() {
    if (!('Notification' in window)) return Promise.reject('not_supported');
    if (Notification.permission === 'granted') return Promise.resolve('granted');
    if (Notification.permission === 'denied') return Promise.reject('denied');

    return Notification.requestPermission();
  }

  // ==================== UI 渲染 ====================

  /**
   * 渲染单条推送卡片的反馈区域
   * @param {object} pushItem - 推送项
   * @param {string} containerId - 面板容器ID（用于重新渲染）
   * @returns {string} HTML字符串
   */
  function _renderFeedbackArea(pushItem, containerId) {
    var fb = pushItem.feedback;
    var html = '';

    // 反馈按钮区域容器
    var areaStyle = 'font-size:11px;color:#94a3b8;margin-top:8px;display:flex;gap:12px;';
    var btnStyle = 'background:none;border:none;color:#64748b;cursor:pointer;font-size:11px;padding:2px 0;';
    var btnHoverStyle = ''; // hover 用CSS类或直接style

    if (fb === null || fb === undefined) {
      // 未反馈：显示「有用」「没用」两个按钮
      html += '<div style="' + areaStyle + '">';
      html += '<button onclick="PushEngine._handleFeedback(\'' + pushItem.id + '\', \'useful\', [], \'' + containerId + '\')" style="' + btnStyle + '" onmouseover="this.style.color=\'#3b82f6\'" onmouseout="this.style.color=\'#64748b\'">有用</button>';
      html += '<button onclick="PushEngine._toggleFeedbackReasons(\'' + pushItem.id + '\', \'' + containerId + '\')" style="' + btnStyle + '" onmouseover="this.style.color=\'#3b82f6\'" onmouseout="this.style.color=\'#64748b\'">没用</button>';
      html += '</div>';

      // 检查是否展开了原因选择（用一个临时标记存在内存里）
      if (_expandedFeedbackIds && _expandedFeedbackIds[pushItem.id]) {
        html += _renderReasonButtons(pushItem.id, containerId);
      }
    } else if (fb === 'useful') {
      // 已标记有用
      html += '<div style="font-size:11px;color:#10b981;margin-top:6px;">感谢反馈，AI会越来越懂你</div>';
    } else if (fb === 'useless') {
      // 已标记没用并选了原因
      html += '<div style="font-size:11px;color:#10b981;margin-top:6px;">已记录，下次会调整</div>';
    }

    return html;
  }

  // 内存中记录哪些卡片展开了原因选择
  var _expandedFeedbackIds = {};

  /**
   * 渲染没用的原因按钮
   */
  function _renderReasonButtons(pushId, containerId) {
    var reasonRowStyle = 'margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;';
    var reasonBtnStyle = 'padding:3px 10px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;font-size:11px;color:#64748b;cursor:pointer;';

    var html = '<div style="' + reasonRowStyle + '" id="fb_reasons_' + pushId + '">';

    var reasons = ['inaccurate', 'unnecessary', 'bad_timing', 'too_shallow'];
    for (var i = 0; i < reasons.length; i++) {
      var key = reasons[i];
      var label = FEEDBACK_REASON_LABELS[key] || key;
      html += '<button onclick="PushEngine._handleFeedback(\'' + pushId + '\', \'useless\', [\'' + key + '\'], \'' + containerId + '\')" style="' + reasonBtnStyle + '" onmouseover="this.style.borderColor=\'#f59e0b\';this.style.color=\'#f59e0b\'" onmouseout="this.style.borderColor=\'#e2e8f0\';this.style.color=\'#64748b\'">' + label + '</button>';
    }

    html += '</div>';
    return html;
  }

  /**
   * 切换没用原因选择区的展开/收起
   * 内部方法，供UI调用
   */
  function _toggleFeedbackReasons(pushId, containerId) {
    if (!_expandedFeedbackIds) _expandedFeedbackIds = {};
    if (_expandedFeedbackIds[pushId]) {
      delete _expandedFeedbackIds[pushId];
    } else {
      _expandedFeedbackIds[pushId] = true;
    }
    // 重新渲染面板
    renderPanel(containerId);
  }

  /**
   * 处理反馈提交
   * 内部方法，供UI调用
   */
  function _handleFeedback(pushId, feedback, reasons, containerId) {
    // 清理展开状态
    if (_expandedFeedbackIds && _expandedFeedbackIds[pushId]) {
      delete _expandedFeedbackIds[pushId];
    }
    recordFeedback(pushId, feedback, reasons);
    // 重新渲染面板
    renderPanel(containerId);
  }

  /**
   * 渲染推送中心面板（首页或弹窗）
   */
  function renderPanel(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var pushes = getPushList(20);
    var settings = getSettings();

    var html = '';

    if (pushes.length === 0) {
      html = '<div style="text-align:center;padding:32px 16px;color:#94a3b8;font-size:13px;">暂无推送</div>';
    } else {
      html = '<div style="display:flex;flex-direction:column;gap:8px;">';
      for (var i = 0; i < pushes.length; i++) {
        var p = pushes[i];
        var sevColor = p.severity >= 3 ? '#dc2626' : (p.severity >= 2 ? '#f59e0b' : '#3b82f6');
        var sevBg = p.severity >= 3 ? '#fef2f2' : (p.severity >= 2 ? '#fffbeb' : '#eff6ff');
        var readStyle = p.read ? 'opacity:0.6;' : '';

        html += '<div style="background:' + sevBg + ';border-radius:10px;padding:12px;border-left:3px solid ' + sevColor + ';' + readStyle + '">';
        html += '<div style="font-weight:600;font-size:13px;color:#1e293b;margin-bottom:4px;">' + escapeHtml(p.title) + '</div>';
        if (p.content) {
          html += '<div style="font-size:12px;color:#475569;line-height:1.6;white-space:pre-wrap;">' + escapeHtml(p.content) + '</div>';
        }
        var d = new Date(p.timestamp);
        html += '<div style="font-size:11px;color:#94a3b8;margin-top:6px;">' +
          formatTime(d) + '</div>';

        // 反馈交互区域
        html += _renderFeedbackArea(p, containerId);

        html += '</div>';
      }
      html += '</div>';

      if (pushes.length > 0) {
        html += '<div style="text-align:center;padding:12px 0 4px;">';
        html += '<button onclick="PushEngine.markAllRead();PushEngine.renderPanel(\'' + containerId + '\')" style="background:none;border:none;font-size:12px;color:#94a3b8;cursor:pointer;">全部标为已读</button>';
        html += '</div>';
      }
    }

    container.innerHTML = html;
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== 轮询调度 ====================

  var _checkTimer = null;
  var _checkInterval = 5 * 60 * 1000; // 每5分钟检查一次

  /**
   * 启动后台轮询
   */
  function startPolling() {
    if (_checkTimer) return;

    // 启动时先检查一次（延迟3秒，等页面加载完）
    setTimeout(function() {
      checkAndGenerate();
    }, 3000);

    _checkTimer = setInterval(function() {
      checkAndGenerate();
      // 有新推送时触发事件
      var unread = getUnreadCount();
      if (unread > 0) {
        try {
          window.dispatchEvent(new CustomEvent('push_new', { detail: { unread: unread } }));
        } catch(e) {}
      }
    }, _checkInterval);
  }

  /**
   * 停止轮询
   */
  function stopPolling() {
    if (_checkTimer) {
      clearInterval(_checkTimer);
      _checkTimer = null;
    }
  }

  // ==================== 导出 ====================

  window.PushEngine = {
    // 核心
    checkAndGenerate: checkAndGenerate,
    startPolling: startPolling,
    stopPolling: stopPolling,

    // 数据
    getPushList: getPushList,
    getUnreadCount: getUnreadCount,
    getTodayPushCount: getTodayPushCount,
    markRead: markRead,
    markAllRead: markAllRead,
    clearLog: clearLog,

    // 设置
    getSettings: getSettings,
    updateSettings: updateSettings,

    // 通知
    requestNotificationPermission: requestNotificationPermission,
    sendBrowserNotification: sendBrowserNotification,

    // UI
    renderPanel: renderPanel,

    // 生成器（供外部调试/测试）
    generateDailyBriefing: generateDailyBriefing,
    generateInsightAlerts: generateInsightAlerts,
    generateScenarioTips: generateScenarioTips,

    // ===== 反馈闭环（共生内核L1）=====
    recordFeedback: recordFeedback,
    getFeedbackStats: getFeedbackStats,
    resetSuppressedInsights: resetSuppressedInsights,
    getSuppressedList: getSuppressedList,
    isSuppressed: isSuppressed,

    // UI 内部回调（供onclick调用）
    _handleFeedback: _handleFeedback,
    _toggleFeedbackReasons: _toggleFeedbackReasons
  };

})();
