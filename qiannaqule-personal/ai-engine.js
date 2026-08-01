/**
 * AI Engine - 米界AI智能引擎
 * 接入LLM实现自然语言理解、智能决策、主动推荐
 * 
 * 架构：
 *   用户输入 → 上下文收集 → SystemPrompt构建 → LLM调用 → 指令解析 → 执行
 */
(function() {
  'use strict';

  var CONFIG_KEY = 'mijieai_ai_config';
  var CHAT_HISTORY_KEY = 'mijieai_chat_history';
  var MAX_HISTORY = 20; // 保留最近20轮对话

  // ==================== 配置管理 ====================

  var PROVIDERS = {
    kimi: {
      name: 'Kimi (Moonshot)',
      apiBase: 'https://api.moonshot.cn/v1',
      models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
      defaultModel: 'moonshot-v1-8k'
    },
    qwen: {
      name: '通义千问 (DashScope)',
      apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
      defaultModel: 'qwen-turbo'
    },
    custom: {
      name: '自定义 (OpenAI兼容)',
      apiBase: '',
      models: [],
      defaultModel: ''
    }
  };

  function getConfig() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      if (raw) {
        var cfg = JSON.parse(raw);
        // 兼容性处理
        if (!cfg.provider) cfg.provider = 'kimi';
        if (!cfg.apiBase && cfg.provider !== 'custom') {
          cfg.apiBase = PROVIDERS[cfg.provider].apiBase;
        }
        if (!cfg.model && cfg.provider !== 'custom') {
          cfg.model = PROVIDERS[cfg.provider].defaultModel;
        }
        return cfg;
      }
    } catch(e) {}
    return JSON.parse(JSON.stringify({
      provider: 'kimi',
      apiKey: '',
      model: 'moonshot-v1-8k',
      apiBase: 'https://api.moonshot.cn/v1',
      customApiBase: '',
      customModel: '',
      maxTokens: 1024,
      temperature: 0.7
    }));
  }

  function saveConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  function isConfigured() {
    var cfg = getConfig();
    return !!(cfg.apiKey && cfg.apiBase);
  }

  // ==================== 上下文收集 ====================

  function collectContext() {
    var now = new Date();
    var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    var ctx = {
      currentTime: now.toLocaleString('zh-CN', {year:'numeric',month:'long',day:'numeric',weekday:'long',hour:'2-digit',minute:'2-digit'}),
      todayDate: todayStr,
      solarTerm: null,
      healthProfile: null,
      todaySchedule: [],
      todayFinance: { income: 0, expense: 0 },
      recentMood: null
    };

    // 节气信息
    try {
      if (window.solarGetCurrentTermData) {
        var td = window.solarGetCurrentTermData();
        if (td) {
          ctx.solarTerm = {
            name: td.name,
            summary: td.summary,
            principle: td.principle,
            foods: td.foods ? td.foods.slice(0, 6) : [],
            tips: td.tips
          };
        }
      }
    } catch(e) {}

    // 健康档案
    try {
      var hp = JSON.parse(localStorage.getItem('mijieai_health_profile') || '{}');
      if (hp.screened && hp.conditions && hp.conditions.length > 0) {
        ctx.healthProfile = { conditions: hp.conditions };
      }
    } catch(e) {}

    // 今日日程
    try {
      if (window.scheduleGetTasks) {
        var tasks = window.scheduleGetTasks();
        ctx.todaySchedule = tasks.filter(function(t) {
          return t.date === todayStr && t.status !== 'done';
        }).map(function(t) {
          return { title: t.title, group: t.group, priority: t.priority, status: t.status };
        });
      }
    } catch(e) {}

    // 今日收支
    try {
      var txList = JSON.parse(localStorage.getItem('mijieai_daily_tx') || '[]');
      txList.forEach(function(t) {
        if (t.date === todayStr) {
          if (t.type === 'income') ctx.todayFinance.income += t.amount;
          else ctx.todayFinance.expense += t.amount;
        }
      });
    } catch(e) {}

    // 最近情绪
    try {
      var moodLog = JSON.parse(localStorage.getItem('mijieai_mood_log') || '[]');
      if (moodLog.length > 0) {
        var latest = moodLog[moodLog.length - 1];
        ctx.recentMood = { mood: latest.mood, date: latest.date };
      }
    } catch(e) {}

    // 统一用户画像
    try {
      if (window.UserProfile) {
        ctx.userProfileSummary = window.UserProfile.getSummary();
        ctx.userProfileCompleteness = window.UserProfile.getCompleteness();
      }
    } catch(e) {}

    return ctx;
  }

  // ==================== Prompt构建 ====================

  function buildSystemPrompt(context) {
    var prompt = '你是「米界AI」——一个私人智能助手，风格类似钢铁侠的贾维斯。\n';
    prompt += '你服务于你的主人"小米"，你需要主动、智能、高效地帮助他管理生活。\n\n';

    prompt += '## 当前上下文\n';
    prompt += '- 当前时间：' + context.currentTime + '\n';
    if (context.solarTerm) {
      prompt += '- 当前节气：' + context.solarTerm.name + '（' + context.solarTerm.summary + '）\n';
      prompt += '- 养生原则：' + context.solarTerm.principle + '\n';
      prompt += '- 宜食：' + context.solarTerm.foods.join('、') + '\n';
    }
    if (context.healthProfile) {
      prompt += '- 用户健康状况：' + context.healthProfile.conditions.join('、') + '\n';
    }
    if (context.todaySchedule.length > 0) {
      prompt += '- 今日待办日程：\n';
      context.todaySchedule.forEach(function(t) {
        prompt += '  · ' + t.title + (t.group ? ' [' + t.group + ']' : '') + ' - ' + (t.status === 'progress' ? '进行中' : '待开始') + '\n';
      });
    } else {
      prompt += '- 今日暂无待办日程\n';
    }
    prompt += '- 今日收支：收入 ¥' + context.todayFinance.income + '，支出 ¥' + context.todayFinance.expense + '\n';
    if (context.recentMood) {
      prompt += '- 最近情绪记录：' + context.recentMood.mood + '（' + context.recentMood.date + '）\n';
    }
    if (context.userProfileSummary) {
      prompt += '\n## 用户画像\n' + context.userProfileSummary + '\n';
    }

    prompt += '\n## 你的能力\n';
    prompt += '你可以通过actions执行以下操作：\n';
    prompt += '- navigate(module): 切换到模块。可选: home, finance, dailytx, solar, schedule, behavior\n';
    prompt += '- add_schedule(title, date?, group?): 添加日程任务。date格式YYYY-MM-DD，默认今天\n';
    prompt += '- add_expense(amount, ctField, note?): 记录支出。ctField可选: expensePersonal, expenseFamily, expenseEducation, expenseMedical, loanPayment, insurance\n';
    prompt += '- add_income(amount, ctField, note?): 记录收入。ctField可选: jobIncome, rentalIncome, investIncome, sideIncome\n';
    prompt += '- set_reminder(text, datetime): 设置提醒\n';
    prompt += '- query_weather(city?): 查询天气（无city则用用户所在城市）\n';
    prompt += '- recommend_recipe(): 根据当前节气和用户健康状况推荐食谱\n';
    prompt += '- show_health_tips(): 展示当前节气养生建议\n';

    prompt += '\n## 回复规则\n';
    prompt += '1. 你必须以JSON格式回复，格式如下：\n';
    prompt += '```json\n';
    prompt += '{\n';
    prompt += '  "reply": "对用户的自然语言回复，简洁友好，像贾维斯一样专业又有人情味",\n';
    prompt += '  "actions": [\n';
    prompt += '    {"type": "navigate", "module": "模块名"},\n';
    prompt += '    {"type": "add_schedule", "title": "任务标题", "date": "2026-08-01", "group": "分组"},\n';
    prompt += '    {"type": "add_expense", "amount": 50, "ctField": "expensePersonal", "note": "午餐"},\n';
    prompt += '    {"type": "add_income", "amount": 1000, "ctField": "jobIncome", "note": "项目款"}\n';
    prompt += '  ]\n';
    prompt += '}\n';
    prompt += '```\n';
    prompt += '2. 如果不需要执行操作，actions为空数组 []\n';
    prompt += '3. 回复要简洁（通常2-3句话），有温度，体现主动性\n';
    prompt += '4. 当用户问健康/饮食问题时，结合当前节气和健康档案给出建议\n';
    prompt += '5. 当用户说"记一笔"/"花了"/"收入"时，提取金额和分类，生成add_expense或add_income action\n';
    prompt += '6. 当用户说"添加日程"/"提醒我"时，提取标题和日期，生成add_schedule action\n';
    prompt += '7. 当用户的请求涉及多个操作时，可以返回多个actions\n';
    prompt += '8. 严禁使用emoji\n';
    prompt += '9. 严禁回复非JSON内容，必须严格JSON格式\n';

    return prompt;
  }

  // ==================== LLM调用 ====================

  async function callLLM(messages) {
    var cfg = getConfig();
    if (!cfg.apiKey) throw new Error('请先配置API Key');

    var apiBase = cfg.provider === 'custom' ? cfg.customApiBase : cfg.apiBase;
    var model = cfg.provider === 'custom' ? cfg.customModel : cfg.model;
    var url = apiBase.replace(/\/$/, '') + '/chat/completions';

    var body = {
      model: model,
      messages: messages,
      max_tokens: cfg.maxTokens || 1024,
      temperature: cfg.temperature || 0.7
    };

    var resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.apiKey
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      var errText = await resp.text();
      throw new Error('API调用失败 (' + resp.status + '): ' + errText);
    }

    var data = await resp.json();
    var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('API返回为空');
    return content;
  }

  // ==================== 响应解析 ====================

  function parseResponse(content) {
    // 尝试提取JSON
    var jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    var jsonStr = jsonMatch ? jsonMatch[1] : content;

    // 尝试找到第一个 { 和最后一个 }
    var start = jsonStr.indexOf('{');
    var end = jsonStr.lastIndexOf('}');
    if (start === -1 || end === -1) {
      return { reply: content, actions: [] };
    }
    jsonStr = jsonStr.substring(start, end + 1);

    try {
      var parsed = JSON.parse(jsonStr);
      return {
        reply: parsed.reply || content,
        actions: parsed.actions || []
      };
    } catch(e) {
      // JSON解析失败，直接作为回复文本
      return { reply: content, actions: [] };
    }
  }

  // ==================== Action执行 ====================

  function executeActions(actions) {
    var results = [];
    if (!actions || !Array.isArray(actions)) return results;

    actions.forEach(function(action) {
      try {
        switch(action.type) {
          case 'navigate':
            if (action.module && window.switchModule) {
              window.switchModule(action.module);
              results.push({ type: 'navigate', success: true, module: action.module });
            }
            break;

          case 'add_schedule':
            if (action.title && window.scheduleAddTask) {
              var task = {
                title: action.title,
                desc: action.desc || '',
                date: action.date || new Date().toISOString().substr(0, 10),
                group: action.group || ''
              };
              window.scheduleAddTask(task);
              results.push({ type: 'add_schedule', success: true, title: action.title });
            }
            break;

          case 'add_expense':
            if (action.amount && window.dailyTxAdd) {
              window.dailyTxAdd({
                type: 'expense',
                amount: parseFloat(action.amount),
                ctField: action.ctField || 'expensePersonal',
                note: action.note || '',
                date: new Date().toISOString().substr(0, 10)
              });
              results.push({ type: 'add_expense', success: true, amount: action.amount });
            }
            break;

          case 'add_income':
            if (action.amount && window.dailyTxAdd) {
              window.dailyTxAdd({
                type: 'income',
                amount: parseFloat(action.amount),
                ctField: action.ctField || 'jobIncome',
                note: action.note || '',
                date: new Date().toISOString().substr(0, 10)
              });
              results.push({ type: 'add_income', success: true, amount: action.amount });
            }
            break;

          case 'recommend_recipe':
            if (window.switchModule) {
              window.switchModule('solar');
              results.push({ type: 'navigate', success: true, module: 'solar' });
            }
            break;

          case 'show_health_tips':
            if (window.switchModule) {
              window.switchModule('solar');
              if (window.solarSwitchView) {
                setTimeout(function() { window.solarSwitchView('health'); }, 300);
              }
              results.push({ type: 'navigate', success: true, module: 'solar' });
            }
            break;

          default:
            results.push({ type: action.type, success: false, error: '未知操作类型' });
        }
      } catch(e) {
        results.push({ type: action.type, success: false, error: e.message });
      }
    });

    return results;
  }

  // ==================== 对话历史管理 ====================

  function getChatHistory() {
    try {
      return JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
    } catch(e) { return []; }
  }

  function saveChatHistory(history) {
    // 只保留最近N轮
    if (history.length > MAX_HISTORY * 2) {
      history = history.slice(-MAX_HISTORY * 2);
    }
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
  }

  function clearChatHistory() {
    localStorage.removeItem(CHAT_HISTORY_KEY);
  }

  // ==================== 主入口 ====================

  async function processInput(text) {
    if (!text || !text.trim()) {
      return { reply: '请输入你的需求', actions: [], results: [] };
    }

    // 检查是否配置了API
    if (!isConfigured()) {
      // 降级到关键词匹配
      return fallbackIntent(text);
    }

    var context = collectContext();
    var systemPrompt = buildSystemPrompt(context);
    var history = getChatHistory();

    // 构建消息列表
    var messages = [{ role: 'system', content: systemPrompt }];
    // 加入历史对话（最近几轮）
    var recentHistory = history.slice(-10); // 最近5轮（每轮user+assistant）
    messages = messages.concat(recentHistory);
    messages.push({ role: 'user', content: text });

    try {
      var raw = await callLLM(messages);
      var result = parseResponse(raw);

      // 保存对话历史
      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: raw });
      saveChatHistory(history);

      // 执行actions
      result.results = executeActions(result.actions);

      return result;
    } catch(e) {
      // 出错降级
      console.error('[AiEngine] LLM调用失败:', e);
      return {
        reply: 'AI服务暂时不可用：' + e.message + '。请检查API配置。',
        actions: [],
        results: [],
        error: true
      };
    }
  }

  // 降级方案：关键词匹配（与原detectIntent一致）
  function fallbackIntent(text) {
    var t = text;
    if (/贷款|负债|还款|借|利息|房贷|车贷|信用|融资|收入|支出|消费|花了|挣|工资|账单|预算|记账/.test(t)) {
      return { reply: '已切换到「财富诊断CT」', actions: [{type:'navigate',module:'finance'}], results: [] };
    }
    if (/提醒|日程|待办|还款日|缴费|会议|预约|安排|计划|排期|饭局|聚会|今晚|明天|后天|周末|下午|上午|点钟|点半|出差|电影|挂号/.test(t)) {
      return { reply: '已切换到「日程管理」', actions: [{type:'navigate',module:'schedule'}], results: [] };
    }
    if (/食谱|菜谱|饭菜|煲汤|养生|节气|时令|食疗|滋补|祛湿|清热|食材|菜品|炖汤|营养|热量|蛋白质|水果|蔬菜|肉|喝/.test(t)) {
      return { reply: '已切换到「节气养生」', actions: [{type:'navigate',module:'solar'}], results: [] };
    }
    if (/添加任务|新建任务/.test(t)) {
      var addMatch = t.match(/添加任务[：:]\s*(.+)/);
      if (addMatch && window.scheduleAddTask) {
        window.scheduleAddTask({ title: addMatch[1].trim(), desc: '' });
        return { reply: '已添加任务：' + addMatch[1].trim(), actions: [{type:'navigate',module:'schedule'}], results: [] };
      }
    }
    return { reply: '意图识别中，请配置AI引擎以获得更智能的理解能力。', actions: [], results: [] };
  }

  // ==================== UI: 设置面板 ====================

  function renderSettingsUI(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var cfg = getConfig();
    var html = '<div class="ai-settings">';
    html += '<div class="ai-settings-header">';
    html += '<h3>AI引擎配置</h3>';
    html += '<span class="ai-status ' + (isConfigured() ? 'online' : 'offline') + '">' + (isConfigured() ? '已连接' : '未配置') + '</span>';
    html += '</div>';

    // Provider选择
    html += '<div class="ai-field">';
    html += '<label>服务商</label>';
    html += '<select id="aiProvider" onchange="window.AiEngine.onProviderChange()">';
    Object.keys(PROVIDERS).forEach(function(key) {
      html += '<option value="' + key + '"' + (cfg.provider === key ? ' selected' : '') + '>' + PROVIDERS[key].name + '</option>';
    });
    html += '</select></div>';

    // API Key
    html += '<div class="ai-field">';
    html += '<label>API Key</label>';
    html += '<input type="password" id="aiApiKey" placeholder="输入你的API Key" value="' + (cfg.apiKey || '') + '" />';
    html += '<span class="ai-hint">Kimi: <a href="https://platform.moonshot.cn/console/api-keys" target="_blank">获取Key</a> | 通义千问: <a href="https://dashscope.console.aliyun.com/apiKey" target="_blank">获取Key</a></span>';
    html += '</div>';

    // 自定义API地址（仅custom时显示）
    html += '<div class="ai-field" id="aiCustomFields" style="display:' + (cfg.provider === 'custom' ? 'block' : 'none') + '">';
    html += '<label>API地址</label>';
    html += '<input type="text" id="aiCustomBase" placeholder="https://api.example.com/v1" value="' + (cfg.customApiBase || '') + '" />';
    html += '<label>模型名称</label>';
    html += '<input type="text" id="aiCustomModel" placeholder="model-name" value="' + (cfg.customModel || '') + '" />';
    html += '</div>';

    // 模型选择
    html += '<div class="ai-field" id="aiModelField">';
    html += '<label>模型</label>';
    html += '<select id="aiModel">';
    var provider = PROVIDERS[cfg.provider] || PROVIDERS.kimi;
    provider.models.forEach(function(m) {
      html += '<option value="' + m + '"' + (cfg.model === m ? ' selected' : '') + '>' + m + '</option>';
    });
    html += '</select></div>';

    // 高级设置
    html += '<div class="ai-advanced" id="aiAdvanced" style="display:none">';
    html += '<div class="ai-field"><label>Max Tokens</label><input type="number" id="aiMaxTokens" value="' + (cfg.maxTokens || 1024) + '" min="256" max="4096" /></div>';
    html += '<div class="ai-field"><label>Temperature</label><input type="range" id="aiTemp" min="0" max="1" step="0.1" value="' + (cfg.temperature || 0.7) + '" /><span id="aiTempVal">' + (cfg.temperature || 0.7) + '</span></div>';
    html += '</div>';
    html += '<div style="text-align:right;margin-top:4px"><a href="javascript:void(0)" onclick="var el=document.getElementById(\'aiAdvanced\');el.style.display=el.style.display===\'none\'?\'block\':\'none\'" style="font-size:11px;color:#9ca3af">高级设置</a></div>';

    // 按钮
    html += '<div class="ai-btns">';
    html += '<button class="ai-btn-save" onclick="window.AiEngine.saveSettings()">保存配置</button>';
    html += '<button class="ai-btn-test" onclick="window.AiEngine.testConnection()">测试连接</button>';
    html += '<button class="ai-btn-clear" onclick="window.AiEngine.clearHistory()">清空对话</button>';
    html += '</div>';

    // 测试结果
    html += '<div id="aiTestResult" style="display:none;margin-top:10px;padding:10px;border-radius:8px;font-size:12px"></div>';

    html += '</div>';
    container.innerHTML = html;
  }

  function onProviderChange() {
    var sel = document.getElementById('aiProvider');
    var provider = sel.value;
    var customFields = document.getElementById('aiCustomFields');
    var modelField = document.getElementById('aiModelField');
    var modelSelect = document.getElementById('aiModel');

    if (provider === 'custom') {
      customFields.style.display = 'block';
      modelField.style.display = 'none';
    } else {
      customFields.style.display = 'none';
      modelField.style.display = 'block';
      var models = PROVIDERS[provider].models;
      modelSelect.innerHTML = '';
      models.forEach(function(m) {
        var opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        modelSelect.appendChild(opt);
      });
    }
  }

  function saveSettings() {
    var cfg = getConfig();
    cfg.provider = document.getElementById('aiProvider').value;
    cfg.apiKey = document.getElementById('aiApiKey').value.trim();
    cfg.maxTokens = parseInt(document.getElementById('aiMaxTokens').value) || 1024;
    cfg.temperature = parseFloat(document.getElementById('aiTemp').value) || 0.7;

    if (cfg.provider === 'custom') {
      cfg.customApiBase = document.getElementById('aiCustomBase').value.trim();
      cfg.customModel = document.getElementById('aiCustomModel').value.trim();
      cfg.apiBase = cfg.customApiBase;
      cfg.model = cfg.customModel;
    } else {
      cfg.model = document.getElementById('aiModel').value;
      cfg.apiBase = PROVIDERS[cfg.provider].apiBase;
    }

    saveConfig(cfg);

    // 更新状态显示
    var statusEl = document.querySelector('.ai-status');
    if (statusEl) {
      statusEl.textContent = isConfigured() ? '已连接' : '未配置';
      statusEl.className = 'ai-status ' + (isConfigured() ? 'online' : 'offline');
    }

    if (typeof window.showToast === 'function') {
      window.showToast('AI配置已保存');
    }
  }

  async function testConnection() {
    var resultEl = document.getElementById('aiTestResult');
    if (!resultEl) return;
    resultEl.style.display = 'block';
    resultEl.style.background = '#eff6ff';
    resultEl.style.color = '#1d4ed8';
    resultEl.textContent = '正在测试连接...';

    try {
      var resp = await callLLM([
        { role: 'system', content: '你是一个测试助手。请用一句话回复：连接成功。' },
        { role: 'user', content: '测试' }
      ]);
      resultEl.style.background = '#f0fdf4';
      resultEl.style.color = '#166534';
      resultEl.textContent = '连接成功！AI回复：' + resp.substring(0, 100);
    } catch(e) {
      resultEl.style.background = '#fef2f2';
      resultEl.style.color = '#dc2626';
      resultEl.textContent = '连接失败：' + e.message;
    }
  }

  function clearHistory() {
    clearChatHistory();
    if (typeof window.showToast === 'function') {
      window.showToast('对话历史已清空');
    }
  }

  // ==================== 导出 ====================

  window.AiEngine = {
    processInput: processInput,
    getConfig: getConfig,
    saveConfig: saveConfig,
    isConfigured: isConfigured,
    collectContext: collectContext,
    renderSettingsUI: renderSettingsUI,
    onProviderChange: onProviderChange,
    saveSettings: saveSettings,
    testConnection: testConnection,
    clearHistory: clearHistory,
    getProviders: function() { return PROVIDERS; },
    fallbackIntent: fallbackIntent
  };

})();
