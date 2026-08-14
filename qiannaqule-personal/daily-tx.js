/**
 * daily-tx.js - MiRun AI日常收支记录模块 (v2 - CT字段对齐版)
 *
 * 分类体系与财富诊断CT字段完全对齐，数据可自动汇总回填。
 * 数据键：mijieai_daily_tx
 * 入口：window.initDailyTx(containerId)
 * 对外：window.dailyTxAdd({ type, amount, ctField, subCategory, note, date })
 * 对外：window.getDailyTxSummary() — 返回当月按ctField分组的汇总
 */
(function() {
  'use strict';

  // 金额格式化：保留2位小数，去掉末尾多余零
  function _fmtAmt(v) { return parseFloat((v || 0).toFixed(2)); }

  var STORAGE_KEY = 'mijieai_daily_tx';

  // ==================== 分类体系（CT字段对齐） ====================

  var EXPENSE_CATEGORIES = [
    {
      ctField: 'expensePersonal', name: '个人消费', color: '#f97316',
      icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM16 3.13a4 4 0 0 1 0 7.75',
      subs: ['餐饮','交通','购物','娱乐','日用','其他']
    },
    {
      ctField: 'expenseFamily', name: '家庭开支', color: '#ef4444',
      icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zM9 22V12h6v10',
      subs: ['餐饮买菜','水电燃气','物业','交通','日用','其他']
    },
    {
      ctField: 'expenseEducation', name: '家庭教育', color: '#8b5cf6',
      icon: 'M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422A12 12 0 0 1 12 19.5a12 12 0 0 1-6.16-8.922L12 14z',
      subs: ['学费','培训费','教材文具','其他']
    },
    {
      ctField: 'expenseMedical', name: '家庭医疗', color: '#ec4899',
      icon: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
      subs: ['门诊','药品','体检','其他']
    },
    {
      ctField: 'loanPayment', name: '贷款月供', color: '#dc2626',
      icon: 'M2 17l10 5 10-5M2 12l10 5 10-5M12 2L2 7l10 5 10-5L12 2z',
      subs: ['房贷','车贷','消费贷','其他']
    },
    {
      ctField: 'insurance', name: '保险保障', color: '#b91c1c',
      icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      subs: ['寿险','重疾','医疗险','其他']
    }
  ];

  var INCOME_CATEGORIES = [
    {
      ctField: 'jobIncome', name: '职业收入', color: '#22c55e',
      icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
      subs: ['工资','奖金','提成','其他']
    },
    {
      ctField: 'rentalIncome', name: '租金收入', color: '#14b8a6',
      icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zM22 12h-4l-3 9L9 3l-3 9H2',
      subs: ['房租','商铺','其他']
    },
    {
      ctField: 'investIncome', name: '投资收益', color: '#0ea5e9',
      icon: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
      subs: ['利息','股息分红','基金收益','其他']
    },
    {
      ctField: 'sideIncome', name: '副业兼职', color: '#10b981',
      icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6',
      subs: ['兼职','咨询','接单','其他']
    }
  ];

  var CT_MAP = {};
  EXPENSE_CATEGORIES.forEach(function(c) { CT_MAP[c.ctField] = c; });
  INCOME_CATEGORIES.forEach(function(c) { CT_MAP[c.ctField] = c; });

  // ==================== 旧数据兼容映射 ====================
  var OLD_CATEGORY_MAP = {
    food:      { ctField: 'expensePersonal', sub: '餐饮' },
    transport: { ctField: 'expensePersonal', sub: '交通' },
    shopping:  { ctField: 'expensePersonal', sub: '购物' },
    entertain: { ctField: 'expensePersonal', sub: '娱乐' },
    medical:   { ctField: 'expenseMedical',  sub: '门诊' },
    education: { ctField: 'expenseEducation', sub: '培训费' },
    daily:     { ctField: 'expenseFamily',   sub: '日用' },
    other:     { ctField: 'expensePersonal', sub: '其他' },
    salary:    { ctField: 'jobIncome',       sub: '工资' },
    sidejob:   { ctField: 'sideIncome',      sub: '兼职' },
    invest:    { ctField: 'investIncome',    sub: '基金收益' },
    other_in:  { ctField: 'jobIncome',       sub: '其他' }
  };

  // ==================== 数据操作 ====================
  function loadTx() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      // 旧数据迁移
      var migrated = false;
      raw.forEach(function(t) {
        if (t.category && !t.ctField) {
          var mapping = OLD_CATEGORY_MAP[t.category];
          if (mapping) {
            t.ctField = mapping.ctField;
            t.subCategory = t.subCategory || mapping.sub;
            t.type = t.type || 'expense';
          } else {
            t.ctField = t.type === 'income' ? 'jobIncome' : 'expensePersonal';
            t.subCategory = t.subCategory || '其他';
          }
          migrated = true;
        }
      });
      if (migrated) saveTx(raw);
      return raw;
    } catch(e) { return []; }
  }
  function saveTx(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

  function addTx(tx) {
    var list = loadTx();
    tx.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    tx.createdAt = new Date().toISOString();
    if (!tx.subCategory) tx.subCategory = '';
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
      '.dtx-title{font-size:18px;font-weight:700;color:#1f2937;display:flex;align-items:center;gap:8px}',
      '.dtx-add-btn{display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:20px;border:none;background:#2563eb;color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s}',
      '.dtx-add-btn:hover{background:#1d4ed8}',
      '.dtx-summary{margin-bottom:16px}',
      '.dtx-sum-total{display:flex;gap:10px;margin-bottom:12px}',
      '.dtx-sum-card{flex:1;padding:12px 8px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb;text-align:center}',
      '.dtx-sum-label{font-size:14px;color:#6b7280;margin-bottom:4px;font-weight:500}',
      '.dtx-sum-val{font-size:22px;font-weight:700}',
      '.dtx-sum-val.exp{color:#ef4444}.dtx-sum-val.inc{color:#22c55e}.dtx-sum-val.bal{color:#2563eb}',
      '.dtx-sum-detail{display:flex;flex-direction:column;gap:6px}',
      '.dtx-sum-group{padding:12px 14px;border-radius:12px;background:#fff;border:1px solid #f3f4f6}',
      '.dtx-sum-group-title{font-size:14px;font-weight:600;color:#374151;margin-bottom:8px;display:flex;align-items:center;gap:6px}',
      '.dtx-sum-group-title.inc-title{color:#166534}',
      '.dtx-sum-row{display:flex;align-items:center;gap:8px;margin-bottom:4px}',
      '.dtx-sum-row:last-child{margin-bottom:0}',
      '.dtx-sum-row-name{font-size:13px;color:#6b7280;width:64px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dtx-sum-row-bar{flex:1;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden}',
      '.dtx-sum-row-bar-fill{height:100%;border-radius:3px;transition:width .4s ease}',
      '.dtx-sum-row-val{font-size:13px;font-weight:600;color:#374151;width:55px;text-align:right;flex-shrink:0}',
      '.dtx-day-group{margin-bottom:12px}',
      '.dtx-day-header{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f3f4f6;margin-bottom:6px}',
      '.dtx-day-label{font-size:15px;font-weight:600;color:#374151}',
      '.dtx-day-total{font-size:13px;color:#6b7280}',
      '.dtx-item{display:flex;align-items:center;gap:10px;padding:10px 4px;border-radius:8px;transition:background .15s;cursor:pointer}',
      '.dtx-item:hover{background:#f9fafb}',
      '.dtx-item-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '.dtx-item-info{flex:1;min-width:0}',
      '.dtx-item-cat{font-size:15px;font-weight:600;color:#1f2937}',
      '.dtx-item-sub{font-size:12px;color:#9ca3af;margin-left:4px;font-weight:400}',
      '.dtx-item-note{font-size:12px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dtx-item-right{text-align:right;flex-shrink:0}',
      '.dtx-item-amt{font-size:16px;font-weight:700}',
      '.dtx-item-amt.exp{color:#ef4444}.dtx-item-amt.inc{color:#22c55e}',
      '.dtx-item-del{font-size:13px;color:#d1d5db;cursor:pointer;margin-top:2px}',
      '.dtx-item-del:hover{color:#ef4444}',
      '.dtx-empty{text-align:center;padding:40px 16px;color:#9ca3af;font-size:14px}',
      '.dtx-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:9998;display:flex;align-items:flex-end;justify-content:center}',
      '.dtx-modal{background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:480px;padding:20px 16px 24px;max-height:85vh;overflow-y:auto}',
      '.dtx-modal-title{font-size:18px;font-weight:700;color:#1f2937;margin-bottom:16px;text-align:center}',
      '.dtx-step-label{font-size:13px;color:#6b7280;margin-bottom:10px;font-weight:500}',
      '.dtx-big-cat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}',
      '.dtx-big-cat-section{margin-bottom:14px}',
      '.dtx-big-cat-section-label{font-size:12px;font-weight:600;color:#9ca3af;margin-bottom:8px;letter-spacing:.5px}',
      '.dtx-big-cat-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border:1.5px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;transition:all .2s;font-size:13px;color:#6b7280}',
      '.dtx-big-cat-btn:hover{border-color:#93c5fd;background:#f8fafc}',
      '.dtx-big-cat-btn.selected{border-color:#2563eb;background:#eff6ff;color:#1d4ed8;font-weight:600}',
      '.dtx-big-cat-btn.exp-sel{border-color:#ef4444;background:#fef2f2;color:#dc2626}',
      '.dtx-big-cat-btn.inc-sel{border-color:#22c55e;background:#f0fdf4;color:#16a34a}',
      '.dtx-sub-cat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}',
      '.dtx-sub-cat-btn{padding:10px 4px;border:1.5px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;transition:all .2s;font-size:13px;color:#6b7280;text-align:center}',
      '.dtx-sub-cat-btn:hover{border-color:#93c5fd}',
      '.dtx-sub-cat-btn.selected{border-color:#2563eb;background:#eff6ff;color:#1d4ed8;font-weight:600}',
      '.dtx-back-btn{display:inline-flex;align-items:center;gap:4px;font-size:13px;color:#6b7280;cursor:pointer;margin-bottom:10px;padding:6px 8px;border-radius:6px;border:none;background:none}',
      '.dtx-back-btn:hover{background:#f3f4f6;color:#374151}',
      '.dtx-input-row{margin-bottom:14px}',
      '.dtx-input-row label{display:block;font-size:13px;color:#6b7280;margin-bottom:6px}',
      '.dtx-input-row input,.dtx-input-row textarea{width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;box-sizing:border-box;outline:none;transition:border .2s;font-family:inherit}',
      '.dtx-input-row input:focus,.dtx-input-row textarea:focus{border-color:#2563eb}',
      '.dtx-input-row textarea{height:60px;resize:none}',
      '.dtx-submit-btn{width:100%;padding:12px;border:none;border-radius:10px;background:#2563eb;color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s;margin-top:4px}',
      '.dtx-submit-btn:hover{background:#1d4ed8}',
      '.dtx-submit-btn:disabled{background:#cbd5e1;cursor:not-allowed}',
      '.dtx-cancel-btn{width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;color:#6b7280;font-size:14px;cursor:pointer;margin-top:8px}',
      '.dtx-month-nav{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px}',
      '.dtx-month-btn{width:36px;height:36px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#475569;transition:all .15s;flex-shrink:0}',
      '.dtx-month-btn:hover{background:#f1f5f9;border-color:#cbd5e1}',
      '.dtx-month-btn:active{transform:scale(.93)}',
      '.dtx-month-label{font-size:16px;font-weight:700;color:#1f2937;min-width:120px;text-align:center}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ==================== SVG辅助 ====================
  function svgIcon(pathD, color, sz) {
    sz = sz || 16;
    return '<svg viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'" fill="none" stroke="'+(color||'currentColor')+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="'+pathD+'"/></svg>';
  }

  // ==================== 获取某条记录的分类信息 ====================
  function getCatInfo(tx) {
    var cat = CT_MAP[tx.ctField];
    if (cat) {
      return { name: cat.name, subCategory: tx.subCategory || '', color: cat.color, icon: cat.icon, ctField: tx.ctField };
    }
    // fallback
    var isExp = tx.type === 'expense';
    return {
      name: isExp ? '个人消费' : '职业收入',
      subCategory: tx.subCategory || '',
      color: isExp ? '#f97316' : '#22c55e',
      icon: isExp ? EXPENSE_CATEGORIES[0].icon : INCOME_CATEGORIES[0].icon,
      ctField: isExp ? 'expensePersonal' : 'jobIncome'
    };
  }

  // ==================== 渲染主函数 ====================
  function render(root, viewMonth) {
    var now = new Date();
    if (!viewMonth) {
      viewMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    }
    var txList = loadTx();
    var monthTx = txList.filter(function(t) { return t.date && t.date.substr(0, 7) === viewMonth; });
    monthTx.sort(function(a, b) { return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt); });

    // Compute totals
    var totalExp = 0, totalInc = 0;
    monthTx.forEach(function(t) {
      if (t.type === 'expense') totalExp += t.amount;
      else totalInc += t.amount;
    });

    // CT field subtotals
    var expTotals = {}, incTotals = {};
    EXPENSE_CATEGORIES.forEach(function(c) { expTotals[c.ctField] = 0; });
    INCOME_CATEGORIES.forEach(function(c) { incTotals[c.ctField] = 0; });
    monthTx.forEach(function(t) {
      if (t.type === 'expense' && expTotals.hasOwnProperty(t.ctField)) expTotals[t.ctField] += t.amount;
      else if (t.type === 'income' && incTotals.hasOwnProperty(t.ctField)) incTotals[t.ctField] += t.amount;
    });

    var vmParts = viewMonth.split('-');
    var vmYear = parseInt(vmParts[0]);
    var vmMonth = parseInt(vmParts[1]);
    var balance = totalInc - totalExp;

    var html = '<div class="dtx-wrap">';
    // Header
    html += '<div class="dtx-header">';
    html += '<div class="dtx-title">' + svgIcon('M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', '#2563eb') + ' 日常收支</div>';
    html += '<button class="dtx-add-btn" id="dtxAddBtn">' + svgIcon('M12 5v14M5 12h14', '#fff', 14) + ' 记一笔</button>';
    html += '</div>';

    // Month navigation
    html += '<div class="dtx-month-nav">';
    html += '<button class="dtx-month-btn" data-dir="-1">' + svgIcon('<path d="M15 18l-6-6 6-6"/>', '#374151', 18) + '</button>';
    html += '<div class="dtx-month-label">' + vmYear + '年' + vmMonth + '月</div>';
    html += '<button class="dtx-month-btn" data-dir="1">' + svgIcon('<path d="M9 18l6-6-6-6"/>', '#374151', 18) + '</button>';
    html += '</div>';

    // Summary: total cards + CT field breakdown
    html += '<div class="dtx-summary">';
    html += '<div class="dtx-sum-total">';
    html += '<div class="dtx-sum-card"><div class="dtx-sum-label">支出</div><div class="dtx-sum-val exp">-' + _fmtAmt(totalExp) + '</div></div>';
    html += '<div class="dtx-sum-card"><div class="dtx-sum-label">收入</div><div class="dtx-sum-val inc">+' + _fmtAmt(totalInc) + '</div></div>';
    html += '<div class="dtx-sum-card"><div class="dtx-sum-label">结余</div><div class="dtx-sum-val bal">' + _fmtAmt(balance) + '</div></div>';
    html += '</div>';

    // Income breakdown
    var hasInc = totalInc > 0;
    html += '<div class="dtx-sum-detail">';
    html += '<div class="dtx-sum-group">';
    html += '<div class="dtx-sum-group-title inc-title">' + svgIcon('M23 6l-9.5 9.5-5-5L1 18M17 6h6v6', '#22c55e', 13) + ' 收入构成</div>';
    INCOME_CATEGORIES.forEach(function(c) {
      var val = incTotals[c.ctField] || 0;
      var pct = hasInc ? Math.round(val / totalInc * 100) : 0;
      html += '<div class="dtx-sum-row">';
      html += '<span class="dtx-sum-row-name">' + c.name + '</span>';
      html += '<div class="dtx-sum-row-bar"><div class="dtx-sum-row-bar-fill" style="width:' + pct + '%;background:' + c.color + '"></div></div>';
      html += '<span class="dtx-sum-row-val" style="color:' + c.color + '">¥' + _fmtAmt(val) + '</span>';
      html += '</div>';
    });
    html += '</div>';

    // Expense breakdown
    var hasExp = totalExp > 0;
    html += '<div class="dtx-sum-group">';
    html += '<div class="dtx-sum-group-title">' + svgIcon('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z', '#ef4444', 13) + ' 支出构成</div>';
    EXPENSE_CATEGORIES.forEach(function(c) {
      var val = expTotals[c.ctField] || 0;
      var pct = hasExp ? Math.round(val / totalExp * 100) : 0;
      html += '<div class="dtx-sum-row">';
      html += '<span class="dtx-sum-row-name">' + c.name + '</span>';
      html += '<div class="dtx-sum-row-bar"><div class="dtx-sum-row-bar-fill" style="width:' + pct + '%;background:' + c.color + '"></div></div>';
      html += '<span class="dtx-sum-row-val" style="color:' + c.color + '">¥' + _fmtAmt(val) + '</span>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>'; // end sum-detail
    html += '</div>'; // end summary

    // Group by day
    if (monthTx.length === 0) {
      html += '<div class="dtx-empty">' + svgIcon('M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', '#d1d5db', 36) + '<br>本月暂无记录<br><span style="font-size:13px;color:#d1d5db">点击右上角"记一笔"开始记账</span></div>';
    } else {
      var groups = {};
      var dayOrder = [];
      monthTx.forEach(function(t) {
        if (!groups[t.date]) { groups[t.date] = []; dayOrder.push(t.date); }
        groups[t.date].push(t);
      });
      var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
      dayOrder.forEach(function(day) {
        var dayExp = 0, dayInc = 0;
        groups[day].forEach(function(t) {
          if (t.type === 'expense') dayExp += t.amount; else dayInc += t.amount;
        });
        var d = new Date(day + 'T00:00:00');
        var weekDay = ['日','一','二','三','四','五','六'][d.getDay()];
        var dayLabel = d.getMonth() + 1 + '/' + d.getDate() + ' 周' + weekDay;
        if (day === todayStr) dayLabel = '今天 ' + d.getDate() + '日 周' + weekDay;

        html += '<div class="dtx-day-group">';
        html += '<div class="dtx-day-header"><div class="dtx-day-label">' + dayLabel + '</div>';
        var dayParts = [];
        if (dayExp > 0) dayParts.push('支出 ¥' + _fmtAmt(dayExp));
        if (dayInc > 0) dayParts.push('收入 ¥' + _fmtAmt(dayInc));
        html += '<div class="dtx-day-total">' + dayParts.join(' · ') + '</div></div>';

        groups[day].forEach(function(t) {
          var info = getCatInfo(t);
          var bgColor = info.color + '18';
          html += '<div class="dtx-item">';
          html += '<div class="dtx-item-icon" style="background:' + bgColor + '">' + svgIcon(info.icon, info.color) + '</div>';
          html += '<div class="dtx-item-info"><div class="dtx-item-cat">' + info.name + '<span class="dtx-item-sub">' + info.subCategory + '</span></div>';
          if (t.note) html += '<div class="dtx-item-note">' + t.note + '</div>';
          html += '</div>';
          html += '<div class="dtx-item-right">';
          html += '<div class="dtx-item-amt ' + (t.type === 'expense' ? 'exp' : 'inc') + '">' + (t.type === 'expense' ? '-' : '+') + '¥' + _fmtAmt(t.amount) + '</div>';
          html += '<div class="dtx-item-del" data-txid="' + t.id + '">删除</div>';
          html += '</div>';
          html += '</div>';
        });
        html += '</div>';
      });
    }

    html += '</div>';
    root.innerHTML = html;

    // Events
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

  // ==================== 添加弹窗（两步选择） ====================
  function openAddModal(root, viewMonth) {
    var step = 'big'; // 'big' | 'sub' | 'detail'
    var selType = null; // 'expense' | 'income'
    var selCtField = '';
    var selSub = '';
    var overlay = document.createElement('div');
    overlay.className = 'dtx-modal-overlay';
    var todayStr = new Date().toISOString().substr(0, 10);

    function stepBigHtml() {
      var h = '<div class="dtx-modal">';
      h += '<div class="dtx-modal-title">记一笔</div>';
      // Expense section
      h += '<div class="dtx-big-cat-section">';
      h += '<div class="dtx-big-cat-section-label">支出</div>';
      h += '<div class="dtx-big-cat-grid">';
      EXPENSE_CATEGORIES.forEach(function(c) {
        h += '<button class="dtx-big-cat-btn" data-type="expense" data-ct="' + c.ctField + '">';
        h += svgIcon(c.icon, c.color, 20);
        h += c.name + '</button>';
      });
      h += '</div></div>';
      // Income section
      h += '<div class="dtx-big-cat-section">';
      h += '<div class="dtx-big-cat-section-label">收入</div>';
      h += '<div class="dtx-big-cat-grid">';
      INCOME_CATEGORIES.forEach(function(c) {
        h += '<button class="dtx-big-cat-btn" data-type="income" data-ct="' + c.ctField + '">';
        h += svgIcon(c.icon, c.color, 20);
        h += c.name + '</button>';
      });
      h += '</div></div>';
      h += '<button class="dtx-cancel-btn" id="dtxCancel">取消</button>';
      h += '</div>';
      return h;
    }

    function stepSubHtml() {
      var cat = CT_MAP[selCtField];
      if (!cat) return stepBigHtml();
      var h = '<div class="dtx-modal">';
      h += '<button class="dtx-back-btn" id="dtxBack">' + svgIcon('M15 18l-6-6 6-6', '#6b7280', 12) + ' 返回</button>';
      h += '<div class="dtx-modal-title" style="font-size:15px">' + svgIcon(cat.icon, cat.color, 18) + ' ' + cat.name + '</div>';
      h += '<div class="dtx-step-label">选择子类</div>';
      h += '<div class="dtx-sub-cat-grid">';
      cat.subs.forEach(function(sub) {
        var selCls = selSub === sub ? ' selected' : '';
        h += '<button class="dtx-sub-cat-btn' + selCls + '" data-sub="' + sub + '">' + sub + '</button>';
      });
      h += '</div>';
      h += '<div class="dtx-input-row"><label>金额（元）</label><input type="number" id="dtxAmount" placeholder="0.00" min="0" step="0.01" inputmode="decimal"></div>';
      h += '<div class="dtx-input-row"><label>日期</label><input type="date" id="dtxDate" value="' + todayStr + '"></div>';
      h += '<div class="dtx-input-row"><label>备注</label><textarea id="dtxNote" placeholder="可选，如：午餐、打车"></textarea></div>';
      h += '<button class="dtx-submit-btn" id="dtxSubmit" disabled>保存</button>';
      h += '<button class="dtx-cancel-btn" id="dtxCancel">取消</button>';
      h += '</div>';
      return h;
    }

    function renderModal() {
      if (step === 'big') {
        overlay.innerHTML = stepBigHtml();
      } else {
        overlay.innerHTML = stepSubHtml();
      }
      bindModalEvents();
    }

    function bindModalEvents() {
      // Big cat buttons
      overlay.querySelectorAll('.dtx-big-cat-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          selType = this.getAttribute('data-type');
          selCtField = this.getAttribute('data-ct');
          selSub = '';
          step = 'sub';
          renderModal();
        });
      });
      // Back button
      var backBtn = overlay.querySelector('#dtxBack');
      if (backBtn) {
        backBtn.addEventListener('click', function() {
          step = 'big';
          selCtField = '';
          selSub = '';
          renderModal();
        });
      }
      // Sub category buttons
      overlay.querySelectorAll('.dtx-sub-cat-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          overlay.querySelectorAll('.dtx-sub-cat-btn').forEach(function(b) { b.classList.remove('selected'); });
          this.classList.add('selected');
          selSub = this.getAttribute('data-sub');
          checkSubmit();
        });
      });
      // Amount input - enable submit when has value
      var amtInput = overlay.querySelector('#dtxAmount');
      if (amtInput) {
        amtInput.addEventListener('input', checkSubmit);
        amtInput.addEventListener('focus', function() { if (this.value === '0') this.value = ''; });
      }
      // Submit
      var submitBtn = overlay.querySelector('#dtxSubmit');
      if (submitBtn) {
        submitBtn.addEventListener('click', function() {
          var amt = parseFloat(amtInput.value);
          if (!amt || amt <= 0) { alert('请输入金额'); return; }
          var dateInput = overlay.querySelector('#dtxDate');
          var noteInput = overlay.querySelector('#dtxNote');
          addTx({
            type: selType,
            amount: amt,
            ctField: selCtField,
            subCategory: selSub,
            note: noteInput ? noteInput.value.trim() : '',
            date: dateInput.value || todayStr
          });
          overlay.remove();
          render(root, viewMonth);
        });
      }
      // Cancel
      overlay.querySelectorAll('#dtxCancel').forEach(function(btn) {
        btn.addEventListener('click', function() { overlay.remove(); });
      });
      // Click outside
      overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    }

    function checkSubmit() {
      var submitBtn = overlay.querySelector('#dtxSubmit');
      var amtInput = overlay.querySelector('#dtxAmount');
      if (submitBtn && amtInput) {
        var amt = parseFloat(amtInput.value);
        submitBtn.disabled = !(selSub && amt > 0);
      }
    }

    renderModal();
    document.body.appendChild(overlay);
    // Auto focus amount after selecting sub
    setTimeout(function() {
      var amtInput = overlay.querySelector('#dtxAmount');
      if (amtInput && step === 'sub') amtInput.focus();
    }, 100);
  }

  // ==================== getDailyTxSummary ====================
  function getDailyTxSummary() {
    var now = new Date();
    var month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var txList = loadTx();
    var monthTx = txList.filter(function(t) { return t.date && t.date.substr(0, 7) === month; });

    var income = {};
    INCOME_CATEGORIES.forEach(function(c) { income[c.ctField] = 0; });
    var expense = {};
    EXPENSE_CATEGORIES.forEach(function(c) { expense[c.ctField] = 0; });

    monthTx.forEach(function(t) {
      if (t.type === 'expense' && expense.hasOwnProperty(t.ctField)) {
        expense[t.ctField] += t.amount;
      } else if (t.type === 'income' && income.hasOwnProperty(t.ctField)) {
        income[t.ctField] += t.amount;
      }
    });

    var totalIncome = 0, totalExpense = 0;
    INCOME_CATEGORIES.forEach(function(c) { totalIncome += income[c.ctField]; });
    EXPENSE_CATEGORIES.forEach(function(c) { totalExpense += expense[c.ctField]; });

    return {
      month: month,
      income: income,
      expense: expense,
      totalIncome: totalIncome,
      totalExpense: totalExpense,
      balance: totalIncome - totalExpense
    };
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
    // Support both old format (category) and new format (ctField)
    if (!tx.ctField && tx.category) {
      var mapping = OLD_CATEGORY_MAP[tx.category];
      if (mapping) {
        tx.ctField = mapping.ctField;
        tx.subCategory = tx.subCategory || mapping.sub;
      } else {
        tx.ctField = tx.type === 'income' ? 'jobIncome' : 'expensePersonal';
        tx.subCategory = tx.subCategory || '其他';
      }
    }
    if (!tx.ctField) {
      tx.ctField = tx.type === 'income' ? 'jobIncome' : 'expensePersonal';
    }
    if (!tx.subCategory) tx.subCategory = '';
    addTx(tx);
  };

  window.getDailyTxSummary = getDailyTxSummary;

})();
