/**
 * health-bridge.js — MiRun AI 健康数据接入层
 *
 * 职责：
 * 1. 统一健康数据Schema定义（心率/步数/睡眠/运动/压力等）
 * 2. 多源CSV数据适配器（小米/华为/苹果/Fitbit/Garmin）
 * 3. 预留原生API接口（HealthKit/HealthConnect/BLE）
 * 4. 为洞察引擎和AI引擎提供标准化健康数据
 *
 * localStorage Keys:
 *   mijieai_health_data      — 每日健康记录数组
 *   mijieai_health_settings  — 导入设置（最后导入日期等）
 *
 * 与behavior-log.js的关系：
 *   behavior-log保留睡眠/运动/饮水等手动记录结构
 *   health-bridge提供更完整的心率/HRV/深睡浅睡等精细数据
 *   insight-engine优先从health-bridge取数据，没有时回退到behavior-log
 *
 * 挂载：window.HealthBridge
 */
(function() {
  'use strict';

  // 注册本模块到 DataStore
  if (window.DataStore && DataStore.registerModule) {
    DataStore.registerModule('health', {
      records: 'mijieai_health_data',
      settings: 'mijieai_health_settings',
      profile: 'mijieai_health_profile'
    });
  }

  var MODULE = 'health';
  var FIELD_RECORDS = 'records';
  var FIELD_SETTINGS = 'settings';
  var FIELD_PROFILE = 'profile';

  var DATA_KEY = 'mijieai_health_data';
  var SETTINGS_KEY = 'mijieai_health_settings';

  // ==================== 数据读写 ====================

  /** 读取所有健康记录 */
  function loadData() {
    try {
      return DataStore.load(MODULE, FIELD_RECORDS, []) || [];
    } catch(e) {
      return [];
    }
  }

  /** 保存所有健康记录 */
  function saveData(data) {
    try {
      DataStore.save(MODULE, FIELD_RECORDS, data);
    } catch(e) {
      console.warn('[HealthBridge] 保存失败:', e.message);
    }
  }

  /** 读取导入设置 */
  function loadSettings() {
    try {
      return DataStore.load(MODULE, FIELD_SETTINGS, {}) || {};
    } catch(e) {
      return {};
    }
  }

  /** 保存导入设置 */
  function saveSettings(settings) {
    try {
      DataStore.save(MODULE, FIELD_SETTINGS, settings);
    } catch(e) {}
  }

  // ==================== 工具函数 ====================

  /** 生成今天日期字符串 YYYY-MM-DD */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  /** 解析日期字符串为Date对象，兼容多种格式 */
  function parseDate(str) {
    if (!str) return null;
    str = String(str).trim();
    // YYYY-MM-DD
    var m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
    // YYYY/MM/DD
    m = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (m) return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
    // YYYYMMDD
    m = str.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
    // MM/DD/YYYY
    m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return new Date(Number(m[3]), Number(m[1])-1, Number(m[2]));
    // 尝试原生解析
    var d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    return null;
  }

  /** 格式化Date为YYYY-MM-DD */
  function formatDate(d) {
    if (!d) return '';
    if (typeof d === 'string') return d;
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  /** 安全数字转换 */
  function toNum(val, defaultVal) {
    if (val === undefined || val === null || val === '') return defaultVal || 0;
    var n = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? (defaultVal || 0) : n;
  }

  /** 安全整数转换 */
  function toInt(val, defaultVal) {
    var n = toNum(val, defaultVal);
    return Math.round(n);
  }

  /** CSV行解析（处理引号内逗号） */
  function parseCSVLine(line, delimiter) {
    delimiter = delimiter || ',';
    var result = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i+1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === delimiter) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  }

  /** 检测CSV分隔符 */
  function detectDelimiter(lines) {
    if (lines.length < 2) return ',';
    var firstLine = lines[0];
    var commas = (firstLine.match(/,/g) || []).length;
    var tabs = (firstLine.match(/\t/g) || []).length;
    var semicolons = (firstLine.match(/;/g) || []).length;
    if (tabs > commas && tabs > semicolons) return '\t';
    if (semicolons > commas) return ';';
    return ',';
  }

  /** 列名模糊匹配 */
  function findColumn(headers, candidates) {
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i].toLowerCase().replace(/\s+/g, '');
      for (var j = 0; j < candidates.length; j++) {
        if (h.indexOf(candidates[j].toLowerCase()) >= 0) return i;
      }
    }
    return -1;
  }

  /** 创建标准空记录 */
  function createEmptyRecord(date) {
    return {
      date: date,
      source: 'manual',
      heartRate: null,
      steps: 0,
      distance: 0,
      activeMinutes: 0,
      sleep: null,
      exercise: [],
      stress: 0,
      mood: 0,
      water: 0,
      meals: []
    };
  }

  // ==================== CSV解析适配器 ====================

  /** 小米运动CSV解析 */
  function parseXiaomiCSV(content) {
    var lines = content.split(/\r?\n/).filter(function(l) { return l.trim(); });
    if (lines.length < 2) return [];

    var delimiter = detectDelimiter(lines);
    var headers = parseCSVLine(lines[0], delimiter);
    var records = [];

    // 查找列索引
    var colDate = findColumn(headers, ['日期', 'date', '时间']);
    var colSteps = findColumn(headers, ['步数', 'steps', '步']);
    var colDist = findColumn(headers, ['距离', 'distance', '公里', 'km']);
    var colActive = findColumn(headers, ['活动时长', '活动', 'active', '运动时长', 'minutes']);
    var colCal = findColumn(headers, ['卡路里', '热量', 'calori', '消耗']);

    if (colDate < 0) colDate = 0; // 默认第一列为日期

    for (var i = 1; i < lines.length; i++) {
      var cols = parseCSVLine(lines[i], delimiter);
      if (cols.length < 2) continue;

      var d = parseDate(cols[colDate]);
      if (!d) continue;
      var dateStr = formatDate(d);

      var rec = createEmptyRecord(dateStr);
      rec.source = 'csv_import';
      if (colSteps >= 0) rec.steps = toInt(cols[colSteps]);
      if (colDist >= 0) rec.distance = toNum(cols[colDist]);
      if (colActive >= 0) rec.activeMinutes = toInt(cols[colActive]);

      records.push(rec);
    }
    return records;
  }

  /** 华为健康CSV解析 */
  function parseHuaweiCSV(content) {
    var lines = content.split(/\r?\n/).filter(function(l) { return l.trim(); });
    if (lines.length < 2) return [];

    var delimiter = detectDelimiter(lines);
    var headers = parseCSVLine(lines[0], delimiter);
    var records = [];

    var colDate = findColumn(headers, ['日期', 'date', '时间', '统计时间']);
    var colSteps = findColumn(headers, ['步数', 'steps']);
    var colDist = findColumn(headers, ['距离', 'distance']);
    var colCal = findColumn(headers, ['卡路里', '热量', 'calori']);
    var colRestHR = findColumn(headers, ['静息心率', '心率', 'resting', 'heartrate']);
    var colSleep = findColumn(headers, ['睡眠时长', '睡眠', 'sleep', '总睡眠']);
    var colDeep = findColumn(headers, ['深睡', 'deep', '深度睡眠']);
    var colLight = findColumn(headers, ['浅睡', 'light', '浅度睡眠']);

    if (colDate < 0) colDate = 0;

    for (var i = 1; i < lines.length; i++) {
      var cols = parseCSVLine(lines[i], delimiter);
      if (cols.length < 2) continue;

      var d = parseDate(cols[colDate]);
      if (!d) continue;
      var dateStr = formatDate(d);

      var rec = createEmptyRecord(dateStr);
      rec.source = 'csv_import';
      if (colSteps >= 0) rec.steps = toInt(cols[colSteps]);
      if (colDist >= 0) rec.distance = toNum(cols[colDist]);
      if (colRestHR >= 0 && toNum(cols[colRestHR]) > 0) {
        rec.heartRate = { avg: toInt(cols[colRestHR]), resting: toInt(cols[colRestHR]), max: 0, hrv: 0 };
      }
      if (colSleep >= 0) {
        var sleepTotal = toNum(cols[colSleep]);
        if (sleepTotal > 0) {
          // 华为可能以小时或分钟为单位
          if (sleepTotal > 24) sleepTotal = sleepTotal / 60; // 分钟转小时
          rec.sleep = {
            total: Math.round(sleepTotal * 10) / 10,
            deep: colDeep >= 0 ? toNum(cols[colDeep]) : 0,
            light: colLight >= 0 ? toNum(cols[colLight]) : 0,
            rem: 0,
            awake: 0
          };
          // 修正深睡浅睡单位（如果是分钟转小时）
          if (rec.sleep.deep > 10) rec.sleep.deep = Math.round(rec.sleep.deep / 60 * 10) / 10;
          if (rec.sleep.light > 10) rec.sleep.light = Math.round(rec.sleep.light / 60 * 10) / 10;
        }
      }

      records.push(rec);
    }
    return records;
  }

  /** 苹果健康CSV解析（健康App导出格式：Type, Value, Date, Unit） */
  function parseAppleCSV(content) {
    var lines = content.split(/\r?\n/).filter(function(l) { return l.trim(); });
    if (lines.length < 2) return [];

    var delimiter = detectDelimiter(lines);
    var headers = parseCSVLine(lines[0], delimiter);
    var records = {};

    var colType = findColumn(headers, ['type', '类型']);
    var colValue = findColumn(headers, ['value', '值']);
    var colDate = findColumn(headers, ['date', '日期', 'time', '时间', 'start']);
    var colUnit = findColumn(headers, ['unit', '单位']);

    if (colType < 0 || colValue < 0 || colDate < 0) return [];

    for (var i = 1; i < lines.length; i++) {
      var cols = parseCSVLine(lines[i], delimiter);
      if (cols.length < 3) continue;

      var type = (cols[colType] || '').trim().toLowerCase();
      var value = toNum(cols[colValue]);
      var d = parseDate(cols[colDate]);
      if (!d) continue;
      var dateStr = formatDate(d);

      if (!records[dateStr]) {
        records[dateStr] = createEmptyRecord(dateStr);
        records[dateStr].source = 'csv_import';
      }
      var rec = records[dateStr];

      // 按类型归类
      if (type.indexOf('step') >= 0) {
        rec.steps += toInt(value);
      } else if (type.indexOf('heart rate') >= 0 || type.indexOf('heartrate') >= 0 || type.indexOf('bpm') >= 0) {
        if (!rec.heartRate) rec.heartRate = { avg: 0, resting: 0, max: 0, hrv: 0 };
        var count = rec.heartRate.avg > 0 ? 2 : 1;
        rec.heartRate.avg = Math.round((rec.heartRate.avg * (count-1) + value) / count);
        if (value > rec.heartRate.max) rec.heartRate.max = toInt(value);
      } else if (type.indexOf('sleep') >= 0) {
        var sleepHours = value;
        if (type.indexOf('rem') >= 0) {
          if (!rec.sleep) rec.sleep = { total: 0, deep: 0, light: 0, rem: 0, awake: 0 };
          rec.sleep.rem = Math.round(sleepHours * 10) / 10;
        } else if (type.indexOf('deep') >= 0) {
          if (!rec.sleep) rec.sleep = { total: 0, deep: 0, light: 0, rem: 0, awake: 0 };
          rec.sleep.deep = Math.round(sleepHours * 10) / 10;
        } else if (type.indexOf('core') >= 0 || type.indexOf('light') >= 0) {
          if (!rec.sleep) rec.sleep = { total: 0, deep: 0, light: 0, rem: 0, awake: 0 };
          rec.sleep.light = Math.round(sleepHours * 10) / 10;
        } else if (type.indexOf('asleep') >= 0 || type.indexOf('total') >= 0) {
          if (!rec.sleep) rec.sleep = { total: 0, deep: 0, light: 0, rem: 0, awake: 0 };
          if (sleepHours > 24) sleepHours = sleepHours / 60;
          rec.sleep.total = Math.round(sleepHours * 10) / 10;
        }
      } else if (type.indexOf('distance') >= 0 || type.indexOf('walking') >= 0 || type.indexOf('running') >= 0) {
        if (type.indexOf('distance') >= 0) {
          rec.distance += Math.round(value * 100) / 100;
        }
      } else if (type.indexOf('hrv') >= 0 || type.indexOf('heart rate variability') >= 0) {
        if (!rec.heartRate) rec.heartRate = { avg: 0, resting: 0, max: 0, hrv: 0 };
        rec.heartRate.hrv = toInt(value);
      }
    }

    // 转换为数组
    var result = [];
    for (var key in records) {
      if (records.hasOwnProperty(key)) {
        result.push(records[key]);
      }
    }
    return result;
  }

  /** Fitbit CSV解析（预留） */
  function parseFitbitCSV(content) {
    console.log('[HealthBridge] Fitbit解析为预留接口，暂返回空数组');
    return [];
  }

  /** Garmin CSV解析（预留） */
  function parseGarminCSV(content) {
    console.log('[HealthBridge] Garmin解析为预留接口，暂返回空数组');
    return [];
  }

  /** 适配器映射 */
  var ADAPTERS = {
    xiaomi: parseXiaomiCSV,
    huawei: parseHuaweiCSV,
    apple: parseAppleCSV,
    fitbit: parseFitbitCSV,
    garmin: parseGarminCSV
  };

  // ==================== 核心API ====================

  /** 解析CSV（仅解析不写入，预览用） */
  function parseCSV(fileContent, source) {
    source = (source || 'xiaomi').toLowerCase();
    var adapter = ADAPTERS[source];
    if (!adapter) {
      console.warn('[HealthBridge] 未知数据源:', source, '，尝试小米格式解析');
      adapter = ADAPTERS.xiaomi;
    }
    try {
      return adapter(fileContent);
    } catch(e) {
      console.error('[HealthBridge] CSV解析失败:', e.message);
      return [];
    }
  }

  /** 导入CSV（解析并写入） */
  function importCSV(fileContent, source) {
    try {
      var records = parseCSV(fileContent, source);
      if (records.length === 0) return 0;

      var data = loadData();
      var dateMap = {};
      for (var i = 0; i < data.length; i++) {
        dateMap[data[i].date] = i;
      }

      var importCount = 0;
      for (var j = 0; j < records.length; j++) {
        var rec = records[j];
        if (dateMap[rec.date] !== undefined) {
          // 更新已有记录（合并，不覆盖手动填写的字段）
          var existing = data[dateMap[rec.date]];
          if (!existing.steps && rec.steps) existing.steps = rec.steps;
          if (!existing.distance && rec.distance) existing.distance = rec.distance;
          if (!existing.activeMinutes && rec.activeMinutes) existing.activeMinutes = rec.activeMinutes;
          if (!existing.heartRate && rec.heartRate) existing.heartRate = rec.heartRate;
          if (!existing.sleep && rec.sleep) existing.sleep = rec.sleep;
          if (rec.exercise && rec.exercise.length > 0) {
            existing.exercise = existing.exercise.concat(rec.exercise);
          }
        } else {
          data.push(rec);
          dateMap[rec.date] = data.length - 1;
        }
        importCount++;
      }

      // 按日期排序
      data.sort(function(a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
      saveData(data);

      // 更新设置
      var settings = loadSettings();
      settings.lastImportDate = todayStr();
      settings.lastImportSource = source;
      settings.lastImportCount = importCount;
      saveSettings(settings);

      return importCount;
    } catch(e) {
      console.error('[HealthBridge] 导入失败:', e.message);
      return 0;
    }
  }

  /** 手动添加/更新某日记录 */
  function addDailyRecord(record) {
    try {
      if (!record || !record.date) return false;
      var data = loadData();
      var found = false;
      for (var i = 0; i < data.length; i++) {
        if (data[i].date === record.date) {
          // 合并更新
          for (var key in record) {
            if (record.hasOwnProperty(key) && record[key] !== undefined && record[key] !== null && record[key] !== '') {
              data[i][key] = record[key];
            }
          }
          found = true;
          break;
        }
      }
      if (!found) {
        if (!record.source) record.source = 'manual';
        data.push(record);
      }
      data.sort(function(a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
      saveData(data);
      return true;
    } catch(e) {
      console.error('[HealthBridge] 添加记录失败:', e.message);
      return false;
    }
  }

  /** 获取某日健康数据 */
  function getDailyData(date) {
    try {
      var data = loadData();
      for (var i = 0; i < data.length; i++) {
        if (data[i].date === date) return data[i];
      }
      return null;
    } catch(e) {
      return null;
    }
  }

  /** 获取日期范围数据 */
  function getDateRange(startDate, endDate) {
    try {
      var data = loadData();
      return data.filter(function(r) {
        return r.date >= startDate && r.date <= endDate;
      });
    } catch(e) {
      return [];
    }
  }

  /** 获取最近N天数据 */
  function getRecentDays(n) {
    try {
      var d = new Date();
      d.setDate(d.getDate() - n + 1);
      var start = formatDate(d);
      var end = todayStr();
      return getDateRange(start, end);
    } catch(e) {
      return [];
    }
  }

  /** 获取N天统计 */
  function getStats(days) {
    try {
      var data = getRecentDays(days || 7);
      if (data.length === 0) {
        return { days: days || 7, recordCount: 0, avgSteps: 0, avgSleep: 0, avgHeartRate: 0, avgActiveMinutes: 0, avgDistance: 0 };
      }

      var sumSteps = 0, cntSteps = 0;
      var sumSleep = 0, cntSleep = 0;
      var sumHR = 0, cntHR = 0;
      var sumActive = 0, cntActive = 0;
      var sumDist = 0, cntDist = 0;

      for (var i = 0; i < data.length; i++) {
        var r = data[i];
        if (r.steps > 0) { sumSteps += r.steps; cntSteps++; }
        if (r.sleep && r.sleep.total > 0) { sumSleep += r.sleep.total; cntSleep++; }
        if (r.heartRate && r.heartRate.avg > 0) { sumHR += r.heartRate.avg; cntHR++; }
        if (r.activeMinutes > 0) { sumActive += r.activeMinutes; cntActive++; }
        if (r.distance > 0) { sumDist += r.distance; cntDist++; }
      }

      return {
        days: days || 7,
        recordCount: data.length,
        avgSteps: cntSteps > 0 ? Math.round(sumSteps / cntSteps) : 0,
        avgSleep: cntSleep > 0 ? Math.round(sumSleep / cntSleep * 10) / 10 : 0,
        avgHeartRate: cntHR > 0 ? Math.round(sumHR / cntHR) : 0,
        avgActiveMinutes: cntActive > 0 ? Math.round(sumActive / cntActive) : 0,
        avgDistance: cntDist > 0 ? Math.round(sumDist / cntDist * 10) / 10 : 0
      };
    } catch(e) {
      return { days: days || 7, recordCount: 0, avgSteps: 0, avgSleep: 0, avgHeartRate: 0, avgActiveMinutes: 0, avgDistance: 0 };
    }
  }

  /** 获取最近7天健康摘要（供AI prompt注入，约150字） */
  function getHealthSummary() {
    try {
      var data = getRecentDays(7);
      if (data.length === 0) return null;

      var stats = getStats(7);
      var parts = [];

      parts.push('近7天健康数据（共' + stats.recordCount + '天记录）：');

      if (stats.avgSteps > 0) {
        parts.push('日均步数' + stats.avgSteps + '步');
      }
      if (stats.avgSleep > 0) {
        parts.push('平均睡眠' + stats.avgSleep + '小时');
      }
      if (stats.avgHeartRate > 0) {
        parts.push('平均心率' + stats.avgHeartRate + '次/分');
      }
      if (stats.avgActiveMinutes > 0) {
        parts.push('日均运动' + stats.avgActiveMinutes + '分钟');
      }
      if (stats.avgDistance > 0) {
        parts.push('日均距离' + stats.avgDistance + '公里');
      }

      // 睡眠细节
      var deepSum = 0, deepCnt = 0;
      for (var i = 0; i < data.length; i++) {
        if (data[i].sleep && data[i].sleep.deep > 0) {
          deepSum += data[i].sleep.deep;
          deepCnt++;
        }
      }
      if (deepCnt > 0) {
        parts.push('深睡平均' + Math.round(deepSum / deepCnt * 10) / 10 + '小时');
      }

      // 评价
      if (stats.avgSteps >= 8000 && stats.avgSleep >= 7) {
        parts.push('整体状态良好');
      } else if (stats.avgSteps < 5000) {
        parts.push('运动量偏少，建议增加日常活动');
      } else if (stats.avgSleep < 6) {
        parts.push('睡眠不足，建议调整作息');
      }

      return parts.join('，') + '。';
    } catch(e) {
      return null;
    }
  }

  /** 导出健康数据为标准CSV */
  function exportHealthCSV(startDate, endDate) {
    try {
      var data = getDateRange(startDate || '2000-01-01', endDate || todayStr());
      if (data.length === 0) return '';

      var header = '日期,来源,步数,距离(公里),活动时长(分钟),平均心率,静息心率,最高心率,HRV,睡眠总时长,深睡,浅睡,REM,清醒,压力,情绪,饮水(杯)';
      var rows = [header];

      for (var i = 0; i < data.length; i++) {
        var r = data[i];
        var hr = r.heartRate || {};
        var sl = r.sleep || {};
        rows.push([
          r.date,
          r.source || '',
          r.steps || 0,
          r.distance || 0,
          r.activeMinutes || 0,
          hr.avg || '',
          hr.resting || '',
          hr.max || '',
          hr.hrv || '',
          sl.total || '',
          sl.deep || '',
          sl.light || '',
          sl.rem || '',
          sl.awake || '',
          r.stress || '',
          r.mood || '',
          r.water || 0
        ].join(','));
      }

      return rows.join('\n');
    } catch(e) {
      console.error('[HealthBridge] 导出失败:', e.message);
      return '';
    }
  }

  // ==================== 原生API预留接口 ====================

  /** 连接原生健康数据源（HealthKit/HealthConnect） */
  function connectNativeSource(platform) {
    return {
      available: false,
      message: '需要原生App支持，当前版本暂不支持' + (platform ? '（' + platform + '）' : '')
    };
  }

  /** 蓝牙直连设备 */
  function connectBLE(deviceType) {
    return {
      available: false,
      message: '蓝牙直连需要原生App支持' + (deviceType ? '（' + deviceType + '）' : '')
    };
  }

  // ==================== 导出 ====================

  window.HealthBridge = {
    // 核心数据API
    importCSV: importCSV,
    parseCSV: parseCSV,
    addDailyRecord: addDailyRecord,
    getDailyData: getDailyData,
    getDateRange: getDateRange,
    getRecentDays: getRecentDays,
    getHealthSummary: getHealthSummary,
    getStats: getStats,
    exportHealthCSV: exportHealthCSV,

    // 原生API预留
    connectNativeSource: connectNativeSource,
    connectBLE: connectBLE
  };

})();
