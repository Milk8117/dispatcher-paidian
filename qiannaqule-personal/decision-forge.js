/**
 * Decision Forge - MiRun AI 决策对辩模块
 * 通过三轮结构化对辩帮用户挖清隐含假设、理清价值排序，生成决策档案
 *
 * 模块名：decision_forge
 * 全局挂载：window.DecisionForge
 */

(function(global) {
  'use strict';

  // ==================== 注册 DataStore 模块 ====================
  var MODULE_NAME = 'decision_forge';
  var FIELD_SESSIONS = 'sessions';
  var FIELD_SETTINGS = 'settings';

  if (global.DataStore && DataStore.registerModule) {
    DataStore.registerModule(MODULE_NAME, {
      sessions: 'mijieai_decision_sessions',
      settings: 'mijieai_decision_settings'
    });
  }

  // ==================== System Prompts ====================
  var SYSTEM_PROMPTS = {
    round1: [
      '你是一个决策教练，正在帮助用户理清一个纠结的问题。当前是第一轮：定义问题。',
      '你的任务是引导用户说清楚：',
      '1. 他在纠结什么',
      '2. 有哪几个主要选项',
      '3. 每个选项的吸引点和顾虑点分别是什么',
      '用中文回复，语气温和但有引导性，不要直接给建议，只提问和澄清。',
      '如果用户已经说清楚了这些信息，就总结一下并确认，然后进入下一轮。',
      '回复要简洁，不超过200字。'
    ].join('\n'),
    round2: [
      '你是一个决策教练，正在帮助用户理清一个纠结的问题。当前是第二轮：挖掘隐含假设。',
      '你的任务是针对用户描述的每个选项，追问背后的隐含假设。',
      '人做选择时的理由往往是模糊的（比如"稳定""有前景""轻松"），你要把这些模糊的词拆成具体的、可验证的假设。',
      '针对每个选项追问2-3个问题，把模糊的理由具体化。',
      '用中文回复，语气像一个聪明的朋友在帮你思考，不要说教。',
      '回复要简洁，不超过300字。'
    ].join('\n'),
    round3: [
      '你是一个决策教练，正在帮助用户理清一个纠结的问题。当前是第三轮：极端场景测试。',
      '你的任务是设计2-3个极端假设场景，用来测试用户的真实底线和价值排序。',
      '极端场景的设计原则：',
      '- 放大某个选项的优点到极致，看用户是否还接受',
      '- 放大某个选项的缺点到极致，看用户是否还接受',
      '- 改变时间维度（短期vs长期），看用户的选择是否变化',
      '每个场景用一句话描述，然后问用户"你还会选它吗？为什么？"',
      '用中文回复，语气友好，不要评判用户的选择。',
      '回复要简洁，不超过300字。'
    ].join('\n'),
    round4: [
      '你是一个决策教练，正在帮助用户生成决策档案。当前是第四轮：总结输出。',
      '基于前三轮的对话，生成一份决策档案，格式如下：',
      '',
      '## 核心问题',
      '（一句话概括用户在纠结什么）',
      '',
      '## 选项对比',
      '### 选项A：xxx',
      '- 吸引点：xxx',
      '- 顾虑点：xxx',
      '',
      '### 选项B：xxx',
      '- 吸引点：xxx',
      '- 顾虑点：xxx',
      '',
      '## 你的隐含假设',
      '（列出3-5条你从对话中发现的隐含假设，这些是用户可能没有意识到的、需要验证的前提）',
      '',
      '## 你的价值排序',
      '（根据用户的回答，推断他最看重什么、次看重什么。用1. 2. 3. 列出）',
      '',
      '## 下一步建议',
      '（建议用户去验证哪些假设、怎么验证。列出2-3条具体行动）',
      '',
      '重要：不要直接告诉用户选哪个！你的工作是帮他把问题想清楚，最终决定由他自己做。',
      '用中文回复，Markdown格式，简洁有力。'
    ].join('\n')
  };

  // ==================== 开场白（第一轮AI消息） ====================
  var OPENING_MESSAGE = [
    '好的，我们一起来理清楚。先告诉我：',
    '1. 你现在在纠结什么？',
    '2. 你面前有几个主要选项？分别是什么？',
    '3. 每个选项最吸引你的一点、和最让你顾虑的一点分别是什么？'
  ].join('\n');

  // ==================== 工具函数 ====================
  function genId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }

  function now() {
    return Date.now();
  }

  function esc(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 将 Markdown 简单转换为 HTML（仅支持标题、列表、加粗等基础语法）
  function markdownToHtml(text) {
    if (!text) return '';
    var lines = text.split('\n');
    var html = '';
    var inList = false;
    var listType = ''; // 'ul' or 'ol'

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      // 空行
      if (!trimmed) {
        if (inList) {
          html += '</' + listType + '>';
          inList = false;
          listType = '';
        }
        continue;
      }

      // 标题
      if (/^##\s+/.test(trimmed)) {
        if (inList) { html += '</' + listType + '>'; inList = false; listType = ''; }
        html += '<h3 class="df-md-h2">' + trimmed.replace(/^##\s+/, '') + '</h3>';
        continue;
      }
      if (/^###\s+/.test(trimmed)) {
        if (inList) { html += '</' + listType + '>'; inList = false; listType = ''; }
        html += '<h4 class="df-md-h3">' + trimmed.replace(/^###\s+/, '') + '</h4>';
        continue;
      }

      // 无序列表项
      if (/^[-*•]\s+/.test(trimmed)) {
        if (!inList || listType !== 'ul') {
          if (inList) html += '</' + listType + '>';
          html += '<ul class="df-md-ul">';
          inList = true;
          listType = 'ul';
        }
        var itemText = trimmed.replace(/^[-*•]\s+/, '');
        itemText = renderInlineFormat(itemText);
        html += '<li>' + itemText + '</li>';
        continue;
      }

      // 有序列表项
      if (/^\d+\.\s+/.test(trimmed)) {
        if (!inList || listType !== 'ol') {
          if (inList) html += '</' + listType + '>';
          html += '<ol class="df-md-ol">';
          inList = true;
          listType = 'ol';
        }
        var olText = trimmed.replace(/^\d+\.\s+/, '');
        olText = renderInlineFormat(olText);
        html += '<li>' + olText + '</li>';
        continue;
      }

      // 普通段落
      if (inList) {
        html += '</' + listType + '>';
        inList = false;
        listType = '';
      }
      html += '<p class="df-md-p">' + renderInlineFormat(trimmed) + '</p>';
    }

    if (inList) {
      html += '</' + listType + '>';
    }

    return html;
  }

  function renderInlineFormat(text) {
    // 粗体 **text**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // emoji-like 保留原样
    return text;
  }

  // ==================== LLM 调用封装（使用 AiEngine 同套 provider 链） ====================
  async function callLLM(messages, maxTokens, temperature) {
    // 如果 AiEngine 提供了直接调用接口，优先用
    if (global.AiEngine && typeof AiEngine._callLLM === 'function') {
      return await AiEngine._callLLM(messages, { maxTokens: maxTokens, temperature: temperature });
    }
    // 否则直接复用 AiEngine 的配置和 provider 链
    if (!global.AiEngine || !AiEngine.getConfig || !AiEngine.getProviders) {
      throw new Error('AiEngine 未就绪，无法调用 AI');
    }
    var cfg = AiEngine.getConfig();
    var providers = AiEngine.getProviders();
    var chain = buildProviderChain(cfg, providers);
    if (chain.length === 0) {
      throw new Error('未配置任何可用的AI服务商，请先在设置中配置API Key');
    }

    var lastError = null;
    for (var i = 0; i < chain.length; i++) {
      try {
        var result = await callSingleProvider(chain[i], messages, maxTokens, temperature);
        return result.content;
      } catch (e) {
        console.warn('[DecisionForge] Provider ' + chain[i].id + ' 失败:', e.message);
        lastError = e;
        if (!cfg.fallbackEnabled || i === chain.length - 1) {
          throw e;
        }
      }
    }
    throw lastError || new Error('所有AI服务商调用失败');
  }

  function buildProviderChain(cfg, providers) {
    var chain = [];
    if (cfg.mode === 'default') {
      // 默认模式：使用 defaultProvider + defaultApiKey
      var defaultId = cfg.defaultProvider || 'deepseek';
      var defaultProvider = null;
      for (var i = 0; i < providers.length; i++) {
        if (providers[i].id === defaultId) {
          defaultProvider = {
            id: providers[i].id,
            name: providers[i].name,
            apiBase: providers[i].apiBase,
            model: providers[i].model,
            apiKey: cfg.defaultApiKey || ''
          };
          break;
        }
      }
      if (defaultProvider && defaultProvider.apiKey) {
        chain.push(defaultProvider);
      }
    } else {
      // 高级模式：按 providers 配置顺序
      for (var j = 0; j < providers.length; j++) {
        var p = providers[j];
        var pc = (cfg.providers && cfg.providers[p.id]) || {};
        if (pc.apiKey) {
          chain.push({
            id: p.id,
            name: p.name,
            apiBase: pc.apiBase || p.apiBase,
            model: pc.model || p.defaultModel || p.model,
            apiKey: pc.apiKey
          });
        }
      }
    }
    return chain;
  }

  async function callSingleProvider(provider, messages, maxTokens, temperature) {
    var apiBase = provider.apiBase;
    var model = provider.model;
    if (!apiBase || !model) {
      throw new Error('Provider ' + provider.id + ' 未配置API地址或模型');
    }
    var url = apiBase.replace(/\/$/, '') + '/chat/completions';

    var body = {
      model: model,
      messages: messages,
      max_tokens: maxTokens || 1024,
      temperature: temperature !== undefined ? temperature : 0.7
    };

    var resp;
    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function() { ctrl.abort(); }, 30000);
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + provider.apiKey
        },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      clearTimeout(timer);
    } catch (e) {
      throw new Error('API请求超时或网络错误（Provider: ' + provider.id + '）: ' + e.message);
    }

    if (!resp.ok) {
      var errText = await resp.text();
      var errMsg = 'API调用失败 (' + resp.status + '): ' + errText.substring(0, 200);
      if (resp.status === 402) {
        errMsg = provider.name + ' 账户余额不足，请充值后再使用';
      } else if (resp.status === 429) {
        errMsg = provider.name + ' 请求过于频繁（限流），请稍后再试或切换到其他模型';
      } else if (resp.status === 401) {
        errMsg = provider.name + ' API Key无效，请检查Key是否正确';
      } else if (resp.status === 404) {
        errMsg = provider.name + ' 模型不存在或API地址错误';
      }
      throw new Error(errMsg);
    }

    var data = await resp.json();
    var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('API返回为空');

    return {
      content: content,
      usage: data.usage || null,
      providerId: provider.id
    };
  }

  // ==================== 数据层 ====================
  function loadSessions() {
    var data = DataStore.load(MODULE_NAME, FIELD_SESSIONS, []);
    return Array.isArray(data) ? data : [];
  }

  function saveSessions(sessions) {
    DataStore.save(MODULE_NAME, FIELD_SESSIONS, sessions);
  }

  function loadSettings() {
    return DataStore.load(MODULE_NAME, FIELD_SETTINGS, {}) || {};
  }

  function saveSettings(settings) {
    DataStore.save(MODULE_NAME, FIELD_SETTINGS, settings);
  }

  function createSession(title) {
    var sessions = loadSessions();
    var session = {
      id: genId('dec'),
      title: title || '未命名决策',
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
      currentRound: 1,
      rounds: [
        {
          round: 1,
          aiMessage: OPENING_MESSAGE,
          userAnswer: '',
          timestamp: now()
        }
      ],
      options: [],
      assumptions: [],
      valueRankings: [],
      finalSummary: '',
      decisionMade: '',
      resultNote: ''
    };
    sessions.unshift(session);
    saveSessions(sessions);
    return session;
  }

  function getSession(sessionId) {
    var sessions = loadSessions();
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === sessionId) return sessions[i];
    }
    return null;
  }

  function updateSession(sessionId, updater) {
    var sessions = loadSessions();
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === sessionId) {
        sessions[i] = updater(sessions[i]) || sessions[i];
        sessions[i].updatedAt = now();
        saveSessions(sessions);
        return sessions[i];
      }
    }
    return null;
  }

  // ==================== 状态 ====================
  var state = {
    currentSessionId: null,
    isAiThinking: false,
    panelOpen: false
  };

  // ==================== UI 渲染：入口卡片 ====================
  function renderEntryCard(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    // 用和 home-smart-card 风格一致的卡片
    var card = document.createElement('div');
    card.className = 'df-entry-card';
    card.innerHTML = [
      '<div class="df-entry-icon">',
      '  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#8b5cf6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
      '    <path d="M9 11l3 3L22 4"/>',
      '    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
      '  </svg>',
      '</div>',
      '<div class="df-entry-body">',
      '  <div class="df-entry-title">纠结诊疗室</div>',
      '  <div class="df-entry-desc">三轮对辩帮你把问题想清楚</div>',
      '</div>',
      '<div class="df-entry-arrow">',
      '  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '    <polyline points="9 18 15 12 9 6"/>',
      '  </svg>',
      '</div>'
    ].join('');

    card.addEventListener('click', function() {
      openPanel();
    });

    container.appendChild(card);
  }

  // ==================== UI 渲染：全屏面板 ====================
  var panelEl = null;

  function ensurePanel() {
    if (panelEl) return panelEl;

    panelEl = document.createElement('div');
    panelEl.className = 'df-panel';
    panelEl.id = 'decisionForgePanel';
    panelEl.innerHTML = [
      '<div class="df-panel-inner">',
      '  <div class="df-header">',
      '    <div class="df-header-left">',
      '      <button class="df-header-btn df-back-btn" id="dfBackBtn" style="display:none">',
      '        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
      '      </button>',
      '      <div class="df-header-title" id="dfHeaderTitle">纠结诊疗室</div>',
      '    </div>',
      '    <button class="df-header-btn df-close-btn" id="dfCloseBtn">',
      '      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      '    </button>',
      '  </div>',
      '  <div class="df-body" id="dfBody">',
      // 主界面（历史列表 + 新建按钮）
      '    <div class="df-view" id="dfViewHome">',
      '      <div class="df-new-btn" id="dfNewSessionBtn">',
      '        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
      '        <span>开始一次新的对辩</span>',
      '      </div>',
      '      <div class="df-history-title">历史决策</div>',
      '      <div class="df-history-list" id="dfHistoryList"></div>',
      '    </div>',
      // 对辩界面
      '    <div class="df-view df-view-chat" id="dfViewChat" style="display:none">',
      '      <div class="df-progress">',
      '        <div class="df-progress-step df-step-active" data-step="1">',
      '          <div class="df-step-dot">1</div>',
      '          <div class="df-step-label">定义问题</div>',
      '        </div>',
      '        <div class="df-progress-line" id="dfLine1"></div>',
      '        <div class="df-progress-step" data-step="2">',
      '          <div class="df-step-dot">2</div>',
      '          <div class="df-step-label">挖假设</div>',
      '        </div>',
      '        <div class="df-progress-line" id="dfLine2"></div>',
      '        <div class="df-progress-step" data-step="3">',
      '          <div class="df-step-dot">3</div>',
      '          <div class="df-step-label">极端测试</div>',
      '        </div>',
      '        <div class="df-progress-line" id="dfLine3"></div>',
      '        <div class="df-progress-step" data-step="4">',
      '          <div class="df-step-dot">4</div>',
      '          <div class="df-step-label">决策档案</div>',
      '        </div>',
      '      </div>',
      '      <div class="df-chat-area" id="dfChatArea"></div>',
      '    </div>',
      '  </div>',
      '  <div class="df-input-bar" id="dfInputBar">',
      '    <input type="text" class="df-input-field" id="dfInputField" placeholder="输入你的回答..." />',
      '    <button class="df-input-send" id="dfSendBtn">',
      '      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
      '    </button>',
      '  </div>',
      '</div>'
    ].join('');

    // 追加样式
    injectStyles();

    document.body.appendChild(panelEl);

    // 绑定事件
    panelEl.querySelector('#dfCloseBtn').addEventListener('click', closePanel);
    panelEl.querySelector('#dfBackBtn').addEventListener('click', goBackHome);
    panelEl.querySelector('#dfNewSessionBtn').addEventListener('click', startNewSession);
    panelEl.querySelector('#dfSendBtn').addEventListener('click', handleSend);
    panelEl.querySelector('#dfInputField').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleSend();
    });

    return panelEl;
  }

  function injectStyles() {
    if (document.getElementById('df-styles')) return;
    var style = document.createElement('style');
    style.id = 'df-styles';
    style.textContent = [
      /* 入口卡片 */
      '.df-entry-card { display:flex; align-items:center; gap:12px; background:#fff; border-radius:14px; padding:14px 16px; box-shadow:0 1px 3px rgba(0,0,0,0.05),0 4px 14px rgba(0,0,0,0.04); border:1px solid #f3f4f6; margin-bottom:10px; cursor:pointer; transition:all .2s; }',
      '.df-entry-card:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,0,0,0.08); }',
      '.df-entry-card:active { transform:scale(0.98); }',
      '.df-entry-icon { width:40px; height:40px; border-radius:10px; background:#f5f3ff; display:flex; align-items:center; justify-content:center; flex-shrink:0; }',
      '.df-entry-body { flex:1; min-width:0; }',
      '.df-entry-title { font-size:15px; font-weight:600; color:#1a1a2e; margin-bottom:3px; }',
      '.df-entry-desc { font-size:12px; color:#6b7280; line-height:1.4; }',
      '.df-entry-arrow { flex-shrink:0; }',

      /* 全屏面板 */
      '.df-panel { position:fixed; inset:0; z-index:9999; background:#fff; display:flex; flex-direction:column; animation:dfSlideIn .3s ease; }',
      '@keyframes dfSlideIn { from { transform:translateY(100%); } to { transform:translateY(0); } }',
      '.df-panel-inner { display:flex; flex-direction:column; height:100%; }',

      /* 顶部栏 */
      '.df-header { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #f1f5f9; background:#fff; flex-shrink:0; }',
      '.df-header-left { display:flex; align-items:center; gap:8px; flex:1; min-width:0; }',
      '.df-header-title { font-size:17px; font-weight:600; color:#1a1a2e; }',
      '.df-header-btn { background:none; border:none; padding:6px; cursor:pointer; border-radius:8px; transition:background .2s; }',
      '.df-header-btn:hover { background:#f1f5f9; }',

      /* 主体区 */
      '.df-body { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; }',
      '.df-view { padding:16px; }',

      /* 首页 */
      '.df-new-btn { display:flex; align-items:center; justify-content:center; gap:8px; background:linear-gradient(135deg, #8b5cf6, #6366f1); color:#fff; border:none; border-radius:14px; padding:16px; font-size:15px; font-weight:600; cursor:pointer; transition:all .2s; box-shadow:0 4px 12px rgba(139,92,246,0.3); }',
      '.df-new-btn:hover { transform:translateY(-1px); box-shadow:0 6px 16px rgba(139,92,246,0.4); }',
      '.df-new-btn:active { transform:scale(0.98); }',
      '.df-history-title { font-size:13px; font-weight:600; color:#6b7280; margin:20px 2px 10px; letter-spacing:0.5px; }',
      '.df-history-list { display:flex; flex-direction:column; gap:8px; }',
      '.df-history-item { background:#fff; border:1px solid #f3f4f6; border-radius:12px; padding:12px 14px; cursor:pointer; transition:all .2s; }',
      '.df-history-item:hover { border-color:#c4b5fd; background:#faf5ff; }',
      '.df-history-item-title { font-size:14px; font-weight:600; color:#1e293b; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.df-history-item-meta { display:flex; justify-content:space-between; font-size:11px; color:#94a3b8; }',
      '.df-history-empty { text-align:center; padding:30px 0; color:#94a3b8; font-size:13px; }',
      '.df-badge { display:inline-block; padding:1px 8px; border-radius:10px; font-size:10px; font-weight:500; }',
      '.df-badge-active { background:#eff6ff; color:#3b82f6; }',
      '.df-badge-completed { background:#f0fdf4; color:#16a34a; }',
      '.df-badge-abandoned { background:#f3f4f6; color:#6b7280; }',

      /* 进度条 */
      '.df-view-chat { padding:16px 16px 0; }',
      '.df-progress { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; padding:0 4px; }',
      '.df-progress-step { display:flex; flex-direction:column; align-items:center; gap:4px; flex:1; position:relative; }',
      '.df-step-dot { width:28px; height:28px; border-radius:50%; background:#e2e8f0; color:#94a3b8; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; transition:all .3s; flex-shrink:0; }',
      '.df-progress-step.df-step-active .df-step-dot { background:#8b5cf6; color:#fff; box-shadow:0 2px 8px rgba(139,92,246,0.4); }',
      '.df-progress-step.df-step-done .df-step-dot { background:#10b981; color:#fff; }',
      '.df-step-label { font-size:10px; color:#94a3b8; text-align:center; white-space:nowrap; }',
      '.df-progress-step.df-step-active .df-step-label { color:#8b5cf6; font-weight:500; }',
      '.df-progress-step.df-step-done .df-step-label { color:#10b981; }',
      '.df-progress-line { flex:0 0 auto; height:2px; background:#e2e8f0; margin-top:13px; width:30px; transition:background .3s; }',
      '.df-progress-line.df-line-done { background:#10b981; }',

      /* 对话区 */
      '.df-chat-area { display:flex; flex-direction:column; gap:12px; padding-bottom:16px; }',
      '.df-msg { max-width:85%; padding:10px 14px; border-radius:16px; line-height:1.6; font-size:14px; word-break:break-word; white-space:pre-wrap; }',
      '.df-msg-ai { background:#f5f3ff; color:#1e293b; border-bottom-left-radius:4px; align-self:flex-start; }',
      '.df-msg-user { background:#8b5cf6; color:#fff; border-bottom-right-radius:4px; align-self:flex-end; }',
      '.df-msg-thinking { background:#f5f3ff; color:#8b5cf6; font-style:italic; align-self:flex-start; display:flex; align-items:center; gap:6px; }',
      '.df-thinking-dot { width:6px; height:6px; border-radius:50%; background:#8b5cf6; animation:dfThinkingBounce 1.4s infinite ease-in-out both; }',
      '.df-thinking-dot:nth-child(1) { animation-delay:-0.32s; }',
      '.df-thinking-dot:nth-child(2) { animation-delay:-0.16s; }',
      '@keyframes dfThinkingBounce { 0%,80%,100% { transform:scale(0); } 40% { transform:scale(1); } }',

      /* 决策档案卡片 */
      '.df-summary-card { background:#fff; border:1px solid #ede9fe; border-radius:14px; padding:16px; margin:8px 0; }',
      '.df-md-h2 { font-size:15px; font-weight:700; color:#7c3aed; margin:16px 0 8px; padding-bottom:6px; border-bottom:1px solid #ede9fe; }',
      '.df-md-h2:first-child { margin-top:0; }',
      '.df-md-h3 { font-size:14px; font-weight:600; color:#4c1d95; margin:12px 0 6px; }',
      '.df-md-p { font-size:13px; color:#1e293b; line-height:1.7; margin:6px 0; }',
      '.df-md-ul, .df-md-ol { font-size:13px; color:#1e293b; line-height:1.8; padding-left:20px; margin:6px 0; }',
      '.df-md-ul li, .df-md-ol li { margin:2px 0; }',
      '.df-summary-actions { display:flex; gap:8px; margin-top:16px; }',
      '.df-summary-btn { flex:1; padding:10px 12px; border-radius:10px; border:none; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; }',
      '.df-summary-btn-primary { background:linear-gradient(135deg, #8b5cf6, #6366f1); color:#fff; }',
      '.df-summary-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(139,92,246,0.3); }',
      '.df-summary-btn-secondary { background:#f3f4f6; color:#4b5563; }',
      '.df-summary-btn-secondary:hover { background:#e5e7eb; }',

      /* 底部输入栏 */
      '.df-input-bar { display:flex; align-items:center; gap:8px; padding:10px 12px calc(env(safe-area-inset-bottom, 8px) + 10px); border-top:1px solid #f1f5f9; background:#fff; flex-shrink:0; }',
      '.df-input-field { flex:1; border:1.5px solid #e2e8f0; border-radius:24px; padding:10px 16px; font-size:15px; outline:none; font-family:inherit; background:#f8fafc; transition:border-color .2s, background .2s; }',
      '.df-input-field:focus { border-color:#8b5cf6; background:#fff; }',
      '.df-input-field::placeholder { color:#94a3b8; }',
      '.df-input-field:disabled { opacity:0.5; cursor:not-allowed; }',
      '.df-input-send { width:40px; height:40px; border-radius:50%; border:none; background:linear-gradient(135deg, #8b5cf6, #6366f1); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; flex-shrink:0; }',
      '.df-input-send:hover { transform:scale(1.05); }',
      '.df-input-send:active { transform:scale(0.95); }',
      '.df-input-send:disabled { opacity:0.5; cursor:not-allowed; transform:none; }',

      /* 决策档案详情页（已完成的） */
      '.df-detail-section { margin-bottom:20px; }',
      '.df-detail-title { font-size:14px; font-weight:600; color:#475569; margin-bottom:8px; }',
      '.df-detail-input { width:100%; border:1.5px solid #e2e8f0; border-radius:10px; padding:10px 12px; font-size:14px; outline:none; font-family:inherit; background:#f8fafc; transition:border-color .2s; }',
      '.df-detail-input:focus { border-color:#8b5cf6; background:#fff; }',
      '.df-detail-textarea { width:100%; min-height:60px; border:1.5px solid #e2e8f0; border-radius:10px; padding:10px 12px; font-size:14px; outline:none; font-family:inherit; background:#f8fafc; resize:vertical; }',
      '.df-detail-textarea:focus { border-color:#8b5cf6; background:#fff; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ==================== 面板控制 ====================
  function openPanel(sessionId) {
    ensurePanel();
    panelEl.style.display = 'flex';
    state.panelOpen = true;

    if (sessionId) {
      openSession(sessionId);
    } else {
      showView('home');
      renderHistory();
    }

    document.body.style.overflow = 'hidden';
  }

  function closePanel() {
    if (!panelEl) return;
    panelEl.style.display = 'none';
    state.panelOpen = false;
    state.currentSessionId = null;
    state.isAiThinking = false;
    document.body.style.overflow = '';
  }

  function showView(viewName) {
    var views = panelEl.querySelectorAll('.df-view');
    for (var i = 0; i < views.length; i++) {
      views[i].style.display = 'none';
    }
    var target = panelEl.querySelector('#dfView' + viewName.charAt(0).toUpperCase() + viewName.slice(1));
    if (target) target.style.display = 'block';

    // 更新标题和返回按钮
    var titleEl = panelEl.querySelector('#dfHeaderTitle');
    var backBtn = panelEl.querySelector('#dfBackBtn');
    var inputBar = panelEl.querySelector('#dfInputBar');

    if (viewName === 'home') {
      titleEl.textContent = '纠结诊疗室';
      backBtn.style.display = 'none';
      inputBar.style.display = 'none';
    } else if (viewName === 'chat') {
      titleEl.textContent = '决策对辩';
      backBtn.style.display = 'flex';
      inputBar.style.display = 'flex';
    } else if (viewName === 'detail') {
      titleEl.textContent = '决策详情';
      backBtn.style.display = 'flex';
      inputBar.style.display = 'none';
    }
  }

  function goBackHome() {
    showView('home');
    state.currentSessionId = null;
    renderHistory();
  }

  // ==================== 历史列表 ====================
  function renderHistory() {
    var listEl = panelEl.querySelector('#dfHistoryList');
    if (!listEl) return;

    var sessions = loadSessions();
    if (sessions.length === 0) {
      listEl.innerHTML = '<div class="df-history-empty">暂无决策记录</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      var statusText = '';
      var statusClass = '';
      if (s.status === 'active') {
        statusText = '进行中 · 第' + s.currentRound + '轮';
        statusClass = 'df-badge-active';
      } else if (s.status === 'completed') {
        statusText = '已完成';
        statusClass = 'df-badge-completed';
      } else {
        statusText = '已放弃';
        statusClass = 'df-badge-abandoned';
      }

      var dateStr = new Date(s.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      html += '<div class="df-history-item" data-id="' + s.id + '">';
      html += '  <div class="df-history-item-title">' + esc(s.title) + '</div>';
      html += '  <div class="df-history-item-meta">';
      html += '    <span class="df-badge ' + statusClass + '">' + statusText + '</span>';
      html += '    <span>' + dateStr + '</span>';
      html += '  </div>';
      html += '</div>';
    }
    listEl.innerHTML = html;

    // 绑定点击
    var items = listEl.querySelectorAll('.df-history-item');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        openSession(id);
      });
    }
  }

  // ==================== 会话流程 ====================
  function startNewSession() {
    var session = createSession('新的决策');
    state.currentSessionId = session.id;
    showView('chat');
    renderChat(session);
    updateProgress(session.currentRound);
    // 聚焦输入框
    setTimeout(function() {
      var input = panelEl.querySelector('#dfInputField');
      if (input) input.focus();
    }, 300);
  }

  function openSession(sessionId) {
    var session = getSession(sessionId);
    if (!session) return;

    state.currentSessionId = sessionId;

    if (session.status === 'completed') {
      // 已完成：展示决策档案详情
      showView('detail');
      renderDetailView(session);
    } else {
      // 进行中：继续对辩
      showView('chat');
      renderChat(session);
      updateProgress(session.currentRound);
    }
  }

  function renderChat(session) {
    var chatArea = panelEl.querySelector('#dfChatArea');
    if (!chatArea) return;

    var html = '';
    for (var i = 0; i < session.rounds.length; i++) {
      var round = session.rounds[i];
      if (round.aiMessage) {
        html += '<div class="df-msg df-msg-ai">' + esc(round.aiMessage) + '</div>';
      }
      if (round.userAnswer) {
        html += '<div class="df-msg df-msg-user">' + esc(round.userAnswer) + '</div>';
      }
    }
    chatArea.innerHTML = html;
    scrollToBottom();
  }

  function scrollToBottom() {
    var body = panelEl.querySelector('#dfBody');
    if (body) {
      requestAnimationFrame(function() {
        body.scrollTop = body.scrollHeight;
      });
    }
  }

  function updateProgress(currentRound) {
    var steps = panelEl.querySelectorAll('.df-progress-step');
    for (var i = 0; i < steps.length; i++) {
      var step = parseInt(steps[i].getAttribute('data-step'));
      steps[i].classList.remove('df-step-active', 'df-step-done');
      if (step < currentRound) {
        steps[i].classList.add('df-step-done');
      } else if (step === currentRound) {
        steps[i].classList.add('df-step-active');
      }
    }
    // 连线
    for (var j = 1; j <= 3; j++) {
      var line = panelEl.querySelector('#dfLine' + j);
      if (line) {
        if (j < currentRound) {
          line.classList.add('df-line-done');
        } else {
          line.classList.remove('df-line-done');
        }
      }
    }
  }

  function showThinking() {
    var chatArea = panelEl.querySelector('#dfChatArea');
    if (!chatArea) return;
    var thinkingEl = document.createElement('div');
    thinkingEl.className = 'df-msg df-msg-thinking df-thinking-bubble';
    thinkingEl.innerHTML = [
      '<span class="df-thinking-dot"></span>',
      '<span class="df-thinking-dot"></span>',
      '<span class="df-thinking-dot"></span>',
      '<span style="margin-left:4px">思考中...</span>'
    ].join('');
    chatArea.appendChild(thinkingEl);
    scrollToBottom();
  }

  function removeThinking() {
    if (!panelEl) return;
    var bubble = panelEl.querySelector('.df-thinking-bubble');
    if (bubble) bubble.remove();
  }

  function handleSend() {
    if (state.isAiThinking) return;
    var input = panelEl.querySelector('#dfInputField');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    var session = getSession(state.currentSessionId);
    if (!session || session.status !== 'active') return;

    input.value = '';
    state.isAiThinking = true;
    setInputEnabled(false);

    var currentRound = session.currentRound;

    // 保存用户回答到当前轮
    updateSession(session.id, function(s) {
      var roundIndex = -1;
      for (var i = 0; i < s.rounds.length; i++) {
        if (s.rounds[i].round === currentRound) { roundIndex = i; break; }
      }
      if (roundIndex >= 0) {
        s.rounds[roundIndex].userAnswer = text;
      }
      return s;
    });

    // 刷新UI显示用户消息
    var updated = getSession(session.id);
    renderChat(updated);
    showThinking();

    // 决定下一步
    if (currentRound < 4) {
      runAIStep(session.id, currentRound);
    }
  }

  function setInputEnabled(enabled) {
    var input = panelEl.querySelector('#dfInputField');
    var sendBtn = panelEl.querySelector('#dfSendBtn');
    if (input) input.disabled = !enabled;
    if (sendBtn) sendBtn.disabled = !enabled;
  }

  function buildConversationHistory(session, upToRound) {
    var messages = [];
    for (var i = 0; i < session.rounds.length; i++) {
      var r = session.rounds[i];
      if (r.round > upToRound) break;
      if (r.aiMessage && r.round <= upToRound) {
        messages.push({ role: 'assistant', content: r.aiMessage });
      }
      if (r.userAnswer && r.round <= upToRound) {
        messages.push({ role: 'user', content: r.userAnswer });
      }
    }
    return messages;
  }

  async function runAIStep(sessionId, justAnsweredRound) {
    var session = getSession(sessionId);
    if (!session) {
      state.isAiThinking = false;
      setInputEnabled(true);
      return;
    }

    var nextRound = justAnsweredRound + 1;
    var systemPrompt = SYSTEM_PROMPTS['round' + nextRound];

    // 构建 messages：system + 历史对话 + 引导下一轮
    var messages = [{ role: 'system', content: systemPrompt }];
    var history = buildConversationHistory(session, justAnsweredRound);
    messages = messages.concat(history);

    // 第四轮：不需要额外user消息，直接让AI生成总结
    if (nextRound < 4) {
      messages.push({ role: 'user', content: '好的，请继续引导我。' });
    }

    try {
      var aiReply = await callLLM(messages, nextRound === 4 ? 1500 : 500, 0.7);
      removeThinking();

      // 如果是第四轮，标记完成并生成决策档案
      if (nextRound === 4) {
        updateSession(sessionId, function(s) {
          s.currentRound = 4;
          s.status = 'completed';
          s.finalSummary = aiReply;
          s.rounds.push({
            round: 4,
            aiMessage: aiReply,
            userAnswer: '',
            timestamp: now()
          });
          return s;
        });

        var finalSession = getSession(sessionId);
        renderChatWithSummary(finalSession);
        updateProgress(4);
        state.isAiThinking = false;
        setInputEnabled(false);
        // 更新标题（从对话中提取）
        updateTitleFromSummary(sessionId, aiReply);
        return;
      }

      // 正常下一轮
      updateSession(sessionId, function(s) {
        s.currentRound = nextRound;
        s.rounds.push({
          round: nextRound,
          aiMessage: aiReply,
          userAnswer: '',
          timestamp: now()
        });
        return s;
      });

      var updatedSession = getSession(sessionId);
      renderChat(updatedSession);
      updateProgress(nextRound);

    } catch (e) {
      removeThinking();
      var chatArea = panelEl.querySelector('#dfChatArea');
      if (chatArea) {
        var errEl = document.createElement('div');
        errEl.className = 'df-msg df-msg-ai';
        errEl.style.color = '#dc2626';
        errEl.style.background = '#fef2f2';
        errEl.textContent = '抱歉，AI 出了点问题：' + e.message + '。请稍后再试。';
        chatArea.appendChild(errEl);
      }
    }

    state.isAiThinking = false;
    setInputEnabled(true);
  }

  function renderChatWithSummary(session) {
    var chatArea = panelEl.querySelector('#dfChatArea');
    if (!chatArea) return;

    var html = '';
    for (var i = 0; i < session.rounds.length; i++) {
      var r = session.rounds[i];
      if (r.round === 4) continue; // 最后一轮用档案卡片展示
      if (r.aiMessage) {
        html += '<div class="df-msg df-msg-ai">' + esc(r.aiMessage) + '</div>';
      }
      if (r.userAnswer) {
        html += '<div class="df-msg df-msg-user">' + esc(r.userAnswer) + '</div>';
      }
    }

    // 决策档案卡片
    html += '<div class="df-summary-card">';
    html += markdownToHtml(session.finalSummary);
    html += '<div class="df-summary-actions">';
    html += '  <button class="df-summary-btn df-summary-btn-secondary" onclick="DecisionForge.showHistoryFromSession()">返回列表</button>';
    html += '</div>';
    html += '</div>';

    chatArea.innerHTML = html;
    scrollToBottom();
  }

  function showHistoryFromSession() {
    goBackHome();
  }

  function updateTitleFromSummary(sessionId, summary) {
    // 从决策档案中提取核心问题作为标题
    var match = summary.match(/核心问题[\s\S]*?\n([^\n]+)/);
    var title = match ? match[1].trim() : '';
    if (!title || title.length < 2) {
      // 取第一轮用户回答的前20字
      var session = getSession(sessionId);
      if (session && session.rounds.length > 0 && session.rounds[0].userAnswer) {
        title = session.rounds[0].userAnswer.substring(0, 20);
        if (session.rounds[0].userAnswer.length > 20) title += '...';
      }
    }
    if (title) {
      updateSession(sessionId, function(s) {
        s.title = title;
        return s;
      });
    }
  }

  // ==================== 决策详情页（已完成） ====================
  function renderDetailView(session) {
    // 先创建 detail view
    var body = panelEl.querySelector('#dfBody');
    if (!body) return;

    // 检查是否已存在 detail view
    var detailView = panelEl.querySelector('#dfViewDetail');
    if (!detailView) {
      detailView = document.createElement('div');
      detailView.className = 'df-view';
      detailView.id = 'dfViewDetail';
      detailView.style.display = 'none';
      body.appendChild(detailView);
    }

    var html = '';
    html += '<div class="df-summary-card" style="margin-top:0">';
    html += markdownToHtml(session.finalSummary);
    html += '</div>';

    html += '<div class="df-detail-section">';
    html += '  <div class="df-detail-title">你的最终选择</div>';
    html += '  <input type="text" class="df-detail-input" id="dfDecisionMade" value="' + esc(session.decisionMade || '') + '" placeholder="记录你最终选了什么..." />';
    html += '</div>';

    html += '<div class="df-detail-section">';
    html += '  <div class="df-detail-title">后续结果记录</div>';
    html += '  <textarea class="df-detail-textarea" id="dfResultNote" placeholder="后来怎么样了？有什么经验教训...">' + esc(session.resultNote || '') + '</textarea>';
    html += '</div>';

    html += '<div style="display:flex;gap:10px">';
    html += '  <button class="df-summary-btn df-summary-btn-primary" id="dfSaveDetailBtn" style="flex:1">保存记录</button>';
    html += '  <button class="df-summary-btn df-summary-btn-secondary" id="dfAbandonBtn" style="flex:0 0 auto">删除</button>';
    html += '</div>';

    detailView.innerHTML = html;

    // 绑定事件
    detailView.querySelector('#dfSaveDetailBtn').addEventListener('click', function() {
      var decisionEl = detailView.querySelector('#dfDecisionMade');
      var noteEl = detailView.querySelector('#dfResultNote');
      updateSession(session.id, function(s) {
        s.decisionMade = decisionEl.value.trim();
        s.resultNote = noteEl.value.trim();
        return s;
      });
      if (typeof global.showToast === 'function') {
        global.showToast('已保存');
      } else {
        alert('已保存');
      }
    });

    detailView.querySelector('#dfAbandonBtn').addEventListener('click', function() {
      if (!confirm('确定要删除这个决策记录吗？')) return;
      var sessions = loadSessions();
      var filtered = [];
      for (var i = 0; i < sessions.length; i++) {
        if (sessions[i].id !== session.id) filtered.push(sessions[i]);
      }
      saveSessions(filtered);
      goBackHome();
    });

    showView('detail');
  }

  // ==================== 对外 API ====================
  var DecisionForge = {
    renderEntryCard: renderEntryCard,
    openPanel: openPanel,
    closePanel: closePanel,
    showHistoryFromSession: showHistoryFromSession,

    // 调试用
    _getSessions: loadSessions,
    _createSession: createSession,
    _getSession: getSession,
    _callLLM: callLLM,
    _MODULE: MODULE_NAME
  };

  global.DecisionForge = DecisionForge;

})(window);
