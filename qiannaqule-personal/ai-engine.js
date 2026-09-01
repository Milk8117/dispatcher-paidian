/**
 * AI Engine v2 - MiRun AI 智能引擎
 * 多Provider降级链 + 零配置默认模式 + 任务分档 + Token预算控制
 *
 * 架构：
 *   用户输入 → 任务分档 → 缓存查询 → 上下文收集 → Prompt构建(截断) → LLM降级调用 → 指令解析 → 执行
 */
(function() {
  'use strict';

  // 注册本模块到 DataStore
  if (window.DataStore && DataStore.registerModule) {
    DataStore.registerModule('ai_engine', {
      config: 'mijieai_ai_config',
      usage: 'mijieai_ai_usage',
      cache: 'mijieai_ai_cache',
      chat_history: 'mijieai_chat_history'
    }, { engine: 'indexeddb' });
  }

  var MODULE = 'ai_engine';
  var FIELD_CONFIG = 'config';
  var FIELD_USAGE = 'usage';
  var FIELD_CACHE = 'cache';
  var FIELD_CHAT_HISTORY = 'chat_history';

  var CONFIG_KEY = 'mijieai_ai_config';
  var USAGE_KEY = 'mijieai_ai_usage';
  var CACHE_KEY = 'mijieai_ai_cache';
  var CHAT_HISTORY_KEY = 'mijieai_chat_history';
  var MAX_HISTORY = 20;

  // ==================== Provider定义（按优先级排序） ====================

  var PROVIDERS = [
    {
      id: 'nvidia',
      name: 'NVIDIA免费通道 (GLM-5.2)',
      apiBase: 'https://integrate.api.nvidia.com/v1',
      model: 'z-ai/glm-5.2',
      free: true,
      costPerMIn: 0,
      costPerMOut: 0,
      models: ['z-ai/glm-5.2'],
      defaultModel: 'z-ai/glm-5.2',
      keyHint: '注册NVIDIA获取免费Key（nvapi-开头）',
      keyUrl: 'https://build.nvidia.com/'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek V4',
      apiBase: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4-flash',
      free: false,
      costPerMIn: 1,
      costPerMOut: 2,
      models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
      defaultModel: 'deepseek-v4-flash',
      keyHint: 'DeepSeek API Key',
      keyUrl: 'https://platform.deepseek.com/api_keys'
    },
    {
      id: 'bailian',
      name: '阿里云百炼 (Qwen3.7 Flash)',
      apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen3.7-flash',
      free: false,
      costPerMIn: 0.2,
      costPerMOut: 0.8,
      models: ['qwen3.7-flash', 'qwen-plus', 'qwen-turbo'],
      defaultModel: 'qwen3.7-flash',
      keyHint: '阿里云百炼API Key',
      keyUrl: 'https://dashscope.console.aliyun.com/apiKey'
    },
    {
      id: 'kimi',
      name: 'Kimi (Moonshot)',
      apiBase: 'https://api.moonshot.cn/v1',
      model: 'moonshot-v1-8k',
      free: false,
      costPerMIn: 12,
      costPerMOut: 12,
      models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
      defaultModel: 'moonshot-v1-8k',
      keyHint: 'Moonshot API Key',
      keyUrl: 'https://platform.moonshot.cn/console/api-keys'
    },
    {
      id: 'doubao',
      name: '豆包 (火山引擎)',
      apiBase: 'https://ark.cn-beijing.volces.com/api/v3',
      model: 'doubao-seed-1.6-flash',
      free: true,
      costPerMIn: 0.15,
      costPerMOut: 1.5,
      models: ['doubao-seed-1.6-flash', 'doubao-seed-1.6', 'doubao-seed-1.6-vision', 'doubao-1.5-pro-32k', 'doubao-1.5-lite-32k'],
      defaultModel: 'doubao-seed-1.6-flash',
      keyHint: '火山引擎方舟API Key + 接入点ID（填入model字段）',
      keyUrl: 'https://console.volcengine.com/ark/'
    },
    {
      id: 'zhipu',
      name: '智谱AI (GLM)',
      apiBase: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4.7-flash',
      free: true,
      costPerMIn: 0,
      costPerMOut: 0,
      models: ['glm-4.7-flash', 'glm-4-flash', 'glm-4.6v-flash', 'glm-4.5-air', 'glm-5'],
      defaultModel: 'glm-4.7-flash',
      keyHint: '智谱开放平台API Key（新用户送2000万Token，Flash系列永久免费）',
      keyUrl: 'https://open.bigmodel.cn/'
    },
    {
      id: 'custom',
      name: '自定义 (OpenAI兼容)',
      apiBase: '',
      model: '',
      free: false,
      costPerMIn: 0,
      costPerMOut: 0,
      models: [],
      defaultModel: '',
      keyHint: '自定义API Key',
      keyUrl: ''
    }
  ];

  // Provider索引，快速查找
  var PROVIDER_MAP = {};
  PROVIDERS.forEach(function(p) { PROVIDER_MAP[p.id] = p; });

  // ==================== 配置管理 ====================

  var DEFAULT_CONFIG = {
    mode: 'default',
    defaultProvider: 'bailian',
    defaultApiKey: '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',
    providers: {
      deepseek: { apiKey: 'sk-25c588ba49b243f08e743c788e92cf15', apiBase: '', model: '' },
      bailian: { apiKey: 'sk-ws-H.ELEXHRD.2Xmm.MEUCIQD8FduqTxbuANZ3ttnoQKjMEmqxkpG7ZpJK4th7jrpO8wIgeeQVwro_HTzZywrGoEFSAVZPcuuvnpJTdiP2sp5H0JA', apiBase: '', model: '' },
      kimi: { apiKey: 'sk-hoZEU79yH5oklgZvS7SfNg2TJ36ZoQR0Ks5D9laP1exPoFT0', apiBase: '', model: '' },
      doubao: { apiKey: '', apiBase: '', model: '' },
      zhipu: { apiKey: '', apiBase: '', model: '' },
      custom: { apiKey: '', apiBase: '', model: '' }
    },
    fallbackEnabled: true,
    maxTokens: 1024,
    temperature: 0.7,
    tokenBudget: {
      dailyLimit: 500000,
      cacheEnabled: true,
      cacheTTL: 86400
    }
  };

  function getConfig() {
    try {
      var cfg = DataStore.load(MODULE, FIELD_CONFIG, null);
      if (cfg) {
        // 兼容旧版配置迁移
        if (cfg.provider && !cfg.mode) {
          cfg = migrateOldConfig(cfg);
        }
        // 补全缺失字段
        if (!cfg.mode) cfg.mode = 'default';
        if (!cfg.defaultProvider) cfg.defaultProvider = 'nvidia';
        if (!cfg.providers) cfg.providers = DEFAULT_CONFIG.providers;
        if (!cfg.tokenBudget) cfg.tokenBudget = DEFAULT_CONFIG.tokenBudget;
        if (cfg.tokenBudget.dailyLimit === undefined) cfg.tokenBudget.dailyLimit = 500000;
        if (cfg.tokenBudget.cacheEnabled === undefined) cfg.tokenBudget.cacheEnabled = true;
        if (cfg.tokenBudget.cacheTTL === undefined) cfg.tokenBudget.cacheTTL = 86400;
        if (cfg.fallbackEnabled === undefined) cfg.fallbackEnabled = true;
        return cfg;
      }
    } catch(e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  function migrateOldConfig(oldCfg) {
    var newCfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    newCfg.mode = 'advanced';
    // 旧配置映射到新provider
    var oldId = oldCfg.provider || 'kimi';
    if (oldId === 'qwen') oldId = 'bailian';
    if (PROVIDER_MAP[oldId]) {
      newCfg.providers[oldId] = newCfg.providers[oldId] || {};
      newCfg.providers[oldId].apiKey = oldCfg.apiKey || '';
      newCfg.providers[oldId].apiBase = oldCfg.provider === 'custom' ? (oldCfg.customApiBase || '') : '';
      newCfg.providers[oldId].model = oldCfg.provider === 'custom' ? (oldCfg.customModel || '') : (oldCfg.model || '');
    }
    newCfg.maxTokens = oldCfg.maxTokens || 1024;
    newCfg.temperature = oldCfg.temperature || 0.7;
    return newCfg;
  }

  function saveConfig(config) {
    DataStore.save(MODULE, FIELD_CONFIG, config);
  }

  function isConfigured() {
    var cfg = getConfig();
    if (cfg.mode === 'default') {
      return !!(cfg.defaultApiKey);
    }
    // 高级模式：至少有一个provider配置了key
    var keys = Object.keys(cfg.providers || {});
    for (var i = 0; i < keys.length; i++) {
      if (cfg.providers[keys[i]].apiKey) return true;
    }
    return false;
  }

  // ==================== 任务分档 ====================

  function classifyTask(text) {
    // L1: 简单指令（导航、记录、查询）
    if (/^(导航|切换|打开|跳转|记一笔|花了|收入|添加|去|看看|查看)/.test(text)) {
      return { level: 'L1', maxTokens: 256, temperature: 0.3 };
    }
    // L3: 复杂分析（诊断、规划、多步推理）
    if (/分析|诊断|规划|建议|方案|评估|对比|预测|怎么办|如何|为什么/.test(text)) {
      return { level: 'L3', maxTokens: 2048, temperature: 0.7 };
    }
    // L2: 日常对话（默认）
    return { level: 'L2', maxTokens: 1024, temperature: 0.7 };
  }

  // ==================== Token预算控制 ====================

  function getTodayKey() {
    var now = new Date();
    return now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
  }

  function getUsage() {
    try {
      return DataStore.load(MODULE, FIELD_USAGE, {}) || {};
    } catch(e) { return {}; }
  }

  function saveUsage(usage) {
    DataStore.save(MODULE, FIELD_USAGE, usage);
  }

  function recordUsage(providerId, usageData) {
    if (!usageData) return;
    var usage = getUsage();
    var today = getTodayKey();
    if (!usage[today]) {
      usage[today] = { totalTokens: 0, byProvider: {}, estimatedCost: 0, requestCount: 0 };
    }
    var dayData = usage[today];
    var inputTokens = usageData.prompt_tokens || 0;
    var outputTokens = usageData.completion_tokens || 0;
    var totalTokens = inputTokens + outputTokens;

    dayData.totalTokens += totalTokens;
    dayData.requestCount += 1;

    if (!dayData.byProvider[providerId]) {
      dayData.byProvider[providerId] = 0;
    }
    dayData.byProvider[providerId] += totalTokens;

    // 计算费用
    var provider = PROVIDER_MAP[providerId];
    if (provider) {
      dayData.estimatedCost += (inputTokens / 1000000) * provider.costPerMIn +
                               (outputTokens / 1000000) * provider.costPerMOut;
    }

    saveUsage(usage);
  }

  function checkTokenBudget(cfg) {
    var usage = getUsage();
    var today = getTodayKey();
    var dayData = usage[today];
    if (!dayData) return { ok: true, used: 0, limit: cfg.tokenBudget.dailyLimit };

    var limit = cfg.tokenBudget.dailyLimit || 500000;
    return {
      ok: dayData.totalTokens < limit,
      used: dayData.totalTokens,
      limit: limit,
      requestCount: dayData.requestCount,
      estimatedCost: dayData.estimatedCost
    };
  }

  // ==================== 本地缓存 ====================

  function getCache() {
    try {
      return DataStore.load(MODULE, FIELD_CACHE, {}) || {};
    } catch(e) { return {}; }
  }

  function saveCache(cache) {
    DataStore.save(MODULE, FIELD_CACHE, cache);
  }

  function getCacheKey(systemPrompt, userText) {
    // 简化key：取system prompt前100字符 + user input hash
    var sp = systemPrompt.substring(0, 100);
    var ut = userText.substring(0, 200);
    return 'c_' + simpleHash(sp + ut);
  }

  function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  function lookupCache(systemPrompt, userText, cfg) {
    if (!cfg.tokenBudget || !cfg.tokenBudget.cacheEnabled) return null;
    var cache = getCache();
    var key = getCacheKey(systemPrompt, userText);
    var entry = cache[key];
    if (!entry) return null;
    var ttl = cfg.tokenBudget.cacheTTL || 86400;
    var now = Date.now() / 1000;
    if (now - entry.ts > ttl) {
      delete cache[key];
      saveCache(cache);
      return null;
    }
    return entry.data;
  }

  function storeCache(systemPrompt, userText, result, cfg) {
    if (!cfg.tokenBudget || !cfg.tokenBudget.cacheEnabled) return;
    var cache = getCache();
    var key = getCacheKey(systemPrompt, userText);
    // 限制缓存条目数量
    var keys = Object.keys(cache);
    if (keys.length > 100) {
      // 淘汰最旧的20%
      var sorted = keys.sort(function(a, b) {
        return (cache[a].ts || 0) - (cache[b].ts || 0);
      });
      for (var i = 0; i < 20; i++) {
        delete cache[sorted[i]];
      }
    }
    cache[key] = { data: result, ts: Date.now() / 1000 };
    saveCache(cache);
  }

  function clearCache() {
    DataStore.remove(MODULE, FIELD_CACHE);
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
      var hp = DataStore.load('health', 'profile', {}) || {};
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
      var txList = DataStore.load('daily_tx', 'records', []) || [];
      txList.forEach(function(t) {
        if (t.date === todayStr) {
          if (t.type === 'income') ctx.todayFinance.income += t.amount;
          else ctx.todayFinance.expense += t.amount;
        }
      });
    } catch(e) {}

    // 最近情绪（mood_log 属于 behavior 模块，暂未在 DataStore 注册，回退 localStorage）
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

    // 跨模块洞察摘要
    try {
      if (window.InsightEngine) {
        ctx.insightSummary = window.InsightEngine.getInsightSummary();
      }
    } catch(e) {}

    // 健康数据摘要
    try {
      if (window.HealthBridge) {
        ctx.healthSummary = window.HealthBridge.getHealthSummary();
      }
    } catch(e) {}

    return ctx;
  }

  // ==================== Prompt构建（含截断） ====================

  function buildSystemPrompt(context) {
    var prompt = '你是「MiRun AI」——一个私人智能助手，风格类似钢铁侠的贾维斯。\n';
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
    if (context.insightSummary) {
      prompt += '\n## 跨模块洞察\n' + context.insightSummary + '\n';
    }
    if (context.healthSummary) {
      prompt += '\n## 健康数据\n' + context.healthSummary + '\n';
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

  // 上下文截断：system prompt压缩到500 tokens以内，历史对话只保留最近3轮
  function truncateContext(systemPrompt, history) {
    // 粗略估算：1个中文字约1-2 tokens，1个英文单词约1 token
    // 500 tokens 约 750 中文字符
    var MAX_SYSTEM_CHARS = 1500;
    if (systemPrompt.length > MAX_SYSTEM_CHARS) {
      // 保留核心规则部分，截断上下文详情
      var ruleStart = systemPrompt.indexOf('\n## 你的能力\n');
      if (ruleStart > -1) {
        var contextPart = systemPrompt.substring(0, ruleStart);
        var rulePart = systemPrompt.substring(ruleStart);
        if (contextPart.length > MAX_SYSTEM_CHARS - rulePart.length) {
          contextPart = contextPart.substring(0, MAX_SYSTEM_CHARS - rulePart.length) + '...\n';
        }
        systemPrompt = contextPart + rulePart;
      } else {
        systemPrompt = systemPrompt.substring(0, MAX_SYSTEM_CHARS) + '...\n';
      }
    }

    // 历史对话只保留最近3轮（6条消息）
    var MAX_HISTORY_ROUNDS = 3;
    if (history.length > MAX_HISTORY_ROUNDS * 2) {
      history = history.slice(-MAX_HISTORY_ROUNDS * 2);
    }

    return { systemPrompt: systemPrompt, history: history };
  }

  // ==================== Provider降级链 ====================

  // 降级优先级：成本低、可用性高的排前面（v52.3.15 优化）
  var FALLBACK_PRIORITY = ['bailian', 'doubao', 'zhipu', 'kimi', 'nvidia', 'deepseek'];

  function getProviderChain(cfg) {
    var chain = [];

    if (cfg.mode === 'default') {
      // 默认模式：默认provider排最前
      var defaultP = PROVIDER_MAP[cfg.defaultProvider || 'nvidia'];
      if (defaultP && cfg.defaultApiKey) {
        var p = mergeProviderConfig(defaultP, { apiKey: cfg.defaultApiKey });
        chain.push(p);
      }
      // 如果启用了降级，其余provider按FALLBACK_PRIORITY排序追加
      if (cfg.fallbackEnabled) {
        for (var i = 0; i < FALLBACK_PRIORITY.length; i++) {
          var pid = FALLBACK_PRIORITY[i];
          if (pid === cfg.defaultProvider) continue;
          var pCfg = (cfg.providers || {})[pid];
          if (pCfg && pCfg.apiKey) {
            var prov = PROVIDER_MAP[pid];
            if (prov) {
              chain.push(mergeProviderConfig(prov, pCfg));
            }
          }
        }
      }
    } else {
      // 高级模式：按FALLBACK_PRIORITY优先级排列
      for (var j = 0; j < FALLBACK_PRIORITY.length; j++) {
        var provId = FALLBACK_PRIORITY[j];
        var prov = PROVIDER_MAP[provId];
        if (!prov) continue;
        var pCfg = (cfg.providers || {})[provId];
        // 检查是否有可用key（defaultProvider的key在defaultApiKey里）
        var key = (pCfg && pCfg.apiKey) ? pCfg.apiKey : '';
        if (!key && cfg.defaultProvider === provId && cfg.defaultApiKey) {
          key = cfg.defaultApiKey;
        }
        if (key) {
          chain.push(mergeProviderConfig(prov, { apiKey: key }));
        }
      }
      // 兜底：自定义provider
      var customCfg = (cfg.providers || {}).custom;
      if (customCfg && customCfg.apiKey && PROVIDER_MAP.custom) {
        chain.push(mergeProviderConfig(PROVIDER_MAP.custom, customCfg));
      }
    }

    return chain;
  }

  function mergeProviderConfig(baseDef, userCfg) {
    var result = {};
    for (var k in baseDef) {
      result[k] = baseDef[k];
    }
    if (userCfg.apiKey) result.apiKey = userCfg.apiKey;
    if (userCfg.apiBase) result.apiBase = userCfg.apiBase;
    if (userCfg.model) result.model = userCfg.model;
    return result;
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
      temperature: temperature || 0.7
    };
    // 百炼qwen3.x系列默认开启思考模式，免费额度可能不支持，显式关闭
    if (provider.id === 'bailian') {
      body.enable_thinking = false;
    }

    var resp;
    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function() { ctrl.abort(); }, 15000);
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

  async function callLLMWithFallback(messages, taskInfo, cfg) {
    var chain = getProviderChain(cfg);
    if (chain.length === 0) {
      throw new Error('未配置任何可用的AI服务商，请先在设置中配置API Key');
    }

    var maxTokens = taskInfo.maxTokens || cfg.maxTokens || 1024;
    var temperature = taskInfo.temperature || cfg.temperature || 0.7;

    var lastError = null;
    for (var i = 0; i < chain.length; i++) {
      try {
        var result = await callSingleProvider(chain[i], messages, maxTokens, temperature);
        // 记录token用量
        if (result.usage) {
          recordUsage(chain[i].id, result.usage);
        }
        return result;
      } catch(e) {
        console.warn('[AiEngine] Provider ' + chain[i].id + ' 失败:', e.message);
        lastError = e;
        if (!cfg.fallbackEnabled || i === chain.length - 1) {
          throw e;
        }
        // 继续尝试下一个provider
      }
    }
    throw lastError || new Error('所有AI服务商调用失败');
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
      return DataStore.load(MODULE, FIELD_CHAT_HISTORY, []) || [];
    } catch(e) { return []; }
  }

  function saveChatHistory(history) {
    if (history.length > MAX_HISTORY * 2) {
      history = history.slice(-MAX_HISTORY * 2);
    }
    DataStore.save(MODULE, FIELD_CHAT_HISTORY, history);
  }

  function clearChatHistory() {
    DataStore.remove(MODULE, FIELD_CHAT_HISTORY);
  }

  // ==================== 主入口 ====================

  async function processInput(text) {
    if (!text || !text.trim()) {
      return { reply: '请输入你的需求', actions: [], results: [] };
    }

    var cfg = getConfig();

    // 检查是否配置了API
    if (!isConfigured()) {
      return fallbackIntent(text);
    }

    // 检查Token预算
    var budget = checkTokenBudget(cfg);
    if (!budget.ok) {
      return {
        reply: '今日AI调用已达预算上限（' + (budget.limit / 1000).toFixed(0) + 'K tokens），请明天再试或在设置中调整预算。',
        actions: [],
        results: [],
        budgetExceeded: true
      };
    }

    // 任务分档
    var taskInfo = classifyTask(text);

    // 上下文收集
    var context = collectContext();
    var systemPrompt = buildSystemPrompt(context);
    var history = getChatHistory();

    // 上下文截断
    var truncated = truncateContext(systemPrompt, history);
    systemPrompt = truncated.systemPrompt;
    history = truncated.history;

    // 查询缓存
    var cached = lookupCache(systemPrompt, text, cfg);
    if (cached) {
      console.log('[AiEngine] 命中缓存，跳过LLM调用');
      // 仍然保存到对话历史
      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: cached.raw });
      saveChatHistory(history);
      return cached.result;
    }

    // 构建消息列表
    var messages = [{ role: 'system', content: systemPrompt }];
    messages = messages.concat(history);
    messages.push({ role: 'user', content: text });

    try {
      var llmResult = await callLLMWithFallback(messages, taskInfo, cfg);
      var raw = llmResult.content;
      var result = parseResponse(raw);

      // 保存对话历史
      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: raw });
      saveChatHistory(history);

      // 写入缓存
      storeCache(systemPrompt, text, { result: result, raw: raw }, cfg);

      // 执行actions
      result.results = executeActions(result.actions);

      return result;
    } catch(e) {
      console.error('[AiEngine] LLM调用失败:', e);
      return {
        reply: 'AI服务暂时不可用：' + e.message + '。请检查API配置或稍后重试。',
        actions: [],
        results: [],
        error: true
      };
    }
  }

  // 降级方案：关键词匹配
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
    var budget = checkTokenBudget(cfg);
    var usage = getUsage();
    var today = getTodayKey();
    var dayData = usage[today] || { totalTokens: 0, byProvider: {}, estimatedCost: 0, requestCount: 0 };

    var html = '<div class="ai-settings">';

    // 头部
    html += '<div class="ai-settings-header">';
    html += '<h3>AI引擎配置</h3>';
    html += '<span class="ai-status ' + (isConfigured() ? 'online' : 'offline') + '">' + (isConfigured() ? '已连接' : '未配置') + '</span>';
    html += '</div>';

    // 模式切换Tab
    html += '<div class="ai-mode-tabs">';
    html += '<div class="ai-mode-tab ' + (cfg.mode === 'default' ? 'active' : '') + '" data-mode="default" onclick="window.AiEngine._switchMode(\'default\')">默认模式</div>';
    html += '<div class="ai-mode-tab ' + (cfg.mode === 'advanced' ? 'active' : '') + '" data-mode="advanced" onclick="window.AiEngine._switchMode(\'advanced\')">高级模式</div>';
    html += '</div>';

    // 默认模式面板
    html += '<div class="ai-mode-panel" id="aiPanelDefault" style="display:' + (cfg.mode === 'default' ? 'block' : 'none') + '">';
    html += '<div class="ai-mode-desc">只需一个免费API Key即可启用AI助手，零配置开箱即用</div>';

    // 默认Provider选择
    html += '<div class="ai-field">';
    html += '<label>服务商</label>';
    html += '<select id="aiDefaultProvider" onchange="window.AiEngine._onDefaultProviderChange()">';
    PROVIDERS.forEach(function(p) {
      if (p.id !== 'custom') {
        html += '<option value="' + p.id + '"' + (cfg.defaultProvider === p.id ? ' selected' : '') + '>' + p.name + (p.free ? ' [免费]' : '') + '</option>';
      }
    });
    html += '</select></div>';

    // 默认API Key
    html += '<div class="ai-field">';
    html += '<label>API Key</label>';
    html += '<div class="ai-key-row">';
    html += '<input type="password" id="aiDefaultApiKey" placeholder="输入你的API Key" value="' + (cfg.defaultApiKey || '') + '" />';
    html += '<button class="ai-key-toggle" onclick="var el=document.getElementById(\'aiDefaultApiKey\');el.type=el.type===\'password\'?\'text\':\'password\'" title="显示/隐藏">';
    html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    html += '</button></div>';
    // 注册引导
    var selProv = PROVIDER_MAP[cfg.defaultProvider || 'nvidia'] || PROVIDERS[0];
    if (selProv.keyUrl) {
      html += '<span class="ai-hint">免费注册获取Key：<a href="' + selProv.keyUrl + '" target="_blank">' + selProv.keyHint + '</a></span>';
    }
    html += '</div>';

    html += '</div>'; // aiPanelDefault

    // 高级模式面板
    html += '<div class="ai-mode-panel" id="aiPanelAdvanced" style="display:' + (cfg.mode === 'advanced' ? 'block' : 'none') + '">';

    // 降级链开关
    html += '<div class="ai-field ai-field-row">';
    html += '<label>自动降级</label>';
    html += '<div class="ai-toggle-wrap">';
    html += '<input type="checkbox" id="aiFallback" ' + (cfg.fallbackEnabled ? 'checked' : '') + ' class="ai-toggle" />';
    html += '<span class="ai-toggle-label">' + (cfg.fallbackEnabled ? '已开启' : '已关闭') + '</span>';
    html += '</div>';
    html += '<span class="ai-hint-inline">主Provider失败时自动切换备用</span>';
    html += '</div>';

    // 各Provider配置
    PROVIDERS.forEach(function(prov) {
      var pCfg = (cfg.providers || {})[prov.id] || {};
      var hasKey = !!pCfg.apiKey;
      var isCustom = prov.id === 'custom';

      html += '<div class="ai-provider-card">';
      html += '<div class="ai-provider-header" onclick="window.AiEngine._toggleProviderCard(\'' + prov.id + '\')">';
      html += '<div class="ai-provider-info">';
      html += '<span class="ai-provider-name">' + prov.name + '</span>';
      if (prov.free) html += '<span class="ai-badge-free">免费</span>';
      if (hasKey) html += '<span class="ai-badge-active">已配置</span>';
      html += '</div>';
      html += '<svg class="ai-provider-arrow" id="aiArrow_' + prov.id + '" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
      html += '</div>';

      html += '<div class="ai-provider-body" id="aiBody_' + prov.id + '" style="display:' + (hasKey ? 'block' : 'none') + '">';
      html += '<div class="ai-field">';
      html += '<label>API Key</label>';
      html += '<input type="password" id="aiKey_' + prov.id + '" placeholder="' + prov.keyHint + '" value="' + (pCfg.apiKey || '') + '" />';
      if (prov.keyUrl) {
        html += '<span class="ai-hint"><a href="' + prov.keyUrl + '" target="_blank">获取Key</a></span>';
      }
      html += '</div>';

      if (isCustom) {
        html += '<div class="ai-field">';
        html += '<label>API地址</label>';
        html += '<input type="text" id="aiBase_' + prov.id + '" placeholder="https://api.example.com/v1" value="' + (pCfg.apiBase || '') + '" />';
        html += '</div>';
        html += '<div class="ai-field">';
        html += '<label>模型名称</label>';
        html += '<input type="text" id="aiModel_' + prov.id + '" placeholder="model-name" value="' + (pCfg.model || '') + '" />';
        html += '</div>';
      } else if (prov.models.length > 1) {
        html += '<div class="ai-field">';
        html += '<label>模型</label>';
        html += '<select id="aiModel_' + prov.id + '">';
        prov.models.forEach(function(m) {
          html += '<option value="' + m + '"' + (pCfg.model === m || (!pCfg.model && m === prov.defaultModel) ? ' selected' : '') + '>' + m + '</option>';
        });
        html += '</select></div>';
      }

      if (!prov.free && prov.costPerMIn > 0) {
        html += '<div class="ai-cost-hint">费用：输入 ' + prov.costPerMIn + ' 元/百万tokens，输出 ' + prov.costPerMOut + ' 元/百万tokens</div>';
      }
      html += '</div>'; // ai-provider-body
      html += '</div>'; // ai-provider-card
    });

    html += '</div>'; // aiPanelAdvanced

    // 通用高级设置（折叠）
    html += '<div class="ai-advanced-toggle" onclick="var el=document.getElementById(\'aiAdvancedPanel\');el.style.display=el.style.display===\'none\'?\'block\':\'none\'">';
    html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>';
    html += ' 高级参数</div>';
    html += '<div class="ai-advanced-panel" id="aiAdvancedPanel" style="display:none">';
    html += '<div class="ai-field"><label>Max Tokens</label><input type="number" id="aiMaxTokens" value="' + (cfg.maxTokens || 1024) + '" min="128" max="8192" step="128" /></div>';
    html += '<div class="ai-field"><label>Temperature</label><div class="ai-range-row"><input type="range" id="aiTemp" min="0" max="1" step="0.1" value="' + (cfg.temperature || 0.7) + '" oninput="document.getElementById(\'aiTempVal\').textContent=this.value" /><span id="aiTempVal">' + (cfg.temperature || 0.7) + '</span></div></div>';
    html += '<div class="ai-field"><label>每日Token预算</label><input type="number" id="aiDailyLimit" value="' + (cfg.tokenBudget.dailyLimit || 500000) + '" min="10000" step="50000" /></div>';
    html += '<div class="ai-field ai-field-row"><label>启用缓存</label>';
    html += '<input type="checkbox" id="aiCacheEnabled" ' + (cfg.tokenBudget.cacheEnabled ? 'checked' : '') + ' class="ai-toggle" />';
    html += '<span class="ai-hint-inline">相同问题24h内不重复调用</span></div>';
    html += '</div>';

    // 用量统计
    html += '<div class="ai-usage-stats">';
    html += '<div class="ai-usage-title">今日用量</div>';
    html += '<div class="ai-usage-grid">';
    html += '<div class="ai-usage-item"><span class="ai-usage-value">' + formatTokens(dayData.totalTokens) + '</span><span class="ai-usage-label">tokens</span></div>';
    html += '<div class="ai-usage-item"><span class="ai-usage-value">' + dayData.requestCount + '</span><span class="ai-usage-label">请求次数</span></div>';
    html += '<div class="ai-usage-item"><span class="ai-usage-value">' + (dayData.estimatedCost < 0.01 ? '<0.01' : dayData.estimatedCost.toFixed(2)) + '</span><span class="ai-usage-label">预估费用(元)</span></div>';
    html += '</div>';
    // 预算进度条
    var budgetPct = budget.limit > 0 ? Math.min(100, Math.round(budget.used / budget.limit * 100)) : 0;
    var budgetColor = budgetPct < 60 ? '#22c55e' : budgetPct < 90 ? '#eab308' : '#ef4444';
    html += '<div class="ai-budget-bar">';
    html += '<div class="ai-budget-fill" style="width:' + budgetPct + '%;background:' + budgetColor + '"></div>';
    html += '</div>';
    html += '<div class="ai-budget-text">' + formatTokens(budget.used) + ' / ' + formatTokens(budget.limit) + ' tokens</div>';
    html += '</div>';

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

    // 绑定降级开关事件
    var fallbackEl = document.getElementById('aiFallback');
    if (fallbackEl) {
      fallbackEl.addEventListener('change', function() {
        var label = this.parentElement.querySelector('.ai-toggle-label');
        if (label) label.textContent = this.checked ? '已开启' : '已关闭';
      });
    }
    // 绑定缓存开关事件
    var cacheEl = document.getElementById('aiCacheEnabled');
    if (cacheEl) {
      cacheEl.addEventListener('change', function() {
        // 无需额外UI反馈
      });
    }
  }

  function formatTokens(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return String(n);
  }

  function _switchMode(mode) {
    var tabs = document.querySelectorAll('.ai-mode-tab');
    tabs.forEach(function(tab) {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
    });
    var panelDefault = document.getElementById('aiPanelDefault');
    var panelAdvanced = document.getElementById('aiPanelAdvanced');
    if (panelDefault) panelDefault.style.display = mode === 'default' ? 'block' : 'none';
    if (panelAdvanced) panelAdvanced.style.display = mode === 'advanced' ? 'block' : 'none';
  }

  function _toggleProviderCard(providerId) {
    var body = document.getElementById('aiBody_' + providerId);
    var arrow = document.getElementById('aiArrow_' + providerId);
    if (!body) return;
    var isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    if (arrow) {
      arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
    }
  }

  function _onDefaultProviderChange() {
    var sel = document.getElementById('aiDefaultProvider');
    if (!sel) return;
    var provId = sel.value;
    var prov = PROVIDER_MAP[provId];
    // 更新注册引导链接
    var hintEl = document.querySelector('#aiPanelDefault .ai-hint a');
    if (hintEl && prov && prov.keyUrl) {
      hintEl.href = prov.keyUrl;
      hintEl.textContent = prov.keyHint;
    }
  }

  function onProviderChange() {
    // 保持兼容，实际逻辑已由_switchMode和_toggleProviderCard处理
  }

  function saveSettings() {
    var cfg = getConfig();

    // 模式
    var activeTab = document.querySelector('.ai-mode-tab.active');
    cfg.mode = activeTab ? activeTab.getAttribute('data-mode') : 'default';

    // 默认模式
    var defaultProvEl = document.getElementById('aiDefaultProvider');
    if (defaultProvEl) cfg.defaultProvider = defaultProvEl.value;
    var defaultKeyEl = document.getElementById('aiDefaultApiKey');
    if (defaultKeyEl) cfg.defaultApiKey = defaultKeyEl.value.trim();

    // 降级开关
    var fallbackEl = document.getElementById('aiFallback');
    if (fallbackEl) cfg.fallbackEnabled = fallbackEl.checked;

    // 各Provider配置
    PROVIDERS.forEach(function(prov) {
      var keyEl = document.getElementById('aiKey_' + prov.id);
      if (keyEl) {
        cfg.providers[prov.id] = cfg.providers[prov.id] || {};
        cfg.providers[prov.id].apiKey = keyEl.value.trim();
      }
      var baseEl = document.getElementById('aiBase_' + prov.id);
      if (baseEl) cfg.providers[prov.id].apiBase = baseEl.value.trim();
      var modelEl = document.getElementById('aiModel_' + prov.id);
      if (modelEl) cfg.providers[prov.id].model = modelEl.value.trim();
    });

    // 高级参数
    var maxTokensEl = document.getElementById('aiMaxTokens');
    if (maxTokensEl) cfg.maxTokens = parseInt(maxTokensEl.value) || 1024;
    var tempEl = document.getElementById('aiTemp');
    if (tempEl) cfg.temperature = parseFloat(tempEl.value) || 0.7;
    var dailyLimitEl = document.getElementById('aiDailyLimit');
    if (dailyLimitEl) cfg.tokenBudget.dailyLimit = parseInt(dailyLimitEl.value) || 500000;
    var cacheEnabledEl = document.getElementById('aiCacheEnabled');
    if (cacheEnabledEl) cfg.tokenBudget.cacheEnabled = cacheEnabledEl.checked;

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
      // 先保存当前配置
      saveSettings();

      var cfg = getConfig();
      var chain = getProviderChain(cfg);
      if (chain.length === 0) {
        throw new Error('未配置任何Provider');
      }

      var testProvider = chain[0];
      var resp = await callSingleProvider(testProvider, [
        { role: 'system', content: '你是一个测试助手。请用一句话回复：连接成功。' },
        { role: 'user', content: '测试' }
      ], 128, 0.3);

      if (resp.usage) {
        recordUsage(resp.providerId, resp.usage);
      }

      resultEl.style.background = '#f0fdf4';
      resultEl.style.color = '#166534';
      resultEl.textContent = '连接成功！[' + testProvider.name + '] 回复：' + resp.content.substring(0, 100);
    } catch(e) {
      resultEl.style.background = '#fef2f2';
      resultEl.style.color = '#dc2626';
      resultEl.textContent = '连接失败：' + e.message;
    }
  }

  function clearHistory() {
    clearChatHistory();
    clearCache();
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
    fallbackIntent: fallbackIntent,
    // 新增API
    classifyTask: classifyTask,
    checkTokenBudget: function() { return checkTokenBudget(getConfig()); },
    getUsage: getUsage,
    clearCache: clearCache,
    // 内部UI方法
    _switchMode: _switchMode,
    _toggleProviderCard: _toggleProviderCard,
    _onDefaultProviderChange: _onDefaultProviderChange
  };

})();
