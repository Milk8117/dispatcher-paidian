/**
 * ReminderEngine - MiRun AI财务提醒模块
 * 
 * 功能：
 * 1. 从贷款/保险数据中提取还款日/缴费日
 * 2. 计算距离下次还款/缴费的天数
 * 3. 按紧急度分级显示提醒（紧急≤3天/预警≤7天/预告≤30天）
 * 4. 支持浏览器通知（可选，需用户授权）
 * 
 * 数据来源：通过 DataStore/WealthCT 读取已保存的贷款和保险数据
 * 所有数据纯本地处理，不上传任何服务器
 */

(function(global) {
  'use strict';

  // ==================== 常量 ====================
  var URGENCY = {
    CRITICAL: { key: 'critical', label: '紧急', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', icon: '<svg viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="10" fill="#dc2626"/></svg>' },
    WARNING:  { key: 'warning',  label: '预警', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: '<svg viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="10" fill="#ea580c"/></svg>' },
    UPCOMING: { key: 'upcoming', label: '预告', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: '<svg viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="10" fill="#2563eb"/></svg>' }
  };

  var MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  // ==================== 工具函数 ====================

  /**
   * 计算两个日期之间的天数差（向上取整，不足1天按1天算）
   */
  function daysBetween(from, to) {
    var ms = to.getTime() - from.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  /**
   * 格式化日期为 "M月D日"
   */
  function formatDate(date) {
    return (date.getMonth() + 1) + '月' + date.getDate() + '日';
  }

  /**
   * 格式化金额为带千分位的字符串
   */
  function formatMoney(amount) {
    if (amount >= 10000) {
      return (amount / 10000).toFixed(1) + '万';
    }
    return Math.round(amount).toLocaleString();
  }

  /**
   * 根据天数确定紧急度级别
   */
  function getUrgency(days) {
    if (days <= 3) return URGENCY.CRITICAL;
    if (days <= 7) return URGENCY.WARNING;
    if (days <= 30) return URGENCY.UPCOMING;
    return null; // 超过30天不显示
  }

  /**
   * 计算贷款的单笔月供（复用index.html的逻辑，简化版）
   */
  function calcMonthlyPayment(amt, annualRate, term, type, transLeft) {
    if (amt <= 0 || term <= 0) return 0;
    var r = annualRate / 100 / 12;

    if (type === 'debx') {
      if (r > 0) {
        return amt * r * Math.pow(1 + r, term) / (Math.pow(1 + r, term) - 1);
      }
      return amt / term; // 无息
    }
    if (type === 'debj') {
      if (r > 0) return amt / term + amt * r; // 首月（最高）
      return amt / term;
    }
    if (type === 'xxhb') {
      if (transLeft > 0) return amt * r; // 先息阶段
      // 已转等额本息
      if (r > 0) return amt * r * Math.pow(1 + r, term) / (Math.pow(1 + r, term) - 1);
      return amt / term;
    }
    if (type === 'dqhc') {
      return amt * r; // 月供利息
    }
    return 0;
  }

  // ==================== 核心逻辑 ====================

  /**
   * 从贷款数据收集还款提醒
   */
  function collectLoanReminders(today) {
    var reminders = [];
    var loans = global.WealthCT ? global.WealthCT.loadLoans() : [];
    if (!loans || !loans.length) return reminders;

    loans.forEach(function(loan, idx) {
      var amt = Number(loan.amt) || 0;
      if (amt <= 0) return;

      var payDay = Number(loan.payDay);
      if (!payDay || payDay < 1 || payDay > 28) return; // 无效还款日

      // 计算下次还款日期
      var nextDate = new Date(today);
      nextDate.setDate(payDay);
      if (nextDate < today) {
        // 本月还款日已过，推到下月
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      var daysLeft = daysBetween(today, nextDate);
      var urgency = getUrgency(daysLeft);

      // 计算月供
      var rate = Number(loan.rate) || 0;
      var term = Number(loan.term) || 1;
      var type = loan.type || 'debx';
      var transLeft = Number(loan.transLeft) || 0;
      var monthly = calcMonthlyPayment(amt, rate, term, type, transLeft);

      reminders.push({
        type: 'loan',
        title: '贷款还款',
        subtitle: '贷款' + (idx + 1) + '（' + formatMoney(amt) + '元）',
        amount: Math.round(monthly),
        daysLeft: daysLeft,
        nextDate: nextDate,
        dateText: '每月' + payDay + '日',
        urgency: urgency
      });
    });

    return reminders;
  }

  /**
   * 从保险数据收集缴费提醒
   */
  function collectInsuranceReminders(today) {
    var reminders = [];
    var items = global.WealthCT ? global.WealthCT.loadInsurance() : [];
    if (!items || !items.length) return reminders;

    var typeNames = {
      'life': '人寿保险',
      'commercial': '商业保险',
      'education': '教育险',
      'other': '保险'
    };

    items.forEach(function(item, idx) {
      var premium = Number(item.premium) || 0;
      if (premium <= 0) return;

      var payDateStr = item.payDate;
      if (!payDateStr) return;

      // 解析日期 (YYYY-MM-DD)
      var parts = payDateStr.split('-');
      if (parts.length !== 3) return;
      var year = parseInt(parts[0]);
      var month = parseInt(parts[1]) - 1; // JS month is 0-based
      var day = parseInt(parts[2]);

      // 计算下次缴费日
      var nextDate = new Date(today);
      nextDate.setFullYear(year, month, day);
      nextDate.setHours(0, 0, 0, 0);

      if (nextDate < today) {
        // 已过今年缴费日，推到明年
        nextDate.setFullYear(year + 1);
      }

      var daysLeft = daysBetween(today, nextDate);
      var urgency = getUrgency(daysLeft);

      var typeName = typeNames[item.type] || '保险';

      reminders.push({
        type: 'insurance',
        title: typeName + '缴费',
        subtitle: typeName + (idx + 1) + '（年缴 ' + formatMoney(premium) + '元）',
        amount: premium,
        daysLeft: daysLeft,
        nextDate: nextDate,
        dateText: formatDate(nextDate),
        urgency: urgency
      });
    });

    return reminders;
  }

  /**
   * 获取所有提醒（按紧急度排序）
   */
  function getReminders() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var all = [];
    var loanReminders = collectLoanReminders(today);
    var insReminders = collectInsuranceReminders(today);

    all = all.concat(loanReminders).concat(insReminders);

    // 按紧急度排序：紧急 > 预警 > 预告
    var order = { critical: 0, warning: 1, upcoming: 2 };
    all.sort(function(a, b) {
      var ua = a.urgency ? order[a.urgency.key] : 99;
      var ub = b.urgency ? order[b.urgency.key] : 99;
      if (ua !== ub) return ua - ub;
      return a.daysLeft - b.daysLeft;
    });

    return all;
  }

  // ==================== 渲染 ====================

  /**
   * 渲染提醒横幅到指定容器
   * @param {string} containerId - 容器元素ID
   * @returns {number} 显示的提醒数量
   */
  function render(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return 0;

    var reminders = getReminders();

    if (reminders.length === 0) {
      container.style.display = 'none';
      return 0;
    }

    container.style.display = 'block';

    var html = '<div class="reminder-banner">';

    // 标题
    var urgentCount = 0;
    reminders.forEach(function(r) {
      if (r.urgency && r.urgency.key === 'critical') urgentCount++;
    });
    var titleText = urgentCount > 0
      ? '⏰ ' + urgentCount + '项还款即将到期'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:4px"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>近期财务提醒（' + reminders.length + '项）';

    html += '<div class="reminder-header">' + titleText + '</div>';

    // 提醒列表
    html += '<div class="reminder-list">';
    reminders.forEach(function(r) {
      var u = r.urgency || URGENCY.UPCOMING;
      html += '<div class="reminder-item" style="border-left:3px solid ' + u.color + ';background:' + u.bg + ';">';
      html += '<div class="reminder-item-header">';
      html += '<span class="reminder-icon">' + u.icon + '</span>';
      html += '<span class="reminder-title">' + r.title + '</span>';
      html += '<span class="reminder-badge" style="color:' + u.color + ';">'
      if (r.daysLeft === 0) {
        html += '今天';
      } else if (r.daysLeft === 1) {
        html += '明天';
      } else {
        html += r.daysLeft + '天后';
      }
      html += '</span>';
      html += '</div>';
      html += '<div class="reminder-detail">';
      html += '<span>' + r.subtitle + '</span>';
      html += '<span>→ ' + r.dateText + '，约 ' + formatMoney(r.amount) + ' 元</span>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';

    // 浏览器通知入口
    if ('Notification' in window) {
      var perm = Notification.permission;
      if (perm === 'default') {
        html += '<div class="reminder-notif-hint">';
        html += '<button class="reminder-notif-btn" onclick="ReminderEngine.requestNotificationPermission()">';
        html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>开启到期提醒通知';
        html += '</button>';
        html += '</div>';
      } else if (perm === 'granted') {
        html += '<div class="reminder-notif-status"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>通知已开启，到期前将自动提醒</div>';
      }
    }

    html += '</div>';
    container.innerHTML = html;

    return reminders.length;
  }

  // ==================== 浏览器通知 ====================

  /**
   * 请求浏览器通知权限
   */
  function requestNotificationPermission() {
    if (!('Notification' in window)) {
      alert('您的浏览器不支持通知功能');
      return;
    }

    Notification.requestPermission().then(function(permission) {
      if (permission === 'granted') {
        // 发送测试通知
        new Notification('MiRun AI · 财务提醒', {
          body: '通知已开启！下次还款/缴费到期前将自动提醒您。',
          icon: './icon-orange.png',
          badge: './icon-orange.png'
        });
        // 刷新提醒横幅（隐藏请求按钮，显示已开启状态）
        render('_reminderContainer');
      }
    });
  }

  /**
   * 发送浏览器通知（供外部调用或定时任务调用）
   * @param {string} title - 通知标题
   * @param {string} body - 通知内容
   */
  function sendNotification(title, body) {
    if (!('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    new Notification(title, {
      body: body,
      icon: './icon-orange.png',
      badge: './icon-orange.png',
      tag: 'finance-reminder' // 相同tag的通知会替换而非堆叠
    });
    return true;
  }

  /**
   * 检查并发送到期提醒通知
   * 在页面加载时调用一次
   */
  function checkAndNotify() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    var reminders = getReminders();
    var critical = reminders.filter(function(r) {
      return r.urgency && r.urgency.key === 'critical';
    });

    if (critical.length > 0) {
      var lines = critical.map(function(r) {
        if (r.daysLeft === 0) return r.title + '：今天到期（' + formatMoney(r.amount) + '元）';
        return r.title + '：' + r.daysLeft + '天后到期（' + formatMoney(r.amount) + '元）';
      });

      sendNotification(
        '⏰ ' + critical.length + '项财务待办即将到期',
        lines.join('\n')
      );
    }
  }

  // ==================== 获取摘要（供其他模块使用） ====================

  /**
   * 获取提醒摘要数据（不渲染UI）
   * @returns {object} { total, critical, warning, upcoming, items }
   */
  function getSummary() {
    var reminders = getReminders();
    var summary = { total: 0, critical: 0, warning: 0, upcoming: 0, items: reminders };

    reminders.forEach(function(r) {
      summary.total++;
      if (r.urgency) {
        summary[r.urgency.key]++;
      }
    });

    return summary;
  }

  // ==================== 导出 ====================
  global.ReminderEngine = {
    render: render,
    getReminders: getReminders,
    getSummary: getSummary,
    requestNotificationPermission: requestNotificationPermission,
    sendNotification: sendNotification,
    checkAndNotify: checkAndNotify
  };

})(window);
