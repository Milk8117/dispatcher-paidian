/**
 * daily-tx.js - 米界AI日常收支记录模块
 *
 * 功能：快速记账（收入/支出），按日分组展示，周/月统计
 * 数据键：mijieai_daily_tx
 * 入口：window.initDailyTx(containerId)
 * 对外：window.dailyTxAdd({ type, amount, category, note })
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'mijieai_daily_tx';

  // 支出分类（SVG图标+颜色）
  var EXPENSE_CATS = [
    { key: 'food',     name: '餐饮', color: '#f97316', icon: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3' },
    { key: 'transport',name: '交通', color: '#3b82f6', icon: 'M5 17h14M5 17a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2M5 17l-1 3h16l-1-3M8 13h.01M16 13h.01' },
    { key: 'shopping', name: '购物', color: '#ec4899', icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0' },
    { key: 'entertain',name: '娱乐', color: '#8b5cf6', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0 0 10 9.87v4.263a1 1 0 0 0 1.555.832l3.197-2.132a1 1 0 0 0 0-1.664zM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
    { key: 'medical',  name: '医疗', color: '#ef4444', icon: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' },
    { key: 'education',name: '教育', color: '#06b6d4', icon: 'M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422A12 12 0 0 1 12 19.5a12 12 0 0 1-6.16-8.922L12 14z' },
    { key: 'daily',    name: '日用', color: '#14b8a6', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z' },
    { key: 'other',    name: '其他', color: '#6b7280', icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' }
  ];

  var INCOME_CATS = [
    { key: 'salary',   name: '工资', color: '#22c55e', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
    { key: 'sidejob',  name: '兼职', color: '#0ea5e9', icon: 'M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zM10 5h4v2h-4V5z' },
    { key: 'invest',   name: '投资收益', color: '#f59e0b', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
    { key: 'other_in', name: '其他', color: '#6b7280', icon: 'M12 5v14M5 12h14' }
  ];

  var EXPENSE_MAP = {};
  EXPENSE_CATS.forEach(function(c) { EXPENSE_MAP[c.key] = c; });
  var INCOME_MAP = {};
  INCOME_CATS.forEach(function(c) { INCOME_MAP[c.key] = c; });

  // ==================== 数据操作 ====================
  function loadTx() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch(e) { return []; }
  }
  function saveTx(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

  function addTx(tx) {
    var list = loadTx();
    tx.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    tx.createdAt = new Date().toISOString();
    list.push(tx);
    saveTx(list);
    return tx;
  }
  function deleteTx(id) {
    var list = loadTx().filter(function(t) { return t.id !== id; });
    saveTx(list);
  }

  // ==================== 样式注入 ====================
  function injectStyles() {
    var s = document.createElement('style');
    s.textContent = [
      '.dtx-wrap{padding:16px;max-width:480px;margin:0 auto}',
      '.dtx-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}',
      '.dtx-title{font-size:16px;font-weight:700;color:#1f2937;display:flex;align-items:center;gap:6px}',
      '.dtx-add-btn{display:flex;align-items:center;gap:4px;padding:7px 14px;border-radius:20px;border:none;background:#2563eb;color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}',
      '.dtx-add-btn:hover{background:#1d4ed8}',
      '.dtx-summary{display:flex;gap:8px;margin-bottom:16px}',
      '.dtx-sum-card{flex:1;padding:12px;border-radius:10px;background:#f8fafc;border:1px solid #e5e7eb;text-align:center}',
      '.dtx-sum-label{font-size:11px;color:#6b7280;margin-bottom:2px}',
      '.dtx-sum-val{font-size:18px;font-weight:700}',
      '.dtx-sum-val.exp{color:#ef4444}.dtx-sum-val.inc{color:#22c55e}.dtx-sum-val.bal{color:#2563eb}',
      '.dtx-day-group{margin-bottom:12px}',
      '.dtx-day-header{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f3f4f6;margin-bottom:6px}',
      '.dtx-day-label{font-size:13px;font-weight:600;color:#374151}',
      '.dtx-day-total{font-size:12px;color:#6b7280}',
      '.dtx-item{display:flex;align-items:center;gap:10px;padding:8px 4px;border-radius:8px;transition:background .15s;cursor:pointer}',
      '.dtx-item:hover{background:#f9fafb}',
      '.dtx-item-icon{width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '.dtx-item-info{flex:1;min-width:0}',
      '.dtx-item-cat{font-size:13px;font-weight:600;color:#1f2937}',
      '.dtx-item-note{font-size:11px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dtx-item-right{text-align:right;flex-shrink:0}',
      '.dtx-item-amt{font-size:14px;font-weight:700}',
      '.dtx-item-amt.exp{color:#ef4444}.dtx-item-amt.inc{color:#22c55e}',
      '.dtx-item-del{font-size:11px;color:#d1d5db;cursor:pointer;margin-top:2px}',
      '.dtx-item-del:hover{color:#ef4444}',
      '.dtx-empty{text-align:center;padding:32px 16px;color:#9ca3af;font-size:13px}',
      '.dtx-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:9998;display:flex;align-items:flex-end;justify-content:center}',
      '.dtx-modal{background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:480px;padding:20px 16px 24px;max-height:80vh;overflow-y:auto}',
      '.dtx-modal-title{font-size:16px;font-weight:700;color:#1f2937;margin-bottom:14px;text-align:center}',
      '.dtx-type-toggle{display:flex;gap:8px;margin-bottom:14px}',
      '.dtx-type-btn{flex:1;padding:10px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;color:#6b7280}',
      '.dtx-type-btn.active.exp{border-color:#ef4444;background:#fef2f2;color:#ef4444}',
      '.dtx-type-btn.active.inc{border-color:#22c55e;background:#f0fdf4;color:#16a34a}',
      '.dtx-cat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}',
      '.dtx-cat-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border:1.5px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;transition:all .2s;font-size:11px;color:#6b7280}',
      '.dtx-cat-btn:hover{border-color:#93c5fd}',
      '.dtx-cat-btn.selected{border-color:#2563eb;background:#eff6ff;color:#1d4ed8;font-weight:600}',
      '.dtx-input-row{margin-bottom:12px}',
      '.dtx-input-row label{display:block;font-size:12px;color:#6b7280;margin-bottom:4px}',
      '.dtx-input-row input,.dtx-input-row textarea{width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;outline:none;transition:border .2s}',
      '.dtx-input-row input:focus,.dtx-input-row textarea:focus{border-color:#2563eb}',
      '.dtx-input-row textarea{height:60px;resize:none}',
      '.dtx-submit-btn{width:100%;padding:12px;border:none;border-radius:10px;background:#2563eb;color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s}',
      '.dtx-submit-btn:hover{background:#1d4ed8}',
      '.dtx-submit-btn:disabled{background:#cbd5e1;cursor:not-allowed}',
      '.dtx-cancel-btn{width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#6b7280;font-size:14px;cursor:pointer;margin-top:8px}',
      '.dtx-month-nav{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:12px}',
      '.dtx-month-btn{width:28px;height:28px;border-radius:50%;border:1px solid #e5e7eb;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6b7280}',
      '.dtx-month-btn:hover{background:#f3f4f6}',
      '.dtx-month-label{font-size:14px;font-weight:600;color:#374151;min-width:100px;text-align:center}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ==================== SVG辅助 ====================
  function svgIcon(pathD, color, sz) {
    sz = sz || 16;
    return '<svg viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'" fill="none" stroke="'+(color||'currentColor')+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+pathD+'</svg>';
  }

  // ==================== 渲染主函数 ====================
  function render(root, viewMonth) {
    // viewMonth: 'YYYY-MM' format
    var now = new Date();
    if (!viewMonth) {
      viewMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    }
    var txList = loadTx();

    // Filter by month
    var monthTx = txList.filter(function(t) { return t.date && t.date.substr(0, 7) === viewMonth; });
    monthTx.sort(function(a, b) { return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt); });

    // Compute summary
    var totalExp = 0, totalInc = 0;
    monthTx.forEach(function(t) {
      if (t.type === 'expense') totalExp += t.amount;
      else totalInc += t.amount;
    });

    // Parse viewMonth for nav
    var vmParts = viewMonth.split('-');
    var vmYear = parseInt(vmParts[0]);
    var vmMonth = parseInt(vmParts[1]);

    var html = '<div class="dtx-wrap">';
    // Header
    html += '<div class="dtx-header">';
    html += '<div class="dtx-title">' + svgIcon('M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', '#2563eb') + '日常收支</div>';
    html += '<button class="dtx-add-btn" id="dtxAddBtn">' + svgIcon('M12 5v14M5 12h14', '#fff', 14) + ' 记一笔</button>';
    html += '</div>';

    // Month navigation
    html += '<div class="dtx-month-nav">';
    html += '<button class="dtx-month-btn" data-dir="-1">' + svgIcon('M15 18l-6-6 6-6', '#6b7280', 14) + '</button>';
    html += '<div class="dtx-month-label">' + vmYear + '年' + vmMonth + '月</div>';
    html += '<button class="dtx-month-btn" data-dir="1">' + svgIcon('M9 18l6-6-6-6', '#6b7280', 14) + '</button>';
    html += '</div>';

    // Summary cards
    html += '<div class="dtx-summary">';
    html += '<div class="dtx-sum-card"><div class="dtx-sum-label">支出</div><div class="dtx-sum-val exp">-' + totalExp.toFixed(0) + '</div></div>';
    html += '<div class="dtx-sum-card"><div class="dtx-sum-label">收入</div><div class="dtx-sum-val inc">+' + totalInc.toFixed(0) + '</div></div>';
    html += '<div class="dtx-sum-card"><div class="dtx-sum-label">结余</div><div class="dtx-sum-val bal">' + (totalInc - totalExp).toFixed(0) + '</div></div>';
    html += '</div>';

    // Group by day
    if (monthTx.length === 0) {
      html += '<div class="dtx-empty">' + svgIcon('M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', '#d1d5db', 28) + '<br>本月暂无记录<br><span style="font-size:12px;color:#d1d5db">点击右上角"记一笔"开始记账</span></div>';
    } else {
      var groups = {};
      var dayOrder = [];
      monthTx.forEach(function(t) {
        if (!groups[t.date]) { groups[t.date] = []; dayOrder.push(t.date); }
        groups[t.date].push(t);
      });
      dayOrder.forEach(function(day) {
        var dayExp = 0, dayInc = 0;
        groups[day].forEach(function(t) {
          if (t.type === 'expense') dayExp += t.amount; else dayInc += t.amount;
        });
        var d = new Date(day + 'T00:00:00');
        var weekDay = ['日','一','二','三','四','五','六'][d.getDay()];
        var dayLabel = d.getMonth() + 1 + '/' + d.getDate() + ' 周' + weekDay;
        // Today label
        var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
        if (day === todayStr) dayLabel = '今天 ' + d.getDate() + '日 周' + weekDay;

        html += '<div class="dtx-day-group">';
        html += '<div class="dtx-day-header"><div class="dtx-day-label">' + dayLabel + '</div>';
        var dayParts = [];
        if (dayExp > 0) dayParts.push('支出 ¥' + dayExp.toFixed(0));
        if (dayInc > 0) dayParts.push('收入 ¥' + dayInc.toFixed(0));
        html += '<div class="dtx-day-total">' + dayParts.join(' · ') + '</div></div>';

        groups[day].forEach(function(t) {
          var catMap = t.type === 'expense' ? EXPENSE_MAP : INCOME_MAP;
          var cat = catMap[t.category] || (t.type === 'expense' ? EXPENSE_MAP['other'] : INCOME_MAP['other_in']);
          var bgColor = cat.color + '18';
          html += '<div class="dtx-item">';
          html += '<div class="dtx-item-icon" style="background:' + bgColor + '">' + svgIcon(cat.icon, cat.color) + '</div>';
          html += '<div class="dtx-item-info"><div class="dtx-item-cat">' + cat.name + '</div>';
          if (t.note) html += '<div class="dtx-item-note">' + t.note + '</div>';
          html += '</div>';
          html += '<div class="dtx-item-right">';
          html += '<div class="dtx-item-amt ' + (t.type === 'expense' ? 'exp' : 'inc') + '">' + (t.type === 'expense' ? '-' : '+') + '¥' + t.amount.toFixed(0) + '</div>';
          html += '<div class="dtx-item-del" data-txid="' + t.id + '">删除</div>';
          html += '</div>';
          html += '</div>';
        });
        html += '</div>';
      });
    }

    html += '</div>';
    root.innerHTML = html;

    // Bind events
    root.querySelector('#dtxAddBtn').addEventListener('click', function() { openAddModal(root, viewMonth); });
    root.querySelectorAll('.dtx-month-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var dir = parseInt(this.getAttribute('data-dir'));
        var nm = vmMonth + dir;
        var ny = vmYear;
        if (nm < 1) { nm = 12; ny--; }
        if (nm > 12) { nm = 1; ny++; }
        render(root, ny + '-' + String(nm).padStart(2, '0'));
      });
    });
    root.querySelectorAll('.dtx-item-del').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = this.getAttribute('data-txid');
        if (confirm('确定删除这条记录？')) { deleteTx(id); render(root, viewMonth); }
      });
    });
  }

  // ==================== 添加弹窗 ====================
  function openAddModal(root, viewMonth) {
    var selType = 'expense';
    var selCat = '';
    var overlay = document.createElement('div');
    overlay.className = 'dtx-modal-overlay';

    var todayStr = new Date().toISOString().substr(0, 10);

    function modalHtml() {
      var cats = selType === 'expense' ? EXPENSE_CATS : INCOME_CATS;
      var h = '<div class="dtx-modal">';
      h += '<div class="dtx-modal-title">记一笔</div>';
      h += '<div class="dtx-type-toggle">';
      h += '<button class="dtx-type-btn exp' + (selType==='expense'?' active':'') + '" data-type="expense">支出</button>';
      h += '<button class="dtx-type-btn inc' + (selType==='income'?' active':'') + '" data-type="income">收入</button>';
      h += '</div>';
      h += '<div class="dtx-cat-grid">';
      cats.forEach(function(c) {
        h += '<button class="dtx-cat-btn' + (selCat===c.key?' selected':'') + '" data-cat="' + c.key + '">';
        h += svgIcon(c.icon, selCat===c.key ? '#2563eb' : c.color, 20);
        h += c.name + '</button>';
      });
      h += '</div>';
      h += '<div class="dtx-input-row"><label>金额（元）</label><input type="number" id="dtxAmount" placeholder="0" min="0" step="1" inputmode="numeric"></div>';
      h += '<div class="dtx-input-row"><label>日期</label><input type="date" id="dtxDate" value="' + todayStr + '"></div>';
      h += '<div class="dtx-input-row"><label>备注</label><textarea id="dtxNote" placeholder="可选，如：午餐、打车"></textarea></div>';
      h += '<button class="dtx-submit-btn" id="dtxSubmit"' + (!selCat?' disabled':'') + '>保存</button>';
      h += '<button class="dtx-cancel-btn" id="dtxCancel">取消</button>';
      h += '</div>';
      return h;
    }

    overlay.innerHTML = modalHtml();
    document.body.appendChild(overlay);

    // Events
    overlay.querySelectorAll('.dtx-type-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        selType = this.getAttribute('data-type');
        selCat = '';
        overlay.innerHTML = modalHtml();
        bindModalEvents(overlay, root, viewMonth, modalHtml);
      });
    });
    bindModalEvents(overlay, root, viewMonth, modalHtml);
  }

  function bindModalEvents(overlay, root, viewMonth, modalHtml) {
    overlay.querySelectorAll('.dtx-cat-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        overlay.querySelectorAll('.dtx-cat-btn').forEach(function(b) { b.classList.remove('selected'); });
        this.classList.add('selected');
        var submitBtn = overlay.querySelector('#dtxSubmit');
        if (submitBtn) submitBtn.disabled = false;
      });
    });
    overlay.querySelectorAll('.dtx-type-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var newType = this.getAttribute('data-type');
        // Re-render modal with new type
        var selCat = '';
        var todayStr = overlay.querySelector('#dtxDate') ? overlay.querySelector('#dtxDate').value : new Date().toISOString().substr(0,10);
        var selType = newType;
        // Rebuild
        var cats = selType === 'expense' ? EXPENSE_CATS : INCOME_CATS;
        var h = '<div class="dtx-modal">';
        h += '<div class="dtx-modal-title">记一笔</div>';
        h += '<div class="dtx-type-toggle">';
        h += '<button class="dtx-type-btn exp' + (selType==='expense'?' active':'') + '" data-type="expense">支出</button>';
        h += '<button class="dtx-type-btn inc' + (selType==='income'?' active':'') + '" data-type="income">收入</button>';
        h += '</div>';
        h += '<div class="dtx-cat-grid">';
        cats.forEach(function(c) {
          h += '<button class="dtx-cat-btn" data-cat="' + c.key + '">' + svgIcon(c.icon, c.color, 20) + c.name + '</button>';
        });
        h += '</div>';
        h += '<div class="dtx-input-row"><label>金额（元）</label><input type="number" id="dtxAmount" placeholder="0" min="0" step="1" inputmode="numeric"></div>';
        h += '<div class="dtx-input-row"><label>日期</label><input type="date" id="dtxDate" value="' + todayStr + '"></div>';
        h += '<div class="dtx-input-row"><label>备注</label><textarea id="dtxNote" placeholder="可选"></textarea></div>';
        h += '<button class="dtx-submit-btn" id="dtxSubmit" disabled>保存</button>';
        h += '<button class="dtx-cancel-btn" id="dtxCancel">取消</button>';
        h += '</div>';
        overlay.innerHTML = h;
        bindModalEvents(overlay, root, viewMonth, modalHtml);
      });
    });
    var submitBtn = overlay.querySelector('#dtxSubmit');
    if (submitBtn) {
      submitBtn.addEventListener('click', function() {
        var catBtn = overlay.querySelector('.dtx-cat-btn.selected');
        var amtInput = overlay.querySelector('#dtxAmount');
        var dateInput = overlay.querySelector('#dtxDate');
        var noteInput = overlay.querySelector('#dtxNote');
        if (!catBtn || !amtInput || !dateInput) return;
        var amt = parseFloat(amtInput.value);
        if (!amt || amt <= 0) { alert('请输入金额'); return; }
        // Determine type from which button is active
        var activeTypeBtn = overlay.querySelector('.dtx-type-btn.active');
        var txType = activeTypeBtn ? activeTypeBtn.getAttribute('data-type') : 'expense';
        addTx({
          type: txType,
          amount: amt,
          category: catBtn.getAttribute('data-cat'),
          note: noteInput ? noteInput.value.trim() : '',
          date: dateInput.value
        });
        overlay.remove();
        render(root, viewMonth);
      });
    }
    var cancelBtn = overlay.querySelector('#dtxCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', function() { overlay.remove(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  }

  // ==================== 入口 ====================
  window.initDailyTx = function(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    injectStyles();
    render(el);
  };

  window.dailyTxAdd = function(tx) {
    if (!tx || !tx.amount) return;
    if (!tx.type) tx.type = 'expense';
    if (!tx.date) tx.date = new Date().toISOString().substr(0, 10);
    if (!tx.category) tx.category = tx.type === 'expense' ? 'other' : 'other_in';
    addTx(tx);
  };

})();
