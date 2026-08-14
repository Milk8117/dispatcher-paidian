/**
 * DataStore - MiRun AI统一数据访问层
 * 
 * 设计目标：
 * 1. 统一数据读写接口，所有模块通过DataStore访问数据
 * 2. 底层先用localStorage实现，后续可无缝切换到IndexedDB或云同步
 * 3. 支持数据加密存储（预留接口）
 * 4. 支持数据导出/导入（备份与恢复）
 * 
 * 当前阶段：明文存储（开发调试阶段）
 * 下一阶段：AES加密存储 + 导出/导入
 */

(function(global) {
  'use strict';

  // ==================== 配置 ====================
  var CONFIG = {
    STORAGE_PREFIX: 'wealth_ct_',  // 保持旧前缀，向后兼容
    VERSION: '1.0.0',            // DataStore版本
    MODULE: 'wealth_ct',         // 当前模块名
    ENCRYPT_ENABLED: false       // 是否启用加密（MVP阶段先关闭）
  };

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
     * 保存单个字段
     * @param {string} module - 模块名（如 'wealth_ct'）
     * @param {string} field - 字段名（如 'jobIncome'）
     * @param {*} value - 值（支持字符串、数字、对象、数组）
     */
    save: function(module, field, value) {
      var key = buildKey(module, field);
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
      var key = buildKey(module, field);
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
      var key = buildKey(module, field);
      StorageAdapter.removeItem(key);
    },

    /**
     * 获取模块下所有字段
     * @param {string} module - 模块名
     * @returns {object} 包含所有字段的对象
     */
    loadAll: function(module) {
      var prefix = buildKey(module, '');
      var result = {};
      
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
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
      var prefix = buildKey(module, '');
      var keysToRemove = [];
      
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf(prefix) === 0) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(function(key) {
        StorageAdapter.removeItem(key);
      });
    },

    /**
     * 导出数据（预留接口，后续实现加密）
     * @param {string} module - 模块名（可选，不传则导出所有数据）
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
        modules.forEach(function(m) {
          allData[m] = this.loadAll(m);
        }.bind(this));
        
        return {
          modules: allData,
          exportTime: new Date().toISOString()
        };
      }
    },

    /**
     * 导入数据（预留接口，后续实现解密）
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
     * 获取所有模块名
     * @returns {array} 模块名数组
     */
    getModules: function() {
      var modules = {};
      var prefix = CONFIG.STORAGE_PREFIX;
      
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf(prefix) === 0) {
          var remainder = key.substring(prefix.length);
          var module = remainder.split('_')[0];
          if (module) modules[module] = true;
        }
      }
      
      return Object.keys(modules);
    },

    /**
     * 清空所有数据（谨慎使用）
     */
    clearAll: function() {
      var modules = this.getModules();
      modules.forEach(function(module) {
        this.removeAll(module);
      }.bind(this));
    }
  };

  // ==================== 导出到全局 ====================
  global.DataStore = DataStore;


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

  // 导出到全局
  global.DataStore = DataStore;
  global.WealthCT = WealthCT;

})(window);
