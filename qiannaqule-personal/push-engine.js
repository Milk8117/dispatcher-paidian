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
 *
 * 数据存储：
 *   mijieai_push_log      — 推送历史记录（用于去重+统计）
 *   mijieai_push_settings — 用户推送偏好设置
 *   mijieai_push_fingerprint — 数据指纹（判断数据是否有变化）
 *
 * 挂载：window.PushEngine
 */
(function() {
  'use strict';

  // ==================== 常量 ====================

  var LOG_KEY = 'mijieai_push_log';
  var SETTINGS_KEY = 'mijieai_push_settings';
  var FINGERPRINT_KEY = 'mijieai_push_fingerprint';

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
    }
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

  // ==================== 工具函数 ====================

  function safeGetJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return fallback;
  }

  function safeSetJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch(e) {}
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
    var saved = safeGetJSON(SETTINGS_KEY, null);
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
    safeSetJSON(SETTINGS_KEY, current);
    return current;
  }

  // ==================== 推送历史管理 ====================

  function getPushLog() {
    return safeGetJSON(LOG_KEY, []);
  }

  function addPushLog(item) {
    var log = getPushLog();
    log.unshift(item);
    // 只保留最近100条
    if (log.length > 100) log = log.slice(0, 100);
    safeSetJSON(LOG_KEY, log);
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
    var prev = safeGetJSON(FINGERPRINT_KEY, null);
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
    safeSetJSON(FINGERPRINT_KEY, getDataFingerprint());
  }

  // ==================== 推送生成器 ====================

  /**
   * 生成每日晨报
   */
  function generateDailyBriefing() {
    // 检查今天是否已推送过晨报
    if (wasPushedRecently('daily_briefing', 'morning_brief')) return null;

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
      read: false
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
        read: false
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
      if (daysSince >= 3 && !wasPushedRecently('scenario_tip', 'no_record_3d')) {
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
          read: false
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
              && !wasPushedRecently('scenario_tip', 'weekend_spending')) {
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
              read: false
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
        if (lowCount >= 2 && !wasPushedRecently('scenario_tip', 'mood_low_streak')) {
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
            read: false
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
        date: pushes[i].date
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
    safeSetJSON(LOG_KEY, log);
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
    safeSetJSON(LOG_KEY, log);
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
    safeSetJSON(LOG_KEY, []);
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
    generateScenarioTips: generateScenarioTips
  };

})();
