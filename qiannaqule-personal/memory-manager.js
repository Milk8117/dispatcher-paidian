/**
 * MiRun AI Memory Manager — 记忆系统骨架 v50
 * 分层存储：user / soul / memory / tools / recent_memory
 * 底层基于 IndexedDB，localStorage 兜底
 *
 * 记忆层级说明：
 * - user: 用户固定档案（基本信息、健康档案、偏好、价值观、家庭成员）
 * - soul: 数字分身内核（性格、说话风格、决策原则、长期目标）
 * - memory: 长期记忆（重要事件、关键对话、里程碑）
 * - tools: 工具使用习惯、常用配置
 * - recent_memory: 近期记忆（最近N轮对话上下文，会话级）
 */

(function() {
  'use strict';

  var DB_NAME = 'mirunai_memory';
  var DB_VERSION = 1;
  var STORE_NAME = 'memory_layers';
  var LS_FALLBACK_PREFIX = 'mirunai_mem_';

  var _db = null;
  var _initPromise = null;
  var _useLSFallback = false;

  // 记忆层定义
  var LAYERS = ['user', 'soul', 'memory', 'tools', 'recent_memory'];

  function _isValidLayer(layer) {
    return LAYERS.indexOf(layer) !== -1;
  }

  // ========== IndexedDB 初始化 ==========
  function initDB() {
    if (_initPromise) return _initPromise;

    _initPromise = new Promise(function(resolve, reject) {
      if (!window.indexedDB) {
        _useLSFallback = true;
        resolve(null);
        return;
      }

      var req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          var store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('layer', 'layer', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      req.onsuccess = function(e) {
        _db = e.target.result;
        resolve(_db);
      };

      req.onerror = function(e) {
        console.warn('[MemoryManager] IndexedDB 打开失败，降级到 localStorage');
        _useLSFallback = true;
        resolve(null);
      };
    });

    return _initPromise;
  }

  // ========== IndexedDB 底层操作 ==========
  function _idbPut(layer, key, value) {
    return new Promise(function(resolve, reject) {
      if (!_db) { reject(new Error('DB not ready')); return; }
      var tx = _db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      var id = layer + ':' + key;
      var record = {
        id: id,
        layer: layer,
        key: key,
        value: value,
        updatedAt: Date.now()
      };
      var req = store.put(record);
      req.onsuccess = function() { resolve(true); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  function _idbGet(layer, key) {
    return new Promise(function(resolve, reject) {
      if (!_db) { reject(new Error('DB not ready')); return; }
      var tx = _db.transaction(STORE_NAME, 'readonly');
      var store = tx.objectStore(STORE_NAME);
      var id = layer + ':' + key;
      var req = store.get(id);
      req.onsuccess = function(e) {
        var rec = e.target.result;
        resolve(rec ? rec.value : null);
      };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  function _idbGetAllByLayer(layer) {
    return new Promise(function(resolve, reject) {
      if (!_db) { reject(new Error('DB not ready')); return; }
      var tx = _db.transaction(STORE_NAME, 'readonly');
      var store = tx.objectStore(STORE_NAME);
      var idx = store.index('layer');
      var req = idx.getAll(layer);
      req.onsuccess = function(e) {
        var records = e.target.result || [];
        var result = {};
        records.forEach(function(r) { result[r.key] = r.value; });
        resolve(result);
      };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  function _idbDelete(layer, key) {
    return new Promise(function(resolve, reject) {
      if (!_db) { reject(new Error('DB not ready')); return; }
      var tx = _db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      var id = layer + ':' + key;
      var req = store.delete(id);
      req.onsuccess = function() { resolve(true); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  function _idbSearch(layer, query) {
    return new Promise(function(resolve, reject) {
      if (!_db) { reject(new Error('DB not ready')); return; }
      var tx = _db.transaction(STORE_NAME, 'readonly');
      var store = tx.objectStore(STORE_NAME);
      var idx = store.index('layer');
      var req = idx.openCursor(layer);
      var results = [];
      var lowerQuery = query.toLowerCase();

      req.onsuccess = function(e) {
        var cursor = e.target.result;
        if (cursor) {
          var rec = cursor.value;
          var valStr = '';
          try { valStr = JSON.stringify(rec.value).toLowerCase(); } catch(err) {}
          if (rec.key.toLowerCase().indexOf(lowerQuery) !== -1 || valStr.indexOf(lowerQuery) !== -1) {
            results.push({ key: rec.key, value: rec.value, updatedAt: rec.updatedAt });
          }
          cursor.continue();
        } else {
          results.sort(function(a, b) { return b.updatedAt - a.updatedAt; });
          resolve(results);
        }
      };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  // ========== localStorage 兜底 ==========
  function _lsKey(layer, key) {
    return LS_FALLBACK_PREFIX + layer + ':' + key;
  }

  function _lsPut(layer, key, value) {
    try {
      localStorage.setItem(_lsKey(layer, key), JSON.stringify({
        value: value,
        updatedAt: Date.now()
      }));
      return Promise.resolve(true);
    } catch(e) {
      return Promise.reject(e);
    }
  }

  function _lsGet(layer, key) {
    try {
      var raw = localStorage.getItem(_lsKey(layer, key));
      if (!raw) return Promise.resolve(null);
      var obj = JSON.parse(raw);
      return Promise.resolve(obj.value);
    } catch(e) {
      return Promise.reject(e);
    }
  }

  function _lsGetAllByLayer(layer) {
    try {
      var result = {};
      var prefix = _lsKey(layer, '');
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0) {
          var recKey = k.substring(prefix.length);
          try {
            var obj = JSON.parse(localStorage.getItem(k));
            result[recKey] = obj.value;
          } catch(e) {}
        }
      }
      return Promise.resolve(result);
    } catch(e) {
      return Promise.reject(e);
    }
  }

  function _lsDelete(layer, key) {
    try {
      localStorage.removeItem(_lsKey(layer, key));
      return Promise.resolve(true);
    } catch(e) {
      return Promise.reject(e);
    }
  }

  function _lsSearch(layer, query) {
    try {
      var results = [];
      var lowerQuery = query.toLowerCase();
      var prefix = _lsKey(layer, '');
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0) {
          var recKey = k.substring(prefix.length);
          try {
            var obj = JSON.parse(localStorage.getItem(k));
            var valStr = JSON.stringify(obj.value || '').toLowerCase();
            if (recKey.toLowerCase().indexOf(lowerQuery) !== -1 || valStr.indexOf(lowerQuery) !== -1) {
              results.push({ key: recKey, value: obj.value, updatedAt: obj.updatedAt || 0 });
            }
          } catch(e) {}
        }
      }
      results.sort(function(a, b) { return b.updatedAt - a.updatedAt; });
      return Promise.resolve(results);
    } catch(e) {
      return Promise.reject(e);
    }
  }

  // ========== 统一接口 ==========
  function _ensureReady() {
    return initDB();
  }

  /**
   * 保存记忆
   * @param {string} layer - 记忆层：user/soul/memory/tools/recent_memory
   * @param {string} key - 键名
   * @param {any} value - 值（可 JSON 序列化）
   */
  function save(layer, key, value) {
    if (!_isValidLayer(layer)) {
      return Promise.reject(new Error('无效的记忆层: ' + layer));
    }
    return _ensureReady().then(function() {
      if (_useLSFallback) return _lsPut(layer, key, value);
      return _idbPut(layer, key, value);
    });
  }

  /**
   * 加载记忆
   * @param {string} layer - 记忆层
   * @param {string} key - 键名
   * @returns {Promise<any>} 值
   */
  function load(layer, key) {
    if (!_isValidLayer(layer)) {
      return Promise.reject(new Error('无效的记忆层: ' + layer));
    }
    return _ensureReady().then(function() {
      if (_useLSFallback) return _lsGet(layer, key);
      return _idbGet(layer, key);
    });
  }

  /**
   * 加载某层所有记忆
   * @param {string} layer - 记忆层
   * @returns {Promise<Object>} 键值对对象
   */
  function loadLayer(layer) {
    if (!_isValidLayer(layer)) {
      return Promise.reject(new Error('无效的记忆层: ' + layer));
    }
    return _ensureReady().then(function() {
      if (_useLSFallback) return _lsGetAllByLayer(layer);
      return _idbGetAllByLayer(layer);
    });
  }

  /**
   * 追加内容到数组记忆
   * 如果 key 不存在则创建新数组
   * @param {string} layer - 记忆层
   * @param {string} key - 键名
   * @param {any} item - 要追加的内容
   * @param {number} maxItems - 最大保留条数（可选，超出时丢弃最早的）
   */
  function append(layer, key, item, maxItems) {
    return load(layer, key).then(function(existing) {
      var arr = Array.isArray(existing) ? existing : [];
      arr.push(item);
      if (maxItems && arr.length > maxItems) {
        arr = arr.slice(arr.length - maxItems);
      }
      return save(layer, key, arr);
    });
  }

  /**
   * 删除某条记忆
   */
  function remove(layer, key) {
    if (!_isValidLayer(layer)) {
      return Promise.reject(new Error('无效的记忆层: ' + layer));
    }
    return _ensureReady().then(function() {
      if (_useLSFallback) return _lsDelete(layer, key);
      return _idbDelete(layer, key);
    });
  }

  /**
   * 搜索记忆（关键词匹配 key 和 value）
   * @param {string} layer - 记忆层
   * @param {string} query - 搜索关键词
   * @returns {Promise<Array>} 匹配结果，按更新时间倒序
   */
  function search(layer, query) {
    if (!_isValidLayer(layer)) {
      return Promise.reject(new Error('无效的记忆层: ' + layer));
    }
    return _ensureReady().then(function() {
      if (_useLSFallback) return _lsSearch(layer, query);
      return _idbSearch(layer, query);
    });
  }

  /**
   * 获取对话上下文（用于每次对话前自动加载）
   * 从 user / soul / recent_memory 三层提取关键信息
   * @returns {Promise<Object>} 上下文对象
   */
  function getContextForChat() {
    return Promise.all([
      loadLayer('user').catch(function() { return {}; }),
      loadLayer('soul').catch(function() { return {}; }),
      load('recent_memory', 'conversation').catch(function() { return []; })
    ]).then(function(results) {
      return {
        user: results[0] || {},
        soul: results[1] || {},
        recentConversation: results[2] || []
      };
    });
  }

  /**
   * 记录一轮对话到近期记忆
   * @param {string} role - user / assistant
   * @param {string} content - 内容
   * @param {number} maxTurns - 最大保留轮数（默认20）
   */
  function recordConversationTurn(role, content, maxTurns) {
    var turn = { role: role, content: content, timestamp: Date.now() };
    return append('recent_memory', 'conversation', turn, maxTurns || 20);
  }

  /**
   * 清空近期对话记忆
   */
  function clearRecentConversation() {
    return save('recent_memory', 'conversation', []);
  }

  // ========== 同步获取（初始化后可用） ==========
  var _syncCache = {};

  function preloadForSync() {
    return Promise.all(LAYERS.map(function(layer) {
      return loadLayer(layer).then(function(data) {
        _syncCache[layer] = data;
      }).catch(function() {
        _syncCache[layer] = {};
      });
    }));
  }

  function getSync(layer, key, defaultValue) {
    if (_syncCache[layer] && _syncCache[layer][key] !== undefined) {
      return _syncCache[layer][key];
    }
    return defaultValue !== undefined ? defaultValue : null;
  }

  function setSync(layer, key, value) {
    if (!_syncCache[layer]) _syncCache[layer] = {};
    _syncCache[layer][key] = value;
    // 异步持久化，不等待
    save(layer, key, value).catch(function(e) {
      console.warn('[MemoryManager] 异步持久化失败:', e);
    });
  }

  // ========== 导出 ==========
  window.MemoryManager = {
    LAYERS: LAYERS,
    init: initDB,
    save: save,
    load: load,
    loadLayer: loadLayer,
    append: append,
    remove: remove,
    search: search,
    getContextForChat: getContextForChat,
    recordConversationTurn: recordConversationTurn,
    clearRecentConversation: clearRecentConversation,
    preloadForSync: preloadForSync,
    getSync: getSync,
    setSync: setSync,
    isReady: function() { return _db !== null || _useLSFallback; },
    useFallback: function() { return _useLSFallback; }
  };

  // 自动初始化
  initDB().catch(function(e) {
    console.warn('[MemoryManager] 初始化失败:', e);
  });

})();
