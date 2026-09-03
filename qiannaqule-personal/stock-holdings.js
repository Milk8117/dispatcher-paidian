/**
 * stock-holdings.js - MiRun AI 财富域 · 投资持仓模块 (v1.0.0)
 *
 * 功能：
 *   - 持仓总览（标的数量、总市值、总浮盈亏、浮盈%、可用资金）
 *   - 持仓明细表（增删改查）
 *   - 操作计划列表（关联持仓，优先级/方向/触发条件/状态/备注）
 *   - 数据本地 IndexedDB 存储
 *
 * 入口：window.StockHoldings.render(containerId)
 * 对外：window.StockHoldings
 *
 * 表结构：
 *   stock_holdings: [{ id, name, code, quantity, cost_price, current_price, status, note, created_at, updated_at }]
 *   stock_plans:    [{ id, holding_id, priority, direction, trigger_condition, status, note, created_at, updated_at }]
 */
(function() {
  'use strict';

  // ==================== 注册 DataStore 模块 ====================
  if (window.DataStore && DataStore.registerModule) {
    DataStore.registerModule('stock_holdings', {
      holdings: 'mijieai_stock_holdings',
      cash: 'mijieai_stock_cash'
    }, { engine: 'indexeddb' });

    DataStore.registerModule('stock_plans', {
      plans: 'mijieai_stock_plans'
    }, { engine: 'indexeddb' });
  }

  var HOLDINGS_MODULE = 'stock_holdings';
  var HOLDINGS_FIELD = 'holdings';
  var CASH_FIELD = 'cash';
  var PLANS_MODULE = 'stock_plans';
  var PLANS_FIELD = 'plans';

  // ==================== 实时行情状态 (v52.6.0) ====================
  var QUOTE_API = 'https://push2.eastmoney.com/api/qt/ulist.np/get?secids=SECIDS&fields=f2,f3,f12,f13,f14,f18&fltt=2';
  var AUTO_QUOTE_INTERVAL = 16000;     // 自动拉取节流：16s 内不重复发起
  var MANUAL_OVERRIDE_WINDOW = 60000;  // 手动改价保护窗口：60s
  var lastAutoQuoteTs = 0;             // 上次自动拉取时间戳
  var manualOverride = {};             // { holdingId: 时间戳 } 手动改价记录
  var quoteStatus = 'idle';            // idle | loading | updated | error
  var quoteLastTs = null;              // 上次成功更新时间


  // 状态标签预设（用户可自定义或选预设）
  var DEFAULT_STATUS_OPTIONS = [
    '盈利持有',
    '做T重点',
    '深套中',
    '深度套牢',
    '观察仓',
    '建仓中',
    '待加仓',
    '减仓中'
  ];

  // ==================== 工具函数 ====================
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function fmtMoney(v) {
    var n = parseFloat(v) || 0;
    return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtPct(v) {
    var n = parseFloat(v) || 0;
    return (n * 100).toFixed(2) + '%';
  }

  function fmtNum(v, digits) {
    if (digits === undefined) digits = 2;
    var n = parseFloat(v) || 0;
    return n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ==================== 数据操作 ====================
  function loadHoldings() {
    try {
      return DataStore.load(HOLDINGS_MODULE, HOLDINGS_FIELD, []) || [];
    } catch(e) { return []; }
  }
  function saveHoldings(list) {
    DataStore.save(HOLDINGS_MODULE, HOLDINGS_FIELD, list);
  }
  function loadCash() {
    try {
      return parseFloat(DataStore.load(HOLDINGS_MODULE, CASH_FIELD, 0)) || 0;
    } catch(e) { return 0; }
  }
  function _saveCashToStore(val) {
    DataStore.save(HOLDINGS_MODULE, CASH_FIELD, parseFloat(val) || 0);
    // 关键数据立即强制落盘，防止刷新丢失
    if (DataStore.flush) DataStore.flush();
  }

  function loadPlans() {
    try {
      return DataStore.load(PLANS_MODULE, PLANS_FIELD, []) || [];
    } catch(e) { return []; }
  }
  function savePlans(list) {
    DataStore.save(PLANS_MODULE, PLANS_FIELD, list);
  }

  function addHolding(h) {
    var list = loadHoldings();
    h.id = genId();
    h.created_at = nowIso();
    h.updated_at = nowIso();
    list.push(h);
    saveHoldings(list);
    return h;
  }

  function updateHolding(id, patch) {
    var list = loadHoldings();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return null;
    for (var k in patch) {
      if (patch.hasOwnProperty(k)) list[idx][k] = patch[k];
    }
    list[idx].updated_at = nowIso();
    saveHoldings(list);
    return list[idx];
  }

  function deleteHolding(id) {
    var list = loadHoldings().filter(function(h) { return h.id !== id; });
    saveHoldings(list);
    // 级联删除关联计划
    var plans = loadPlans().filter(function(p) { return p.holding_id !== id; });
    savePlans(plans);
  }

  function getHolding(id) {
    var list = loadHoldings();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function addPlan(p) {
    var list = loadPlans();
    p.id = genId();
    p.created_at = nowIso();
    p.updated_at = nowIso();
    list.push(p);
    savePlans(list);
    return p;
  }

  function updatePlan(id, patch) {
    var list = loadPlans();
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return null;
    for (var k in patch) {
      if (patch.hasOwnProperty(k)) list[idx][k] = patch[k];
    }
    list[idx].updated_at = nowIso();
    savePlans(list);
    return list[idx];
  }

  function deletePlan(id) {
    var list = loadPlans().filter(function(p) { return p.id !== id; });
    savePlans(list);
  }

  function getPlansForHolding(holdingId) {
    return loadPlans().filter(function(p) { return p.holding_id === holdingId; });
  }

  // ==================== 计算 ====================
  function calcSummary() {
    var list = loadHoldings();
    var totalCost = 0;
    var totalValue = 0;
    list.forEach(function(h) {
      var qty = parseFloat(h.quantity) || 0;
      var cost = parseFloat(h.cost_price) || 0;
      var curr = parseFloat(h.current_price) || 0;
      totalCost += qty * cost;
      totalValue += qty * curr;
    });
    var totalPnl = totalValue - totalCost;
    var pnlPct = totalCost > 0 ? totalPnl / totalCost : 0;
    var cash = loadCash();
    return {
      count: list.length,
      totalCost: totalCost,
      totalValue: totalValue,
      totalPnl: totalPnl,
      pnlPct: pnlPct,
      cash: cash
    };
  }

  function calcHoldingPnl(h) {
    var qty = parseFloat(h.quantity) || 0;
    var cost = parseFloat(h.cost_price) || 0;
    var curr = parseFloat(h.current_price) || 0;
    var pnl = (curr - cost) * qty;
    var pct = cost > 0 ? (curr - cost) / cost : 0;
    return { pnl: pnl, pct: pct, value: qty * curr, cost: qty * cost };
  }

  // ==================== 实时行情 (v52.6.0) ====================
  // 现价自动调取东财实时行情：render/切换持仓明细子Tab时自动批量拉取；
  // 手动刷新忽略节流；最近60s内被手动改价的持仓不覆盖；失败保底显示上次价格。
  function toSecid(code) {
    var digits = String(code || '').replace(/\D/g, '');
    if (!digits) return null;
    // 6 开头→沪市(1.)；0/3/4/8 开头→深市/北交所(0.)
    return (digits.charAt(0) === '6' ? '1.' : '0.') + digits;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtClock(d) {
    if (!d || isNaN(d.getTime())) return '';
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }

  // 实时数据状态行 HTML
  function quoteStatusRowHtml() {
    var txt, color;
    if (quoteStatus === 'loading') {
      txt = '行情获取中…'; color = '#2563eb';
    } else if (quoteStatus === 'updated') {
      txt = '实时行情 · 已更新 ' + fmtClock(quoteLastTs); color = '#16a34a';
    } else if (quoteStatus === 'error') {
      txt = '行情获取失败 · 显示上次价格'; color = '#dc2626';
    } else {
      txt = '现价已连接实时行情'; color = '#94a3b8';
    }
    return '<div class="sh-quote-status" id="shQuoteStatus">' +
      '<span class="sh-quote-status-txt" style="color:' + color + '">' +
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><polyline points="21 3 21 8 16 8"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><polyline points="8 21 3 21 3 16"/></svg>' +
        txt +
      '</span>' +
      '<button class="sh-quote-refresh" onclick="StockHoldings.refreshQuotes()" title="手动刷新实时行情">' +
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>' +
        '<span>刷新</span>' +
      '</button>' +
    '</div>';
  }

  function setQuoteStatus(mode) {
    quoteStatus = mode;
    var el = document.getElementById('shQuoteStatus');
    if (el) el.outerHTML = quoteStatusRowHtml();
  }

  function autoFetchQuotes() {
    fetchRealtimeQuotes(false);
  }

  function fetchRealtimeQuotes(force) {
    var list = loadHoldings();
    if (!list.length) { setQuoteStatus('idle'); return; }
    var now = Date.now();
    // 节流：自动拉取 16s 内不重复发起；手动刷新(force)忽略节流
    if (!force && now - lastAutoQuoteTs < AUTO_QUOTE_INTERVAL) return;
    lastAutoQuoteTs = now;

    // 组装 secids，跳过最近 60s 内被手动改价的持仓
    var secids = [];
    var skipSet = {};
    list.forEach(function(h) {
      if (!h || !h.code) return;
      var mTs = manualOverride[h.id];
      if (mTs && (now - mTs) < MANUAL_OVERRIDE_WINDOW) { skipSet[h.id] = true; return; }
      var sid = toSecid(h.code);
      if (sid) secids.push(sid);
    });

    if (!secids.length) {
      quoteLastTs = new Date();
      setQuoteStatus('updated');
      return;
    }

    setQuoteStatus('loading');
    var url = QUOTE_API.replace('SECIDS', secids.join(','));
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 10000;
    xhr.onload = function() {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          var res = typeof xhr.response === 'string' ? JSON.parse(xhr.response) : xhr.response;
          applyQuotes((res && res.data && res.data.diff) || [], skipSet);
        } else {
          setQuoteStatus('error');
        }
      } catch(e) {
        setQuoteStatus('error');
      }
    };
    xhr.onerror = function() { setQuoteStatus('error'); };
    xhr.ontimeout = function() { setQuoteStatus('error'); };
    xhr.send();
  }

  function flatEq(a, b) {
    return Math.abs((parseFloat(a) || 0) - (parseFloat(b) || 0)) < 0.0001;
  }

  function applyQuotes(diff, skipSet) {
    if (!diff || !diff.length) { setQuoteStatus('error'); return; }
    var priceBySecid = {};
    diff.forEach(function(d) {
      var market = (d.f13 === 1) ? '1' : '0';
      priceBySecid[market + '.' + d.f12] = d;
    });
    var list = loadHoldings();
    var changed = false;
    list.forEach(function(h) {
      if (!h || !h.code || skipSet[h.id]) return;
      var sid = toSecid(h.code);
      var d = priceBySecid[sid];
      // 接口无该只数据（含北交所段异常）或现价异常 → 跳过，保底显示上次价格
      if (!d || d.f2 === undefined || d.f2 === null || d.f2 === '-') return;
      var price = parseFloat(d.f2);
      if (isNaN(price) || price <= 0) return;
      if (flatEq(h.current_price, price)) return;
      h.current_price = price;
      h.updated_at = nowIso();
      changed = true;
    });
    if (changed) {
      saveHoldings(list);
      refreshOverview();
      refreshHoldingsPnl();
      renderTopHoldings();
    }
    quoteLastTs = new Date();
    setQuoteStatus('updated');
  }

  // ==================== 样式注入 ====================
  var stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var s = document.createElement('style');
    s.textContent = [
      '.sh-wrap{padding:16px;max-width:680px;margin:0 auto}',
      '.sh-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}',
      '.sh-title{font-size:18px;font-weight:700;color:#1f2937;display:flex;align-items:center;gap:8px}',
      '.sh-icon{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#2563eb,#1d4ed8);display:flex;align-items:center;justify-content:center}',
      '.sh-add-btn{display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:20px;border:none;background:#2563eb;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;box-shadow:0 2px 6px rgba(37,99,235,.3)}',
      '.sh-add-btn:hover{background:#1d4ed8;transform:translateY(-1px)}',

      // 总览卡片
      '.sh-overview-card{background:linear-gradient(135deg,#1e40af 0%,#2563eb 100%);border-radius:16px;padding:20px 18px;color:#fff;margin-bottom:18px;box-shadow:0 4px 12px rgba(37,99,235,.25)}',
      '.sh-overview-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}',
      '.sh-overview-label{font-size:13px;opacity:.85;margin-bottom:6px}',
      '.sh-overview-value{font-size:28px;font-weight:700;letter-spacing:.5px}',
      '.sh-overview-count{background:rgba(255,255,255,.2);padding:4px 10px;border-radius:12px;font-size:12px;font-weight:500}',
      '.sh-overview-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}',
      '.sh-overview-stat{background:rgba(255,255,255,.12);border-radius:10px;padding:10px;text-align:center}',
      '.sh-stat-label{font-size:11px;opacity:.85;margin-bottom:4px}',
      '.sh-stat-value{font-size:15px;font-weight:700}',
      '.sh-stat-value.profit{color:#fca5a5}',
      '.sh-stat-value.loss{color:#86efac}',
      '.sh-cash-row{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.2)}',
      '.sh-cash-label{font-size:13px;opacity:.85;display:flex;align-items:center;gap:6px}',
      '.sh-cash-value{font-size:16px;font-weight:700}',
      '.sh-cash-edit{font-size:12px;background:rgba(255,255,255,.2);padding:4px 10px;border-radius:8px;cursor:pointer;opacity:.9}',
      '.sh-cash-edit:hover{opacity:1}',

      // 分段标题
      '.sh-section-title{display:flex;align-items:center;justify-content:space-between;margin:20px 0 10px}',
      '.sh-section-title-text{font-size:15px;font-weight:700;color:#1f2937;display:flex;align-items:center;gap:6px}',
      '.sh-section-title-text .dot{width:5px;height:16px;background:#2563eb;border-radius:3px;display:inline-block}',

      // 表格
      '.sh-table-wrap{background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow-x:auto;margin-bottom:8px;position:relative;-webkit-overflow-scrolling:touch}',
      '.sh-table{width:100%;border-collapse:collapse;font-size:13px}',
      '.sh-table th{background:#f8fafc;color:#6b7280;font-weight:600;font-size:12px;padding:10px 8px;text-align:right;border-bottom:1px solid #e5e7eb;white-space:nowrap}',
      '.sh-table th:first-child{text-align:left;padding-left:12px}',
      '.sh-table th.sh-th-name{text-align:left}',
      '.sh-table td{padding:12px 8px;text-align:right;border-bottom:1px solid #f3f4f6;vertical-align:middle}',
      '.sh-table td:first-child{text-align:left;padding-left:12px}',
      '.sh-table tr:last-child td{border-bottom:none}',
      '.sh-table tr:hover{background:#f9fafb}',
      '.sh-name-cell{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.sh-name-main{font-size:14px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.sh-name-code{font-size:11px;color:#9ca3af}',
      '.sh-status-tag{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500;white-space:nowrap}',
      '.sh-status-tag.profit{background:#fef2f2;color:#dc2626}',
      '.sh-status-tag.t-target{background:#fef3c7;color:#b45309}',
      '.sh-status-tag.deep-trap{background:#fee2e2;color:#b91c1c}',
      '.sh-status-tag.deep-trap-heavy{background:#7f1d1d;color:#fecaca}',
      '.sh-status-tag.watch{background:#eff6ff;color:#2563eb}',
      '.sh-status-tag.building{background:#f0fdf4;color:#16a34a}',
      '.sh-status-tag.default{background:#f3f4f6;color:#6b7280}',
      '.sh-pnl{font-weight:700}',
      '.sh-pnl.up{color:#dc2626}',   /* A股：涨红跌绿 */
      '.sh-pnl.down{color:#16a34a}',
      '.sh-action-btn{font-size:12px;padding:3px 8px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;cursor:pointer;transition:all .15s;margin-left:4px}',
      '.sh-action-btn:hover{border-color:#2563eb;color:#2563eb}',
      '.sh-action-btn.danger:hover{border-color:#ef4444;color:#ef4444}',
      '.sh-th-ops,.sh-td-ops{min-width:80px;white-space:nowrap}',
      '.sh-ops{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}',
      '.sh-ops .sh-action-btn{margin-left:0;white-space:nowrap}',

      // 空状态
      '.sh-empty{text-align:center;padding:40px 16px;color:#9ca3af;font-size:14px}',
      '.sh-empty-icon{font-size:40px;margin-bottom:10px;opacity:.5}',

      // 弹窗
      '.sh-modal-mask{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:9998;display:flex;align-items:center;justify-content:center;padding:16px}',
      '.sh-modal{background:#fff;border-radius:16px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)}',
      '.sh-modal-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #f3f4f6;position:sticky;top:0;background:#fff;z-index:1}',
      '.sh-modal-title{font-size:17px;font-weight:700;color:#1f2937}',
      '.sh-modal-close{font-size:22px;color:#9ca3af;cursor:pointer;line-height:1;padding:2px 6px}',
      '.sh-modal-close:hover{color:#1f2937}',
      '.sh-modal-body{padding:20px}',
      '.sh-modal-footer{padding:16px 20px;border-top:1px solid #f3f4f6;display:flex;gap:10px;position:sticky;bottom:0;background:#fff;z-index:1}',
      '.sh-form-group{margin-bottom:16px}',
      '.sh-form-group:last-child{margin-bottom:0}',
      '.sh-form-label{font-size:13px;color:#374151;font-weight:500;margin-bottom:6px;display:block}',
      '.sh-form-input{width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:16px;color:#1f2937;box-sizing:border-box;transition:border-color .2s;outline:none;background:#fff;-webkit-appearance:none;appearance:none}',
      '.sh-form-input:focus{border-color:#2563eb}',
      '.sh-form-row{display:flex;gap:10px}',
      '.sh-form-row .sh-form-group{flex:1}',
      '.sh-form-textarea{width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:16px;color:#1f2937;box-sizing:border-box;resize:vertical;min-height:60px;font-family:inherit;outline:none;transition:border-color .2s}',
      '.sh-form-textarea:focus{border-color:#2563eb}',
      '.sh-form-select{width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:16px;color:#1f2937;box-sizing:border-box;background:#fff;outline:none;appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 12px center}',
      '.sh-btn{flex:1;padding:12px;border-radius:10px;border:none;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;text-align:center}',
      '.sh-btn-primary{background:#2563eb;color:#fff}',
      '.sh-btn-primary:hover{background:#1d4ed8}',
      '.sh-btn-secondary{background:#f3f4f6;color:#374151}',
      '.sh-btn-secondary:hover{background:#e5e7eb}',
      '.sh-btn-danger{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}',
      '.sh-btn-danger:hover{background:#fee2e2}',

      // 计划列表
      '.sh-plan-card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:10px}',
      '.sh-plan-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}',
      '.sh-plan-h-left{display:flex;align-items:center;gap:8px;min-width:0}',
      '.sh-plan-h-title{font-size:14px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.sh-plan-priority{font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;flex-shrink:0}',
      '.sh-plan-priority.high{background:#fef2f2;color:#dc2626}',
      '.sh-plan-priority.mid{background:#fef3c7;color:#b45309}',
      '.sh-plan-priority.low{background:#eff6ff;color:#2563eb}',
      '.sh-plan-direction{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:500;flex-shrink:0}',
      '.sh-plan-direction.buy{background:#fef2f2;color:#dc2626}',
      '.sh-plan-direction.sell{background:#f0fdf4;color:#16a34a}',
      '.sh-plan-direction.watch{background:#f3f4f6;color:#6b7280}',
      '.sh-plan-trigger{font-size:13px;color:#374151;margin-bottom:8px;line-height:1.5}',
      '.sh-plan-meta{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#6b7280}',
      '.sh-plan-status{display:inline-flex;align-items:center;gap:4px}',
      '.sh-plan-status-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}',
      '.sh-plan-status-dot.pending{background:#f59e0b}',
      '.sh-plan-status-dot.progress{background:#3b82f6}',
      '.sh-plan-status-dot.done{background:#10b981}',
      '.sh-plan-actions{display:flex;gap:6px}',
      '.sh-plan-btn{font-size:12px;padding:3px 8px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;cursor:pointer;transition:all .15s}',
      '.sh-plan-btn:hover{border-color:#2563eb;color:#2563eb}',
      '.sh-plan-btn.danger:hover{border-color:#ef4444;color:#ef4444}',

      // 持仓计划分组标题
      '.sh-plan-group{margin-bottom:14px}',
      '.sh-plan-group-title{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8fafc;border-radius:10px 10px 0 0;border:1px solid #e5e7eb;border-bottom:none;cursor:pointer}',
      '.sh-plan-group-title:hover{background:#f1f5f9}',
      '.sh-plan-group-hl{display:flex;align-items:center;gap:8px;min-width:0}',
      '.sh-plan-group-name{font-size:14px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.sh-plan-group-count{font-size:11px;background:#e0e7ff;color:#4338ca;padding:1px 8px;border-radius:10px;font-weight:500}',
      '.sh-plan-group-arrow{font-size:12px;color:#9ca3af;transition:transform .2s}',
      '.sh-plan-group.collapsed .sh-plan-group-arrow{transform:rotate(-90deg)}',
      '.sh-plan-group.collapsed .sh-plan-list{display:none}',
      '.sh-plan-list{border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;padding:10px 12px;background:#fff}',

      // 子Tab切换（持仓/计划）
      '.sh-sub-tabs{display:flex;gap:4px;background:#f1f5f9;padding:4px;border-radius:12px;margin-bottom:16px}',
      '.sh-sub-tab{flex:1;padding:9px;text-align:center;font-size:14px;font-weight:600;color:#64748b;border-radius:9px;cursor:pointer;transition:all .2s}',
      '.sh-sub-tab.active{background:#fff;color:#2563eb;box-shadow:0 1px 3px rgba(0,0,0,.08)}',

      // 实时数据状态行 (v52.6.0)
      '.sh-quote-status{display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;margin-bottom:8px;font-size:12px}',
      '.sh-quote-status-txt{display:inline-flex;align-items:center;gap:5px;font-weight:500}',
      '.sh-quote-refresh{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;border:1px solid #dbe3ec;background:#fff;color:#475569;font-size:12px;cursor:pointer;transition:all .15s}',
      '.sh-quote-refresh:hover{border-color:#2563eb;color:#2563eb}',

      // 快速编辑价格
      '.sh-price-edit{display:inline-flex;align-items:center;gap:4px}',
      '.sh-price-input{width:78px;padding:5px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:16px;text-align:right;color:#1f2937;outline:none;-webkit-appearance:none;appearance:none}',
      '.sh-price-input:focus{border-color:#2563eb}',

      // 移动端适配
      '@media(max-width:480px){',
      '  .sh-overview-value{font-size:22px}',
      '  .sh-stat-value{font-size:13px}',
      '  .sh-table th,.sh-table td{padding:10px 6px;font-size:12px}',
      '  .sh-name-main{font-size:13px}',
      '  .sh-form-input,.sh-form-select,.sh-form-textarea{font-size:16px}',
      '  .sh-ops{flex-direction:column;align-items:stretch;gap:6px}',
      '  .sh-ops .sh-action-btn{width:100%;text-align:center;padding:6px 10px}',
      '  .sh-th-ops{min-width:70px}',
      '}',
      // ====== 持仓建议 (v52.7.0) ======
      '.sh-advice-conclusion{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:12px;padding:14px;margin-bottom:12px}',
      '.sh-advice-c-head{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#1e3a8a;margin-bottom:8px}',
      '.sh-advice-c-head .dot{width:5px;height:14px;background:#2563eb;border-radius:3px;display:inline-block}',
      '.sh-advice-c-text{font-size:13px;color:#334155;line-height:1.7}',
      '.sh-advice-sec-title{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:700;color:#1f2937;margin:16px 0 8px}',
      '.sh-advice-sec-title .dot{width:5px;height:14px;background:#2563eb;border-radius:3px;display:inline-block}',
      '.sh-advice-act-wrap{display:flex;flex-direction:column;gap:8px;margin-bottom:4px}',
      '.sh-advice-act{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.sh-advice-act-name{font-size:14px;font-weight:600;color:#1f2937;min-width:0}',
      '.sh-advice-act-dir{font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;flex-shrink:0}',
      '.sh-advice-act-dir.buy{background:#fef2f2;color:#dc2626}',
      '.sh-advice-act-dir.sell{background:#f0fdf4;color:#16a34a}',
      '.sh-advice-act-dir.hold{background:#eff6ff;color:#2563eb}',
      '.sh-advice-act-reason{font-size:12px;color:#64748b;flex:1;min-width:60%;line-height:1.5}',
      '.sh-advice-risk-wrap{display:flex;flex-direction:column;gap:6px}',
      '.sh-advice-risk{font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;line-height:1.6}',
      '.sh-advice-disclaim{font-size:11px;color:#94a3b8;text-align:center;margin-top:14px;line-height:1.6}',
      '.sh-advice-loading{display:flex;flex-direction:column;align-items:center;gap:10px;padding:34px 16px;color:#64748b;font-size:13px}',
      '.sh-advice-loading-icon{color:#2563eb}',
      '.sh-advice-loading-icon svg{animation:shAdviceSpin 1s linear infinite}',
      '@keyframes shAdviceSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}'
    ].join('');
    document.head.appendChild(s);
  }

  // ==================== 状态标签样式映射 ====================
  function getStatusClass(status) {
    if (!status) return 'default';
    var s = status;
    if (s.indexOf('盈利') >= 0) return 'profit';
    if (s.indexOf('做T') >= 0) return 't-target';
    if (s.indexOf('深度套牢') >= 0) return 'deep-trap-heavy';
    if (s.indexOf('深套') >= 0) return 'deep-trap';
    if (s.indexOf('观察') >= 0) return 'watch';
    if (s.indexOf('建仓') >= 0 || s.indexOf('加仓') >= 0) return 'building';
    return 'default';
  }

  // ==================== 主渲染 ====================
  var currentSub = 'holdings'; // 'holdings' | 'advice'
  var container = null;

  function render(containerId) {
    injectStyles();
    container = document.getElementById(containerId);
    if (!container) return;
    renderAll();
  }

  function renderAll() {
    if (!container) return;
    container.innerHTML = '';

    // 顶部标题栏
    var header = document.createElement('div');
    header.className = 'sh-header';
    header.innerHTML =
      '<div class="sh-title">' +
      '<span class="sh-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg></span>' +
      '投资持仓</div>' +
      '<button class="sh-add-btn" onclick="StockHoldings.openHoldingModal()">' +
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
      '添加持仓</button>';
    container.appendChild(header);

    // 总览卡片
    renderOverview();

    // 子Tab切换
    var subTabs = document.createElement('div');
    subTabs.className = 'sh-sub-tabs';
    subTabs.innerHTML =
      '<div class="sh-sub-tab' + (currentSub === 'holdings' ? ' active' : '') + '" onclick="StockHoldings.switchSub(\'holdings\')">持仓明细</div>' +
      '<div class="sh-sub-tab' + (currentSub === 'advice' ? ' active' : '') + '" onclick="StockHoldings.switchSub(\'advice\')">持仓建议</div>';
    container.appendChild(subTabs);

    // 内容区
    var content = document.createElement('div');
    content.id = 'shContent';
    container.appendChild(content);

    renderSubContent();
    renderTopHoldings();
  }

  function switchSub(sub) {
    currentSub = sub;
    var tabs = container.querySelectorAll('.sh-sub-tab');
    tabs.forEach(function(t, i) {
      t.classList.toggle('active', (i === 0 && sub === 'holdings') || (i === 1 && sub === 'advice'));
    });
    renderSubContent();
  }

  function renderSubContent() {
    var content = document.getElementById('shContent');
    if (!content) return;
    content.innerHTML = '';
    if (currentSub === 'holdings') {
      renderHoldingsTable(content);
    } else {
      renderAdvice(content);
    }
  }

  // ==================== 总览卡片 ====================
  function renderOverview() {
    var s = calcSummary();
    var pnlClass = s.totalPnl >= 0 ? 'profit' : 'loss';
    var pnlSign = s.totalPnl >= 0 ? '+' : '';
    var pctSign = s.pnlPct >= 0 ? '+' : '';

    var card = document.createElement('div');
    card.className = 'sh-overview-card';
    card.innerHTML =
      '<div class="sh-overview-top">' +
        '<div>' +
          '<div class="sh-overview-label">持仓总市值</div>' +
          '<div class="sh-overview-value">' + fmtMoney(s.totalValue) + '</div>' +
        '</div>' +
        '<div class="sh-overview-count">' + s.count + ' 只标的</div>' +
      '</div>' +
      '<div class="sh-overview-stats">' +
        '<div class="sh-overview-stat">' +
          '<div class="sh-stat-label">总浮盈亏</div>' +
          '<div class="sh-stat-value ' + pnlClass + '">' + pnlSign + fmtMoney(s.totalPnl) + '</div>' +
        '</div>' +
        '<div class="sh-overview-stat">' +
          '<div class="sh-stat-label">盈亏比例</div>' +
          '<div class="sh-stat-value ' + pnlClass + '">' + pctSign + fmtPct(s.pnlPct) + '</div>' +
        '</div>' +
        '<div class="sh-overview-stat">' +
          '<div class="sh-stat-label">总成本</div>' +
          '<div class="sh-stat-value">' + fmtMoney(s.totalCost) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="sh-cash-row">' +
        '<div class="sh-cash-label">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>' +
          '可用资金（弹药）' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<span class="sh-cash-value">' + fmtMoney(s.cash) + '</span>' +
          '<span class="sh-cash-edit" onclick="StockHoldings.openCashModal()">修改</span>' +
        '</div>' +
      '</div>';
    container.insertBefore(card, container.querySelector('.sh-sub-tabs'));
  }

  // ==================== 持仓明细表 ====================
  function renderHoldingsTable(parent) {
    var sectionTitle = document.createElement('div');
    sectionTitle.className = 'sh-section-title';
    sectionTitle.innerHTML =
      '<div class="sh-section-title-text"><span class="dot"></span>持仓明细</div>' +
      '<div style="font-size:12px;color:#9ca3af;">点击现价可快速编辑</div>';
    parent.appendChild(sectionTitle);

    var list = loadHoldings();
    if (list.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'sh-empty';
      empty.innerHTML =
        '<div class="sh-empty-icon">📊</div>' +
        '<div>暂无持仓记录</div>' +
        '<div style="font-size:12px;margin-top:6px;">点击右上角「添加持仓」开始记录</div>';
      parent.appendChild(empty);
      return;
    }

    // 实时数据状态行
    parent.appendChild((function() {
      var tmp = document.createElement('div');
      tmp.innerHTML = quoteStatusRowHtml();
      return tmp.firstChild;
    })());

    var wrap = document.createElement('div');
    wrap.className = 'sh-table-wrap';

    var html = '<table class="sh-table">';
    html += '<thead><tr>';
    html += '<th class="sh-th-name">标的</th>';
    html += '<th>持仓</th>';
    html += '<th>成本价</th>';
    html += '<th>现价</th>';
    html += '<th>浮盈亏</th>';
    html += '<th>盈亏%</th>';
    html += '<th class="sh-th-ops">操作</th>';
    html += '</tr></thead><tbody>';

    list.forEach(function(h) {
      var calc = calcHoldingPnl(h);
      var pnlClass = calc.pnl >= 0 ? 'up' : 'down';
      var pnlSign = calc.pnl >= 0 ? '+' : '';
      var pctSign = calc.pct >= 0 ? '+' : '';
      var statusCls = getStatusClass(h.status);

      html += '<tr data-id="' + h.id + '">';
      html += '<td class="sh-th-name">';
      html +=   '<div class="sh-name-cell">';
      html +=     '<span class="sh-name-main">' + escapeHtml(h.name) + '</span>';
      html +=     '<span class="sh-name-code">' + escapeHtml(h.code || '') + '</span>';
      if (h.status) {
        html +=     '<span class="sh-status-tag ' + statusCls + '" style="margin-top:4px;align-self:flex-start">' + escapeHtml(h.status) + '</span>';
      }
      html +=   '</div>';
      html += '</td>';
      html += '<td>' + fmtNum(h.quantity, 0) + '</td>';
      html += '<td>' + fmtNum(h.cost_price, 2) + '</td>';
      html += '<td>';
      html +=   '<div class="sh-price-edit">';
      html +=     '<input type="number" class="sh-price-input ' + pnlClass + '" value="' + (h.current_price || 0) + '" step="0.01" style="color:' + (calc.pnl >= 0 ? '#dc2626' : '#16a34a') + '" onchange="StockHoldings.updateCurrentPrice(\'' + h.id + '\', this.value)" onblur="StockHoldings.updateCurrentPrice(\'' + h.id + '\', this.value)">';
      html +=   '</div>';
      html += '</td>';
      html += '<td class="sh-pnl ' + pnlClass + '">' + pnlSign + fmtMoney(calc.pnl) + '</td>';
      html += '<td class="sh-pnl ' + pnlClass + '">' + pctSign + fmtPct(calc.pct) + '</td>';
      html += '<td class="sh-td-ops">';
      html +=   '<div class="sh-ops">';
      html +=     '<button class="sh-action-btn" onclick="StockHoldings.openHoldingModal(\'' + h.id + '\')">编辑</button>';
      html +=     '<button class="sh-action-btn danger" onclick="StockHoldings.deleteHoldingConfirm(\'' + h.id + '\')">删除</button>';
      html +=   '</div>';
      html += '</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';
    wrap.innerHTML = html;
    parent.appendChild(wrap);

    // render/切到持仓明细子Tab时自动批量拉取实时行情
    autoFetchQuotes();
  }

  // ==================== 持仓建议 (v52.7.0) ====================
  var adviceGenerating = false;

  function renderAdvice(parent) {
    var sectionTitle = document.createElement('div');
    sectionTitle.className = 'sh-section-title';
    sectionTitle.innerHTML =
      '<div class="sh-section-title-text"><span class="dot"></span>持仓建议</div>' +
      '<div style="font-size:12px;color:#9ca3af;">MiRun AI 四维研判 · 仅供决策参考</div>';
    parent.appendChild(sectionTitle);

    var shell = document.createElement('div');
    shell.id = 'shAdvicePanel';
    parent.appendChild(shell);

    var holdings = loadHoldings();
    if (!holdings.length) {
      var empty = document.createElement('div');
      empty.className = 'sh-empty';
      empty.innerHTML =
        '<div class="sh-empty-icon">' +
          '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/><polyline points="18 12 22 17 22 7"/></svg>' +
        '</div>' +
        '<div>暂无持仓</div>' +
        '<div style="font-size:12px;margin-top:6px;">添加持仓后，MiRun AI 将为你智能生成持仓建议</div>';
      shell.appendChild(empty);
      return;
    }

    var toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;';
    toolbar.innerHTML =
      '<div style="font-size:12px;color:#64748b;flex:1;min-width:0;">从实时行情 · 成本盈亏 · 风险控制 · 市场环境四个维度综合研判</div>' +
      '<button id="shAdviceGenBtn" class="sh-add-btn" style="padding:7px 14px;font-size:13px;flex-shrink:0;">' +
        svgWand() +
        '生成研判</button>';
    shell.appendChild(toolbar);

    var result = document.createElement('div');
    result.id = 'shAdviceResult';
    shell.appendChild(result);

    var genBtn = document.getElementById('shAdviceGenBtn');
    if (genBtn) genBtn.onclick = function() { generateAdvice(); };

    // 进入该 Tab 自动生成一次
    generateAdvice(false);
  }

  function svgWand() {
    return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="15 4 17.12 4 17.88 2 18.64 4 21 4 18.24 6.12 21 8 18.64 8 17.88 10 17.12 8 15 8 17.76 6.12"/><path d="M3 21 14 10"/></svg>';
  }

  function computeAdviceStats(list) {
    var totalCost = 0, totalValue = 0;
    list.forEach(function(h) {
      var q = parseFloat(h.quantity) || 0, c = parseFloat(h.cost_price) || 0, p = parseFloat(h.current_price) || 0;
      totalCost += q * c;
      totalValue += q * p;
    });
    var totalPnl = totalValue - totalCost;
    return { count: list.length, totalCost: totalCost, totalValue: totalValue, totalPnl: totalPnl, pnlPct: totalCost > 0 ? totalPnl / totalCost : 0, cash: loadCash() };
  }

  function fetchAdviceQuotes() {
    return new Promise(function(resolve) {
      var list = loadHoldings();
      if (!list.length) { resolve({ ok: true, list: list }); return; }
      var secids = [];
      list.forEach(function(h) {
        if (!h || !h.code) return;
        var sid = toSecid(h.code);
        if (sid) secids.push(sid);
      });
      if (!secids.length) { resolve({ ok: true, list: list }); return; }
      var url = QUOTE_API.replace('SECIDS', secids.join(','));
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 10000;
      var finished = false;
      var finish = function(ok, out) { if (finished) return; finished = true; resolve({ ok: ok, list: out || list }); };
      xhr.onload = function() {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            var res = typeof xhr.response === 'string' ? JSON.parse(xhr.response) : xhr.response;
            var diff = (res && res.data && res.data.diff) || [];
            var m = {};
            diff.forEach(function(d) {
              var market = (d.f13 === 1) ? '1' : '0';
              var sid = market + '.' + d.f12;
              if (d.f2 === undefined || d.f2 === null || d.f2 === '-') return;
              var p = parseFloat(d.f2);
              if (!isNaN(p) && p > 0) m[sid] = p;
            });
            var out = list.map(function(h) {
              var hh = { id: h.id, name: h.name, code: h.code, quantity: h.quantity, cost_price: h.cost_price, current_price: h.current_price, status: h.status, note: h.note };
              var sid = toSecid(h.code);
              if (sid && m[sid]) hh.current_price = m[sid];
              return hh;
            });
            finish(true, out);
          } else { finish(false, list); }
        } catch (e) { finish(false, list); }
      };
      xhr.onerror = function() { finish(false, list); };
      xhr.ontimeout = function() { finish(false, list); };
      xhr.send();
    });
  }

  function fetchMarketEnv() {
    return new Promise(function(resolve) {
      var url = 'https://push2.eastmoney.com/api/qt/ulist.np/get?secids=1.000001,0.399001,0.399006&fields=f2,f3,f12,f14&fltt=2';
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 8000;
      var finished = false;
      var finish = function(s2) { if (finished) return; finished = true; resolve(s2); };
      xhr.onload = function() {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            var res = typeof xhr.response === 'string' ? JSON.parse(xhr.response) : xhr.response;
            var diff = (res && res.data && res.data.diff) || [];
            if (!diff.length) { finish(''); return; }
            var parts = diff.map(function(d) { return (d.f14 || '指数') + ' ' + d.f2 + ' (' + (d.f3 >= 0 ? '+' : '') + d.f3 + '%)'; });
            finish(parts.join('；'));
          } else { finish(''); }
        } catch (e) { finish(''); }
      };
      xhr.onerror = function() { finish(''); };
      xhr.ontimeout = function() { finish(''); };
      xhr.send();
    });
  }

  function buildAdviceContext(list, stats, marketEnv) {
    var lines = ['当前持仓数据：'];
    list.forEach(function(h, i) {
      var q = parseFloat(h.quantity) || 0;
      var cost = parseFloat(h.cost_price) || 0;
      var curr = parseFloat(h.current_price) || 0;
      var pnl = (curr - cost) * q;
      var pct = cost > 0 ? ((curr - cost) / cost * 100) : 0;
      var value = q * curr;
      var conc = stats.totalValue > 0 ? (value / stats.totalValue * 100) : 0;
      lines.push(String(i + 1) + '. ' + (h.name || '未知') + '(' + (h.code || '') + ') 现价' + fmtNum(curr) + ' 成本' + fmtNum(cost) + ' 持有' + q + '股 ' + (value / 10000).toFixed(2) + '万元 占组合' + conc.toFixed(1) + '% 浮盈亏' + (pnl >= 0 ? '+' : '') + fmtNum(Math.abs(pnl)) + '元(' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%)');
    });
    lines.push('组合总市值' + fmtNum(stats.totalValue) + '元，总浮盈亏' + (stats.totalPnl >= 0 ? '+' : '') + fmtNum(Math.abs(stats.totalPnl)) + '元(' + (stats.pnlPct >= 0 ? '+' : '') + (stats.pnlPct * 100).toFixed(2) + '%)，可用资金' + fmtNum(stats.cash) + '元。');
    if (marketEnv) {
      lines.push('大盘概况：' + marketEnv);
    } else {
      lines.push('大盘实时概况暂不可用，请基于你的常识与上述持仓成本盈亏做保守、审慎的研判，避免过度乐观。');
    }
    return lines.join('\n');
  }

  function generateAdvice() {
    if (adviceGenerating) return;
    var holdings = loadHoldings();
    if (!holdings.length) return;
    adviceGenerating = true;
    var btn = document.getElementById('shAdviceGenBtn');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
    var result = document.getElementById('shAdviceResult');
    if (result) setAdviceLoading(result);

    fetchAdviceQuotes().then(function(qr) {
      var list = qr.list || loadHoldings();
      if (!list.length) {
        adviceGenerating = false;
        if (btn) { btn.disabled = false; btn.style.opacity = ''; }
        return;
      }
      var stats = computeAdviceStats(list);
      if (!(window.AiEngine && window.AiEngine.callLLMWithFallback && window.AiEngine.isConfigured && window.AiEngine.isConfigured())) {
        finishAdvice(list, stats, buildLocalAdvice(list, stats));
        return;
      }
      fetchMarketEnv().then(function(env) { runAIAdvice(list, stats, env); });
    });
  }

  function runAIAdvice(list, stats, marketEnv) {
    var context = buildAdviceContext(list, stats, marketEnv);
    var messages = [
      { role: 'system', content: '你是资深投资顾问与风险控制专家。请基于提供的持仓数据与市场概况，客观审慎地输出持仓建议。只做分析与建议，绝不替用户下单、不生成实际交易。使用简洁中文。' },
      { role: 'user', content: context + '\n\n请只返回一个合法JSON，不要输出任何多余文字或代码块标记，结构如下：\n{"conclusion":"综合结论（一两句话）","items":[{"name":"标的名","code":"代码","direction":"持有/加仓/减仓/清仓","reason":"一句理由"}],"risks":["风险提示1","风险提示2"]}' }
    ];
    var cfg = (window.AiEngine.getConfig ? window.AiEngine.getConfig() : {}) || {};
    window.AiEngine.callLLMWithFallback(messages, { maxTokens: 1500, temperature: 0.5 }, cfg)
      .then(function(res) {
        var adv = parseAIAdvice((res && res.content) || '', list);
        finishAdvice(list, stats, adv || buildLocalAdvice(list, stats));
      })
      .catch(function() {
        finishAdvice(list, stats, buildLocalAdvice(list, stats));
      });
  }

  function parseAIAdvice(content, list) {
    var raw = String(content || '');
    var start = raw.indexOf('{');
    var end = raw.lastIndexOf('}');
    var obj = null;
    if (start !== -1 && end !== -1 && end > start) {
      try { obj = JSON.parse(raw.substring(start, end + 1)); } catch (e) { obj = null; }
    }
    if (obj && obj.items && Array.isArray(obj.items)) {
      return {
        source: 'ai',
        conclusion: obj.conclusion || '',
        items: obj.items.slice(0, 30).map(function(it) {
          return { name: it.name || '', code: it.code || '', direction: it.direction || '持有', reason: it.reason || '' };
        }),
        risks: (obj.risks || []).map(String)
      };
    }
    return null;
  }

  function finishAdvice(list, stats, adv) {
    adviceGenerating = false;
    var btn = document.getElementById('shAdviceGenBtn');
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
    var result = document.getElementById('shAdviceResult');
    if (!result) return;
    renderAdviceResult(result, adv);
  }

  function buildLocalAdvice(list, stats) {
    if (!stats) stats = computeAdviceStats(list);
    var items = [];
    var risks = [];
    var highConcName = '';
    list.forEach(function(h) {
      var q = parseFloat(h.quantity) || 0;
      var cost = parseFloat(h.cost_price) || 0;
      var curr = parseFloat(h.current_price) || 0;
      var pct = cost > 0 ? (curr - cost) / cost : 0;
      var value = q * curr;
      var conc = stats.totalValue > 0 ? (value / stats.totalValue) : 0;
      var direction = '持有', reason;
      if (pct <= -0.15) { direction = '减仓'; reason = '当前已亏损超15%，建议控制风险、谨慎减仓观望'; }
      else if (pct <= -0.05) { direction = '持有'; reason = '小幅回调仍在可控范围，建议持有观望并关注下方支撑'; }
      else if (pct >= 0.15 && conc >= 0.3) { direction = '减仓'; reason = '盈利可观且单票占比偏高，建议部分止盈、降低集中度'; }
      else if (pct >= 0.15) { direction = '持有'; reason = '盈利良好，建议继续持有并动态上移止盈位'; }
      else if (conc >= 0.45) { direction = '减仓'; reason = '单票占比过高（' + (conc * 100).toFixed(1) + '%），建议减仓分散风险'; }
      else { direction = '持有'; reason = '盈亏与占比处于合理区间，建议按既定策略持有'; }
      if (conc > 0.3 && !highConcName) highConcName = (h.name || '未知') + (h.code ? '(' + h.code + ')' : '');
      items.push({ name: h.name || '未知', code: h.code || '', direction: direction, reason: reason });
    });

    risks.push('以上为基于历史与本地数据的保守研判，仅供决策参考，不构成投资建议，最终决策由你确认。');
    risks.push('请严格执行止损纪律，避免单只标的过度集中；可结合最新行情与个人风险承受能力设定目标价位。');
    if (stats.totalPnl < 0) risks.push('组合当前整体浮亏，注意控制回撤，审慎评估加仓节奏与仓位比例。');
    if (highConcName) risks.push('注意仓位集中风险：' + highConcName + ' 占组合比例较高，建议适当分散。');

    var conclusion = '当前共持有 ' + stats.count + ' 只标的，组合总市值约 ' + fmtNum(stats.totalValue) + ' 元，总' + (stats.totalPnl >= 0 ? '浮盈' : '浮亏') + ' ' + fmtNum(Math.abs(stats.totalPnl)) + ' 元（' + (stats.pnlPct >= 0 ? '+' : '') + (stats.pnlPct * 100).toFixed(2) + '%）。';
    if (stats.totalPnl < 0) conclusion += '整体处于亏损状态，建议以控风险、防回撤为主，避免盲目加仓。';
    else if (highConcName) conclusion += '整体盈利但存在集中风险，建议适当止盈分散。';
    else conclusion += '整体状态较为健康，建议按既定策略持有并动态管理。';
    conclusion += '（AI 服务暂不可用，本建议基于本地规则生成）';

    return { source: 'local', conclusion: conclusion, items: items, risks: risks };
  }

  function renderAdviceResult(container, adv) {
    container.innerHTML = '';
    if (!adv) adv = { source: 'local', conclusion: '', items: [], risks: [] };

    var concl = document.createElement('div');
    concl.className = 'sh-advice-conclusion';
    concl.innerHTML =
      '<div class="sh-advice-c-head">' +
        '<span class="dot"></span>综合结论' +
        (adv.source === 'local' ? '<span style="font-size:11px;color:#94a3b8;margin-left:auto;">本地规则 · AI 暂不可用</span>' : '') +
      '</div>' +
      '<div class="sh-advice-c-text">' + escapeHtml(adv.conclusion || '') + '</div>';
    container.appendChild(concl);

    var itemsTitle = document.createElement('div');
    itemsTitle.className = 'sh-advice-sec-title';
    itemsTitle.innerHTML = '<span class="dot"></span>各持仓方向与动作';
    container.appendChild(itemsTitle);

    var actWrap = document.createElement('div');
    actWrap.className = 'sh-advice-act-wrap';
    (adv.items || []).forEach(function(it) {
      var dir = it.direction || '持有';
      var cls = (dir === '加仓') ? 'buy' : ((dir === '减仓' || dir === '清仓') ? 'sell' : 'hold');
      var card = document.createElement('div');
      card.className = 'sh-advice-act';
      card.innerHTML =
        '<div class="sh-advice-act-name">' + escapeHtml(it.name || '') + (it.code ? '<span style="font-size:11px;color:#9ca3af;margin-left:4px;">' + escapeHtml(it.code) + '</span>' : '') + '</div>' +
        '<div class="sh-advice-act-dir ' + cls + '">' + escapeHtml(dir) + '</div>' +
        '<div class="sh-advice-act-reason">' + escapeHtml(it.reason || '') + '</div>';
      actWrap.appendChild(card);
    });
    container.appendChild(actWrap);

    var riskTitle = document.createElement('div');
    riskTitle.className = 'sh-advice-sec-title';
    riskTitle.innerHTML = '<span class="dot"></span>风险提示';
    container.appendChild(riskTitle);

    var riskWrap = document.createElement('div');
    riskWrap.className = 'sh-advice-risk-wrap';
    (adv.risks || []).forEach(function(r) {
      var rdiv = document.createElement('div');
      rdiv.className = 'sh-advice-risk';
      rdiv.innerHTML = escapeHtml(r);
      riskWrap.appendChild(rdiv);
    });
    container.appendChild(riskWrap);

    var disclaim = document.createElement('div');
    disclaim.className = 'sh-advice-disclaim';
    disclaim.innerHTML = '本建议由 MiRun AI 自动生成，仅供决策参考，不构成投资建议，最终决策由你确认。AI 不会自动执行交易、不会替你下单。';
    container.appendChild(disclaim);
  }

  function setAdviceLoading(container) {
    container.innerHTML = '';
    var l = document.createElement('div');
    l.className = 'sh-advice-loading';
    l.innerHTML =
      '<div class="sh-advice-loading-icon">' +
        '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4"/><path d="M12 20v-4"/><path d="M16 8h-4a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h4v-8"/><path d="M16 9a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3"/></svg>' +
      '</div>' +
      '<div>MiRun AI 正在跨维度研判持仓…</div>';
    container.appendChild(l);
  }

  function renderTopHoldings() {
    var wrap = document.getElementById('wealthTopHoldings');
    if (!wrap) return;
    var list = loadHoldings().slice(0, 3);
    wrap.innerHTML = '';
    if (!list.length) {
      var empty = document.createElement('div');
      empty.className = 'wlc-empty';
      empty.innerHTML = '暂无持仓，对AI说「买入贵州茅台100股」';
      wrap.appendChild(empty);
      return;
    }
    list.forEach(function(h) {
      var calc = calcHoldingPnl(h);
      var curr = parseFloat(h.current_price) || 0;
      var color = calc.pnl >= 0 ? '#dc2626' : '#16a34a';
      var pnlSign = calc.pnl >= 0 ? '+' : '';
      var pctSign = calc.pct >= 0 ? '+' : '';
      var item = document.createElement('div');
      item.className = 'wlc-list-item';
      item.innerHTML =
        '<div class="wlc-item-left">' +
          '<div class="wlc-item-icon" style="background:#eff6ff;color:#2563eb;">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>' +
          '</div>' +
          '<div style="min-width:0">' +
            '<div class="wlc-item-name">' + escapeHtml(h.name || '') + '</div>' +
            '<div class="wlc-item-desc">' + escapeHtml(h.code || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="wlc-item-right">' +
          '<div class="wlc-item-value" style="color:' + color + '">' + fmtNum(curr) + '</div>' +
          '<div class="wlc-item-change" style="color:' + color + '">' + pnlSign + fmtNum(calc.pnl) + '元 · ' + pctSign + (calc.pct * 100).toFixed(2) + '%</div>' +
        '</div>';
      wrap.appendChild(item);
    });
  }

  function showManager() {
    currentSub = 'holdings';
    renderAll();
    var el = document.getElementById('stockHoldingsContainer');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ==================== 弹窗：添加/编辑持仓 ====================
  var holdingModalId = null;

  function openHoldingModal(id) {
    holdingModalId = id || null;
    var h = id ? getHolding(id) : null;
    var title = h ? '编辑持仓' : '添加持仓';

    var statusOptions = DEFAULT_STATUS_OPTIONS.slice();
    if (h && h.status && statusOptions.indexOf(h.status) === -1) {
      statusOptions.push(h.status);
    }

    var statusOptionsHtml = statusOptions.map(function(s) {
      return '<option value="' + escapeHtml(s) + '"' + (h && h.status === s ? ' selected' : '') + '>' + escapeHtml(s) + '</option>';
    }).join('');

    var html =
      '<div class="sh-modal-mask" onclick="if(event.target===this)StockHoldings.closeModal(\'shHoldingModal\')">' +
        '<div class="sh-modal" id="shHoldingModal">' +
          '<div class="sh-modal-header">' +
            '<div class="sh-modal-title">' + title + '</div>' +
            '<div class="sh-modal-close" onclick="StockHoldings.closeModal(\'shHoldingModal\')">×</div>' +
          '</div>' +
          '<div class="sh-modal-body">' +
            '<div class="sh-form-row">' +
              '<div class="sh-form-group">' +
                '<label class="sh-form-label">标的名称 *</label>' +
                '<input type="text" class="sh-form-input" id="sh-h-name" placeholder="如：贵州茅台" value="' + (h ? escapeHtml(h.name || '') : '') + '">' +
              '</div>' +
              '<div class="sh-form-group">' +
                '<label class="sh-form-label">代码</label>' +
                '<input type="text" class="sh-form-input" id="sh-h-code" placeholder="如：600519.SH" value="' + (h ? escapeHtml(h.code || '') : '') + '">' +
              '</div>' +
            '</div>' +
            '<div class="sh-form-row">' +
              '<div class="sh-form-group">' +
                '<label class="sh-form-label">持仓数量（股） *</label>' +
                '<input type="number" class="sh-form-input" id="sh-h-qty" placeholder="如：100" step="1" min="0" value="' + (h ? h.quantity || 0 : 0) + '">' +
              '</div>' +
              '<div class="sh-form-group">' +
                '<label class="sh-form-label">成本价 *</label>' +
                '<input type="number" class="sh-form-input" id="sh-h-cost" placeholder="如：1800.00" step="0.001" min="0" value="' + (h ? h.cost_price || 0 : 0) + '">' +
              '</div>' +
            '</div>' +
            '<div class="sh-form-row">' +
              '<div class="sh-form-group">' +
                '<label class="sh-form-label">现价 *</label>' +
                '<input type="number" class="sh-form-input" id="sh-h-curr" placeholder="如：1850.00" step="0.001" min="0" value="' + (h ? h.current_price || 0 : 0) + '">' +
              '</div>' +
              '<div class="sh-form-group">' +
                '<label class="sh-form-label">状态标签</label>' +
                '<select class="sh-form-select" id="sh-h-status">' +
                  '<option value="">— 选择状态 —</option>' +
                  statusOptionsHtml +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div class="sh-form-group">' +
              '<label class="sh-form-label">备注</label>' +
              '<textarea class="sh-form-textarea" id="sh-h-note" placeholder="备注信息，如买入逻辑、目标价等">' + (h ? escapeHtml(h.note || '') : '') + '</textarea>' +
            '</div>' +
          '</div>' +
          '<div class="sh-modal-footer">' +
            '<button class="sh-btn sh-btn-secondary" onclick="StockHoldings.closeModal(\'shHoldingModal\')">取消</button>' +
            '<button class="sh-btn sh-btn-primary" onclick="StockHoldings.saveHolding()">保存</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstChild);

    setTimeout(function() {
      var nameInput = document.getElementById('sh-h-name');
      if (nameInput) nameInput.focus();
    }, 100);
  }

  function saveHolding() {
    var name = document.getElementById('sh-h-name').value.trim();
    if (!name) { alert('请输入标的名称'); return; }
    var qty = parseFloat(document.getElementById('sh-h-qty').value);
    if (!qty || qty <= 0) { alert('请输入正确的持仓数量'); return; }
    var cost = parseFloat(document.getElementById('sh-h-cost').value);
    if (isNaN(cost) || cost <= 0) { alert('请输入正确的成本价'); return; }
    var curr = parseFloat(document.getElementById('sh-h-curr').value);
    if (isNaN(curr) || curr <= 0) { alert('请输入正确的现价'); return; }

    var data = {
      name: name,
      code: document.getElementById('sh-h-code').value.trim(),
      quantity: qty,
      cost_price: cost,
      current_price: curr,
      status: document.getElementById('sh-h-status').value,
      note: document.getElementById('sh-h-note').value.trim()
    };

    if (holdingModalId) {
      updateHolding(holdingModalId, data);
    } else {
      addHolding(data);
    }

    closeModal('shHoldingModal');
    renderAll();
  }

  function deleteHoldingConfirm(id) {
    var h = getHolding(id);
    if (!h) return;
    if (!confirm('确定删除持仓「' + h.name + '」？\n关联的操作计划也会被一并删除。')) return;
    deleteHolding(id);
    renderAll();
  }

  function updateCurrentPrice(id, val) {
    var price = parseFloat(val);
    if (isNaN(price) || price <= 0) return;
    // 记录手动改价时间戳，自动拉取在 60s 保护窗口内跳过该持仓，避免覆盖刚手输的值
    manualOverride[id] = Date.now();
    updateHolding(id, { current_price: price });
    // 局部刷新总览
    refreshOverview();
    // 局部刷新表格内容
    refreshHoldingsPnl();
  }

  function refreshOverview() {
    // 移除旧总览卡片，重新渲染
    var oldCard = container.querySelector('.sh-overview-card');
    if (!oldCard) return;
    var s = calcSummary();
    var pnlClass = s.totalPnl >= 0 ? 'profit' : 'loss';
    var pnlSign = s.totalPnl >= 0 ? '+' : '';
    var pctSign = s.pnlPct >= 0 ? '+' : '';
    oldCard.innerHTML =
      '<div class="sh-overview-top">' +
        '<div>' +
          '<div class="sh-overview-label">持仓总市值</div>' +
          '<div class="sh-overview-value">' + fmtMoney(s.totalValue) + '</div>' +
        '</div>' +
        '<div class="sh-overview-count">' + s.count + ' 只标的</div>' +
      '</div>' +
      '<div class="sh-overview-stats">' +
        '<div class="sh-overview-stat">' +
          '<div class="sh-stat-label">总浮盈亏</div>' +
          '<div class="sh-stat-value ' + pnlClass + '">' + pnlSign + fmtMoney(s.totalPnl) + '</div>' +
        '</div>' +
        '<div class="sh-overview-stat">' +
          '<div class="sh-stat-label">盈亏比例</div>' +
          '<div class="sh-stat-value ' + pnlClass + '">' + pctSign + fmtPct(s.pnlPct) + '</div>' +
        '</div>' +
        '<div class="sh-overview-stat">' +
          '<div class="sh-stat-label">总成本</div>' +
          '<div class="sh-stat-value">' + fmtMoney(s.totalCost) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="sh-cash-row">' +
        '<div class="sh-cash-label">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>' +
          '可用资金（弹药）' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<span class="sh-cash-value">' + fmtMoney(s.cash) + '</span>' +
          '<span class="sh-cash-edit" onclick="StockHoldings.openCashModal()">修改</span>' +
        '</div>' +
      '</div>';
  }

  function refreshHoldingsPnl() {
    var list = loadHoldings();
    var rows = container.querySelectorAll('.sh-table tbody tr');
    rows.forEach(function(row) {
      var id = row.dataset.id;
      var h = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { h = list[i]; break; }
      }
      if (!h) return;
      var calc = calcHoldingPnl(h);
      var pnlClass = calc.pnl >= 0 ? 'up' : 'down';
      var pnlSign = calc.pnl >= 0 ? '+' : '';
      var pctSign = calc.pct >= 0 ? '+' : '';
      var priceColor = calc.pnl >= 0 ? '#dc2626' : '#16a34a';
      var tds = row.querySelectorAll('td');
      // 第3个td(索引2)是现价 → 已通过输入框手动改
      // 第4个td(索引4)是浮盈亏，第5个td(索引5)是盈亏%
      if (tds[4]) {
        tds[4].className = 'sh-pnl ' + pnlClass;
        tds[4].textContent = pnlSign + fmtMoney(calc.pnl);
      }
      if (tds[5]) {
        tds[5].className = 'sh-pnl ' + pnlClass;
        tds[5].textContent = pctSign + fmtPct(calc.pct);
      }
      // 现价输入框：值随实时行情更新，颜色跟随涨跌；编辑聚焦中则不覆盖
      var input = row.querySelector('.sh-price-input');
      if (input) {
        if (document.activeElement !== input) {
          input.value = h.current_price;
        }
        input.style.color = priceColor;
      }
    });
  }

  // ==================== 弹窗：可用资金 ====================
  function openCashModal() {
    var cash = loadCash();
    var html =
      '<div class="sh-modal-mask" onclick="if(event.target===this)StockHoldings.closeModal(\'shCashModal\')">' +
        '<div class="sh-modal" id="shCashModal" style="max-width:360px">' +
          '<div class="sh-modal-header">' +
            '<div class="sh-modal-title">设置可用资金</div>' +
            '<div class="sh-modal-close" onclick="StockHoldings.closeModal(\'shCashModal\')">×</div>' +
          '</div>' +
          '<div class="sh-modal-body">' +
            '<div class="sh-form-group">' +
              '<label class="sh-form-label">可用资金金额（元）</label>' +
              '<input type="number" class="sh-form-input" id="sh-cash-input" placeholder="如：50000" step="0.01" min="0" value="' + cash + '">' +
              '<div style="font-size:12px;color:#9ca3af;margin-top:6px;">记录你当前可用于投资的闲置资金</div>' +
            '</div>' +
          '</div>' +
          '<div class="sh-modal-footer">' +
            '<button class="sh-btn sh-btn-secondary" onclick="StockHoldings.closeModal(\'shCashModal\')">取消</button>' +
            '<button class="sh-btn sh-btn-primary" onclick="StockHoldings.saveCash()">保存</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstChild);

    setTimeout(function() {
      var inp = document.getElementById('sh-cash-input');
      if (inp) { inp.focus(); inp.select(); }
    }, 100);
  }

  function saveCash() {
    var val = parseFloat(document.getElementById('sh-cash-input').value);
    if (isNaN(val) || val < 0) { alert('请输入正确的金额'); return; }
    _saveCashToStore(val);
    closeModal('shCashModal');
    refreshOverview();
  }

  // ==================== 弹窗：添加/编辑计划 ====================
  var planModalId = null;

  function openPlanModal(id) {
    planModalId = id || null;
    var p = id ? (loadPlans().find(function(pp) { return pp.id === id; }) || null) : null;
    var title = p ? '编辑计划' : '新建操作计划';

    var holdings = loadHoldings();
    var holdingOptions = '<option value="">— 不关联（通用计划） —</option>';
    holdings.forEach(function(h) {
      var selected = p && p.holding_id === h.id ? ' selected' : '';
      holdingOptions += '<option value="' + h.id + '"' + selected + '>' + escapeHtml(h.name) + (h.code ? ' (' + escapeHtml(h.code) + ')' : '') + '</option>';
    });

    var html =
      '<div class="sh-modal-mask" onclick="if(event.target===this)StockHoldings.closeModal(\'shPlanModal\')">' +
        '<div class="sh-modal" id="shPlanModal">' +
          '<div class="sh-modal-header">' +
            '<div class="sh-modal-title">' + title + '</div>' +
            '<div class="sh-modal-close" onclick="StockHoldings.closeModal(\'shPlanModal\')">×</div>' +
          '</div>' +
          '<div class="sh-modal-body">' +
            '<div class="sh-form-group">' +
              '<label class="sh-form-label">关联持仓</label>' +
              '<select class="sh-form-select" id="sh-p-holding">' + holdingOptions + '</select>' +
            '</div>' +
            '<div class="sh-form-row">' +
              '<div class="sh-form-group">' +
                '<label class="sh-form-label">优先级</label>' +
                '<select class="sh-form-select" id="sh-p-priority">' +
                  '<option value="high"' + (p && p.priority === 'high' ? ' selected' : '') + '>高</option>' +
                  '<option value="mid"' + (!p || !p.priority || p.priority === 'mid' ? ' selected' : '') + '>中</option>' +
                  '<option value="low"' + (p && p.priority === 'low' ? ' selected' : '') + '>低</option>' +
                '</select>' +
              '</div>' +
              '<div class="sh-form-group">' +
                '<label class="sh-form-label">操作方向</label>' +
                '<select class="sh-form-select" id="sh-p-direction">' +
                  '<option value="buy"' + (p && p.direction === 'buy' ? ' selected' : '') + '>买入</option>' +
                  '<option value="sell"' + (p && p.direction === 'sell' ? ' selected' : '') + '>卖出</option>' +
                  '<option value="watch"' + (!p || !p.direction || p.direction === 'watch' ? ' selected' : '') + '>观察</option>' +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div class="sh-form-row">' +
              '<div class="sh-form-group">' +
                '<label class="sh-form-label">触发条件</label>' +
                '<input type="text" class="sh-form-input" id="sh-p-trigger" placeholder="如：0.76-0.77卖50手" value="' + (p ? escapeHtml(p.trigger_condition || '') : '') + '">' +
              '</div>' +
              '<div class="sh-form-group">' +
                '<label class="sh-form-label">状态</label>' +
                '<select class="sh-form-select" id="sh-p-status">' +
                  '<option value="pending"' + (!p || !p.status || p.status === 'pending' ? ' selected' : '') + '>待执行</option>' +
                  '<option value="progress"' + (p && p.status === 'progress' ? ' selected' : '') + '>进行中</option>' +
                  '<option value="done"' + (p && p.status === 'done' ? ' selected' : '') + '>已完成</option>' +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div class="sh-form-group">' +
              '<label class="sh-form-label">备注</label>' +
              '<textarea class="sh-form-textarea" id="sh-p-note" placeholder="补充说明、买入逻辑等">' + (p ? escapeHtml(p.note || '') : '') + '</textarea>' +
            '</div>' +
          '</div>' +
          '<div class="sh-modal-footer">' +
            (p ? '<button class="sh-btn sh-btn-danger" onclick="StockHoldings.deletePlanFromModal()">删除</button>' : '') +
            '<button class="sh-btn sh-btn-secondary" onclick="StockHoldings.closeModal(\'shPlanModal\')">取消</button>' +
            '<button class="sh-btn sh-btn-primary" onclick="StockHoldings.savePlan()">保存</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstChild);
  }

  function savePlan() {
    var data = {
      holding_id: document.getElementById('sh-p-holding').value || '',
      priority: document.getElementById('sh-p-priority').value,
      direction: document.getElementById('sh-p-direction').value,
      trigger_condition: document.getElementById('sh-p-trigger').value.trim(),
      status: document.getElementById('sh-p-status').value,
      note: document.getElementById('sh-p-note').value.trim()
    };

    if (planModalId) {
      updatePlan(planModalId, data);
    } else {
      addPlan(data);
    }

    closeModal('shPlanModal');
    if (currentSub === 'plans') renderSubContent();
  }

  function deletePlanConfirm(id) {
    if (!confirm('确定删除这条操作计划？')) return;
    deletePlan(id);
    if (currentSub === 'plans') renderSubContent();
  }

  function deletePlanFromModal() {
    if (!planModalId) return;
    if (!confirm('确定删除这条操作计划？')) return;
    deletePlan(planModalId);
    closeModal('shPlanModal');
    if (currentSub === 'plans') renderSubContent();
  }

  function togglePlanStatus(id) {
    var plans = loadPlans();
    var p = null;
    for (var i = 0; i < plans.length; i++) {
      if (plans[i].id === id) { p = plans[i]; break; }
    }
    if (!p) return;
    var nextStatus = p.status === 'done' ? 'pending' : 'done';
    updatePlan(id, { status: nextStatus });
    if (currentSub === 'plans') renderSubContent();
  }

  // ==================== 通用弹窗关闭 ====================
  function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal && modal.parentElement && modal.parentElement.classList.contains('sh-modal-mask')) {
      modal.parentElement.remove();
    } else if (modal) {
      modal.remove();
    }
  }

  // ==================== 对外接口 ====================
  window.StockHoldings = {
    render: render,
    switchSub: switchSub,
    openHoldingModal: openHoldingModal,
    saveHolding: saveHolding,
    deleteHoldingConfirm: deleteHoldingConfirm,
    updateCurrentPrice: updateCurrentPrice,
    refreshQuotes: function() { fetchRealtimeQuotes(true); },
    openCashModal: openCashModal,
    saveCash: saveCash,
    closeModal: closeModal,
    calcSummary: calcSummary,
    getHoldings: loadHoldings,
    showManager: showManager,
    renderTopHoldings: renderTopHoldings,
    generateAdvice: generateAdvice
  };

})();
