/**
 * behavior-log.js — MiRun AI 个人行为数据收集与分析模块
 *
 * 职责：
 * 1. 每日行为日志（饮食/运动/睡眠/学习/饮水量）
 * 2. 情绪日志（情绪评分+触发事件+关联消费）
 * 3. 个人偏好画像
 * 4. 家庭教育记录
 * 5. 自然语言解析（配合底部AI输入框）
 * 6. 隐私保障：所有数据仅存 localStorage，不上传任何外部服务
 *
 * localStorage Keys:
 *   mijieai_behavior_log     — 每日行为日志数组
 *   mijieai_mood_log         — 情绪日志数组
 *   mijieai_preferences      — 偏好画像对象
 *   mijieai_family_edu       — 家庭教育数据对象
 */
(function() {
  'use strict';

  // ==================== 常量 ====================
  var KEYS = {
    behavior: 'mijieai_behavior_log',
    mood:     'mijieai_mood_log',
    prefs:    'mijieai_preferences',
    edu:      'mijieai_family_edu'
  };

  var MOOD_LABELS = [
    { score: 1, label: '很差', color: '#ef4444' },
    { score: 2, label: '低落', color: '#f97316' },
    { score: 3, label: '一般', color: '#eab308' },
    { score: 4, label: '不错', color: '#22c55e' },
    { score: 5, label: '很好', color: '#06b6d4' }
  ];

  var EXERCISE_TYPES = ['跑步','走路','骑行','游泳','瑜伽','健身','球类','爬山','散步','拉伸','其他'];
  var MEAL_TYPES = ['早餐','午餐','晚餐','加餐'];

  // ==================== 数据操作 ====================
  function _load(key, def) {
    try { var d = localStorage.getItem(key); return d ? JSON.parse(d) : def; }
    catch(e) { return def; }
  }
  function _save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  // ---------- 日期状态 ----------
  var _selectedDate = null; // 当前选中日期，null表示今天

  // b37: 全系统日期统一为本地日历日（个人应用仅服务本人，北京凌晨00:00-08:00不再被UTC算到昨天）
  function _localDateStr(d) {
    d = d || new Date();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + dd;
  }
  function _localIso(d) {
    d = d || new Date();
    var off = -d.getTimezoneOffset();
    var sign = off >= 0 ? '+' : '-';
    var a = Math.abs(off);
    var zh = ('0' + Math.floor(a / 60)).slice(-2);
    var zm = ('0' + (a % 60)).slice(-2);
    return _localDateStr(d) + 'T' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2) + sign + zh + ':' + zm;
  }

  function _getSelectedDate() {
    return _selectedDate || _today();
  }

  function _isViewingToday() {
    return !_selectedDate || _selectedDate === _today();
  }

  // ---------- 行为日志 ----------
  function getLogForDate(dateStr) {
    dateStr = dateStr || _today();
    var logs = _load(KEYS.behavior, []);
    var found = logs.find(function(l) { return l.date === dateStr; });
    if (!found) {
      // 仅对今天自动创建空记录，历史日期只读
      if (dateStr === _today()) {
        found = { date: dateStr, meals: [], exercise: [], sleep: {}, learning: [], water: 0, notes: '' };
        logs.push(found);
        _save(KEYS.behavior, logs);
      } else {
        found = { date: dateStr, meals: [], exercise: [], sleep: {}, learning: [], water: 0, notes: '', _empty: true };
      }
    }
    return found;
  }

  // 兼容旧接口 - 始终返回今天的日志（用于自然语言输入记录）
  function getTodayLog() {
    return getLogForDate(_today());
  }

  function saveTodayLog(log) {
    var logs = _load(KEYS.behavior, []);
    var idx = logs.findIndex(function(l) { return l.date === log.date; });
    if (idx >= 0) logs[idx] = log; else logs.push(log);
    // 只保留最近365天
    if (logs.length > 365) logs = logs.slice(-365);
    _save(KEYS.behavior, logs);
  }

  function getRecentLogs(days) {
    days = days || 7;
    var logs = _load(KEYS.behavior, []);
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    var cutoffStr = _localDateStr(cutoff);
    return logs.filter(function(l) { return l.date >= cutoffStr; });
  }

  // 检查某天是否有数据
  function _hasDataForDate(dateStr) {
    var logs = _load(KEYS.behavior, []);
    var found = logs.find(function(l) { return l.date === dateStr; });
    if (!found) return false;
    return (found.meals && found.meals.length > 0) ||
           (found.exercise && found.exercise.length > 0) ||
           (found.sleep && (found.sleep.bedtime || found.sleep.quality)) ||
           (found.learning && found.learning.length > 0) ||
           (found.water && found.water > 0);
  }

  // ---------- 情绪日志 ----------
  function addMoodEntry(entry) {
    var logs = _load(KEYS.mood, []);
    // b27 防双记：同一次用户表达可能触发多条落库链路（语义正则 _parseMood / 词频 auto_detect / 大模型 ai_perception）
    // 极短时间内（3秒内）已写过高意向情绪即视为同一句的重复触发，跳过，避免"一句话情绪记两次"
    var now = Date.now();
    var last = logs.length ? logs[logs.length - 1] : null;
    if (last && last.timestamp) {
      var lastTs = new Date(last.timestamp).getTime();
      var lastScore = last.score;
      var curScore = entry && entry.score;
      if (now - lastTs < 3000 && lastScore === curScore && curScore >= 1 && curScore <= 5) {
        return last; // 同一句重复触发，跳过不重复落库
      }
    }
    entry.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    entry.timestamp = _localIso();
    logs.push(entry);
    if (logs.length > 500) logs = logs.slice(-500);
    _save(KEYS.mood, logs);
    return entry;
  }

  function getRecentMoods(days) {
    days = days || 7;
    var logs = _load(KEYS.mood, []);
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    var cutoffStr = _localDateStr(cutoff);
    return logs.filter(function(l) { return l.timestamp && l.timestamp.substr(0, 10) >= cutoffStr; });
  }

  // ---------- 偏好画像 ----------
  function getPrefs() {
    return _load(KEYS.prefs, {
      taste: { flavor: [], dislike: [], allergies: [] },
      brands: {},
      routine: { wake_time: '', sleep_time: '', commute: '' },
      shopping_style: { impulse_tendency: 0, price_sensitivity: 0, research_before_buy: false },
      content: { reading_genres: [], video_genres: [], music_genres: [] },
      updated_at: null
    });
  }

  function savePrefs(prefs) {
    prefs.updated_at = new Date().toISOString();
    _save(KEYS.prefs, prefs);
  }

  // ---------- 家庭教育 ----------
  function getFamilyEdu() {
    return _load(KEYS.edu, { children: [], updated_at: null });
  }
  function saveFamilyEdu(data) {
    data.updated_at = new Date().toISOString();
    _save(KEYS.edu, data);
  }

  // ==================== 自然语言解析引擎 ====================
  // 返回值: { matched: true/false, module, action, data, message }

  function parseBehaviorInput(text) {
    if (!text || text.trim().length < 2) return { matched: false };

    var result;

    // 0. 饮水记录（优先于饮食，避免"喝水"被误判为饮食）
    result = _parseWater(text); if (result) return result;
    // 1. 饮食记录
    result = _parseMeal(text); if (result) return result;
    // 1.5 购买/消费记录（优先于运动，避免"游泳镜购买180"被误归为运动且漏记金额）
    result = _parsePurchase(text); if (result) return result;
    // 2. 运动记录
    result = _parseExercise(text); if (result) return result;
    // 3. 睡眠记录
    result = _parseSleep(text); if (result) return result;
    // 4. 学习记录
    result = _parseLearning(text); if (result) return result;
    // 5. 情绪记录
    result = _parseMood(text); if (result) return result;
    // 6. 偏好设置
    result = _parsePreference(text); if (result) return result;
    // 7. 家庭教育
    result = _parseFamilyEdu(text); if (result) return result;

    return { matched: false };
  }

  function _parseMeal(text) {
    // "早餐吃了燕麦牛奶" "午饭牛肉面25" "晚餐吃了火锅" "喝了杯奶茶15"
    var mealMatch = text.match(/(早餐|早饭|午餐|午饭|晚餐|晚饭|加餐|夜宵|吃了?|喝了?|吃了个?|来了一?个?|点?了?(?:外卖|餐))(.*?)(\d+(?:\.\d+)?)?\s*(?:元|块|¥)?$/i);
    if (!mealMatch && !/(?:早餐|午饭|午餐|晚饭|晚餐|外卖|食堂|吃了|喝了|干饭|吃个|喝杯)/.test(text)) return null;

    var items = text;
    var amount = null;
    var mealType = '加餐';
    var where = '';

    // 判断餐次
    if (/早餐|早饭/.test(text)) mealType = '早餐';
    else if (/午餐|午饭/.test(text)) mealType = '午餐';
    else if (/晚餐|晚饭/.test(text)) mealType = '晚餐';
    else if (/夜宵|宵夜/.test(text)) mealType = '加餐';

    // 提取金额
    var amtM = text.match(/(\d+\.?\d*)\s*(?:元|块|¥|￥)?/);
    if (amtM) amount = parseFloat(amtM[1]);

    // 清理食材描述
    items = text.replace(/(早餐|早饭|午餐|午饭|晚餐|晚饭|加餐|夜宵)/, '')
                .replace(/(吃了|喝了|吃了个|点?了?|来了一?个?)/, '')
                .replace(/(\d+\.?\d*)\s*(?:元|块|¥|￥)?/, '')
                .replace(/(在|去|从)(\S+?)(?:吃|的)/, function(m, p1, p2) { where = p2; return ''; })
                .trim();

    // 记录饮食
    var log = getTodayLog();
    var now = new Date();
    var timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    log.meals.push({ type: mealType, time: timeStr, items: items || '未记录', where: where });
    saveTodayLog(log);
    // 健康数据变化广播：刷新健康总览/明细（总览受 moduleInitFlags 缓存，写入后必须主动刷新，否则最新一餐不显示）
    if (window.healthDataChanged) { try { window.healthDataChanged(); } catch(e) {} }

    // 如果有金额，同时记录消费
    if (amount && amount > 0 && window.dailyTxAdd) {
      window.dailyTxAdd({ type: 'expense', amount: amount, category: 'food', note: mealType + ': ' + (items || ''), date: _today() });
    }

    var msg = '已记录' + mealType + (items ? '：' + items : '');
    if (amount) msg += '（¥' + amount + '）';

    return { matched: true, module: 'behavior', action: 'meal', message: msg };
  }

  function _parsePurchase(text) {
    // "买了双运动鞋200" "宝宝游泳镜购买180" "下单大米89" "花了50买菜"
    // 必须含购买动词且带金额；时长/距离的"花了X分钟/公里"不视为消费
    if (!/(购买|买单|下单|购入|付款|花了?|消费|入手|淘了|网购|回购|买)/.test(text)) return null;
    // 若数字后跟时长/距离单位，多为运动/描述，不是金额
    if (/(\d+(?:\.\d+)?)\s*(?:分钟|分|小时|h|秒|公里|km|千米)/i.test(text)) return null;
    // 取最后一个数字作为金额（避免"买了2双袜子50"误取"2"）
    var nums = text.match(/(\d+(?:\.\d+)?)/g);
    if (!nums) return null;
    var amount = parseFloat(nums[nums.length - 1]);
    if (!(amount > 0)) return null;

    var note = text.replace(/(购买|买单|下单|购入|付款|花了|消费|入手|淘了|网购|回购|买了?个|买了?|买了一?个?)/g, '')
                   .replace(/(\d+(?:\.\d+)?)\s*(?:[元块¥￥])?/g, '')
                   .replace(/的/g, '')
                   .replace(/[¥￥元块\s]+$/, '')
                   .trim();
    if (!note) note = '购物';

    // 记录消费（购物类目，个人消费/购物）
    if (window.dailyTxAdd) {
      window.dailyTxAdd({ type: 'expense', amount: amount, category: 'shopping', note: note, date: _today() });
    }

    return { matched: true, module: 'behavior', action: 'purchase', message: '已记录购物支出 ¥' + amount + (note ? '：' + note : '') };
  }

  function _parseWater(text) {
    // "喝了3杯水" "喝了两杯水" "今天喝了三杯水" "喝了一杯水"
    // 注意：要排除"喝奶茶""喝咖啡""喝了碗汤"等饮食类
    if (!/喝了?\s*(?:\d+|[一二三四五六七八九十]+)\s*杯水|喝了?水|喝水/.test(text)) return null;
    // 如果包含奶茶/咖啡/果汁/汤/饮料等，不算纯水
    if (/(?:奶茶|咖啡|果汁|汤|饮料|可乐|啤酒|茶|酒|豆浆|牛奶)/.test(text)) return null;

    var count = 1;
    var numM = text.match(/(\d+|[一二三四五六七八九十])\s*杯/);
    if (numM) {
      var n = numM[1];
      var numMap = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
      count = numMap[n] || parseInt(n) || 1;
    }

    var log = getTodayLog();
    log.water = (log.water || 0) + count;
    saveTodayLog(log);

    return { matched: true, module: 'behavior', action: 'water', message: '已记录饮水 +' + count + ' 杯（今日共' + log.water + '杯）' };
  }

  function _parseExercise(text) {
    // "跑了5公里" "跑步30分钟" "游泳了一小时" "做了瑜伽"
    if (!/(?:跑步|跑了|走路|走了|骑行|骑了|游泳|游了|瑜伽|健身|打球|爬山|爬了|散步|拉伸|运动|锻炼了?|练了?)/.test(text)) return null;

    var type = '其他';
    if (/跑步|跑了|跑了步/.test(text)) type = '跑步';
    else if (/走路|走了/.test(text)) type = '走路';
    else if (/骑行|骑了/.test(text)) type = '骑行';
    else if (/游泳|游了/.test(text)) type = '游泳';
    else if (/瑜伽/.test(text)) type = '瑜伽';
    else if (/健身/.test(text)) type = '健身';
    else if (/打球|篮球|足球|羽毛球|乒乓球/.test(text)) type = '球类';
    else if (/爬山|爬了/.test(text)) type = '爬山';
    else if (/散步/.test(text)) type = '散步';
    else if (/拉伸/.test(text)) type = '拉伸';

    // 提取时长
    var duration = 0;
    var durM = text.match(/(\d+)\s*(?:分钟|分|min|小时|h)/i);
    if (durM) {
      duration = parseInt(durM[1]);
      if (/小时|h/i.test(durM[0])) duration *= 60;
    }

    // 提取距离
    var distance = 0;
    var distM = text.match(/(\d+\.?\d*)\s*(?:公里|km|千米)/i);
    if (distM) distance = parseFloat(distM[1]);

    var log = getTodayLog();
    log.exercise.push({ type: type, duration: duration, distance: distance, intensity: '中', time: _nowTime() });
    saveTodayLog(log);

    var msg = '已记录运动：' + type;
    if (distance) msg += ' ' + distance + '公里';
    if (duration) msg += ' ' + duration + '分钟';

    return { matched: true, module: 'behavior', action: 'exercise', message: msg };
  }

  function _parseSleep(text) {
    // "昨晚11点睡的7点起" "睡了8小时" "昨晚失眠" "睡眠质量很差"
    if (!/(?:昨晚|昨夜|昨天睡|睡了|失眠|早睡|晚睡|熬夜|起床|入睡|睡眠质量|几点睡|几点起)/.test(text)) return null;

    var log = getTodayLog();
    if (!log.sleep) log.sleep = {};

    // 提取入睡时间
    var bedM = text.match(/(?:睡|入睡|躺下)[在是]?\s*(\d{1,2})[点时:：](\d{0,2})/);
    if (bedM) {
      var h = String(parseInt(bedM[1])).padStart(2, '0');
      var m = bedM[2] ? String(parseInt(bedM[2])).padStart(2, '0') : '00';
      log.sleep.bedtime = h + ':' + m;
    }

    // 提取起床时间
    var wakeM = text.match(/(?:起|起床)[在是了]?\s*(\d{1,2})[点时:：](\d{0,2})/);
    if (wakeM) {
      var h2 = String(parseInt(wakeM[1])).padStart(2, '0');
      var m2 = wakeM[2] ? String(parseInt(wakeM[2])).padStart(2, '0') : '00';
      log.sleep.waketime = h2 + ':' + m2;
    }

    // 睡眠质量
    if (/很差|失眠|没睡好|睡得不好/.test(text)) log.sleep.quality = 1;
    else if (/不太好|睡得少|睡得晚/.test(text)) log.sleep.quality = 2;
    else if (/还行|一般|凑合|普通/.test(text)) log.sleep.quality = 3;
    else if (/不错|睡得好的|睡得好/.test(text)) log.sleep.quality = 4;
    else if (/很好|很棒|精力充沛|神清气爽/.test(text)) log.sleep.quality = 5;

    // 时长解析：睡了X小时 / 七小时
    if (!log.sleep.duration) {
      var durH = null;
      var durM = text.match(/(\d+(?:\.\d+)?)\s*(?:个小时?|小时|h)/i);
      var cnMap = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
      if (!durM) {
        var cnM = text.match(/([一二三四五六七八九十]+)\s*(?:个小时?|小时)/);
        if (cnM) { var sum=0; cnM[1].split('').forEach(function(c){sum+=(cnMap[c]||0);}); durH=sum; }
      } else { durH = parseFloat(durM[1]); }
      if (durH !== null && durH > 0) {
        log.sleep.duration = Math.round(durH * 10) / 10;
        if (!log.sleep.quality) log.sleep.quality = (durH >= 7 && durH <= 9) ? 4 : (durH >= 6 ? 3 : 2);
      }
    }
    saveTodayLog(log);
    var msg = '已记录睡眠';
    if (log.sleep.bedtime) msg += ' 入睡 ' + log.sleep.bedtime;
    if (log.sleep.waketime) msg += ' 起床 ' + log.sleep.waketime;
    if (log.sleep.quality) msg += ' 质量:' + log.sleep.quality + '/5';

    return { matched: true, module: 'behavior', action: 'sleep', message: msg };
  }

  function _parseLearning(text) {
    // "学了2小时Python" "看了1小时书" "背了50个单词" "上课2小时"
    if (!/(?:学了|学习了|看了.*书|读了|背了|上课|听课|刷了|练习|写了.*代码|做了.*题|研究|学了)/.test(text)) return null;

    var topic = '';
    var duration = 0;
    var ltype = '自学';

    // 提取时长
    var durM = text.match(/(\d+\.?\d*)\s*(?:分钟|分|min|小时|h|个半小时)/i);
    if (durM) {
      duration = parseFloat(durM[1]);
      if (/小时|h/i.test(durM[0])) duration *= 60;
      if (/半小时/.test(durM[0])) duration = 30;
    }

    // 提取主题（去掉动词和时长后的部分）
    topic = text.replace(/(今天|今天|早上|下午|晚上|刚才)/, '')
                .replace(/(学了|学习了|看了|读了|背了|上课|听了|刷了|练习了|写了|做了|研究了)/, '')
                .replace(/(\d+\.?\d*)\s*(?:分钟|分|min|小时|h)/i, '')
                .replace(/(本书|文章|章节|页)/, '')
                .trim();

    if (/上课|听课/.test(text)) ltype = '课程';
    else if (/看了.*书|读了|读书/.test(text)) ltype = '阅读';
    else if (/刷题|做题/.test(text)) ltype = '练习';
    else ltype = '自学';

    var log = getTodayLog();
    log.learning.push({ topic: topic || '未记录', duration: duration, type: ltype, time: _nowTime() });
    saveTodayLog(log);

    var msg = '已记录学习：' + (topic || '未记录主题');
    if (duration) msg += ' ' + duration + '分钟';

    return { matched: true, module: 'behavior', action: 'learning', message: msg };
  }

  function _parseMood(text) {
    // "心情不好" "今天很开心" "感觉焦虑" "情绪低落" "好烦"
    if (!/(?:心情|情绪|感觉|感到|担[心忧]|发愁|烦|好[开心高兴难过烦累]|开心|高兴|满意|难过|伤心|焦虑|压力|烦躁|郁闷|疲惫|兴奋|沮丧|低落|不错|挺好的|崩溃|绝望|平静|感恩|还好|一般般|不是很好|不太好|担忧|失望|委屈)/.test(text)) return null;

    var score = 3;
    var label = '一般';
    var trigger = '';

    // b27 强判断：死词不再单判，改成 负向加权 + 否定识别 + 综合评分，避免"情况还不是很好+心情一般般+担心"被"很好"两个字误导成5分
    var strongPos = /(?:非常开心|特别开心|高兴极了|太开心|好开心|很开心|兴奋|太棒了|太好了|棒|超开心|美滋滋|非常满意|特别满意|相当满意)/;
    var mildPos   = /(?:不错|挺好|还好|还行|开心|高兴|满意|平静|满足|舒服|正常|放松)/;
    var negMood   = /(?:担心|担忧|焦虑|压力|烦躁|郁闷|沮丧|低落|难过|伤心|委屈|失望|疲惫|累|烦|哭|崩溃|绝望|痛苦|难受|不开心|不高兴|心情不好|很担心)/;
    var negPad    = /(?:不是很好|不太好|不怎么样|有点糟|很差|糟糕|没心情|不想|说不清)/;
    var neutral   = /(?:一般般|一般|还好|还行|普通|凑合|正常|就那样)/;

    var p1 = strongPos.test(text);
    var p2 = mildPos.test(text);
    var n1 = negMood.test(text);
    var n2 = negPad.test(text);
    var nu = neutral.test(text);

    if (/(?:崩溃|绝望|痛苦|受不了|难受死|气死|伤心死了)/.test(text)) { score = 1; label = '很差'; } // 绝望级
    else if (n1 && /(?:很|太|非常|特别|担心|焦虑|崩溃|绝望)/.test(text)) { score = 2; label = '低落'; } // 有强负向
    else if (n1 || n2) { score = 2; label = '低落'; } // 有负向（优于单独的正向词，含"担心"等）
    else if (nu && !(p1 || p2)) { score = 3; label = '一般'; } // 中性偏负：一般般/还好 → 一般
    else if (p1 && !(n1 || n2)) { score = 5; label = '很好'; } // 强正向
    else if (p2 && !(n1 || n2)) { score = 4; label = '不错'; } // 弱正向

    // 提取触发事件
    trigger = text.replace(/(今天|今天|现在|刚才|今天一天)/, '')
                  .replace(/(心情|情绪|感觉|感到|觉得)/, '')
                  .replace(/(很开心|高兴|兴奋|开心|难过|伤心|焦虑|压力|烦躁|郁闷|疲惫|低落|不错|不好|好烦|好累|好开心)/, '')
                  .replace(/^[，,\s：:]+/, '').replace(/[，,\s：:]+$/, '')
                  .trim();

    var entry = { score: score, label: label, trigger: trigger, physical: [], coping: '' };
    addMoodEntry(entry);

    return { matched: true, module: 'mood', action: 'record', message: '已记录情绪：' + label + '（' + score + '/5）' + (trigger ? ' — ' + trigger : '') };
  }

  function _parsePreference(text) {
    // "我不喜欢吃香菜" "我喜欢喝美式咖啡" "以后别推荐辣的" "我不吃海鲜"
    var prefMatch = text.match(/(?:我|本人)?(?:不?喜欢|不爱|讨厌|不吃|不喝|偏好|偏爱|最爱|常买|总是买|习惯用)[：:\s]*(.+)/);
    if (!prefMatch) return null;

    var prefs = getPrefs();
    var detail = prefMatch[1].trim();
    var isNegative = /不喜欢|不爱|讨厌|不吃|不喝|别推荐|不要/.test(text);
    var category = 'taste';
    var action = '';

    if (/(?:吃|喝|味|辣|甜|咸|苦|酸|淡|菜|饭|肉|鱼|水果|食)/.test(text)) {
      category = 'taste';
      if (isNegative) {
        if (prefs.taste.dislike.indexOf(detail) < 0) prefs.taste.dislike.push(detail);
        action = '已加入忌口';
      } else {
        if (prefs.taste.flavor.indexOf(detail) < 0) prefs.taste.flavor.push(detail);
        action = '已加入偏好';
      }
    } else if (/(?:过敏|不能.*吃|吃了.*过敏)/.test(text)) {
      category = 'taste';
      if (prefs.taste.allergies.indexOf(detail) < 0) prefs.taste.allergies.push(detail);
      action = '已加入过敏清单';
    } else if (/(?:牌|品|phone|手机|车|衣服)/.test(text)) {
      category = 'brands';
      action = '已记录品牌偏好';
    } else {
      category = 'general';
      action = '已记录偏好';
    }

    savePrefs(prefs);
    return { matched: true, module: 'preferences', action: 'set', message: action + '：' + detail };
  }

  function _parseFamilyEdu(text) {
    // "孩子数学考了90" "小明期末语文85分" "孩子英语退步了"
    if (!/(?:孩子|小孩|儿子|女儿|学生|宝贝|娃|小朋友).*(?:考|成绩|分|退步|进步|作业|考试|测验|排名|学期)|学校|老师.*(?:说|反馈)/.test(text)) return null;

    var edu = getFamilyEdu();
    if (!edu.children || edu.children.length === 0) {
      // 如果没有孩子信息，提示先设置
      return { matched: true, module: 'family_edu', action: 'need_setup', message: '请先在「个人中心」添加孩子信息，再进行成绩记录' };
    }

    // 提取分数
    var scoreM = text.match(/(\d+)\s*分/);
    var subject = '';
    if (/数学/.test(text)) subject = '数学';
    else if (/语文/.test(text)) subject = '语文';
    else if (/英语|英文/.test(text)) subject = '英语';
    else if (/物理/.test(text)) subject = '物理';
    else if (/化学/.test(text)) subject = '化学';
    else if (/生物/.test(text)) subject = '生物';
    else if (/历史/.test(text)) subject = '历史';
    else if (/地理/.test(text)) subject = '地理';

    var child = edu.children[0]; // 默认第一个孩子
    var entry = {
      date: _today(),
      subject: subject || '其他',
      score: scoreM ? parseInt(scoreM[1]) : null,
      note: text.replace(/(孩子|小孩|儿子|女儿|娃|宝贝|小朋友)/, '').replace(/(考了|成绩|分|期末|期中|月考|测验|数学|语文|英语|物理|化学)/, '').trim()
    };
    if (!child.academic_records) child.academic_records = [];
    child.academic_records.push(entry);
    saveFamilyEdu(edu);

    var msg = '已记录' + (subject || '') + '成绩';
    if (entry.score) msg += '：' + entry.score + '分';
    return { matched: true, module: 'family_edu', action: 'record', message: msg };
  }

  // ==================== 日期导航 ====================
  function _shiftDate(dateStr, delta) {
    var parts = String(dateStr).split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setDate(d.getDate() + delta);
    return _localDateStr(d);
  }

  function _formatDateDisplay(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var weekDays = ['日','一','二','三','四','五','六'];
    var wd = weekDays[d.getDay()];
    return m + '月' + day + '日 · 周' + wd;
  }

  window._bhShiftDate = function(delta) {
    var current = _getSelectedDate();
    var newDate = _shiftDate(current, delta);
    // 不能选未来日期
    if (newDate > _today()) return;
    _selectedDate = (newDate === _today()) ? null : newDate;
    renderBehaviorHub('behaviorHubContainer');
  };

  window._bhGoToday = function() {
    _selectedDate = null;
    renderBehaviorHub('behaviorHubContainer');
  };

  window._bhPickDate = function() {
    var input = document.getElementById('bhDatePicker');
    if (input && input.value) {
      var val = input.value;
      if (val > _today()) {
        window.showToast && window.showToast('不能选未来日期');
        return;
      }
      _selectedDate = (val === _today()) ? null : val;
      renderBehaviorHub('behaviorHubContainer');
    }
  };

  // ==================== UI 渲染 ====================
  function renderBehaviorHub(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;

    var viewingToday = _isViewingToday();
    var selDate = _getSelectedDate();
    var log = getLogForDate(selDate);
    var recentMoods = getRecentMoods(7);
    var recentLogs = getRecentLogs(7);

    var html = '<div class="bh-wrap">';

    // --- 日期导航栏 ---
    html += '<div class="bh-date-nav">';
    html += '<button class="bh-dnav-btn" onclick="window._bhShiftDate(-1)" title="前一天">' + svgIcon('M15 18l-6-6 6-6', 'currentColor', 18) + '</button>';
    html += '<div class="bh-dnav-center">';
    html += '<input type="date" id="bhDatePicker" class="bh-dnav-picker" value="' + selDate + '" max="' + _today() + '" onchange="window._bhPickDate()" />';
    html += '<span class="bh-dnav-label">' + _formatDateDisplay(selDate) + (viewingToday ? '' : '<em class="bh-dnav-note"> · 此页记录将补录到该日</em>') + '</span>';
    html += '</div>';
    html += '<button class="bh-dnav-btn" onclick="window._bhShiftDate(1)" title="后一天"' + (viewingToday ? ' disabled' : '') + '>' + svgIcon('M9 18l6-6-6-6', 'currentColor', 18) + '</button>';
    if (!viewingToday) {
      html += '<button class="bh-dnav-today" onclick="window._bhGoToday()">今天</button>';
    }
    html += '</div>';

    // 历史日期提示
    if (!viewingToday) {
      html += '<div class="bh-history-hint">' + svgIcon('M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', '#f59e0b', 14) + ' 查看历史数据（仅展示当天记录）</div>';
    }

    // --- 行为概览 ---
    html += '<div class="bh-section">';
    html += '<div class="bh-section-title">' + svgIcon('M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', '#3b82f6') + ' ' + (viewingToday ? '今日' : '当日') + '行为概览</div>';
    html += '<div class="bh-overview-grid">';

    // 饮食
    var mealCount = log.meals ? log.meals.length : 0;
    html += _overviewCard('饮食', mealCount + ' 餐', '#f97316', 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z');

    // 运动
    var exCount = log.exercise ? log.exercise.length : 0;
    var exMin = log.exercise ? log.exercise.reduce(function(s,e){return s+(e.duration||0);},0) : 0;
    html += _overviewCard('运动', exCount + ' 项' + (exMin ? ' · ' + exMin + '分钟' : ''), '#22c55e', 'M13 10V3L4 14h7v7l9-11h-7z');

    // 睡眠
    var sleepStr = log.sleep && log.sleep.quality ? '质量 ' + log.sleep.quality + '/5' : '未记录';
    html += _overviewCard('睡眠', sleepStr, '#8b5cf6', 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z');

    // 学习
    var learnCount = log.learning ? log.learning.length : 0;
    var learnMin = log.learning ? log.learning.reduce(function(s,e){return s+(e.duration||0);},0) : 0;
    html += _overviewCard('学习', learnCount + ' 项' + (learnMin ? ' · ' + learnMin + '分钟' : ''), '#06b6d4', 'M12 14l9-5-9-5-9 5 9 5z');

    // 饮水
    html += _overviewCard('饮水', (log.water || 0) + ' 杯', '#3b82f6', 'M12 2l-5.5 9h11L12 2zM12 11v9M5.5 20h13');

    // 情绪
    var latestMood = recentMoods.length > 0 ? recentMoods[recentMoods.length - 1] : null;
    var moodStr = latestMood ? latestMood.label + ' ' + latestMood.score + '/5' : '未记录';
    html += _overviewCard('情绪', moodStr, '#ec4899', 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', '#fdf2f8');

    html += '</div>'; // overview grid
    html += '</div>'; // section

    // --- 快捷记录按钮（仅今天可录入） ---
    if (viewingToday) {
    html += '<div class="bh-section">';
    html += '<div class="bh-section-title">' + svgIcon('M12 5v14M5 12h14', '#22c55e') + ' 快捷记录</div>';
    html += '<div class="bh-quick-actions">';
    html += '<button class="bh-qa-btn" onclick="window._bhShowAddMeal()">' + svgIcon('M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z', '#f97316', 18) + '<span>记饮食</span></button>';
    html += '<button class="bh-qa-btn" onclick="window._bhShowAddExercise()">' + svgIcon('M13 10V3L4 14h7v7l9-11h-7z', '#22c55e', 18) + '<span>记运动</span></button>';
    html += '<button class="bh-qa-btn" onclick="window._bhShowAddSleep()">' + svgIcon('M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z', '#8b5cf6', 18) + '<span>记睡眠</span></button>';
    html += '<button class="bh-qa-btn" onclick="window._bhShowAddMood()">' + svgIcon('M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', '#ec4899', 18) + '<span>记情绪</span></button>';
    html += '<button class="bh-qa-btn" onclick="window._bhShowAddWater()">' + svgIcon('M12 2l-5.5 9h11L12 2zM12 11v9M5.5 20h13', '#3b82f6', 18) + '<span>记饮水</span></button>';
    html += '<button class="bh-qa-btn" onclick="window._bhShowAddLearning()">' + svgIcon('M12 14l9-5-9-5-9 5 9 5z', '#06b6d4', 18) + '<span>记学习</span></button>';
    html += '</div>';
    html += '</div>';
    } // end if (viewingToday)

    // --- 当日详细日志 ---
    html += '<div class="bh-section">';
    html += '<div class="bh-section-title">' + svgIcon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', '#6b7280') + ' ' + (viewingToday ? '今日' : '当日') + '详情</div>';

    // 饮食详情
    if (log.meals && log.meals.length > 0) {
      html += '<div class="bh-detail-group"><div class="bh-detail-label">🍽 饮食</div>';
      log.meals.forEach(function(m) {
        html += '<div class="bh-detail-item">';
        html += '<span class="bh-detail-time">' + (m.time || '') + '</span>';
        html += '<span class="bh-detail-type">' + (m.type || '') + '</span>';
        html += '<span class="bh-detail-content">' + (m.items || '') + '</span>';
        if (m.where) html += '<span class="bh-detail-meta">@' + m.where + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    // 运动详情
    if (log.exercise && log.exercise.length > 0) {
      html += '<div class="bh-detail-group"><div class="bh-detail-label">⚡ 运动</div>';
      log.exercise.forEach(function(e) {
        html += '<div class="bh-detail-item">';
        html += '<span class="bh-detail-time">' + (e.time || '') + '</span>';
        html += '<span class="bh-detail-content">' + (e.type || '') + '</span>';
        if (e.duration) html += '<span class="bh-detail-meta">' + e.duration + '分钟</span>';
        if (e.distance) html += '<span class="bh-detail-meta">' + e.distance + 'km</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    // 睡眠详情
    if (log.sleep && (log.sleep.bedtime || log.sleep.waketime || log.sleep.quality)) {
      html += '<div class="bh-detail-group"><div class="bh-detail-label">🌙 睡眠</div>';
      html += '<div class="bh-detail-item">';
      if (log.sleep.bedtime) html += '<span class="bh-detail-meta">入睡 ' + log.sleep.bedtime + '</span>';
      if (log.sleep.waketime) html += '<span class="bh-detail-meta">起床 ' + log.sleep.waketime + '</span>';
      if (log.sleep.quality) html += '<span class="bh-detail-meta">质量 ' + log.sleep.quality + '/5</span>';
      html += '</div>';
      html += '</div>';
    }

    // 学习详情
    if (log.learning && log.learning.length > 0) {
      html += '<div class="bh-detail-group"><div class="bh-detail-label">📚 学习</div>';
      log.learning.forEach(function(l) {
        html += '<div class="bh-detail-item">';
        html += '<span class="bh-detail-time">' + (l.time || '') + '</span>';
        html += '<span class="bh-detail-content">' + (l.topic || '') + '</span>';
        if (l.duration) html += '<span class="bh-detail-meta">' + l.duration + '分钟</span>';
        if (l.type) html += '<span class="bh-detail-meta">' + l.type + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    // 饮水
    html += '<div class="bh-detail-group"><div class="bh-detail-label">💧 饮水</div>';
    html += '<div class="bh-detail-item"><span class="bh-detail-content">' + (log.water || 0) + ' 杯 / 今日目标 8 杯</span>';
    html += '<button class="bh-water-add" onclick="window._bhAddWater()">+1</button></div>';
    html += '</div>';

    // 无记录提示
    if ((!log.meals || log.meals.length === 0) && (!log.exercise || log.exercise.length === 0) && (!log.learning || log.learning.length === 0) && (!log.sleep || !log.sleep.quality)) {
      if (viewingToday) {
        html += '<div class="bh-empty-hint">今天还没有记录，试试对AI说：<br>"早餐吃了包子豆浆" / "跑步30分钟" / "心情不错"</div>';
      } else {
        html += '<div class="bh-empty-hint">当天无行为记录</div>';
      }
    }

    html += '</div>'; // section

    // --- 近7天情绪趋势 ---
    if (recentMoods.length > 0) {
      // 按天聚合（每天取最后一次情绪）
      var moodByDay = {};
      recentMoods.forEach(function(m) {
        var dayKey = m.timestamp.substr(0, 10);
        moodByDay[dayKey] = m; // 后面的覆盖前面的，保留最新
      });
      var moodDays = Object.keys(moodByDay).sort();
      // 只取最近7天
      if (moodDays.length > 7) moodDays = moodDays.slice(-7);

      // 统计
      var scores = moodDays.map(function(d) { return moodByDay[d].score; });
      var avgScore = (scores.reduce(function(a,b){return a+b;},0) / scores.length).toFixed(1);
      var maxScore = Math.max.apply(null, scores);
      var minScore = Math.min.apply(null, scores);
      var trend = scores.length >= 2 ? (scores[scores.length-1] - scores[0]) : 0;
      var trendLabel = trend > 0 ? '↑ 上升' : trend < 0 ? '↓ 下降' : '→ 平稳';
      var trendColor = trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : '#6b7280';

      html += '<div class="bh-section">';
      html += '<div class="bh-section-title">' + svgIcon('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', '#ec4899') + ' 近7天情绪趋势</div>';

      // 统计卡片行
      html += '<div class="bh-mood-stats">';
      html += '<div class="bh-mood-stat"><span class="bh-mood-stat-val">' + avgScore + '</span><span class="bh-mood-stat-lbl">日均分</span></div>';
      html += '<div class="bh-mood-stat"><span class="bh-mood-stat-val" style="color:#22c55e">' + maxScore + '</span><span class="bh-mood-stat-lbl">最高</span></div>';
      html += '<div class="bh-mood-stat"><span class="bh-mood-stat-val" style="color:#ef4444">' + minScore + '</span><span class="bh-mood-stat-lbl">最低</span></div>';
      html += '<div class="bh-mood-stat"><span class="bh-mood-stat-val" style="color:' + trendColor + '">' + trendLabel + '</span><span class="bh-mood-stat-lbl">趋势</span></div>';
      html += '</div>';

      // SVG折线图
      var chartW = 320, chartH = 120, padL = 28, padR = 12, padT = 16, padB = 28;
      var plotW = chartW - padL - padR, plotH = chartH - padT - padB;
      var points = [];
      moodDays.forEach(function(d, i) {
        var x = padL + (moodDays.length === 1 ? plotW / 2 : (i / (moodDays.length - 1)) * plotW);
        var y = padT + plotH - ((moodByDay[d].score - 1) / 4) * plotH;
        points.push({ x: x, y: y, score: moodByDay[d].score, date: d, label: moodByDay[d].label || '' });
      });

      html += '<div class="bh-mood-chart-wrap">';
      html += '<svg viewBox="0 0 ' + chartW + ' ' + chartH + '" class="bh-mood-svg">';

      // 背景网格线 + Y轴标签
      for (var s = 1; s <= 5; s++) {
        var gy = padT + plotH - ((s - 1) / 4) * plotH;
        html += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (chartW - padR) + '" y2="' + gy + '" stroke="#f3f4f6" stroke-width="1"/>';
        html += '<text x="' + (padL - 6) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="9" fill="#9ca3af">' + s + '</text>';
      }

      // 折线
      if (points.length > 1) {
        var linePath = points.map(function(p, i) { return (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
        html += '<path d="' + linePath + '" fill="none" stroke="#ec4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        // 面积填充
        var areaPath = linePath + ' L' + points[points.length-1].x.toFixed(1) + ',' + (padT + plotH) + ' L' + points[0].x.toFixed(1) + ',' + (padT + plotH) + ' Z';
        html += '<path d="' + areaPath + '" fill="url(#moodGrad)" opacity="0.15"/>';
        html += '<defs><linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#ec4899" stop-opacity="0"/></linearGradient></defs>';
      }

      // 数据点 + X轴日期
      points.forEach(function(p) {
        var moodInfo = MOOD_LABELS.find(function(ml) { return ml.score === p.score; }) || MOOD_LABELS[2];
        html += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4" fill="' + moodInfo.color + '" stroke="#fff" stroke-width="2"/>';
        html += '<text x="' + p.x.toFixed(1) + '" y="' + (p.y.toFixed(1) - 10) + '" text-anchor="middle" font-size="9" font-weight="600" fill="' + moodInfo.color + '">' + p.score + '</text>';
        var shortDate = parseInt(p.date.substr(5, 2)) + '/' + parseInt(p.date.substr(8, 2));
        html += '<text x="' + p.x.toFixed(1) + '" y="' + (chartH - 4) + '" text-anchor="middle" font-size="8" fill="#9ca3af">' + shortDate + '</text>';
      });

      html += '</svg>';
      html += '</div>'; // chart-wrap

      // 逐条情绪记录（最近5条）
      var recentMoodList = recentMoods.slice(-5).reverse();
      html += '<div class="bh-mood-history">';
      html += '<div class="bh-mood-history-title">最近记录</div>';
      recentMoodList.forEach(function(m) {
        var moodInfo = MOOD_LABELS.find(function(ml) { return ml.score === m.score; }) || MOOD_LABELS[2];
        var ts = new Date(m.timestamp);
        var timeLabel = (ts.getMonth()+1) + '/' + ts.getDate() + ' ' + String(ts.getHours()).padStart(2,'0') + ':' + String(ts.getMinutes()).padStart(2,'0');
        html += '<div class="bh-mood-record">';
        html += '<span class="bh-mood-dot" style="background:' + moodInfo.color + '"></span>';
        html += '<span class="bh-mood-time">' + timeLabel + '</span>';
        html += '<span class="bh-mood-tag" style="color:' + moodInfo.color + ';background:' + moodInfo.color + '14">' + moodInfo.label + ' ' + m.score + '/5</span>';
        if (m.trigger) html += '<span class="bh-mood-trigger">' + m.trigger + '</span>';
        html += '</div>';
      });
      html += '</div>';

      html += '</div>'; // section
    }

    // --- 隐私声明 ---
    html += '<div class="bh-privacy-notice">';
    html += svgIcon('M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', '#6b7280', 14);
    html += '<span>所有行为数据100%存储在本地设备，不会上传到任何服务器</span>';
    html += '</div>';

    html += '</div>'; // bh-wrap
    el.innerHTML = html;
  }

  function _overviewCard(label, value, color, iconPath, bgColor) {
    var cardStyle = bgColor ? ' style="background:' + bgColor + '"' : '';
    return '<div class="bh-ov-card"' + cardStyle + '>' +
      '<div class="bh-ov-icon" style="background:' + color + '18">' + svgIcon(iconPath, color, 18) + '</div>' +
      '<div class="bh-ov-info"><div class="bh-ov-label">' + label + '</div><div class="bh-ov-value">' + value + '</div></div>' +
      '</div>';
  }

  // ==================== 快捷弹窗 ====================
  function _showModal(title, formHtml, onSubmit) {
    var overlay = document.createElement('div');
    overlay.className = 'bh-modal-overlay';
    var h = '<div class="bh-modal">';
    h += '<div class="bh-modal-header"><div class="bh-modal-title">' + title + '</div>';
    h += '<button class="bh-modal-close" id="bhModalClose">' + svgIcon('M6 18L18 6M6 6l12 12', '#6b7280', 18) + '</button></div>';
    h += formHtml;
    h += '</div>';
    overlay.innerHTML = h;
    document.body.appendChild(overlay);

    overlay.querySelector('#bhModalClose').onclick = function() { overlay.remove(); };
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    var submitBtn = overlay.querySelector('.bh-modal-submit');
    if (submitBtn && onSubmit) {
      // 创建按钮容器，包裹保存+取消
      var btnWrap = document.createElement('div');
      btnWrap.className = 'bh-modal-btns';
      submitBtn.parentNode.insertBefore(btnWrap, submitBtn);
      btnWrap.appendChild(submitBtn);
      var cancelBtn = document.createElement('button');
      cancelBtn.className = 'bh-modal-cancel';
      cancelBtn.textContent = '取消';
      cancelBtn.onclick = function() { overlay.remove(); };
      btnWrap.appendChild(cancelBtn);

      submitBtn.addEventListener('click', function() {
        if (onSubmit(overlay) !== false) overlay.remove();
      });
    }
  }

  window._bhShowAddMeal = function() {
    var h = '<div class="bh-form-row"><label>餐次</label><select id="bhMealType">';
    MEAL_TYPES.forEach(function(t) { h += '<option value="' + t + '">' + t + '</option>'; });
    h += '</select></div>';
    h += '<div class="bh-form-row"><label>吃了什么</label><input id="bhMealItems" placeholder="如：牛肉面、豆浆油条"></div>';
    h += '<div class="bh-form-row"><label>在哪吃的（可选）</label><input id="bhMealWhere" placeholder="如：食堂、外卖、家"></div>';
    h += '<div class="bh-form-row"><label>花费（可选）</label><input id="bhMealAmount" type="number" placeholder="0.00" step="0.01" inputmode="decimal"></div>';
    h += '<button class="bh-modal-submit">保存</button>';

    _showModal('记录饮食', h, function(ov) {
      var type = ov.querySelector('#bhMealType').value;
      var items = ov.querySelector('#bhMealItems').value.trim();
      if (!items) { alert('请填写吃了什么'); return false; }
      var where = ov.querySelector('#bhMealWhere').value.trim();
      var amount = parseFloat(ov.querySelector('#bhMealAmount').value) || 0;

      var log = getTodayLog();
      log.meals.push({ type: type, time: _nowTime(), items: items, where: where });
      saveTodayLog(log);

      if (amount > 0 && window.dailyTxAdd) {
        window.dailyTxAdd({ type: 'expense', amount: amount, category: 'food', note: type + ': ' + items, date: _today() });
      }
      window.showToast && window.showToast('已记录' + type + '：' + items);
      renderBehaviorHub('behaviorHubContainer');
      window.healthDataChanged && window.healthDataChanged();
    });
  };

  window._bhShowAddExercise = function() {
    var h = '<div class="bh-form-row"><label>运动类型</label><select id="bhExType">';
    EXERCISE_TYPES.forEach(function(t) { h += '<option value="' + t + '">' + t + '</option>'; });
    h += '</select></div>';
    h += '<div class="bh-form-row"><label>时长（分钟）</label><input id="bhExDur" type="number" placeholder="30"></div>';
    h += '<div class="bh-form-row"><label>距离（公里，可选）</label><input id="bhExDist" type="number" placeholder="5"></div>';
    h += '<button class="bh-modal-submit">保存</button>';

    _showModal('记录运动', h, function(ov) {
      var type = ov.querySelector('#bhExType').value;
      var dur = parseInt(ov.querySelector('#bhExDur').value) || 0;
      var dist = parseFloat(ov.querySelector('#bhExDist').value) || 0;

      var log = getTodayLog();
      log.exercise.push({ type: type, duration: dur, distance: dist, intensity: '中', time: _nowTime() });
      saveTodayLog(log);
      window.showToast && window.showToast('已记录运动：' + type);
      renderBehaviorHub('behaviorHubContainer');
      window.healthDataChanged && window.healthDataChanged();
    });
  };

  window._bhShowAddSleep = function() {
    var h = '<div class="bh-form-row"><label>昨晚入睡时间</label><input id="bhSleepBed" type="time" value="23:00"></div>';
    h += '<div class="bh-form-row"><label>今早起床时间</label><input id="bhSleepWake" type="time" value="07:00"></div>';
    h += '<div class="bh-form-row"><label>睡眠质量</label><div class="bh-quality-select" id="bhSleepQuality">';
    MOOD_LABELS.forEach(function(m) {
      h += '<button type="button" class="bh-q-btn" data-score="' + m.score + '" style="border-color:' + m.color + ';color:' + m.color + '">' + m.label + '</button>';
    });
    h += '</div></div>';
    h += '<button class="bh-modal-submit">保存</button>';

    _showModal('记录睡眠', h, function(ov) {
      var bedtime = ov.querySelector('#bhSleepBed').value;
      var waketime = ov.querySelector('#bhSleepWake').value;
      var selBtn = ov.querySelector('.bh-q-btn.active');
      var quality = selBtn ? parseInt(selBtn.getAttribute('data-score')) : 3;

      var log = getTodayLog();
      log.sleep = { bedtime: bedtime, waketime: waketime, quality: quality };
      saveTodayLog(log);
      window.showToast && window.showToast('已记录睡眠');
      renderBehaviorHub('behaviorHubContainer');
      window.healthDataChanged && window.healthDataChanged();
    });

    // 质量选择按钮交互
    setTimeout(function() {
      var btns = document.querySelectorAll('#bhSleepQuality .bh-q-btn');
      btns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          btns.forEach(function(b) { b.classList.remove('active'); b.style.background = '#fff'; });
          this.classList.add('active');
          this.style.background = this.style.color;
        });
      });
    }, 100);
  };

  window._bhShowAddMood = function() {
    var h = '<div class="bh-form-row"><label>现在的心情</label><div class="bh-quality-select" id="bhMoodScore">';
    MOOD_LABELS.forEach(function(m) {
      h += '<button type="button" class="bh-q-btn" data-score="' + m.score + '" style="border-color:' + m.color + ';color:' + m.color + '">' + m.label + '</button>';
    });
    h += '</div></div>';
    h += '<div class="bh-form-row"><label>原因/触发事件（可选）</label><input id="bhMoodTrigger" placeholder="如：项目进展顺利、跟人吵架了"></div>';
    h += '<div class="bh-form-row"><label>身体感受（可选）</label><input id="bhMoodPhysical" placeholder="如：头痛、失眠、精力充沛"></div>';
    h += '<button class="bh-modal-submit">保存</button>';

    _showModal('记录情绪', h, function(ov) {
      var selBtn = ov.querySelector('#bhMoodScore .bh-q-btn.active');
      var score = selBtn ? parseInt(selBtn.getAttribute('data-score')) : 3;
      var moodInfo = MOOD_LABELS.find(function(m) { return m.score === score; }) || MOOD_LABELS[2];
      var trigger = ov.querySelector('#bhMoodTrigger').value.trim();
      var physical = ov.querySelector('#bhMoodPhysical').value.trim();

      addMoodEntry({ score: score, label: moodInfo.label, trigger: trigger, physical: physical ? [physical] : [], coping: '' });
      window.showToast && window.showToast('已记录情绪：' + moodInfo.label);
      renderBehaviorHub('behaviorHubContainer');
      window.healthDataChanged && window.healthDataChanged();
    });

    setTimeout(function() {
      var btns = document.querySelectorAll('#bhMoodScore .bh-q-btn');
      btns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          btns.forEach(function(b) { b.classList.remove('active'); b.style.background = '#fff'; });
          this.classList.add('active');
          this.style.background = this.style.color;
        });
      });
    }, 100);
  };

  window._bhShowAddWater = function() {
    var log = getTodayLog();
    log.water = (log.water || 0) + 1;
    saveTodayLog(log);
    window.showToast && window.showToast('已记录饮水 +1 杯（共' + log.water + '杯）');
    renderBehaviorHub('behaviorHubContainer');
  };

  window._bhAddWater = function() {
    window._bhShowAddWater();
  };

  window._bhShowAddLearning = function() {
    var h = '<div class="bh-form-row"><label>学了什么</label><input id="bhLearnTopic" placeholder="如：Python、英语单词、产品知识"></div>';
    h += '<div class="bh-form-row"><label>时长（分钟）</label><input id="bhLearnDur" type="number" placeholder="60"></div>';
    h += '<div class="bh-form-row"><label>方式</label><select id="bhLearnType">';
    ['自学','阅读','课程','练习','讨论','其他'].forEach(function(t) { h += '<option value="' + t + '">' + t + '</option>'; });
    h += '</select></div>';
    h += '<button class="bh-modal-submit">保存</button>';

    _showModal('记录学习', h, function(ov) {
      var topic = ov.querySelector('#bhLearnTopic').value.trim();
      var dur = parseInt(ov.querySelector('#bhLearnDur').value) || 0;
      var type = ov.querySelector('#bhLearnType').value;

      var log = getTodayLog();
      log.learning.push({ topic: topic || '未记录', duration: dur, type: type, time: _nowTime() });
      saveTodayLog(log);
      window.showToast && window.showToast('已记录学习：' + (topic || '未命名'));
      renderBehaviorHub('behaviorHubContainer');
    });
  };

  // ==================== 样式注入 ====================
  function injectStyles() {
    var s = document.createElement('style');
    s.textContent = [
      '.bh-wrap{padding:16px;max-width:480px;margin:0 auto}',
      '.bh-section{margin-bottom:20px}',
      '.bh-section-title{font-size:15px;font-weight:600;color:#374151;margin-bottom:12px;display:flex;align-items:center;gap:6px;padding-bottom:8px;border-bottom:1px solid #f3f4f6}',
      '.bh-overview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
      '.bh-ov-card{display:flex;align-items:center;gap:8px;padding:10px;border-radius:10px;background:#f8fafc;border:1px solid #e5e7eb}',
      '.bh-ov-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '.bh-ov-info{min-width:0}',
      '.bh-ov-label{font-size:11px;color:#9ca3af}',
      '.bh-ov-value{font-size:13px;font-weight:600;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.bh-quick-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
      '.bh-qa-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;transition:all .2s;font-size:12px;color:#374151}',
      '.bh-qa-btn:hover{border-color:#93c5fd;background:#eff6ff}',
      '.bh-qa-btn span{font-weight:500}',
      '.bh-detail-group{margin-bottom:10px}',
      '.bh-detail-label{font-size:13px;font-weight:600;color:#6b7280;margin-bottom:4px;padding:4px 0}',
      '.bh-detail-item{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px;color:#374151}',
      '.bh-detail-time{color:#9ca3af;font-size:12px;flex-shrink:0;width:42px}',
      '.bh-detail-type{background:#f3f4f6;padding:1px 6px;border-radius:4px;font-size:11px;color:#6b7280;flex-shrink:0}',
      '.bh-detail-content{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.bh-detail-meta{color:#9ca3af;font-size:11px;flex-shrink:0}',
      '.bh-water-add{padding:2px 10px;border:1px solid #3b82f6;color:#3b82f6;border-radius:12px;background:#fff;cursor:pointer;font-size:12px;font-weight:600}',
      '.bh-water-add:hover{background:#eff6ff}',
      '.bh-empty-hint{text-align:center;padding:20px;color:#9ca3af;font-size:13px;line-height:1.8}',
      '.bh-mood-chart{display:flex;align-items:flex-end;gap:6px;height:100px;padding:8px 0}',
      '.bh-mood-bar-wrap{flex:1;display:flex;flex-direction:column;align-items:center;height:100%}',
      '.bh-mood-bar{width:100%;min-height:4px;border-radius:4px 4px 0 0;margin-top:auto;transition:height .3s}',
      '.bh-mood-label{font-size:10px;color:#6b7280;margin-top:4px}',
      '.bh-mood-date{font-size:10px;color:#9ca3af}',
      // 日期导航栏
      '.bh-date-nav{display:flex;align-items:center;justify-content:center;padding:16px 16px 8px;gap:8px;position:relative;margin-bottom:16px}',
      '.bh-dnav-btn{width:36px;height:36px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#475569;transition:all .15s;flex-shrink:0}',
      '.bh-dnav-btn:hover:not(:disabled){background:#f1f5f9;border-color:#cbd5e1}',
      '.bh-dnav-btn:active:not(:disabled){transform:scale(.93)}',
      '.bh-dnav-btn:disabled{opacity:.4;cursor:default}',
      '.bh-dnav-center{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0}',
      '.bh-dnav-picker{font-size:0;width:1px;height:1px;opacity:0;position:absolute;pointer-events:none}',
      '.bh-dnav-label{font-size:15px;font-weight:600;color:#1f2937;cursor:pointer;padding:2px 8px;border-radius:6px;transition:background .15s}',
      '.bh-dnav-label:hover{background:#e5e7eb}',
      '.bh-dnav-today{padding:4px 12px;border-radius:16px;border:1px solid #3b82f6;background:#eff6ff;color:#3b82f6;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0;transition:all .15s}',
      '.bh-dnav-today:hover{background:#3b82f6;color:#fff}',
      '.bh-history-hint{display:flex;align-items:center;gap:6px;padding:8px 12px;background:#fffbeb;border-radius:8px;font-size:12px;color:#92400e;margin-bottom:12px;border:1px solid #fde68a}',
      // 情绪趋势
      '.bh-mood-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}',
      '.bh-mood-stat{display:flex;flex-direction:column;align-items:center;padding:8px 4px;background:#fdf2f8;border-radius:10px;border:1px solid #fce7f3}',
      '.bh-mood-stat-val{font-size:18px;font-weight:700;color:#1f2937;line-height:1.2}',
      '.bh-mood-stat-lbl{font-size:10px;color:#9ca3af;margin-top:2px}',
      '.bh-mood-chart-wrap{padding:4px 0;margin-bottom:8px}',
      '.bh-mood-svg{width:100%;height:auto;display:block}',
      '.bh-mood-history{margin-top:8px;border-top:1px solid #f3f4f6;padding-top:8px}',
      '.bh-mood-history-title{font-size:12px;font-weight:600;color:#6b7280;margin-bottom:6px}',
      '.bh-mood-record{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f9fafb;font-size:12px}',
      '.bh-mood-record:last-child{border-bottom:none}',
      '.bh-mood-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}',
      '.bh-mood-time{color:#9ca3af;flex-shrink:0;width:72px;font-size:11px}',
      '.bh-mood-tag{padding:2px 8px;border-radius:10px;font-weight:600;font-size:11px;flex-shrink:0}',
      '.bh-mood-trigger{color:#6b7280;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',
      '.bh-privacy-notice{display:flex;align-items:center;gap:6px;padding:12px;background:#f0fdf4;border-radius:8px;font-size:11px;color:#6b7280;margin-top:16px}',
      // Modal
      '.bh-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:9998;display:flex;align-items:flex-end;justify-content:center}',
      '.bh-modal{background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:480px;padding:20px 16px 24px}',
      '.bh-modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}',
      '.bh-modal-title{font-size:16px;font-weight:700;color:#1f2937}',
      '.bh-modal-close{background:none;border:none;cursor:pointer;padding:4px}',
      '.bh-form-row{margin-bottom:12px}',
      '.bh-form-row label{display:block;font-size:12px;color:#6b7280;margin-bottom:4px}',
      '.bh-form-row input,.bh-form-row select,.bh-form-row textarea{width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;outline:none;transition:border .2s}',
      '.bh-form-row input:focus,.bh-form-row select:focus,.bh-form-row textarea:focus{border-color:#2563eb}',
      '.bh-form-row textarea{height:60px;resize:none}',
      '.bh-modal-btns{display:flex;gap:10px;margin-top:12px}',
      '.bh-modal-submit{flex:1;padding:12px;border:none;border-radius:10px;background:#2563eb;color:#fff;font-size:15px;font-weight:600;cursor:pointer}',
      '.bh-modal-submit:hover{background:#1d4ed8}',
      '.bh-modal-cancel{flex:0 0 auto;padding:12px 18px;border:1.5px solid #d1d5db;border-radius:10px;background:#fff;color:#6b7280;font-size:14px;font-weight:500;cursor:pointer}',
      '.bh-modal-cancel:hover{background:#f3f4f6}',
      '.bh-quality-select{display:flex;gap:6px}',
      '.bh-q-btn{flex:1;padding:8px;border:1.5px solid #e5e7eb;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s}',
      '.bh-dnav-note{font-style:normal;color:#f97316;font-size:12px;font-weight:600}',
      '.bh-q-btn.active{color:#fff !important}',
      '@media(max-width:380px){.bh-overview-grid{grid-template-columns:repeat(2,1fr)}.bh-quick-actions{grid-template-columns:repeat(2,1fr)}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ==================== 工具函数 ====================
  function _today() { return _localDateStr(); }
  function _nowTime() {
    var n = new Date();
    return String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
  }
  function svgIcon(pathD, color, sz) {
    sz = sz || 16;
    return '<svg viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'" fill="none" stroke="'+(color||'currentColor')+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="'+pathD+'"/></svg>';
  }

  // ==================== 全局接口 ====================
  window.initBehaviorHub = function(containerId) {
    injectStyles();
    renderBehaviorHub(containerId);
  };

  window.parseAndRecordBehavior = function(text) {
    return parseBehaviorInput(text);
  };

  // 对外数据读取接口（供未来分析引擎使用）
  window.getBehaviorData = function() {
    return {
      behaviorLogs: _load(KEYS.behavior, []),
      moodLogs: _load(KEYS.mood, []),
      preferences: getPrefs(),
      familyEdu: getFamilyEdu(),
      dailyTransactions: _load('mijieai_daily_tx', []),
      healthProfile: _load('mijieai_health_profile', {}),
      exportTime: new Date().toISOString()
    };
  };

  // ==================== BehaviorLog 统一数据接口 ====================
  // 供健康总览 / 情绪页 / 睡眠页 / 运动详情页统一读取（消除多源撕裂），
  // 情绪/运动/睡眠写入统一走本对象，不得另开新源
  window.BehaviorLog = {
    getLogForDate: getLogForDate,
    getRecentLogs: getRecentLogs,
    getRecentMoods: getRecentMoods,
    addMoodEntry: addMoodEntry,
    // 情绪删除（确认后按 id 定位，避免同句双链路/重复记录累积）
    removeMoodEntry: function(id) {
      if (!id) return;
      var logs = _load(KEYS.mood, []);
      var idx = -1;
      for (var i = 0; i < logs.length; i++) { if (logs[i].id === id) { idx = i; break; } }
      if (idx === -1) return;
      logs.splice(idx, 1);
      _save(KEYS.mood, logs);
      if (window.healthDataChanged) { try { window.healthDataChanged(); } catch(e) {} }
      return true;
    },
    // 睡眠写入委托：接受 {bedtime, waketime, quality, hour(深夜检测)}
    updateSleep: function(fields) {
      var log = getLogForDate(_getSelectedDate());
      if (log._empty) delete log._empty;
      if (!log.sleep) log.sleep = {};
      if (fields) {
        if (typeof fields.bedtime === 'string' && fields.bedtime) log.sleep.bedtime = fields.bedtime;
        if (typeof fields.waketime === 'string' && fields.waketime) log.sleep.waketime = fields.waketime;
        if (typeof fields.hour === 'number' && !log.sleep.bedtime) {
          var h = String(fields.hour).padStart(2, '0');
          log.sleep.bedtime = h + ':00';
        }
        if (typeof fields.quality === 'number') log.sleep.quality = fields.quality;
      }
      saveTodayLog(log);
      return log.sleep;
    },
    // 饮食写入委托（统一写 behavior_log.meals，对话录入 / 专属页同源）
    addMeal: function(mealType, items) {
      var log = getLogForDate(_getSelectedDate());
      if (log._empty) delete log._empty;
      var now = new Date();
      var timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
      log.meals.push({ type: mealType || '加餐', time: timeStr, items: items || '未记录', where: '' });
      saveTodayLog(log);
      if (window.healthDataChanged) { try { window.healthDataChanged(); } catch(e) {} }
      return log.meals;
    },
    // 饮食编辑/删除（支持错误/多余记录的修改与删除，并同步各页）
    updateMeal: function(idx, fields) {
      var log = getLogForDate(_getSelectedDate());
      if (log._empty) delete log._empty;
      if (!log.meals || idx < 0 || idx >= log.meals.length) return log.meals;
      var m = log.meals[idx];
      if (!m) return log.meals;
      if (fields) {
        if (typeof fields.type === 'string' && fields.type) m.type = fields.type;
        if (typeof fields.items === 'string' && fields.items.trim()) m.items = fields.items.trim();
      }
      saveTodayLog(log);
      if (window.healthDataChanged) { try { window.healthDataChanged(); } catch(e) {} }
      return log.meals;
    },
    removeMeal: function(idx) {
      var log = getLogForDate(_getSelectedDate());
      if (log._empty) delete log._empty;
      if (!log.meals || idx < 0 || idx >= log.meals.length) return log.meals;
      log.meals.splice(idx, 1);
      saveTodayLog(log);
      if (window.healthDataChanged) { try { window.healthDataChanged(); } catch(e) {} }
      return log.meals;
    },
    removeExercise: function(idx) {
      var log = getLogForDate(_getSelectedDate());
      if (log._empty) delete log._empty;
      if (!log.exercise || idx < 0 || idx >= log.exercise.length) return log.exercise;
      log.exercise.splice(idx, 1);
      saveTodayLog(log);
      if (window.healthDataChanged) { try { window.healthDataChanged(); } catch(e) {} }
      return log.exercise;
    },
    parseBehaviorInput: parseBehaviorInput,
    render: renderBehaviorHub
  };

  // 隐私保障：禁止任何外部数据发送
  // 所有数据操作仅使用 localStorage，模块内无任何 fetch/XMLHttpRequest/WebSocket 调用

})();
