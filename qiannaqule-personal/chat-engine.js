/**
 * MiRun AI Chat Engine — 对话引擎主循环 v50
 * Agent 内核：记忆系统 + ReAct推理 + 意图识别 + 工具调用集
 *
 * 架构说明：
 * - 所有用户输入统一进入 chatEngine.process(userInput)
 * - 意图识别 → 选择工具 → 执行工具 → 生成回复 → 记录记忆
 * - 现有功能模块（记账/行为记录/日程等）都是 Agent 可调用的工具
 * - 页面只做结果展示，操作入口统一走对话
 */

(function() {
  'use strict';

  // ========== 意图类型定义 ==========
  var INTENT_TYPES = {
    ACCOUNTING: 'accounting',     // 记账类：收入/支出/转账
    RECORDING: 'recording',       // 记录类：饮食/运动/睡眠/情绪/健康数据
    QUERY: 'query',               // 查询类：问数据/问状态
    ANALYSIS: 'analysis',         // 分析类：要建议/要诊断
    TOOL: 'tool',                 // 工具类：调用纠结诊疗室/价值罗盘等
    SCHEDULE: 'schedule',         // 日程类：添加/查询日程
    HOLDING: 'holding',           // 持仓类：买入/加仓股票（v52.8.0）
    INSURANCE: 'insurance',       // 保单类：新增保险（v52.8.0）
    LOAN: 'loan',                 // 贷款类：新增贷款（v52.8.0）
    CASUAL: 'casual',             // 闲聊类
    UNKNOWN: 'unknown'
  };

  // ========== 工具注册表 ==========
  // 每个工具：{ name, description, execute(params) }
  var _tools = {};

  function registerTool(name, description, handler) {
    _tools[name] = {
      name: name,
      description: description,
      execute: handler
    };
  }

  // ========== 意图识别（关键词匹配 + 兜底AI） ==========
  function detectIntent(text) {
    var lower = text.toLowerCase();
    var trimmed = text.trim();

    // 0.5 v52.8.0 财富域直录优先于记账，避免"买入XX100股XX元"被记账吞掉：
    // 持仓类（买入/加仓/持仓 + 股/手）、保单类、贷款类
    var wealthPatterns = [
      [ /买入|加仓|建仓|买.*股|持仓/.test(trimmed) && /\d+\s*股|\d+\s*手/.test(trimmed), INTENT_TYPES.HOLDING, 0.85 ],
      [ /(?:买|新增|添加|记录)(?:了|了一份|份)?.*(?:保单|保险|重疾险|医疗险|寿险|教育金|年金|投保)/.test(trimmed), INTENT_TYPES.INSURANCE, 0.7 ],
      [ /(?:保单|保险|投保)(?:了|的方式|记录)/.test(trimmed), INTENT_TYPES.INSURANCE, 0.7 ],
      [ /(?:新增|添加|记|办了|申请了)?(?:房贷|车贷|贷款|借款|借了)\d+/.test(trimmed), INTENT_TYPES.LOAN, 0.7 ]
    ];
    for (var wp = 0; wp < wealthPatterns.length; wp++) {
      if (wealthPatterns[wp][0]) {
        return { type: wealthPatterns[wp][1], confidence: wealthPatterns[wp][2] };
      }
    }

    // 1. 记账类：关键词 + 数字模式
    var accountingPatterns = [
      /^(?:收入|支出|花费|花了|消费|赚了|记账|入账|转账).{0,10}\d/,
      /\d+\s*(?:元|块|￥|¥).*/,
      /(?:午餐|晚餐|早餐|早饭|午饭|晚饭|打车|地铁|公交|买菜|购物|工资|奖金|房租)\s*\d+/,
      /(?:记一笔|记个账|记一下账).*/
    ];
    for (var i = 0; i < accountingPatterns.length; i++) {
      if (accountingPatterns[i].test(trimmed)) {
        return { type: INTENT_TYPES.ACCOUNTING, confidence: 0.85 };
      }
    }

    // 2. 记录类：饮食/运动/睡眠/情绪/健康
    var recordingKeywords = [
      '吃了', '早餐', '午餐', '晚餐', '吃了一碗', '喝了',
      '跑步', '走路', '运动了', '锻炼', '健身', '游泳', '瑜伽',
      '睡了', '失眠', '熬夜', '睡眠',
      '心情', '开心', '烦躁', '焦虑', '累了', '压力',
      '体重', '血压', '血糖', '体检', '测量', '测了'
    ];
    for (var j = 0; j < recordingKeywords.length; j++) {
      if (lower.indexOf(recordingKeywords[j]) !== -1) {
        return { type: INTENT_TYPES.RECORDING, confidence: 0.75 };
      }
    }

    // 3. 日程类
    var scheduleKeywords = [
      '日程', '待办', '任务', '安排', '计划', '提醒我', '几点', '会议', '饭局'
    ];
    var schedulePatterns = [
      /(?:今天|明天|后天|下周|周[一二三四五六日]).+(?:点|时)/,
      /\d{1,2}[:：]\d{2}.+(?:会议|见|去|到|提醒)/
    ];
    for (var k = 0; k < scheduleKeywords.length; k++) {
      if (lower.indexOf(scheduleKeywords[k]) !== -1) {
        return { type: INTENT_TYPES.SCHEDULE, confidence: 0.7 };
      }
    }
    for (var m = 0; m < schedulePatterns.length; m++) {
      if (schedulePatterns[m].test(trimmed)) {
        return { type: INTENT_TYPES.SCHEDULE, confidence: 0.8 };
      }
    }

    // 4. 查询类
    var queryKeywords = [
      '多少', '有多少', '花了多少', '余额', '统计', '汇总',
      '今天', '这周', '这个月', '本月', '今年',
      '查看', '看看', '查询', '告诉我', '怎么样', '状态'
    ];
    var queryCount = 0;
    for (var q = 0; q < queryKeywords.length; q++) {
      if (lower.indexOf(queryKeywords[q]) !== -1) queryCount++;
    }
    if (queryCount >= 2 || (queryCount >= 1 && /\?$|？$/.test(trimmed))) {
      return { type: INTENT_TYPES.QUERY, confidence: 0.65 };
    }

    // 5. 分析类
    var analysisKeywords = [
      '分析', '诊断', '建议', '怎么办', '怎么破', '为什么',
      '趋势', '洞察', '总结', '报告', '评估', '改善'
    ];
    for (var a = 0; a < analysisKeywords.length; a++) {
      if (lower.indexOf(analysisKeywords[a]) !== -1) {
        return { type: INTENT_TYPES.ANALYSIS, confidence: 0.7 };
      }
    }

    // 6. 工具类（明确的工具调用）
    var toolMap = {
      '纠结诊疗室': 'decision_forge',
      '纠结': 'decision_forge',
      '价值罗盘': 'value_resonance',
      '价值观': 'value_resonance',
      '决策': 'decision_forge',
      '今日总结': 'daily_summary',
      '体检分析': 'health_analysis'
    };
    for (var tk in toolMap) {
      if (lower.indexOf(tk) !== -1) {
        return { type: INTENT_TYPES.TOOL, confidence: 0.9, tool: toolMap[tk] };
      }
    }

    // 7. 默认：闲聊（短文本偏闲聊，长文本偏分析）
    if (trimmed.length < 8) {
      return { type: INTENT_TYPES.CASUAL, confidence: 0.5 };
    }
    return { type: INTENT_TYPES.UNKNOWN, confidence: 0.3 };
  }

  // ========== 工具路由（根据意图选择工具） ==========
  function routeToTool(intent, text) {
    // 明确指定工具
    if (intent.tool && _tools[intent.tool]) {
      return { toolName: intent.tool, params: { text: text } };
    }

    switch (intent.type) {
      case INTENT_TYPES.ACCOUNTING:
        return { toolName: 'accounting', params: { text: text } };
      case INTENT_TYPES.RECORDING:
        return { toolName: 'behavior_record', params: { text: text } };
      case INTENT_TYPES.HOLDING:
        return { toolName: 'holding', params: { text: text } };
      case INTENT_TYPES.INSURANCE:
        return { toolName: 'insurance_record', params: { text: text } };
      case INTENT_TYPES.LOAN:
        return { toolName: 'loan_record', params: { text: text } };
      case INTENT_TYPES.SCHEDULE:
        return { toolName: 'schedule', params: { text: text } };
      case INTENT_TYPES.QUERY:
        return { toolName: 'data_query', params: { text: text } };
      case INTENT_TYPES.ANALYSIS:
        return { toolName: 'ai_analysis', params: { text: text } };
      case INTENT_TYPES.TOOL:
        return { toolName: intent.tool || 'ai_analysis', params: { text: text } };
      case INTENT_TYPES.CASUAL:
      case INTENT_TYPES.UNKNOWN:
      default:
        return { toolName: 'ai_chat', params: { text: text } };
    }
  }

  // ========== ReAct 思考循环 ==========
  // 简化版：思考 → 行动 → 观察 → 结论
  // 先用关键词直接路由工具，复杂场景走 AI 兜底
  async function reactLoop(userInput, context) {
    var steps = [];

    // Step 1: 思考 — 识别意图
    var intent = detectIntent(userInput);
    steps.push({ step: 'think', content: '识别意图: ' + intent.type + ' (置信度 ' + intent.confidence.toFixed(2) + ')' });

    // Step 2: 行动 — 路由到工具
    var route = routeToTool(intent, userInput);
    steps.push({ step: 'act', content: '调用工具: ' + route.toolName, toolName: route.toolName });

    // Step 3: 观察 — 执行工具
    var toolResult = null;
    var toolError = null;
    try {
      toolResult = await executeTool(route.toolName, route.params);
      steps.push({ step: 'observe', content: '工具执行完成', result: toolResult });
    } catch(e) {
      toolError = e.message || String(e);
      steps.push({ step: 'observe', content: '工具执行失败: ' + toolError, error: true });
    }

    // Step 4: 结论 — 生成回复
    var reply = '';
    if (toolResult && toolResult.reply) {
      reply = toolResult.reply;
    } else if (toolError) {
      reply = '抱歉，处理时遇到了问题：' + toolError + '。让我换一种方式试试。';
    } else {
      // 工具没返回格式化回复，走 AI 总结
      reply = '好的，我来帮你处理。';
    }

    return {
      reply: reply,
      intent: intent,
      toolName: route.toolName,
      toolResult: toolResult,
      steps: steps,
      actions: toolResult ? (toolResult.actions || []) : []
    };
  }

  // ========== 执行工具 ==========
  async function executeTool(toolName, params) {
    var tool = _tools[toolName];
    if (!tool) {
      // 工具不存在，走 AI 聊天兜底
      if (_tools['ai_chat']) {
        return _tools['ai_chat'].execute(params);
      }
      throw new Error('工具不存在: ' + toolName);
    }
    return tool.execute(params);
  }

  // ========== 主入口 ==========
  async function process(userInput, options) {
    options = options || {};

    // 1. 加载上下文（记忆 + 近期对话）
    var context = {};
    if (window.MemoryManager) {
      try {
        context = await window.MemoryManager.getContextForChat();
      } catch(e) {
        console.warn('[ChatEngine] 加载记忆上下文失败:', e);
      }
    }

    // 2. 记录用户消息到近期记忆
    if (window.MemoryManager) {
      window.MemoryManager.recordConversationTurn('user', userInput).catch(function(){});
    }

    // 3. ReAct 循环处理
    var result = await reactLoop(userInput, context);

    // 4. 记录 AI 回复到近期记忆
    if (window.MemoryManager) {
      window.MemoryManager.recordConversationTurn('assistant', result.reply).catch(function(){});
    }

    // 5. 更新用户画像（从对话中提取信息）
    tryUpdateUserProfile(userInput, result);

    return result;
  }

  // ========== 从对话中提取用户信息更新档案 ==========
  function tryUpdateUserProfile(text, result) {
    if (!window.MemoryManager) return;

    var patterns = [
      { regex: /我叫(.+?)(?:，|。|,|\.|$)/, key: 'name', layer: 'user' },
      { regex: /我今年(\d+)岁/, key: 'age', layer: 'user' },
      { regex: /我住在(.+?)(?:，|。|,|\.|$)/, key: 'city', layer: 'user' },
      { regex: /我的工作是(.+?)(?:，|。|,|\.|$)/, key: 'occupation', layer: 'user' },
      { regex: /我对(.+?)过敏/, key: 'allergy', layer: 'user' }
    ];

    patterns.forEach(function(p) {
      var match = text.match(p.regex);
      if (match && match[1]) {
        var value = match[1].trim();
        if (value && value.length < 30) {
          window.MemoryManager.save(p.layer, p.key, value).catch(function(){});
        }
      }
    });
  }

  // ========== 内置基础工具实现 ==========

  // 工具：AI 闲聊（兜底）
  registerTool('ai_chat', '通用AI对话，处理闲聊和未知意图', async function(params) {
    if (window.AiEngine && window.AiEngine.processInput) {
      try {
        var aiResult = await window.AiEngine.processInput(params.text);
        return {
          reply: aiResult.reply || '好的。',
          actions: aiResult.actions || []
        };
      } catch(e) {
        return { reply: '嗯，我在听。有什么我可以帮你的吗？' };
      }
    }
    return { reply: '嗯，我收到了。MiRun AI 正在升级中。' };
  });

  // 工具：记账
  registerTool('accounting', '解析并记录收支转账', async function(params) {
    var text = params.text;

    // 优先调用现有的 daily-tx 解析
    if (window.tryParseTransaction) {
      var txResult = window.tryParseTransaction(text);
      if (txResult && window.dailyTxAdd) {
        window.dailyTxAdd(txResult);
        var typeLabel = txResult.type === 'expense' ? '支出' : '收入';
        var sym = txResult.type === 'expense' ? '-' : '+';
        return {
          reply: '好的，已记录' + typeLabel + ' ¥' + txResult.amount + '。',
          actions: [{ type: 'navigate', module: 'life', subTab: 'finance' }],
          data: txResult
        };
      }
    }

    // 走 AI 解析兜底
    if (window.AiEngine && window.AiEngine.processInput) {
      var aiRes = await window.AiEngine.processInput(text);
      return { reply: aiRes.reply, actions: aiRes.actions };
    }

    return { reply: '我帮你记下来了。' };
  });

  // 工具：行为记录
  registerTool('behavior_record', '记录饮食/运动/睡眠/情绪等健康数据', async function(params) {
    var text = params.text;

    if (window.parseAndRecordBehavior) {
      var bhResult = window.parseAndRecordBehavior(text);
      if (bhResult && bhResult.matched) {
        return {
          reply: bhResult.message || '好的，已记录。',
          actions: [{ type: 'navigate', module: 'health', subTab: 'behavior' }],
          data: bhResult
        };
      }
    }

    if (window.AiEngine && window.AiEngine.processInput) {
      var aiRes = await window.AiEngine.processInput(text);
      return { reply: aiRes.reply, actions: aiRes.actions };
    }

    return { reply: '好的，我记下了。' };
  });

  // 工具：日程
  registerTool('schedule', '添加/查询日程安排', async function(params) {
    var text = params.text;

    if (window.tryParseSchedule) {
      var schResult = window.tryParseSchedule(text);
      if (schResult && window.scheduleAddTask) {
        window.scheduleAddTask({
          title: schResult.title,
          desc: '',
          date: schResult.date,
          time: schResult.time,
          deadline: schResult.date,
          reminder: schResult.time
        });
        return {
          reply: '好的，已添加日程：' + schResult.title + (schResult.time ? '（' + schResult.time + '）' : ''),
          actions: [{ type: 'navigate', module: 'life', subTab: 'schedule' }],
          data: schResult
        };
      }
    }

    if (window.AiEngine && window.AiEngine.processInput) {
      var aiRes = await window.AiEngine.processInput(text);
      return { reply: aiRes.reply, actions: aiRes.actions };
    }

    return { reply: '好的，我帮你记下了。' };
  });

  // ========== v52.8.0 财富域对话直录工具（持仓/保单/贷款） ==========

  // 工具：持仓（买入/加仓股票）
  registerTool('holding', '记录/买入/加仓股票持仓', async function(params) {
    var text = params.text;
    if (window.parseHoldingFromText && window.StockHoldings && typeof window.StockHoldings.addHoldingDirect === 'function') {
      var h = window.parseHoldingFromText(text);
      if (h) {
        var saved = window.StockHoldings.addHoldingDirect(h);
        if (saved) {
          try { if (typeof window.renderInvestOverviewIfAvail === 'function') window.renderInvestOverviewIfAvail(); } catch(e) {}
          try { if (typeof window.refreshWealthDashboard === 'function') window.refreshWealthDashboard(); } catch(e) {}
          return {
            reply: '好的，已记录持仓：' + saved.name + '（' + saved.quantity + '股，成本 ¥' + saved.cost_price + '）',
            actions: [{ type: 'navigate', module: 'life', subTab: 'holdings' }],
            data: saved
          };
        }
      }
    }
    if (window.AiEngine && window.AiEngine.processInput) {
      var aiRes = await window.AiEngine.processInput(text);
      return { reply: aiRes.reply, actions: aiRes.actions };
    }
    return { reply: '好的，已收到。你可以告诉我「买入贵州茅台100股1800元」这样记持仓。' };
  });

  // 工具：保单（新增保险）
  registerTool('insurance_record', '新增/记录保险保单', async function(params) {
    var text = params.text;
    if (window.parseInsuranceFromText && window.WealthCT && typeof window.WealthCT.loadInsurance === 'function') {
      var r = window.parseInsuranceFromText(text);
      if (r) {
        var ins = window.WealthCT.loadInsurance() || [];
        ins.push(r);
        window.WealthCT.saveInsurance(ins);
        try { if (typeof window.renderInsuranceSummary === 'function') window.renderInsuranceSummary(); } catch(e) {}
        try { if (typeof window.refreshWealthDashboard === 'function') window.refreshWealthDashboard(); } catch(e) {}
        return {
          reply: '好的，已添加保单（保额 ¥' + (Math.round(r.amount)||0) + '，年缴 ¥' + (Math.round(r.premium)||0) + '）',
          actions: [{ type: 'navigate', module: 'life', subTab: 'wealth' }],
          data: r
        };
      }
    }
    if (window.AiEngine && window.AiEngine.processInput) {
      var aiRes = await window.AiEngine.processInput(text);
      return { reply: aiRes.reply, actions: aiRes.actions };
    }
    return { reply: '好的，已收到。你可以告诉我「添加一份保额50万、年缴8000的重疾险」这样记保单。' };
  });

  // 工具：贷款（新增贷款）
  registerTool('loan_record', '新增/记录贷款', async function(params) {
    var text = params.text;
    if (window.parseLoanFromText && window.WealthCT && typeof window.WealthCT.loadLoans === 'function') {
      var r = window.parseLoanFromText(text);
      if (r) {
        var loans = window.WealthCT.loadLoans() || [];
        loans.push(r);
        window.WealthCT.saveLoans(loans);
        try { if (typeof window.renderInsuranceSummary === 'function') window.renderInsuranceSummary(); } catch(e) {}
        try { if (typeof window.refreshWealthDashboard === 'function') window.refreshWealthDashboard(); } catch(e) {}
        return {
          reply: '好的，已添加贷款：' + (r.name || '贷款') + '（¥' + (Math.round(r.amt)||0) + '）',
          actions: [{ type: 'navigate', module: 'life', subTab: 'wealth' }],
          data: r
        };
      }
    }
    if (window.AiEngine && window.AiEngine.processInput) {
      var aiRes = await window.AiEngine.processInput(text);
      return { reply: aiRes.reply, actions: aiRes.actions };
    }
    return { reply: '好的，已收到。你可以告诉我「添加一笔50万的房贷」这样记贷款。' };
  });

  // ========== v52.8.0 财富域对话直录工具结束 ==========

  // 工具：数据查询
  registerTool('data_query', '查询各类数据汇总', async function(params) {
    var text = params.text;

    if (window.AiEngine && window.AiEngine.processInput) {
      try {
        var aiRes = await window.AiEngine.processInput(text);
        return { reply: aiRes.reply, actions: aiRes.actions };
      } catch(e) {
        // 静默失败，走简单回复
      }
    }

    // 简单本地查询
    var reply = '我来帮你查一下数据...';
    var actions = [];

    if (/支出|花费|消费/.test(text)) {
      actions.push({ type: 'navigate', module: 'life', subTab: 'finance' });
    } else if (/日程|待办|任务/.test(text)) {
      actions.push({ type: 'navigate', module: 'life', subTab: 'schedule' });
    } else if (/健康|身体|运动|饮食/.test(text)) {
      actions.push({ type: 'navigate', module: 'health', subTab: 'trend' });
    }

    return { reply: reply, actions: actions };
  });

  // 工具：AI 分析
  registerTool('ai_analysis', '深度分析与建议', async function(params) {
    if (window.AiEngine && window.AiEngine.processInput) {
      var aiRes = await window.AiEngine.processInput(params.text);
      return { reply: aiRes.reply, actions: aiRes.actions };
    }
    return { reply: '好的，我来分析一下。' };
  });

  // 工具：纠结诊疗室
  registerTool('decision_forge', '三轮对辩决策辅助工具', async function(params) {
    if (window.DecisionForge && window.DecisionForge.openPanel) {
      window.DecisionForge.openPanel();
      return {
        reply: '好的，我来帮你梳理这个决策。让我们打开纠结诊疗室，通过三轮对辩把问题想清楚。',
        actions: [{ type: 'navigate', module: 'work', subTab: 'decision' }]
      };
    }
    return { reply: '让我们来仔细想想这个问题。' };
  });

  // 工具：价值罗盘
  registerTool('value_resonance', '价值观对齐与人生目标工具', async function(params) {
    if (window.ValueResonance && window.ValueResonance.openPanel) {
      window.ValueResonance.openPanel();
      return {
        reply: '好的，让我们回到你的价值锚点，看看什么对你真正重要。',
        actions: [{ type: 'navigate', module: 'work', subTab: 'decision' }]
      };
    }
    return { reply: '让我们回到初心，想想什么对你最重要。' };
  });

  // ========== 快捷指令 ==========
  var QUICK_COMMANDS = [
    { icon: '📝', label: '记一笔', hint: '随手记账', command: '记一笔' },
    { icon: '😊', label: '记录心情', hint: '此刻感受', command: '记录心情：' },
    { icon: '📋', label: '今日总结', hint: '一天回顾', command: '今日总结' },
    { icon: '🏥', label: '体检分析', hint: '健康报告', command: '体检分析' }
  ];

  // ========== 快捷指令 HTML 渲染 ==========
  function renderQuickCommands(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var html = '<div class="quick-commands-grid">';
    QUICK_COMMANDS.forEach(function(cmd, idx) {
      html += '<div class="quick-command-card" onclick="ChatEngine.sendQuickCommand(' + idx + ')">';
      html += '<div class="qc-icon">' + cmd.icon + '</div>';
      html += '<div class="qc-label">' + cmd.label + '</div>';
      html += '<div class="qc-hint">' + cmd.hint + '</div>';
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }

  function sendQuickCommand(index) {
    var cmd = QUICK_COMMANDS[index];
    if (!cmd) return;
    var field = document.getElementById('aiInputField');
    if (field) {
      field.value = cmd.command;
      field.focus();
    }
  }

  // ========== 今日概览数据 ==========
  function getTodayOverview() {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    var todayStr = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');

    // 今日支出
    var expenseToday = 0;
    try {
      var txList = [];
      if (window.DataStore && DataStore.load) {
        txList = DataStore.load('daily_tx', 'records', []) || [];
      } else {
        txList = JSON.parse(localStorage.getItem('mijieai_daily_tx') || '[]');
      }
      txList.forEach(function(t) {
        if (t.date === todayStr && t.type === 'expense') expenseToday += t.amount;
      });
    } catch(e) {}

    // 今日运动时长（分钟）
    var exerciseMin = 0;
    try {
      if (window.DataStore && DataStore.load) {
        var behaviors = DataStore.load('behavior_log', 'records', []) || [];
        behaviors.forEach(function(b) {
          if (b.date === todayStr && b.category === 'exercise') {
            exerciseMin += b.duration || 0;
          }
        });
      }
    } catch(e) {}

    // 今日待办数
    var todoCount = 0;
    try {
      if (window.scheduleGetTasks) {
        var tasks = window.scheduleGetTasks().filter(function(t) {
          return t.date === todayStr && t.status !== 'done';
        });
        todoCount = tasks.length;
      }
    } catch(e) {}

    return {
      expense: expenseToday,
      exercise: exerciseMin,
      todos: todoCount,
      date: todayStr
    };
  }

  function renderTodayOverview(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var data = getTodayOverview();

    var html = '<div class="today-overview-bar">';
    html += '<div class="ov-item" onclick="switchModule(\'life\', \'finance\')">';
    html += '<span class="ov-value">¥' + data.expense.toFixed(0) + '</span>';
    html += '<span class="ov-label">今日支出</span>';
    html += '</div>';
    html += '<div class="ov-divider"></div>';
    html += '<div class="ov-item" onclick="switchModule(\'health\', \'behavior\')">';
    html += '<span class="ov-value">' + data.exercise + '分</span>';
    html += '<span class="ov-label">运动时长</span>';
    html += '</div>';
    html += '<div class="ov-divider"></div>';
    html += '<div class="ov-item" onclick="switchModule(\'life\', \'schedule\')">';
    html += '<span class="ov-value">' + data.todos + '件</span>';
    html += '<span class="ov-label">待办事项</span>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
  }

  // ========== 导出 ==========
  window.ChatEngine = {
    INTENT_TYPES: INTENT_TYPES,
    process: process,
    detectIntent: detectIntent,
    registerTool: registerTool,
    executeTool: executeTool,
    QUICK_COMMANDS: QUICK_COMMANDS,
    renderQuickCommands: renderQuickCommands,
    sendQuickCommand: sendQuickCommand,
    getTodayOverview: getTodayOverview,
    renderTodayOverview: renderTodayOverview,
    getTools: function() { return Object.keys(_tools); }
  };

})();
