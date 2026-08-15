/**
 * DataStore - MiRun AI统一数据访问层 (v2.0.0)
 * 
 * 设计目标：
 * 1. 统一数据读写接口，所有模块通过DataStore访问数据
 * 2. 底层先用localStorage实现，后续可无缝切换到IndexedDB或云同步
 * 3. 支持数据加密存储（预留接口）
 * 4. 支持数据导出/导入（备份与恢复）
 * 5. 支持模块注册机制：各模块可注册自己的字段→storage key映射，兼容存量数据
 * 
 * v2.0.0 变更：
 *   - 新增 registerModule(moduleName, keyMap) 模块注册机制
 *   - 新增 LEGACY_PREFIX = 'mijieai_' 兼容存量旧数据
 *   - save/load/remove 内部根据 module+field 查找映射表，支持自定义真实key
 *   - 所有方法（loadAll/saveAll/removeAll/exportData/importData/getModules/clearAll）均支持注册模块
 *   - wealth_ct 模块现有逻辑保持不变（向后兼容）
 * 
 * 当前阶段：明文存储（开发调试阶段）
 * 下一阶段：AES加密存储 + 导出/导入
 */

(function(global) {
  'use strict';

  // ==================== 配置 ====================
  var CONFIG = {
    STORAGE_PREFIX: 'wealth_ct_',  // 默认前缀（保持旧前缀，向后兼容）
    LEGACY_PREFIX: 'mijieai_',     // 存量旧数据前缀
    VERSION: '2.0.0',              // DataStore版本
    MODULE: 'wealth_ct',           // 默认模块名（财富CT）
    ENCRYPT_ENABLED: false         // 是否启用加密（MVP阶段先关闭）
  };

  // ==================== 模块-字段映射注册表 ====================
  // keyMap: { moduleName: { fieldName: '真实storage_key' } }
  var _moduleRegistry = {};

  /**
   * 注册模块的字段映射
   * @param {string} moduleName - 模块名
   * @param {object} keyMap - { fieldName: '真实storage_key' }
   */
  function registerModule(moduleName, keyMap) {
    if (!moduleName || !keyMap || typeof keyMap !== 'object') return;
    if (!_moduleRegistry[moduleName]) {
      _moduleRegistry[moduleName] = {};
    }
    for (var field in keyMap) {
      if (keyMap.hasOwnProperty(field)) {
        _moduleRegistry[moduleName][field] = keyMap[field];
      }
    }
  }

  /**
   * 检查模块是否已注册
   */
  function isModuleRegistered(moduleName) {
    return !!_moduleRegistry[moduleName];
  }

  /**
   * 根据模块和字段解析真实的storage key
   * 优先使用注册的映射key，找不到则使用默认前缀规则
   */
  function resolveKey(module, field) {
    if (_moduleRegistry[module] && _moduleRegistry[module][field] !== undefined) {
      return _moduleRegistry[module][field];
    }
    return CONFIG.STORAGE_PREFIX + module + '_' + field;
  }

  /**
   * 获取注册模块的所有字段名
   */
  function getRegisteredFields(moduleName) {
    if (!_moduleRegistry[moduleName]) return [];
    return Object.keys(_moduleRegistry[moduleName]);
  }

  /**
   * 获取所有已注册的模块名
   */
  function getRegisteredModules() {
    return Object.keys(_moduleRegistry);
  }

  // ==================== 底层存储适配器 ====================
  // 当前使用localStorage，后续可以切换
  var StorageAdapter = {
    getItem: function(key) {
      return localStorage.getItem(key);
    },
    setItem: function(key, value) {
      localStorage.setItem(key, value);
    },
    removeItem: function(key) {
      localStorage.removeItem(key);
    },
    clear: function() {
      localStorage.clear();
    }
  };

  // ==================== 工具函数 ====================
  function buildKey(module, field) {
    return CONFIG.STORAGE_PREFIX + module + '_' + field;
  }

  function safeParse(jsonStr, defaultValue) {
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn('[DataStore] JSON解析失败:', e);
      return defaultValue;
    }
  }

  // ==================== DataStore API ====================
  var DataStore = {
    /**
     * 注册模块字段映射
     * @param {string} moduleName - 模块名
     * @param {object} keyMap - { fieldName: '真实storage_key' }
     */
    registerModule: registerModule,

    /**
     * 获取版本号
     */
    getVersion: function() {
      return CONFIG.VERSION;
    },

    /**
     * 保存单个字段
     * @param {string} module - 模块名（如 'wealth_ct' / 'daily_tx'）
     * @param {string} field - 字段名（如 'jobIncome' / 'records'）
     * @param {*} value - 值（支持字符串、数字、对象、数组）
     */
    save: function(module, field, value) {
      var key = resolveKey(module, field);
      var data = (typeof value === 'object') ? JSON.stringify(value) : String(value);
      StorageAdapter.setItem(key, data);
    },

    /**
     * 读取单个字段
     * @param {string} module - 模块名
     * @param {string} field - 字段名
     * @param {*} defaultValue - 默认值（如果字段不存在）
     * @returns {*} 返回存储的值
     */
    load: function(module, field, defaultValue) {
      var key = resolveKey(module, field);
      var data = StorageAdapter.getItem(key);
      if (data === null) return defaultValue;
      
      // 尝试解析JSON，失败则返回原始字符串
      var parsed = safeParse(data, null);
      return parsed !== null ? parsed : data;
    },

    /**
     * 删除单个字段
     * @param {string} module - 模块名
     * @param {string} field - 字段名
     */
    remove: function(module, field) {
      var key = resolveKey(module, field);
      StorageAdapter.removeItem(key);
    },

    /**
     * 获取模块下所有字段
     * @param {string} module - 模块名
     * @returns {object} 包含所有字段的对象
     */
    loadAll: function(module) {
      var result = {};

      // 已注册模块：遍历所有注册字段逐一读取
      if (isModuleRegistered(module)) {
        var fields = getRegisteredFields(module);
        for (var i = 0; i < fields.length; i++) {
          var f = fields[i];
          var val = this.load(module, f);
          if (val !== undefined && val !== null) {
            result[f] = val;
          }
        }
        return result;
      }

      // 未注册模块：使用前缀扫描（原有 wealth_ct 模式）
      var prefix = buildKey(module, '');
      for (var j = 0; j < localStorage.length; j++) {
        var key = localStorage.key(j);
        if (key && key.indexOf(prefix) === 0) {
          var field = key.substring(prefix.length);
          result[field] = this.load(module, field);
        }
      }
      
      return result;
    },

    /**
     * 保存模块下多个字段
     * @param {string} module - 模块名
     * @param {object} data - 包含多个字段的对象
     */
    saveAll: function(module, data) {
      for (var field in data) {
        if (data.hasOwnProperty(field)) {
          this.save(module, field, data[field]);
        }
      }
    },

    /**
     * 删除模块下所有字段
     * @param {string} module - 模块名
     */
    removeAll: function(module) {
      // 已注册模块：逐一删除注册的字段
      if (isModuleRegistered(module)) {
        var fields = getRegisteredFields(module);
        for (var i = 0; i < fields.length; i++) {
          this.remove(module, fields[i]);
        }
        return;
      }

      // 未注册模块：前缀扫描删除
      var prefix = buildKey(module, '');
      var keysToRemove = [];
      
      for (var j = 0; j < localStorage.length; j++) {
        var key = localStorage.key(j);
        if (key && key.indexOf(prefix) === 0) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(function(k) {
        StorageAdapter.removeItem(k);
      });
    },

    /**
     * 导出数据
     * @param {string} [module] - 模块名（可选，不传则导出所有模块数据）
     * @returns {object} 导出的数据对象
     */
    exportData: function(module) {
      if (module) {
        return {
          module: module,
          data: this.loadAll(module),
          exportTime: new Date().toISOString()
        };
      } else {
        // 导出所有模块的数据
        var allData = {};
        var modules = this.getModules();
        for (var i = 0; i < modules.length; i++) {
          allData[modules[i]] = this.loadAll(modules[i]);
        }
        
        return {
          version: CONFIG.VERSION,
          modules: allData,
          exportTime: new Date().toISOString()
        };
      }
    },

    /**
     * 导入数据
     * @param {object} importObj - 导出的数据对象
     */
    importData: function(importObj) {
      if (importObj.module) {
        // 导入单个模块
        this.saveAll(importObj.module, importObj.data);
      } else if (importObj.modules) {
        // 导入多个模块
        for (var module in importObj.modules) {
          if (importObj.modules.hasOwnProperty(module)) {
            this.saveAll(module, importObj.modules[module]);
          }
        }
      }
    },

    /**
     * 获取所有模块名（包括注册模块和存储中发现的模块）
     * @returns {array} 模块名数组
     */
    getModules: function() {
      var modules = {};

      // 1. 已注册的模块
      var registered = getRegisteredModules();
      for (var i = 0; i < registered.length; i++) {
        modules[registered[i]] = true;
      }

      // 2. 默认前缀下发现的模块
      var prefix = CONFIG.STORAGE_PREFIX;
      for (var j = 0; j < localStorage.length; j++) {
        var key = localStorage.key(j);
        if (key && key.indexOf(prefix) === 0) {
          var remainder = key.substring(prefix.length);
          var mod = remainder.split('_')[0];
          if (mod) modules[mod] = true;
        }
      }
      
      return Object.keys(modules);
    },

    /**
     * 清空所有数据（谨慎使用）
     * 清除所有注册模块 + 默认前缀下所有模块的数据
     */
    clearAll: function() {
      var modules = this.getModules();
      for (var i = 0; i < modules.length; i++) {
        this.removeAll(modules[i]);
      }
    }
  };

  // ==================== 财富诊断CT专用便捷方法 ====================
  var WealthCT = {
    MODULE: CONFIG.MODULE,
    
    saveField: function(field, value) {
      DataStore.save(this.MODULE, field, value);
    },

    loadField: function(field, defaultValue) {
      return DataStore.load(this.MODULE, field, defaultValue);
    },

    saveLoans: function(loans) {
      DataStore.save(this.MODULE, 'loans', loans);
    },

    loadLoans: function() {
      return DataStore.load(this.MODULE, 'loans', []);
    },

    saveInsurance: function(items) {
      DataStore.save(this.MODULE, 'insurance', items);
    },

    loadInsurance: function() {
      return DataStore.load(this.MODULE, 'insurance', []);
    },

    saveFamilyMembers: function(members) {
      DataStore.save(this.MODULE, 'familyMembers', members);
    },

    loadFamilyMembers: function() {
      return DataStore.load(this.MODULE, 'familyMembers', []);
    },

    clearAll: function() {
      DataStore.removeAll(this.MODULE);
    },

    exportAll: function() {
      return DataStore.exportData(this.MODULE);
    },

    importAll: function(data) {
      DataStore.importData(data);
    }
  };

  // ==================== 导出到全局 ====================
  global.DataStore = DataStore;
  global.WealthCT = WealthCT;

})(window);
