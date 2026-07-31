/**
 * 米界AI — 日程管理模块
 * 工作计划 · 里程碑追踪 · 对话式添加
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
      id: 't3', title: 'AI输入框接入LLM',
      desc: '替换 detectIntent() 关键词检测为 LLM API（Kimi/通义千问）',
      group: 'mijieai', status: 'todo', priority: 2,
      created: '2026-07-31', deadline: ''
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
    }
  ];

  var GROUP_LABELS = {
    mijieai: { name: '米界AI', color: '#4f46e5', icon: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' },
    'wealth-ct': { name: '财富诊断CT', color: '#2563eb', icon: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M6 16h4"/><path d="M14 16h4"/>' }
  };

  var STATUS_META = {
    done:     { label: '已完成', color: '#16a34a', bg: '#f0fdf4' },
    progress: { label: '进行中', color: '#f59e0b', bg: '#fffbeb' },
    todo:     { label: '待启动', color: '#6b7280', bg: '#f9fafb' }
  };

  // ==================== 数据读写 ====================
  function loadTasks() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
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
    return task;
  };

  window.scheduleGetTasks = function() { return loadTasks(); };

  // ==================== 渲染 ====================
  function render(container) {
    var tasks = loadTasks();

    // 统计
    var doneCount = tasks.filter(function(t){ return t.status==='done'; }).length;
    var progressCount = tasks.filter(function(t){ return t.status==='progress'; }).length;
    var todoCount = tasks.filter(function(t){ return t.status==='todo'; }).length;
    var totalCount = tasks.length;
    var pct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

    var html = '<div class="sch-page">';

    // 顶部概览
    html += '<div class="sch-hero">';
    html += '<div class="sch-hero-row">';
    html += '<div class="sch-ring-wrap">';
    html += '<svg viewBox="0 0 80 80" width="64" height="64">';
    html += '<circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" stroke-width="6"/>';
    html += '<circle cx="40" cy="40" r="34" fill="none" stroke="#4f46e5" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + (2*Math.PI*34) + '" stroke-dashoffset="' + (2*Math.PI*34*(1-pct/100)) + '" transform="rotate(-90 40 40)" style="transition:stroke-dashoffset .6s"/>';
    html += '<text x="40" y="44" text-anchor="middle" font-size="15" font-weight="700" fill="#1e293b">' + pct + '%</text>';
    html += '</svg>';
    html += '</div>';
    html += '<div class="sch-stats">';
    html += '<div class="sch-stat"><span class="sch-stat-num" style="color:#f59e0b">' + progressCount + '</span><span class="sch-stat-label">进行中</span></div>';
    html += '<div class="sch-stat"><span class="sch-stat-num" style="color:#6b7280">' + todoCount + '</span><span class="sch-stat-label">待启动</span></div>';
    html += '<div class="sch-stat"><span class="sch-stat-num" style="color:#16a34a">' + doneCount + '</span><span class="sch-stat-label">已完成</span></div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // 分组渲染（进度 > 待启动 > 已完成）
    var groups = ['progress', 'todo', 'done'];
    groups.forEach(function(status) {
      var items = tasks.filter(function(t){ return t.status === status; });
      if (items.length === 0) return;
      var meta = STATUS_META[status];
      html += '<div class="sch-group">';
      html += '<div class="sch-group-header">';
      html += '<span class="sch-group-dot" style="background:' + meta.color + '"></span>';
      html += '<span class="sch-group-title">' + meta.label + '</span>';
      html += '<span class="sch-group-count">' + items.length + '</span>';
      html += '</div>';
      items.forEach(function(t) {
        var gInfo = GROUP_LABELS[t.group] || { name: '其他', color: '#9ca3af', icon: '' };
        var isOverdue = t.deadline && t.status !== 'done' && new Date(t.deadline) < new Date(new Date().toDateString());
        html += '<div class="sch-card' + (isOverdue ? ' sch-overdue' : '') + '" data-id="' + t.id + '">';
        html += '<div class="sch-card-top">';
        html += '<span class="sch-card-group" style="color:' + gInfo.color + ';background:' + gInfo.color + '12">';
        if (gInfo.icon) html += '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + gInfo.icon + '</svg>';
        html += gInfo.name + '</span>';
        if (t.deadline) {
          html += '<span class="sch-card-date' + (isOverdue ? ' sch-date-overdue' : '') + '">';
          html += '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
          html += t.deadline.slice(5) + '</span>';
        }
        html += '</div>';
        html += '<div class="sch-card-title">' + t.title + '</div>';
        if (t.desc) html += '<div class="sch-card-desc">' + t.desc + '</div>';
        // 操作按钮
        html += '<div class="sch-card-actions">';
        if (status === 'todo') {
          html += '<button class="sch-btn sch-btn-start" data-action="start" data-id="' + t.id + '">开始</button>';
        } else if (status === 'progress') {
          html += '<button class="sch-btn sch-btn-done" data-action="done" data-id="' + t.id + '">完成</button>';
        } else {
          html += '<button class="sch-btn sch-btn-reopen" data-action="reopen" data-id="' + t.id + '">重启</button>';
        }
        html += '<button class="sch-btn sch-btn-del" data-action="delete" data-id="' + t.id + '">';
        html += '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        html += '</button>';
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    });

    html += '</div>';
    container.innerHTML = html;

    // 绑定按钮事件
    container.querySelectorAll('.sch-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var action = this.getAttribute('data-action');
        var id = this.getAttribute('data-id');
        handleAction(action, id, container);
      });
    });
  }

  function handleAction(action, id, container) {
    var tasks = loadTasks();
    if (action === 'delete') {
      tasks = tasks.filter(function(t){ return t.id !== id; });
    } else {
      tasks.forEach(function(t) {
        if (t.id === id) {
          if (action === 'start') t.status = 'progress';
          else if (action === 'done') t.status = 'done';
          else if (action === 'reopen') t.status = 'progress';
        }
      });
    }
    saveTasks(tasks);
    render(container);
  }

  // ==================== 初始化 ====================
  window.initSchedule = function(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    render(el);
  };

  // ==================== 样式注入 ====================
  (function() {
    var style = document.createElement('style');
    style.textContent = [
      '.sch-page{padding:0 0 80px}',
      '.sch-hero{background:linear-gradient(135deg,#1e3a5f 0%,#4f46e5 60%,#7c3aed 100%);padding:24px 20px 28px;border-radius:0 0 24px 24px;margin-bottom:16px}',
      '.sch-hero-row{display:flex;align-items:center;gap:20px}',
      '.sch-ring-wrap{flex-shrink:0}',
      '.sch-stats{display:flex;gap:20px;flex:1;justify-content:center}',
      '.sch-stat{text-align:center}',
      '.sch-stat-num{display:block;font-size:22px;font-weight:700;line-height:1.2}',
      '.sch-stat-label{font-size:11px;color:rgba(255,255,255,.65);margin-top:2px}',
      '.sch-group{margin-bottom:4px}',
      '.sch-group-header{display:flex;align-items:center;gap:6px;padding:10px 18px 6px}',
      '.sch-group-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}',
      '.sch-group-title{font-size:13px;font-weight:600;color:#374151}',
      '.sch-group-count{font-size:11px;color:#9ca3af;background:#f3f4f6;border-radius:8px;padding:1px 7px}',
      '.sch-card{background:#fff;border:1px solid #f3f4f6;border-radius:13px;padding:12px 15px;margin:5px 14px;box-shadow:0 1px 3px rgba(0,0,0,.04);transition:all .15s}',
      '.sch-card:active{transform:scale(.98)}',
      '.sch-card.sch-overdue{border-color:#fecaca;background:#fffbfb}',
      '.sch-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}',
      '.sch-card-group{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;padding:2px 7px;border-radius:8px}',
      '.sch-card-date{font-size:10px;color:#9ca3af;display:flex;align-items:center;gap:3px}',
      '.sch-date-overdue{color:#dc2626;font-weight:600}',
      '.sch-card-title{font-size:14px;font-weight:600;color:#1a1a2e;line-height:1.4;margin-bottom:3px}',
      '.sch-card-desc{font-size:11px;color:#6b7280;line-height:1.5;margin-bottom:8px}',
      '.sch-card-actions{display:flex;gap:6px;justify-content:flex-end}',
      '.sch-btn{font-size:11px;padding:4px 12px;border-radius:8px;border:1px solid;cursor:pointer;font-weight:500;transition:all .15s;background:#fff}',
      '.sch-btn:active{transform:scale(.93)}',
      '.sch-btn-start{color:#f59e0b;border-color:#fde68a}',
      '.sch-btn-start:hover{background:#fffbeb}',
      '.sch-btn-done{color:#16a34a;border-color:#bbf7d0}',
      '.sch-btn-done:hover{background:#f0fdf4}',
      '.sch-btn-reopen{color:#6366f1;border-color:#c7d2fe}',
      '.sch-btn-reopen:hover{background:#eef2ff}',
      '.sch-btn-del{color:#d1d5db;border-color:#f3f4f6;padding:4px 7px}',
      '.sch-btn-del:hover{color:#ef4444;border-color:#fecaca;background:#fef2f2}'
    ].join('\n');
    document.head.appendChild(style);
  })();

})();
