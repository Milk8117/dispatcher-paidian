/**
 * MiRun AI — 日程管理模块（月历视图）
 * 月历网格 · 当日任务详情 · 对话式添加
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'mijieai_schedule';

  // 默认工作计划（首次初始化时写入）
  var DEFAULT_TASKS = [
    {
      id: 't1', title: '秋冬12节气食谱数据录入代码',
      desc: '48道食谱+36款茶饮填入 solar-term.js（立秋→大寒）',
      group: 'mijieai', status: 'progress', priority: 1,
      created: '2026-07-31', deadline: '2026-08-03'
    },
    {
      id: 't2', title: '春夏16个节气食谱填充',
      desc: '调研+录入立春→处暑共16节气的食谱与营养数据',
      group: 'mijieai', status: 'todo', priority: 2,
      created: '2026-07-31', deadline: '2026-08-15'
    },
    {
      id: 't3', title: 'P0 · AI输入框接入LLM',
      desc: '替换 detectIntent() 关键词检测为 LLM API（Kimi/通义千问），贾维斯的核心能力',
      group: 'jarvis', status: 'todo', priority: 0,
      created: '2026-07-31', deadline: '2026-08-02'
    },
    {
      id: 't4', title: '个人财富诊断CT · 周五内测启动',
      desc: '准备内测话术、确定发送方式、收集反馈机制',
      group: 'wealth-ct', status: 'progress', priority: 0,
      created: '2026-07-31', deadline: '2026-07-31'
    },
    {
      id: 't5', title: '转盘吸附算法修正',
      desc: '旋转角度→节气索引映射公式彻底修正',
      group: 'mijieai', status: 'done', priority: 1,
      created: '2026-07-31', deadline: '2026-07-31'
    },
    {
      id: 't6', title: '节气日期年份自适应',
      desc: '基于回归年长度动态计算任意年份节气日期',
      group: 'mijieai', status: 'done', priority: 1,
      created: '2026-07-31', deadline: '2026-07-31'
    },
    {
      id: 't7', title: '慢病调养+健康筛查+智能过滤',
      desc: '6大慢病模块+首次筛查+食谱禁忌规避+收藏+今天吃什么',
      group: 'mijieai', status: 'done', priority: 1,
      created: '2026-07-31', deadline: '2026-07-31'
    },
    // ========== 贾维斯进化计划 ==========
    // P0 — 本周必做（决定是工具还是贾维斯）
    {
      id: 't8', title: 'P0 · 建立UserProfile统一用户画像',
      desc: '合并mijieai_health_profile、mijieai_preferences、财务快照、行为日志偏好为统一UserProfile对象',
      group: 'jarvis', status: 'todo', priority: 0,
      created: '2026-07-31', deadline: '2026-08-02'
    },
    // P1 — 两周内（让数据活起来）
    {
      id: 't9', title: 'P1 · 跨模块数据关联（财务+情绪）',
      desc: '实现消费数据与情绪日志的联动分析，压力消费预警功能',
      group: 'jarvis', status: 'todo', priority: 1,
      created: '2026-07-31', deadline: '2026-08-07'
    },
    {
      id: 't10', title: 'P1 · 主动推送引擎',
      desc: '基于用户数据生成主动建议（不只是提醒，是洞察），如异常消费提醒、健康趋势预警',
      group: 'jarvis', status: 'todo', priority: 1,
      created: '2026-07-31', deadline: '2026-08-10'
    },
    {
      id: 't11', title: 'P1 · DataStore全模块覆盖',
      desc: '所有模块统一走DataStore抽象层，替换直接localStorage调用，统一key前缀规范',
      group: 'jarvis', status: 'todo', priority: 1,
      created: '2026-07-31', deadline: '2026-08-14'
    },
    // P2 — 一个月内（体验跃升）
    {
      id: 't12', title: 'P2 · 图片识别能力',
      desc: '接入视觉模型API，拍菜单/账单/体检报告自动识别并记账',
      group: 'jarvis', status: 'todo', priority: 2,
      created: '2026-07-31', deadline: '2026-08-21'
    },
    {
      id: 't13', title: 'P2 · 趋势洞察面板',
      desc: '跨模块时间序列分析，月度生活全景报告（财务+健康+情绪+行为综合趋势）',
      group: 'jarvis', status: 'todo', priority: 2,
      created: '2026-07-31', deadline: '2026-08-25'
    },
    {
      id: 't14', title: 'P2 · IndexedDB迁移',
      desc: '从localStorage(5MB)迁移至IndexedDB，突破存储上限，支撑长期数据积累',
      group: 'jarvis', status: 'todo', priority: 2,
      created: '2026-07-31', deadline: '2026-08-31'
    },
    // P3 — 远期（贾维斯形态）
    {
      id: 't15', title: 'P3 · 端侧AI推理',
      desc: '本地小模型处理隐私敏感数据，实现真正的离线智能',
      group: 'jarvis', status: 'todo', priority: 3,
      created: '2026-07-31', deadline: ''
    },
    {
      id: 't16', title: 'P3 · 对话记忆系统',
      desc: '长期上下文积累，让贾维斯记住用户的历史偏好、习惯模式和决策风格',
      group: 'jarvis', status: 'todo', priority: 3,
      created: '2026-07-31', deadline: ''
    },
    {
      id: 't17', title: 'P3 · 自动化工作流',
      desc: '每日早8点自动推送生活全景摘要（财务+健康+日程+情绪），实现"人只下命令"',
      group: 'jarvis', status: 'todo', priority: 3,
      created: '2026-07-31', deadline: ''
    },
    {
      id: 't18', title: 'P3 · 事件总线EventBus',
      desc: '建立window.MijieEvent发布/订阅机制，实现模块间实时通信与联动',
      group: 'jarvis', status: 'todo', priority: 3,
      created: '2026-07-31', deadline: ''
    }
  ];

  var GROUP_LABELS = {
    mijieai: { name: 'MiRun AI', color: '#4f46e5', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' },
    'wealth-ct': { name: '财富诊断CT', color: '#2563eb', icon: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M6 16h4"/><path d="M14 16h4"/>' },
    jarvis: { name: '贾维斯进化', color: '#dc2626', icon: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>' }
  };

  var STATUS_META = {
    done:     { label: '已完成', color: '#16a34a', bg: '#f0fdf4', next: 'todo' },
    progress: { label: '进行中', color: '#f59e0b', bg: '#fffbeb', next: 'done' },
    todo:     { label: '待启动', color: '#6b7280', bg: '#f9fafb', next: 'progress' }
  };

  var WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
  var WEEKDAY_FULL = ['日', '一', '二', '三', '四', '五', '六'];

  // ==================== 日期工具 ====================
  function today() {
    var d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), dow: d.getDay() };
  }

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  // 周一=0, 周日=6
  function firstDayOffset(y, m) {
    var d = new Date(y, m - 1, 1).getDay(); // 0=Sun
    return d === 0 ? 6 : d - 1;
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function dateStr(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }

  // 获取任务的日期（优先 date 字段，其次 deadline）
  function taskDate(t) {
    return t.date || (t.deadline && t.deadline.length >= 10 ? t.deadline.slice(0, 10) : '');
  }

  // ==================== 数据读写 ====================
  function loadTasks() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var tasks = JSON.parse(raw);
        // 迁移：检查贾维斯进化计划是否已存在
        var hasJarvis = tasks.some(function(t) { return t.group === 'jarvis'; });
        if (!hasJarvis) {
          var jarvisTasks = DEFAULT_TASKS.filter(function(t) { return t.group === 'jarvis'; });
          // 同时更新t3的group和deadline
          tasks.forEach(function(t) {
            if (t.id === 't3') {
              t.group = 'jarvis';
              t.priority = 0;
              t.deadline = '2026-08-02';
              t.title = 'P0 · AI输入框接入LLM';
              t.desc = '替换 detectIntent() 关键词检测为 LLM API（Kimi/通义千问），贾维斯的核心能力';
            }
          });
          tasks = tasks.concat(jarvisTasks);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        }
        return tasks;
      }
    } catch(e) {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TASKS));
    return DEFAULT_TASKS.slice();
  }

  function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // ==================== 对外接口 ====================
  window.scheduleAddTask = function(task) {
    var tasks = loadTasks();
    task.id = 't' + Date.now();
    task.created = new Date().toISOString().slice(0,10);
    task.status = task.status || 'todo';
    task.priority = task.priority || 2;
    task.group = task.group || 'mijieai';
    tasks.unshift(task);
    saveTasks(tasks);
    // 如果日历已渲染，刷新
    if (window._schState && window._schState.container) {
      render(window._schState.container);
    }
    return task;
  };

  window.scheduleGetTasks = function() { return loadTasks(); };

  // ==================== 内部状态 ====================
  window._schState = null;

  // ==================== SVG 图标 ====================
  function svgIcon(paths, w, h) {
    w = w || 16; h = h || 16;
    return '<svg viewBox="0 0 24 24" width="' + w + '" height="' + h + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }

  var ICON_CALENDAR = '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>';
  var ICON_PLUS = '<path d="M12 5v14M5 12h14"/>';
  var ICON_CHEVRON_L = '<path d="M15 18l-6-6 6-6"/>';
  var ICON_CHEVRON_R = '<path d="M9 18l6-6-6-6"/>';
  var ICON_CHECK = '<path d="M20 6L9 17l-5-5"/>';
  var ICON_CLOCK = '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>';
  var ICON_TRASH = '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>';
  var ICON_X = '<path d="M18 6L6 18M6 6l12 12"/>';
  var ICON_FLAG = '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>';

  // ==================== 渲染 ====================
  function render(container) {
    var state = window._schState;
    if (!state) {
      var t = today();
      state = { year: t.year, month: t.month, selectedDay: t.day, container: container, showAddForm: false };
      window._schState = state;
    }

    var tasks = loadTasks();
    var y = state.year, m = state.month;
    var t = today();
    var isCurrentMonth = (y === t.year && m === t.month);
    var totalDays = daysInMonth(y, m);
    var offset = firstDayOffset(y, m);
    var rows = Math.ceil((offset + totalDays) / 7);

    // 按日期索引任务
    var tasksByDate = {};
    tasks.forEach(function(task) {
      var d = taskDate(task);
      if (d) {
        if (!tasksByDate[d]) tasksByDate[d] = [];
        tasksByDate[d].push(task);
      }
    });

    var html = '<div class="sch-page">';

    // ===== 月份导航栏 =====
    html += '<div class="sch-nav">';
    html += '<button class="sch-nav-btn" data-action="prev-month">' + svgIcon(ICON_CHEVRON_L, 18, 18) + '</button>';
    html += '<div class="sch-nav-title">' + y + '年' + m + '月</div>';
    html += '<button class="sch-nav-btn" data-action="next-month">' + svgIcon(ICON_CHEVRON_R, 18, 18) + '</button>';
    html += '<button class="sch-add-btn" data-action="toggle-add">' + svgIcon(ICON_PLUS, 18, 18) + '</button>';
    html += '</div>';

    // ===== 添加任务表单 =====
    if (state.showAddForm) {
      var selDate = dateStr(y, m, state.selectedDay);
      html += '<div class="sch-add-form">';
      html += '<div class="sch-add-form-header">';
      html += '<span class="sch-add-form-title">添加任务</span>';
      html += '<button class="sch-add-close" data-action="toggle-add">' + svgIcon(ICON_X, 14, 14) + '</button>';
      html += '</div>';
      html += '<div class="sch-add-field"><label>标题</label><input type="text" id="sch-add-title" placeholder="输入任务标题" /></div>';
      html += '<div class="sch-add-row">';
      html += '<div class="sch-add-field sch-add-field-half"><label>日期</label><input type="date" id="sch-add-date" value="' + selDate + '" /></div>';
      html += '<div class="sch-add-field sch-add-field-half"><label>时间</label><input type="time" id="sch-add-time" placeholder="可选" /></div>';
      html += '</div>';
      html += '<div class="sch-add-field"><label>分组</label>';
      html += '<select id="sch-add-group">';
      Object.keys(GROUP_LABELS).forEach(function(gk) {
        html += '<option value="' + gk + '">' + GROUP_LABELS[gk].name + '</option>';
      });
      html += '</select></div>';
      html += '<button class="sch-add-submit" data-action="add-task">添加</button>';
      html += '</div>';
    }

    // ===== 月历网格 =====
    html += '<div class="sch-calendar">';

    // 星期头部
    html += '<div class="sch-cal-header">';
    WEEKDAYS.forEach(function(wd) {
      html += '<div class="sch-cal-weekday">' + wd + '</div>';
    });
    html += '</div>';

    // 日期格子
    html += '<div class="sch-cal-grid" style="grid-template-rows:repeat(' + rows + ',1fr)">';
    var cellIndex = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < 7; c++) {
        var dayNum = cellIndex - offset + 1;
        if (dayNum < 1 || dayNum > totalDays) {
          html += '<div class="sch-cal-cell sch-cal-empty"></div>';
        } else {
          var ds = dateStr(y, m, dayNum);
          var isToday = isCurrentMonth && dayNum === t.day;
          var isSelected = dayNum === state.selectedDay;
          var dayTasks = tasksByDate[ds] || [];
          var cls = 'sch-cal-cell';
          if (isToday) cls += ' sch-cal-today';
          if (isSelected) cls += ' sch-cal-selected';
          if (dayTasks.length > 0) cls += ' sch-cal-has-tasks';

          html += '<div class="' + cls + '" data-day="' + dayNum + '">';
          html += '<div class="sch-cal-day-num">' + dayNum + '</div>';
          if (dayTasks.length > 0) {
            html += '<div class="sch-cal-dots">';
            // 统计各状态数量，显示对应色点
            var statusCounts = { done: 0, progress: 0, todo: 0 };
            dayTasks.forEach(function(dt) { statusCounts[dt.status] = (statusCounts[dt.status] || 0) + 1; });
            ['done', 'progress', 'todo'].forEach(function(st) {
              if (statusCounts[st] > 0) {
                html += '<span class="sch-cal-dot sch-dot-' + st + '"></span>';
              }
            });
            html += '</div>';
            html += '<div class="sch-cal-task-count">' + dayTasks.length + '件事</div>';
          }
          html += '</div>';
        }
        cellIndex++;
      }
    }
    html += '</div>';
    html += '</div>';

    // ===== 当日任务详情面板 =====
    var selDs = dateStr(y, m, state.selectedDay);
    var selTasks = (tasksByDate[selDs] || []).slice();

    // 排序：有 time 的按 time 排，无 time 排最后
    selTasks.sort(function(a, b) {
      var ta = a.time || '', tb = b.time || '';
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return ta.localeCompare(tb);
    });

    var selDate = new Date(y, m - 1, state.selectedDay);
    var selDow = WEEKDAY_FULL[selDate.getDay()];
    var selMonth = m;
    var selDay = state.selectedDay;

    html += '<div class="sch-detail">';
    html += '<div class="sch-detail-header">';
    html += '<div class="sch-detail-title">' + selMonth + '月' + selDay + '日 · 星期' + selDow + '</div>';
    html += '<div class="sch-detail-count">' + selTasks.length + '项任务</div>';
    html += '</div>';

    if (selTasks.length === 0) {
      html += '<div class="sch-detail-empty">';
      html += svgIcon(ICON_CALENDAR, 32, 32);
      html += '<span>当天无安排</span>';
      html += '</div>';
    } else {
      html += '<div class="sch-detail-list">';
      selTasks.forEach(function(task) {
        var gInfo = GROUP_LABELS[task.group] || { name: '其他', color: '#9ca3af', icon: '' };
        var sMeta = STATUS_META[task.status] || STATUS_META.todo;
        var isOverdue = taskDate(task) && task.status !== 'done' && new Date(taskDate(task)) < new Date(new Date().toDateString());

        html += '<div class="sch-task-card' + (isOverdue ? ' sch-task-overdue' : '') + '" data-id="' + task.id + '">';
        // 左侧状态标记
        html += '<button class="sch-task-status" data-action="cycle-status" data-id="' + task.id + '" style="color:' + sMeta.color + ';background:' + sMeta.bg + '" title="点击切换状态">';
        if (task.status === 'done') {
          html += svgIcon(ICON_CHECK, 14, 14);
        } else if (task.status === 'progress') {
          html += svgIcon(ICON_CLOCK, 14, 14);
        } else {
          html += '<span class="sch-task-status-dot"></span>';
        }
        html += '</button>';
        // 中间内容
        html += '<div class="sch-task-body">';
        html += '<div class="sch-task-title-row">';
        html += '<span class="sch-task-title' + (task.status === 'done' ? ' sch-task-done-text' : '') + '">' + task.title + '</span>';
        html += '</div>';
        html += '<div class="sch-task-meta">';
        // 分组标签
        html += '<span class="sch-task-group" style="color:' + gInfo.color + ';background:' + gInfo.color + '12">';
        if (gInfo.icon) html += '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + gInfo.icon + '</svg>';
        html += gInfo.name + '</span>';
        // 时间
        if (task.time) {
          html += '<span class="sch-task-time">' + svgIcon(ICON_CLOCK, 10, 10) + task.time + '</span>';
        }
        // 状态标签
        html += '<span class="sch-task-status-label" style="color:' + sMeta.color + '">' + sMeta.label + '</span>';
        html += '</div>';
        if (task.desc) {
          html += '<div class="sch-task-desc">' + task.desc + '</div>';
        }
        html += '</div>';
        // 删除按钮
        html += '<button class="sch-task-del" data-action="delete" data-id="' + task.id + '" title="删除">';
        html += svgIcon(ICON_TRASH, 13, 13);
        html += '</button>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    // ===== 绑定事件 =====
    // 日期格子点击
    container.querySelectorAll('.sch-cal-cell:not(.sch-cal-empty)').forEach(function(cell) {
      cell.addEventListener('click', function() {
        state.selectedDay = parseInt(this.getAttribute('data-day'));
        render(container);
      });
    });

    // 导航和操作按钮
    container.querySelectorAll('[data-action]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var action = this.getAttribute('data-action');
        var id = this.getAttribute('data-id');
        handleAction(action, id, container);
      });
    });
  }

  function handleAction(action, id, container) {
    var state = window._schState;
    var tasks = loadTasks();

    switch (action) {
      case 'prev-month':
        state.month--;
        if (state.month < 1) { state.month = 12; state.year--; }
        // 重置选中日为1号
        state.selectedDay = 1;
        state.showAddForm = false;
        render(container);
        break;

      case 'next-month':
        state.month++;
        if (state.month > 12) { state.month = 1; state.year++; }
        state.selectedDay = 1;
        state.showAddForm = false;
        render(container);
        break;

      case 'toggle-add':
        state.showAddForm = !state.showAddForm;
        render(container);
        if (state.showAddForm) {
          var titleInput = document.getElementById('sch-add-title');
          if (titleInput) titleInput.focus();
        }
        break;

      case 'add-task':
        var titleEl = document.getElementById('sch-add-title');
        var dateEl = document.getElementById('sch-add-date');
        var timeEl = document.getElementById('sch-add-time');
        var groupEl = document.getElementById('sch-add-group');
        var title = titleEl ? titleEl.value.trim() : '';
        if (!title) {
          if (titleEl) { titleEl.style.borderColor = '#ef4444'; titleEl.focus(); }
          return;
        }
        var newTask = {
          title: title,
          desc: '',
          group: groupEl ? groupEl.value : 'mijieai',
          status: 'todo',
          priority: 2
        };
        if (dateEl && dateEl.value) {
          newTask.date = dateEl.value;
          newTask.deadline = dateEl.value;
        }
        if (timeEl && timeEl.value) {
          newTask.time = timeEl.value;
        }
        window.scheduleAddTask(newTask);
        state.showAddForm = false;
        // 跳转到新任务的日期
        if (newTask.date) {
          var parts = newTask.date.split('-');
          state.year = parseInt(parts[0]);
          state.month = parseInt(parts[1]);
          state.selectedDay = parseInt(parts[2]);
        }
        render(container);
        break;

      case 'cycle-status':
        tasks.forEach(function(t) {
          if (t.id === id) {
            t.status = STATUS_META[t.status] ? STATUS_META[t.status].next : 'todo';
          }
        });
        saveTasks(tasks);
        render(container);
        break;

      case 'delete':
        tasks = tasks.filter(function(t) { return t.id !== id; });
        saveTasks(tasks);
        render(container);
        break;
    }
  }

  // ==================== 初始化 ====================
  window.initSchedule = function(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    // 初始化状态：当前月、选中今天
    var t = today();
    window._schState = {
      year: t.year,
      month: t.month,
      selectedDay: t.day,
      container: el,
      showAddForm: false
    };
    render(el);
  };

  // ==================== 样式注入 ====================
  (function() {
    var style = document.createElement('style');
    style.textContent = [
      /* 页面容器 */
      '.sch-page{padding:0 0 80px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',

      /* ===== 月份导航栏 ===== */
      '.sch-nav{display:flex;align-items:center;justify-content:center;padding:16px 16px 8px;gap:8px;position:relative}',
      '.sch-nav-btn{width:36px;height:36px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#475569;transition:all .15s;flex-shrink:0}',
      '.sch-nav-btn:hover{background:#f1f5f9;border-color:#cbd5e1}',
      '.sch-nav-btn:active{transform:scale(.93)}',
      '.sch-nav-title{font-size:17px;font-weight:700;color:#1e293b;min-width:100px;text-align:center;letter-spacing:.5px}',
      '.sch-add-btn{position:absolute;right:16px;width:36px;height:36px;border-radius:10px;border:none;background:#4f46e5;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;transition:all .15s}',
      '.sch-add-btn:hover{background:#4338ca}',
      '.sch-add-btn:active{transform:scale(.93)}',

      /* ===== 添加任务表单 ===== */
      '.sch-add-form{margin:0 16px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,.06)}',
      '.sch-add-form-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}',
      '.sch-add-form-title{font-size:14px;font-weight:700;color:#1e293b}',
      '.sch-add-close{width:28px;height:28px;border-radius:8px;border:none;background:#f1f5f9;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#64748b}',
      '.sch-add-close:hover{background:#e2e8f0;color:#475569}',
      '.sch-add-field{margin-bottom:10px}',
      '.sch-add-field label{display:block;font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px}',
      '.sch-add-field input,.sch-add-field select{width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none;transition:border-color .15s;box-sizing:border-box;background:#fff}',
      '.sch-add-field input:focus,.sch-add-field select:focus{border-color:#4f46e5}',
      '.sch-add-row{display:flex;gap:10px}',
      '.sch-add-field-half{flex:1}',
      '.sch-add-submit{width:100%;padding:10px;border-radius:10px;border:none;background:#4f46e5;color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;margin-top:4px}',
      '.sch-add-submit:hover{background:#4338ca}',
      '.sch-add-submit:active{transform:scale(.97)}',

      /* ===== 月历网格 ===== */
      '.sch-calendar{margin:0 12px 0;border-radius:14px;overflow:hidden;background:#fff;border:1px solid #f1f5f9;box-shadow:0 1px 4px rgba(0,0,0,.03)}',
      '.sch-cal-header{display:grid;grid-template-columns:repeat(7,1fr);background:#f8fafc;border-bottom:1px solid #f1f5f9}',
      '.sch-cal-weekday{text-align:center;font-size:11px;font-weight:600;color:#94a3b8;padding:8px 0}',
      '.sch-cal-grid{display:grid;grid-template-columns:repeat(7,1fr)}',
      '.sch-cal-cell{min-height:58px;padding:4px 2px;border-right:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;cursor:pointer;display:flex;flex-direction:column;align-items:center;transition:background .12s;position:relative}',
      '.sch-cal-cell:nth-child(7n){border-right:none}',
      '.sch-cal-cell:hover{background:#f8fafc}',
      '.sch-cal-empty{cursor:default;background:#fafbfc}',
      '.sch-cal-empty:hover{background:#fafbfc}',
      '.sch-cal-day-num{font-size:13px;font-weight:500;color:#475569;line-height:1.4}',

      /* 今天高亮 */
      '.sch-cal-today .sch-cal-day-num{background:#4f46e5;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-weight:700}',

      /* 选中日期 */
      '.sch-cal-selected{background:#eef2ff !important;border:2px solid #4f46e5;border-radius:8px;margin:-1px}',

      /* 任务指示点 */
      '.sch-cal-dots{display:flex;gap:3px;margin-top:2px;justify-content:center}',
      '.sch-cal-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}',
      '.sch-dot-done{background:#16a34a}',
      '.sch-dot-progress{background:#f59e0b}',
      '.sch-dot-todo{background:#9ca3af}',
      '.sch-cal-task-count{font-size:9px;color:#94a3b8;margin-top:1px;line-height:1}',

      /* 有任务的日期 */
      '.sch-cal-has-tasks{background:#fafbff}',

      /* ===== 当日任务详情面板 ===== */
      '.sch-detail{margin:12px 12px 0;background:#fff;border-radius:14px;border:1px solid #f1f5f9;box-shadow:0 1px 4px rgba(0,0,0,.03);overflow:hidden}',
      '.sch-detail-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid #f8fafc}',
      '.sch-detail-title{font-size:15px;font-weight:700;color:#1e293b}',
      '.sch-detail-count{font-size:11px;color:#94a3b8;background:#f1f5f9;border-radius:8px;padding:2px 8px}',

      /* 空状态 */
      '.sch-detail-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:28px 16px;color:#cbd5e1}',
      '.sch-detail-empty span{font-size:13px;color:#94a3b8}',

      /* 任务列表 */
      '.sch-detail-list{padding:8px 0}',
      '.sch-task-card{display:flex;align-items:flex-start;gap:10px;padding:10px 16px;transition:background .12s;position:relative}',
      '.sch-task-card:hover{background:#f8fafc}',
      '.sch-task-card:not(:last-child){border-bottom:1px solid #f8fafc}',

      /* 状态切换按钮 */
      '.sch-task-status{width:28px;height:28px;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;margin-top:2px}',
      '.sch-task-status:hover{opacity:.8;transform:scale(1.05)}',
      '.sch-task-status:active{transform:scale(.9)}',
      '.sch-task-status-dot{width:8px;height:8px;border-radius:50%;background:currentColor}',

      /* 任务内容 */
      '.sch-task-body{flex:1;min-width:0}',
      '.sch-task-title-row{display:flex;align-items:center;gap:6px}',
      '.sch-task-title{font-size:13px;font-weight:600;color:#1e293b;line-height:1.4}',
      '.sch-task-done-text{text-decoration:line-through;color:#94a3b8}',
      '.sch-task-meta{display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap}',
      '.sch-task-group{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;padding:2px 7px;border-radius:8px}',
      '.sch-task-time{font-size:10px;color:#94a3af;display:inline-flex;align-items:center;gap:3px}',
      '.sch-task-status-label{font-size:10px;font-weight:600}',
      '.sch-task-desc{font-size:11px;color:#6b7280;line-height:1.5;margin-top:4px}',

      /* 逾期 */
      '.sch-task-overdue{background:#fffbfb}',
      '.sch-task-overdue .sch-task-title{color:#dc2626}',

      /* 删除按钮 */
      '.sch-task-del{width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#d1d5db;transition:all .15s;margin-top:2px}',
      '.sch-task-del:hover{color:#ef4444;background:#fef2f2}',
      '.sch-task-del:active{transform:scale(.9)}',

      /* ===== 响应式：移动端 ===== */
      '@media(max-width:380px){',
      '  .sch-cal-cell{min-height:46px;padding:3px 1px}',
      '  .sch-cal-day-num{font-size:11px}',
      '  .sch-cal-task-count{display:none}',
      '  .sch-cal-dot{width:5px;height:5px}',
      '  .sch-nav-title{font-size:15px}',
      '}',
      '@media(min-width:420px){',
      '  .sch-cal-cell{min-height:64px}',
      '}',

      /* ===== 周末列微弱底色 ===== */
      '.sch-cal-cell:nth-child(7n),.sch-cal-cell:nth-child(7n-1){background:#fafbfd}',
      '.sch-cal-cell:nth-child(7n):hover,.sch-cal-cell:nth-child(7n-1):hover{background:#f5f6fa}',
      '.sch-cal-empty:nth-child(7n),.sch-cal-empty:nth-child(7n-1){background:#f7f8fc}'
    ].join('\n');
    document.head.appendChild(style);
  })();

  // ==================== 日程提醒引擎 ====================
  var _reminderShown = {}; // sessionStorage key: 'mijieai_reminders_YYYY-MM-DD'

  function _getShownKey() {
    var d = new Date();
    return 'mijieai_reminders_' + d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function _loadShown() {
    try { return JSON.parse(sessionStorage.getItem(_getShownKey())) || {}; }
    catch(e) { return {}; }
  }

  function _saveShown(obj) {
    sessionStorage.setItem(_getShownKey(), JSON.stringify(obj));
  }

  function _requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function _showReminderBanner(task) {
    // 移除旧横幅
    var old = document.getElementById('sch-reminder-banner');
    if (old) old.remove();

    var banner = document.createElement('div');
    banner.id = 'sch-reminder-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 20px rgba(79,70,229,.4);animation:schSlideDown .4s ease-out;';

    banner.innerHTML = '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      + '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
      + '</div>'
      + '<div style="flex:1;min-width:0"><div style="font-size:12px;opacity:.8">日程提醒</div>'
      + '<div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (task.title || '待办事项') + '</div></div>'
      + '<button id="schReminderDismiss" style="background:rgba(255,255,255,.2);border:none;color:#fff;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0">知道了</button>';

    // 添加动画样式
    if (!document.getElementById('sch-reminder-style')) {
      var s = document.createElement('style');
      s.id = 'sch-reminder-style';
      s.textContent = '@keyframes schSlideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}';
      document.head.appendChild(s);
    }

    document.body.appendChild(banner);

    // 绑定关闭
    document.getElementById('schReminderDismiss').addEventListener('click', function() {
      banner.style.transition = 'transform .3s';
      banner.style.transform = 'translateY(-100%)';
      setTimeout(function() { banner.remove(); }, 300);
    });

    // 10秒后自动消失
    setTimeout(function() {
      if (document.getElementById('sch-reminder-banner')) {
        banner.style.transition = 'transform .3s';
        banner.style.transform = 'translateY(-100%)';
        setTimeout(function() { if (banner.parentNode) banner.remove(); }, 300);
      }
    }, 10000);

    // 播放提示音（如果浏览器支持）
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch(e) {}
  }

  function _checkReminders() {
    var tasks = loadTasks();
    var now = new Date();
    var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    var nowMinutes = now.getHours() * 60 + now.getMinutes();
    var shown = _loadShown();

    tasks.forEach(function(task) {
      if (!task.time || task.status === 'done') return;
      var taskDate = task.date || task.deadline || '';
      if (taskDate.length >= 10 && taskDate.substr(0,10) !== todayStr) return;

      // 解析任务时间
      var parts = task.time.split(':');
      var taskMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
      var diff = taskMinutes - nowMinutes;

      // 在 -1 到 5 分钟范围内触发（1分钟容忍延迟）
      if (diff >= -1 && diff <= 5) {
        var reminderKey = task.id + '_' + task.time;
        if (shown[reminderKey]) return;
        shown[reminderKey] = true;
        _saveShown(shown);

        // 桌面通知
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('MiRun AI 日程提醒', {
              body: task.title + (task.time ? ' (' + task.time + ')' : ''),
              icon: '../logo.png',
              tag: 'sch-reminder-' + task.id
            });
          } catch(e) {}
        }

        // 页内横幅
        _showReminderBanner(task);
      }
    });
  }

  // 启动提醒引擎：每30秒检查一次
  _requestNotificationPermission();
  setInterval(_checkReminders, 30000);
  // 页面加载后也立即检查一次
  setTimeout(_checkReminders, 2000);

  // 对外暴露：添加任务时如果带reminder字段，确保时间格式正确
  var _origAddTask = window.scheduleAddTask;
  window.scheduleAddTask = function(task) {
    if (task.reminder && !task.time) {
      task.time = task.reminder;
    }
    return _origAddTask(task);
  };

})();
