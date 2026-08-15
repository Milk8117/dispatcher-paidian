/**
 * DataStore - MiRun AI统一数据访问层 (v3.0.0)
 * 
 * v3.0.0 变更：
 *   - 双引擎并存：localStorage（同步）+ IndexedDB（大容量）
 *   - registerModule 增加 engine 参数，可指定模块使用哪个引擎
 *   - 所有 API 保持同步风格，调用方零改动
 *   - IndexedDB 模块：内存缓存 + 异步持久化（读写立即返回，后台落盘）
 *   - 存量数据自动迁移：首次加载自动从 localStorage 搬到 IndexedDB
 *   - 存储状态面板：各模块引擎/占用空间展示
 *   - 完全向后兼容：未指定 engine 的模块默认走 localStorage
 */

(function(global) {
  'use strict';

  var CONFIG = {
    STORAGE_PREFIX: 'wealth_ct_',
    LEGACY_PREFIX: 'mijieai_',
    VERSION: '3.0.0',
    MODULE: 'wealth_ct',
    DB_NAME: 'mijieai_datastore',
    DB_VERSION: 1,
    STORE_NAME: 'keyvalue'
  };

  var _moduleRegistry = {};
  var _idbCache = {};    // IndexedDB 的内存镜像：{ key: value }
  var _idbDirty = {};    // 待持久化的 key：{ key: { value, module } }
  var _idbFlushing = false;
  var _idbReady = false;
  var _idbInitPromise = null;
  var _db = null;

  // ========= 模块注册 =========
  function registerModule(moduleName, keyMap, options) {
    if (!moduleName || !keyMap || typeof keyMap !== 'object') return;
    options = options || {};
    if (!_moduleRegistry[moduleName]) {
      _moduleRegistry[moduleName] = { fields: {}, engine: 'localStorage' };
    }
    for (var f in keyMap) {
      if (keyMap.hasOwnProperty(f)) {
        _moduleRegistry[moduleName].fields[f] = keyMap[f];
      }
    }
    if (options.engine === 'indexeddb') {
      _moduleRegistry[moduleName].engine = 'indexeddb';
      initIDBAndMigrate(moduleName);
    }
  }

  function isModuleRegistered(m) { return !!_moduleRegistry[m]; }
  function getModuleEngine(m) {
    return _moduleRegistry[m] ? _moduleRegistry[m].engine : 'localStorage';
  }
  function resolveKey(m, f) {
    if (_moduleRegistry[m] && _moduleRegistry[m].fields[f] !== undefined) {
      return _moduleRegistry[m].fields[f];
    }
    return CONFIG.STORAGE_PREFIX + m + '_' + f;
  }
  function getRegisteredFields(m) {
    if (!_moduleRegistry[m]) return [];
    return Object.keys(_moduleRegistry[m].fields);
  }
  function getRegisteredModules() { return Object.keys(_moduleRegistry); }
  function buildKey(m, f) { return CONFIG.STORAGE_PREFIX + m + '_' + f; }

  function safeParse(s, def) {
    try { return JSON.parse(s); } catch(e) { return def; }
  }

  // ========= IndexedDB 初始化 + 迁移 =========
  function initIDBAndMigrate(moduleName) {
    if (!_idbInitPromise) {
      _idbInitPromise = new Promise(function(resolve, reject) {
        try {
          var req = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
          req.onupgradeneeded = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains(CONFIG.STORE_NAME)) {
              var store = db.createObjectStore(CONFIG.STORE_NAME, { keyPath: 'key' });
              store.createIndex('module_idx', 'module', { unique: false });
            }
          };
          req.onsuccess = function(e) {
            _db = e.target.result;
            _idbReady = true;
            // 先把所有 IDB 数据加载到内存缓存
            loadAllToCache().then(resolve).catch(resolve);
          };
          req.onerror = function(e) {
            console.warn('[DataStore] IndexedDB 打开失败，降级 localStorage:', e.target.error);
            // 降级：所有 IDB 模块改走 localStorage
            for (var m in _moduleRegistry) {
              if (_moduleRegistry[m].engine === 'indexeddb') {
                _moduleRegistry[m].engine = 'localStorage';
              }
            }
            resolve();
          };
        } catch(e) {
          console.warn('[DataStore] IndexedDB 不支持，降级 localStorage');
          for (var m in _moduleRegistry) {
            if (_moduleRegistry[m].engine === 'indexeddb') {
              _moduleRegistry[m].engine = 'localStorage';
            }
          }
          resolve();
        }
      });
    }
    return _idbInitPromise;
  }

  function loadAllToCache() {
    return new Promise(function(resolve) {
      var tx = _db.transaction(CONFIG.STORE_NAME, 'readonly');
      tx.objectStore(CONFIG.STORE_NAME).openCursor().onsuccess = function(e) {
        var cursor = e.target.result;
        if (cursor) {
          _idbCache[cursor.value.key] = cursor.value.value;
          cursor.continue();
        } else {
          resolve();
        }
      };
      tx.onerror = function() { resolve(); };
    });
  }

  function migrateModuleFromLS(moduleName) {
    var migrateKey = '__idb_migrated_' + moduleName;
    if (localStorage.getItem(migrateKey) === '1') return;
    if (!_moduleRegistry[moduleName]) return;

    var fields = Object.keys(_moduleRegistry[moduleName].fields);
    var migratedCount = 0;
    var totalFields = fields.length;

    fields.forEach(function(f) {
      var realKey = _moduleRegistry[moduleName].fields[f];
      var raw = localStorage.getItem(realKey);
      if (raw !== null) {
        var val = safeParse(raw, raw);
        _idbCache[realKey] = val;
        _idbDirty[realKey] = { value: val, module: moduleName };
        migratedCount++;
      }
    });

    // 迁移完成后删除 localStorage 中的数据（腾出空间）
    if (migratedCount > 0) {
      flushIDB().then(function() {
        fields.forEach(function(f) {
          var realKey = _moduleRegistry[moduleName].fields[f];
          // 不删，留作备份以防万一。用户确认正常后可清理。
        });
        localStorage.setItem(migrateKey, '1');
        console.log('[DataStore] 模块', moduleName, '已迁移', migratedCount, '个字段到 IndexedDB');
      });
    } else {
      localStorage.setItem(migrateKey, '1');
    }
  }

  // ========= IndexedDB 异步持久化 =========
  function flushIDB() {
    if (!_idbReady || !_db) return Promise.resolve();
    var keys = Object.keys(_idbDirty);
    if (keys.length === 0) return Promise.resolve();
    if (_idbFlushing) return Promise.resolve();

    _idbFlushing = true;
    var dirtyCopy = {};
    for (var k in _idbDirty) {
      if (_idbDirty.hasOwnProperty(k)) {
        dirtyCopy[k] = _idbDirty[k];
      }
    }
    _idbDirty = {};

    return new Promise(function(resolve) {
      var tx = _db.transaction(CONFIG.STORE_NAME, 'readwrite');
      var store = tx.objectStore(CONFIG.STORE_NAME);
      var remaining = Object.keys(dirtyCopy).length;
      if (remaining === 0) { _idbFlushing = false; resolve(); return; }

      for (var key in dirtyCopy) {
        if (dirtyCopy.hasOwnProperty(key)) {
          store.put({
            key: key,
            value: dirtyCopy[key].value,
            module: dirtyCopy[key].module,
            updatedAt: Date.now()
          });
        }
      }
      tx.oncomplete = function() {
        _idbFlushing = false;
        // 如果中间又有新的 dirty，继续 flush
        if (Object.keys(_idbDirty).length > 0) {
          flushIDB();
        }
        resolve();
      };
      tx.onerror = function() {
        _idbFlushing = false;
        // 失败了就把数据塞回 dirty 队列，下次再试
        for (var k in dirtyCopy) {
          if (!_idbDirty[k]) _idbDirty[k] = dirtyCopy[k];
        }
        resolve();
      };
    });
  }

  // 节流 flush：每 500ms 批量落盘一次
  var _flushTimer = null;
  function scheduleFlush() {
    if (_flushTimer) return;
    _flushTimer = setTimeout(function() {
      _flushTimer = null;
      flushIDB();
    }, 500);
  }

  // ========= 统一 API（全部同步风格） =========
  var DataStore = {
    registerModule: registerModule,
    getVersion: function() { return CONFIG.VERSION; },
    getModuleEngine: getModuleEngine,

    save: function(module, field, value) {
      var engine = getModuleEngine(module);
      var key = resolveKey(module, field);
      if (engine === 'indexeddb') {
        _idbCache[key] = value;
        _idbDirty[key] = { value: value, module: module };
        scheduleFlush();
        return true;
      }
      var data = (typeof value === 'object') ? JSON.stringify(value) : String(value);
      localStorage.setItem(key, data);
      return true;
    },

    load: function(module, field, defaultValue) {
      var engine = getModuleEngine(module);
      var key = resolveKey(module, field);
      if (engine === 'indexeddb') {
        if (_idbCache.hasOwnProperty(key)) {
          return _idbCache[key];
        }
        // 如果 IDB 还在初始化，先从 localStorage 读（迁移完成前的兜底）
        var raw = localStorage.getItem(key);
        if (raw !== null) {
          var val = safeParse(raw, raw);
          return val;
        }
        return defaultValue;
      }
      var rawLS = localStorage.getItem(key);
      if (rawLS === null) return defaultValue;
      var parsed = safeParse(rawLS, null);
      return parsed !== null ? parsed : rawLS;
    },

    remove: function(module, field) {
      var engine = getModuleEngine(module);
      var key = resolveKey(module, field);
      if (engine === 'indexeddb') {
        delete _idbCache[key];
        // 标记为 null 表示删除
        _idbDirty[key] = { value: null, module: module, _deleted: true };
        scheduleFlush();
        return true;
      }
      localStorage.removeItem(key);
      return true;
    },

    loadAll: function(module) {
      var result = {};
      if (isModuleRegistered(module)) {
        var fields = getRegisteredFields(module);
        for (var i = 0; i < fields.length; i++) {
          var v = this.load(module, fields[i]);
          if (v !== undefined && v !== null) result[fields[i]] = v;
        }
        return result;
      }
      // 未注册模块：前缀扫描（仅 localStorage）
      var prefix = buildKey(module, '');
      for (var j = 0; j < localStorage.length; j++) {
        var k = localStorage.key(j);
        if (k && k.indexOf(prefix) === 0) {
          var f = k.substring(prefix.length);
          result[f] = this.load(module, f);
        }
      }
      return result;
    },

    saveAll: function(module, data) {
      for (var f in data) {
        if (data.hasOwnProperty(f)) {
          this.save(module, f, data[f]);
        }
      }
      return true;
    },

    removeAll: function(module) {
      if (isModuleRegistered(module)) {
        var fields = getRegisteredFields(module);
        for (var i = 0; i < fields.length; i++) {
          this.remove(module, fields[i]);
        }
      }
      return true;
    },

    getModules: function() {
      var mods = {};
      var registered = getRegisteredModules();
      for (var i = 0; i < registered.length; i++) mods[registered[i]] = true;
      var prefix = CONFIG.STORAGE_PREFIX;
      for (var j = 0; j < localStorage.length; j++) {
        var k = localStorage.key(j);
        if (k && k.indexOf(prefix) === 0) {
          var rem = k.substring(prefix.length);
          var m = rem.split('_')[0];
          if (m) mods[m] = true;
        }
      }
      return Object.keys(mods);
    },

    // 强制落盘（用于关键数据）
    flush: function() {
      return flushIDB();
    },

    // 存储状态面板
    showStoragePanel: function() {
      var panel = document.getElementById('mijieai-storage-panel');
      if (panel) { panel.style.display = 'flex'; return; }
      panel = document.createElement('div');
      panel.id = 'mijieai-storage-panel';
      panel.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
      panel.innerHTML = '<div style="background:#fff;border-radius:16px;padding:24px;width:90%;max-width:480px;max-height:80vh;overflow-y:auto;">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
        + '<h3 style="margin:0;font-size:18px;">存储空间</h3>'
        + '<span id="storage-close" style="cursor:pointer;font-size:20px;color:#999;">✕</span></div>'
        + '<div id="storage-content" style="color:#333;font-size:14px;line-height:1.8;">加载中...</div></div>';
      document.body.appendChild(panel);
      panel.querySelector('#storage-close').onclick = function() { panel.style.display = 'none'; };
      panel.onclick = function(e) { if (e.target === panel) panel.style.display = 'none'; };

      var content = panel.querySelector('#storage-content');

      // 计算 localStorage 使用量
      var lsTotal = 0;
      var lsByModule = {};
      var mods = this.getModules();
      mods.forEach(function(m) {
        if (getModuleEngine(m) === 'localStorage' && isModuleRegistered(m)) {
          var fields = getRegisteredFields(m);
          fields.forEach(function(f) {
            var k = resolveKey(m, f);
            var v = localStorage.getItem(k);
            var s = v ? v.length * 2 : 0;
            lsTotal += s;
            lsByModule[m] = (lsByModule[m] || 0) + s;
          });
        }
      });

      // IndexedDB 使用量（从内存缓存估算）
      var idbTotal = 0;
      var idbByModule = {};
      for (var key in _idbCache) {
        if (_idbCache.hasOwnProperty(key)) {
          var val = _idbCache[key];
          var size = JSON.stringify(val).length * 2;
          idbTotal += size;
          // 找对应模块
          var foundMod = null;
          for (var m in _moduleRegistry) {
            if (!_moduleRegistry[m] || _moduleRegistry[m].engine !== 'indexeddb') continue;
            for (var f in _moduleRegistry[m].fields) {
              if (_moduleRegistry[m].fields[f] === key) { foundMod = m; break; }
            }
            if (foundMod) break;
          }
          if (foundMod) idbByModule[foundMod] = (idbByModule[foundMod] || 0) + size;
        }
      }

      var total = lsTotal + idbTotal;
      var html = '<p><strong>DataStore v3.0.0</strong> · 双引擎模式</p>';
      html += '<p style="margin:8px 0 16px;">总占用：<strong>' + formatSize(total) + '</strong></p>';

      html += '<div style="margin-bottom:12px;">';
      html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:4px;">';
      html += '<span>localStorage（同步）</span><span>' + formatSize(lsTotal) + '</span></div>';
      html += '<div style="background:#e5e7eb;border-radius:8px;height:8px;overflow:hidden;">';
      var lsPct = total > 0 ? (lsTotal / total * 100).toFixed(1) : 0;
      html += '<div style="background:#3b82f6;width:' + lsPct + '%;height:100%;"></div></div></div>';

      html += '<div style="margin-bottom:12px;">';
      html += '<div style="display:flex;justify-content:space-between;font-size:12px;color:#666;margin-bottom:4px;">';
      html += '<span>IndexedDB（异步持久化）</span><span>' + formatSize(idbTotal) + '</span></div>';
      html += '<div style="background:#e5e7eb;border-radius:8px;height:8px;overflow:hidden;">';
      var idbPct = total > 0 ? (idbTotal / total * 100).toFixed(1) : 0;
      html += '<div style="background:#10b981;width:' + idbPct + '%;height:100%;"></div></div></div>';

      html += '<h4 style="margin:16px 0 8px;font-size:14px;">模块明细</h4>';
      html += '<div style="font-size:13px;">';
      mods.sort().forEach(function(m) {
        var engine = getModuleEngine(m);
        var size = 0;
        if (engine === 'localStorage' && lsByModule[m]) size = lsByModule[m];
        if (engine === 'indexeddb' && idbByModule[m]) size = idbByModule[m];
        var badge = engine === 'indexeddb'
          ? '<span style="background:#ecfdf5;color:#059669;padding:2px 6px;border-radius:4px;font-size:11px;">IDB</span>'
          : '<span style="background:#eff6ff;color:#2563eb;padding:2px 6px;border-radius:4px;font-size:11px;">LS</span>';
        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;">'
          + '<span>' + m + ' ' + badge + '</span>'
          + '<span style="color:#6b7280;">' + formatSize(size) + '</span></div>';
      });
      html += '</div>';
      content.innerHTML = html;
    }
  };

  function formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  // IDB 初始化完成后执行迁移
  if (_idbInitPromise) {
    _idbInitPromise.then(function() {
      for (var m in _moduleRegistry) {
        if (_moduleRegistry[m].engine === 'indexeddb') {
          migrateModuleFromLS(m);
        }
      }
    });
  }

  // ========= WealthCT 兼容 =========
  var WealthCT = {
    MODULE: CONFIG.MODULE,
    saveField: function(f, v) { DataStore.save(this.MODULE, f, v); },
    loadField: function(f, d) { return DataStore.load(this.MODULE, f, d); },
    saveLoans: function(v) { DataStore.save(this.MODULE, 'loans', v); },
    loadLoans: function() { return DataStore.load(this.MODULE, 'loans', []); },
    saveInsurance: function(v) { DataStore.save(this.MODULE, 'insurance', v); },
    loadInsurance: function() { return DataStore.load(this.MODULE, 'insurance', []); },
    saveFamilyMembers: function(v) { DataStore.save(this.MODULE, 'familyMembers', v); },
    loadFamilyMembers: function() { return DataStore.load(this.MODULE, 'familyMembers', []); },
    clearAll: function() { DataStore.removeAll(this.MODULE); },
    exportAll: function() { return DataStore.exportData(this.MODULE); },
    importAll: function(d) { DataStore.importData(d); }
  };

  global.DataStore = DataStore;
  global.WealthCT = WealthCT;

})(window);
