/**
 * MiRun AI - 图片识别模块 (t12)
 * 多Provider视觉模型降级链 + 三大场景入口 + 全本地存储
 * 
 * 场景：
 *   1. AI对话配图 - 对话中发送图片，AI理解图片内容
 *   2. 食物识别 - 拍食物识别营养成分，对接健康模块
 *   3. 票据识别 - 拍小票/发票自动记账，对接收支模块
 * 
 * 数据策略：识别历史存IndexedDB，图片base64本地缓存，不上云
 */

(function() {
  'use strict';

  // ==================== 注册DataStore模块 ====================
  if (window.DataStore && DataStore.registerModule) {
    DataStore.registerModule('image_recog', {
      history: 'mijieai_image_history',
      settings: 'mijieai_image_settings'
    }, { engine: 'indexeddb' });
  }

  // ==================== 视觉模型Provider定义 ====================
  // 按优先级排序，每个provider指定其视觉模型和endpoint
  var VISION_PROVIDERS = [
    {
      id: 'bailian',
      name: '阿里云百炼 (Qwen-VL)',
      apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-vl-max-latest',
      supportsImage: true,
      keyHint: '阿里云百炼API Key',
      keyUrl: 'https://bailian.console.aliyun.com/'
    },
    {
      id: 'kimi',
      name: 'Kimi (Moonshot VLM)',
      apiBase: 'https://api.moonshot.cn/v1',
      model: 'moonshot-v1-vision',
      supportsImage: true,
      keyHint: 'Kimi API Key',
      keyUrl: 'https://platform.moonshot.cn/'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek V4',
      apiBase: 'https://api.deepseek.com/v1',
      model: 'deepseek-v4',
      supportsImage: true,
      keyHint: 'DeepSeek API Key',
      keyUrl: 'https://platform.deepseek.com/api_keys'
    }
  ];

  // ==================== 场景提示词模板 ====================
  var SCENE_PROMPTS = {
    general: {
      system: '你是MiRun AI的图片识别助手。请仔细分析用户提供的图片，用清晰简洁的语言描述图片内容。如果图片中有文字，请准确识别文字内容。',
      user: '请描述这张图片的内容。'
    },
    food: {
      system: '你是专业的营养分析师。请识别图片中的食物，估算份量，并分析主要营养成分（热量、蛋白质、碳水、脂肪、膳食纤维等）。用中文回答，数据要合理估算。',
      user: '请识别这张图片中的食物，分析其营养成分。'
    },
    receipt: {
      system: '你是专业的票据识别助手。请识别图片中的小票或发票，提取以下信息：消费金额、消费日期、商家名称、商品明细。如果是多张商品，请逐一列出。用JSON格式返回，字段：{amount(数字), date(YYYY-MM-DD), merchant, items:[{name, price, quantity}], category(餐饮/购物/交通/医疗/其他)}',
      user: '请识别这张票据的内容，按指定JSON格式返回。'
    }
  };

  // ==================== 状态 ====================
  var _history = null;
  var _settings = null;

  // ==================== 初始化 ====================
  function init() {
    loadSettings();
    loadHistory();
    // 挂载到全局
    window.ImageRecognizer = {
      init: init,
      recognize: recognize,
      recognizeFood: recognizeFood,
      recognizeReceipt: recognizeReceipt,
      recognizeGeneral: recognizeGeneral,
      getHistory: getHistory,
      clearHistory: clearHistory,
      getSettings: getSettings,
      saveSettings: saveSettings,
      getVisionProviders: function() { return VISION_PROVIDERS; },
      renderUI: renderUI,
      _fileToBase64: fileToBase64,
      _callVisionAPI: callVisionAPI
    };
    console.log('[ImageRecognizer] 图片识别模块已加载');
  }

  // ==================== 数据读写 ====================
  function loadHistory() {
    try {
      _history = DataStore.get('image_recog', 'history') || [];
    } catch(e) {
      _history = [];
    }
  }

  function saveHistory() {
    try {
      DataStore.set('image_recog', 'history', _history);
    } catch(e) {
      console.warn('[ImageRecognizer] 保存历史失败:', e);
    }
  }

  function loadSettings() {
    try {
      _settings = DataStore.get('image_recog', 'settings') || {
        defaultProvider: 'bailian',
        fallbackEnabled: true,
        maxImageSize: 2 * 1024 * 1024, // 2MB
        saveImages: true, // 是否保存原图base64到本地
        maxHistory: 100
      };
    } catch(e) {
      _settings = {
        defaultProvider: 'bailian',
        fallbackEnabled: true,
        maxImageSize: 2 * 1024 * 1024,
        saveImages: true,
        maxHistory: 100
      };
    }
  }

  function saveSettings() {
    try {
      DataStore.set('image_recog', 'settings', _settings);
    } catch(e) {
      console.warn('[ImageRecognizer] 保存设置失败:', e);
    }
  }

  function getHistory() {
    return _history || [];
  }

  function clearHistory() {
    _history = [];
    saveHistory();
  }

  function getSettings() {
    return _settings;
  }

  // ==================== 文件处理 ====================
  function fileToBase64(file) {
    return new Promise(function(resolve, reject) {
      // 检查文件大小
      if (file.size > _settings.maxImageSize) {
        // 自动压缩
        compressImage(file, 1024, 0.8).then(resolve).catch(reject);
        return;
      }
      var reader = new FileReader();
      reader.onload = function(e) {
        resolve(e.target.result);
      };
      reader.onerror = function() {
        reject(new Error('读取图片失败'));
      };
      reader.readAsDataURL(file);
    });
  }

  // 图片压缩：按最大边长等比缩放 + quality压缩
  function compressImage(file, maxSize, quality) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement('canvas');
          var w = img.width;
          var h = img.height;
          if (w > h && w > maxSize) {
            h = Math.round(h * maxSize / w);
            w = maxSize;
          } else if (h > maxSize) {
            w = Math.round(w * maxSize / h);
            h = maxSize;
          }
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality || 0.8));
        };
        img.onerror = function() {
          reject(new Error('图片加载失败'));
        };
        img.src = e.target.result;
      };
      reader.onerror = function() { reject(new Error('读取图片失败')); };
      reader.readAsDataURL(file);
    });
  }

  // ==================== 核心识别 ====================
  async function recognize(imageData, scene, extraPrompt) {
    scene = scene || 'general';
    var prompt = SCENE_PROMPTS[scene] || SCENE_PROMPTS.general;
    var userPrompt = extraPrompt || prompt.user;

    // 构建多模态消息
    var messages = [
      { role: 'system', content: prompt.system },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: imageData } }
        ]
      }
    ];

    try {
      var result = await callVisionWithFallback(messages, scene);
      
      // 记录历史
      var record = {
        id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        scene: scene,
        timestamp: Date.now(),
        imageData: _settings.saveImages ? imageData : null,
        imageSize: imageData.length,
        result: result.content,
        provider: result.providerId,
        tokens: result.usage ? (result.usage.total_tokens || 0) : 0
      };
      
      _history.unshift(record);
      // 限制历史条数
      if (_history.length > _settings.maxHistory) {
        _history = _history.slice(0, _settings.maxHistory);
      }
      saveHistory();

      return {
        success: true,
        content: result.content,
        provider: result.providerId,
        record: record
      };
    } catch(e) {
      console.error('[ImageRecognizer] 识别失败:', e);
      return {
        success: false,
        error: e.message
      };
    }
  }

  function recognizeGeneral(imageData, prompt) {
    return recognize(imageData, 'general', prompt);
  }

  function recognizeFood(imageData, prompt) {
    return recognize(imageData, 'food', prompt);
  }

  async function recognizeReceipt(imageData) {
    var result = await recognize(imageData, 'receipt');
    if (!result.success) return result;

    // 尝试解析JSON
    var parsed = parseReceiptJSON(result.content);
    result.parsed = parsed;
    return result;
  }

  function parseReceiptJSON(content) {
    // 尝试多种方式提取JSON
    var jsonStr = content;
    var jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
    
    var start = jsonStr.indexOf('{');
    var end = jsonStr.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    
    try {
      return JSON.parse(jsonStr.substring(start, end + 1));
    } catch(e) {
      return null;
    }
  }

  // ==================== 视觉API调用 + 降级 ====================
  function getVisionChain() {
    var cfg = _settings;
    var aiCfg = null;
    // 尝试从AI引擎获取已配置的key
    if (window.AiEngine && AiEngine.getConfig) {
      aiCfg = AiEngine.getConfig();
    }

    var chain = [];
    VISION_PROVIDERS.forEach(function(p) {
      var apiKey = '';
      if (aiCfg && aiCfg.providers && aiCfg.providers[p.id]) {
        apiKey = aiCfg.providers[p.id].apiKey || '';
      }
      if (apiKey) {
        chain.push({
          id: p.id,
          name: p.name,
          apiBase: p.apiBase,
          model: p.model,
          apiKey: apiKey,
          supportsImage: p.supportsImage
        });
      }
    });

    // 按defaultProvider排到最前
    if (cfg.defaultProvider) {
      chain.sort(function(a, b) {
        if (a.id === cfg.defaultProvider) return -1;
        if (b.id === cfg.defaultProvider) return 1;
        return 0;
      });
    }

    return chain;
  }

  async function callVisionWithFallback(messages, scene) {
    var chain = getVisionChain();
    if (chain.length === 0) {
      throw new Error('未配置任何支持图片识别的AI服务商，请先在AI引擎中配置API Key（支持百炼/Kimi/DeepSeek）');
    }

    var lastError = null;
    for (var i = 0; i < chain.length; i++) {
      try {
        var result = await callVisionAPI(chain[i], messages);
        // 记录token用量到AI引擎
        if (result.usage && window.AiEngine && AiEngine.recordUsage) {
          AiEngine.recordUsage(chain[i].id, result.usage);
        }
        return result;
      } catch(e) {
        console.warn('[ImageRecognizer] Provider ' + chain[i].id + ' 失败:', e.message);
        lastError = e;
        if (!_settings.fallbackEnabled || i === chain.length - 1) {
          throw e;
        }
        // 继续降级
      }
    }
    throw lastError || new Error('所有图片识别服务商调用失败');
  }

  function callVisionAPI(provider, messages) {
    return new Promise(function(resolve, reject) {
      var url = provider.apiBase.replace(/\/$/, '') + '/chat/completions';
      
      // 不同provider的图片格式适配
      var bodyMessages = adaptMessagesForProvider(provider.id, messages);
      
      var body = {
        model: provider.model,
        messages: bodyMessages,
        max_tokens: 2048,
        temperature: 0.3
      };

      var ctrl = new AbortController();
      var timer = setTimeout(function() { ctrl.abort(); }, 30000); // 30s超时，图片识别慢一些

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + provider.apiKey
        },
        body: JSON.stringify(body),
        signal: ctrl.signal
      }).then(function(resp) {
        clearTimeout(timer);
        if (!resp.ok) {
          resp.text().then(function(errText) {
            var msg = 'API调用失败 (' + resp.status + '): ' + errText.substring(0, 200);
            if (resp.status === 402) msg = provider.name + ' 账户余额不足';
            else if (resp.status === 429) msg = provider.name + ' 请求过于频繁';
            else if (resp.status === 401) msg = provider.name + ' API Key无效';
            reject(new Error(msg));
          }).catch(reject);
          return;
        }
        return resp.json();
      }).then(function(data) {
        if (!data) return;
        var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!content) {
          reject(new Error('API返回为空'));
          return;
        }
        resolve({
          content: content,
          usage: data.usage || null,
          providerId: provider.id
        });
      }).catch(function(e) {
        clearTimeout(timer);
        if (e.name === 'AbortError') {
          reject(new Error('图片识别超时（30秒），请检查网络或更换服务商'));
        } else {
          reject(new Error('网络错误: ' + e.message));
        }
      });
    });
  }

  // 适配不同provider的消息格式
  function adaptMessagesForProvider(providerId, messages) {
    // 百炼和Kimi都兼容OpenAI多模态格式（content为数组，含image_url）
    // DeepSeek V4也兼容
    // 如有特殊格式，在此处适配
    return messages;
  }

  // ==================== UI渲染 ====================
  function renderUI(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var html = '<div class="image-recog-panel">';
    
    // 头部
    html += '<div class="ir-header">';
    html += '<div class="ir-title">';
    html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    html += '<span>图片识别</span>';
    html += '</div>';
    html += '<span class="ir-status ' + (isConfigured() ? 'online' : 'offline') + '">' + (isConfigured() ? '已就绪' : '需配置') + '</span>';
    html += '</div>';

    // 场景选择
    html += '<div class="ir-scene-tabs">';
    html += '<div class="ir-scene-tab active" data-scene="general" onclick="ImageRecognizer._switchScene(\'general\')">通用识别</div>';
    html += '<div class="ir-scene-tab" data-scene="food" onclick="ImageRecognizer._switchScene(\'food\')">食物营养</div>';
    html += '<div class="ir-scene-tab" data-scene="receipt" onclick="ImageRecognizer._switchScene(\'receipt\')">票据记账</div>';
    html += '</div>';

    // 上传区域
    html += '<div class="ir-upload-area" id="irUploadArea" onclick="document.getElementById(\'irFileInput\').click()">';
    html += '<input type="file" id="irFileInput" accept="image/*" capture="environment" style="display:none" onchange="ImageRecognizer._onFileSelected(event)" />';
    html += '<div class="ir-upload-icon">';
    html += '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
    html += '</div>';
    html += '<div class="ir-upload-text" id="irUploadText">点击上传或拍照识别</div>';
    html += '<div class="ir-upload-hint" id="irUploadHint">支持 JPG、PNG 格式，自动压缩到 2MB 以内</div>';
    html += '</div>';

    // 预览区
    html += '<div class="ir-preview" id="irPreview" style="display:none">';
    html += '<img id="irPreviewImg" alt="预览" />';
    html += '<button class="ir-btn-clear" onclick="ImageRecognizer._clearPreview()">重新选择</button>';
    html += '</div>';

    // 输入框（通用识别用）
    html += '<div class="ir-input-row" id="irInputRow" style="display:none">';
    html += '<input type="text" id="irCustomPrompt" placeholder="想让AI分析什么？（可选）" />';
    html += '<button class="ir-btn-primary" id="irBtnRecognize" onclick="ImageRecognizer._doRecognize()">识别</button>';
    html += '</div>';

    // 结果区
    html += '<div class="ir-result" id="irResult" style="display:none">';
    html += '<div class="ir-result-header">';
    html += '<span class="ir-result-title">识别结果</span>';
    html += '<span class="ir-result-provider" id="irResultProvider"></span>';
    html += '</div>';
    html += '<div class="ir-result-content" id="irResultContent"></div>';
    html += '<div class="ir-result-actions" id="irResultActions"></div>';
    html += '</div>';

    // 历史记录
    html += '<div class="ir-history">';
    html += '<div class="ir-history-header">';
    html += '<span>识别历史</span>';
    html += '<span class="ir-history-count" id="irHistoryCount">0 条</span>';
    html += '</div>';
    html += '<div class="ir-history-list" id="irHistoryList">';
    html += '<div class="ir-empty">暂无识别记录</div>';
    html += '</div>';
    html += '</div>';

    html += '</div>';

    container.innerHTML = html;
    
    // 渲染历史
    renderHistoryList();
  }

  function isConfigured() {
    return getVisionChain().length > 0;
  }

  // 当前场景
  var _currentScene = 'general';

  function _switchScene(scene) {
    _currentScene = scene;
    // 更新tab样式
    var tabs = document.querySelectorAll('.ir-scene-tab');
    tabs.forEach(function(t) {
      t.classList.toggle('active', t.dataset.scene === scene);
    });
    // 通用场景显示输入框
    var inputRow = document.getElementById('irInputRow');
    if (inputRow) {
      inputRow.style.display = scene === 'general' ? 'flex' : 'none';
    }
    // 更新上传提示
    var hint = document.getElementById('irUploadHint');
    if (hint) {
      var hints = {
        general: '上传任意图片，AI帮你分析内容',
        food: '拍照识别食物营养成分、热量估算',
        receipt: '拍照识别小票发票，一键记录收支'
      };
      hint.textContent = hints[scene] || '';
    }
    // 清空当前结果
    _clearPreview();
  }

  function _onFileSelected(event) {
    var file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件');
      return;
    }
    
    var uploadArea = document.getElementById('irUploadArea');
    var preview = document.getElementById('irPreview');
    var previewImg = document.getElementById('irPreviewImg');
    
    // 显示预览
    var reader = new FileReader();
    reader.onload = function(e) {
      previewImg.src = e.target.result;
      uploadArea.style.display = 'none';
      preview.style.display = 'block';
      
      // 非通用场景直接识别
      if (_currentScene !== 'general') {
        _doRecognize();
      } else {
        document.getElementById('irInputRow').style.display = 'flex';
      }
    };
    reader.readAsDataURL(file);
  }

  function _clearPreview() {
    var uploadArea = document.getElementById('irUploadArea');
    var preview = document.getElementById('irPreview');
    var result = document.getElementById('irResult');
    var inputRow = document.getElementById('irInputRow');
    var fileInput = document.getElementById('irFileInput');
    
    if (uploadArea) uploadArea.style.display = 'flex';
    if (preview) preview.style.display = 'none';
    if (result) result.style.display = 'none';
    if (inputRow) inputRow.style.display = _currentScene === 'general' ? 'none' : 'none';
    if (fileInput) fileInput.value = '';
  }

  async function _doRecognize() {
    var previewImg = document.getElementById('irPreviewImg');
    if (!previewImg || !previewImg.src) {
      showToast('请先选择图片');
      return;
    }

    var btn = document.getElementById('irBtnRecognize');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '识别中...';
    }
    showToast('正在识别，请稍候...');

    var imageData = previewImg.src;
    var prompt = null;
    
    if (_currentScene === 'general') {
      var input = document.getElementById('irCustomPrompt');
      prompt = input && input.value.trim() ? input.value.trim() : null;
    }

    var result;
    if (_currentScene === 'food') {
      result = await recognizeFood(imageData);
    } else if (_currentScene === 'receipt') {
      result = await recognizeReceipt(imageData);
    } else {
      result = await recognizeGeneral(imageData, prompt);
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = '识别';
    }

    _showResult(result);
  }

  function _showResult(result) {
    var resultDiv = document.getElementById('irResult');
    var contentDiv = document.getElementById('irResultContent');
    var providerSpan = document.getElementById('irResultProvider');
    var actionsDiv = document.getElementById('irResultActions');

    if (!result.success) {
      contentDiv.innerHTML = '<div class="ir-error">识别失败：' + result.error + '</div>';
      providerSpan.textContent = '';
      actionsDiv.innerHTML = '';
      resultDiv.style.display = 'block';
      return;
    }

    providerSpan.textContent = result.provider;
    
    // 格式化内容
    var content = result.content;
    // 简单的换行处理
    content = content.replace(/\n/g, '<br/>');
    contentDiv.innerHTML = '<div class="ir-result-text">' + content + '</div>';

    // 场景化操作按钮
    var actions = [];
    if (_currentScene === 'receipt' && result.parsed) {
      actions.push({
        text: '记一笔',
        action: function() {
          if (window.dailyTxAddRecord) {
            var p = result.parsed;
            dailyTxAddRecord({
              amount: p.amount || 0,
              type: 'expense',
              category: p.category || '购物',
              note: (p.merchant || '') + (p.items && p.items.length ? ' - ' + p.items.length + '项商品' : ''),
              date: p.date || new Date().toISOString().split('T')[0]
            });
            showToast('已添加到收支记录');
          } else {
            showToast('收支模块未加载');
          }
        }
      });
    }
    if (_currentScene === 'food') {
      actions.push({
        text: '保存到健康记录',
        action: function() {
          showToast('健康记录接入开发中');
        }
      });
    }
    actions.push({
      text: '继续对话',
      action: function() {
        // 发送到AI对话
        if (window.AiEngine && window.AiEngine.chatWithImage) {
          AiEngine.chatWithImage(result.record.imageData, result.content);
        } else {
          showToast('对话功能接入中');
        }
      }
    });

    actionsDiv.innerHTML = '';
    actions.forEach(function(a) {
      var btn = document.createElement('button');
      btn.className = 'ir-action-btn';
      btn.textContent = a.text;
      btn.onclick = a.action;
      actionsDiv.appendChild(btn);
    });

    resultDiv.style.display = 'block';
    
    // 刷新历史
    renderHistoryList();
  }

  function renderHistoryList() {
    var list = document.getElementById('irHistoryList');
    var count = document.getElementById('irHistoryCount');
    if (!list) return;

    var history = getHistory();
    if (count) count.textContent = history.length + ' 条';

    if (history.length === 0) {
      list.innerHTML = '<div class="ir-empty">暂无识别记录</div>';
      return;
    }

    var sceneNames = { general: '通用', food: '食物', receipt: '票据' };
    var html = '';
    history.slice(0, 20).forEach(function(item) {
      var date = new Date(item.timestamp);
      var timeStr = date.getMonth()+1 + '/' + date.getDate() + ' ' + 
                    String(date.getHours()).padStart(2,'0') + ':' + String(date.getMinutes()).padStart(2,'0');
      html += '<div class="ir-history-item" onclick="ImageRecognizer._viewHistory(\'' + item.id + '\')">';
      if (item.imageData) {
        html += '<img src="' + item.imageData + '" class="ir-history-thumb" alt="" />';
      } else {
        html += '<div class="ir-history-thumb ir-history-thumb-placeholder">';
        html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#cbd5e1" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
        html += '</div>';
      }
      html += '<div class="ir-history-info">';
      html += '<div class="ir-history-scene">' + (sceneNames[item.scene] || item.scene) + ' · ' + timeStr + '</div>';
      html += '<div class="ir-history-preview">' + (item.result.substring(0, 50)) + '...</div>';
      html += '</div>';
      html += '</div>';
    });

    list.innerHTML = html;
  }

  function _viewHistory(id) {
    var item = _history.find(function(h) { return h.id === id; });
    if (!item) return;

    var previewImg = document.getElementById('irPreviewImg');
    var uploadArea = document.getElementById('irUploadArea');
    var preview = document.getElementById('irPreview');
    
    if (item.imageData && previewImg) {
      previewImg.src = item.imageData;
      uploadArea.style.display = 'none';
      preview.style.display = 'block';
    }
    
    _currentScene = item.scene;
    _switchScene(item.scene);
    
    _showResult({
      success: true,
      content: item.result,
      provider: item.provider,
      parsed: item.scene === 'receipt' ? parseReceiptJSON(item.result) : null,
      record: item
    });
  }

  // 简易toast
  function showToast(msg) {
    if (window.showToast) {
      showToast(msg);
    } else {
      alert(msg);
    }
  }

  // ==================== 暴露内部方法（供UI调用） ====================
  // 注意：这些方法通过window.ImageRecognizer暴露，在renderUI中被onclick调用

  // 自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
