/**
 * behavior-log.js — 米界AI 个人行为数据收集与分析模块
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

  // ---------- 行为日志 ----------
  function getTodayLog() {
    var logs = _load(KEYS.behavior, []);
    var today = _today();
    var found = logs.find(function(l) { return l.date === today; });
    if (!found) {
      found = { date: today, meals: [], exercise: [], sleep: {}, learning: [], water: 0, notes: '' };
      logs.push(found);
      _save(KEYS.behavior, logs);
    }
    return found;
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
    var cutoffStr = cutoff.toISOString().substr(0, 10);
    return logs.filter(function(l) { return l.date >= cutoffStr; });
  }

  // ---------- 情绪日志 ----------
  function addMoodEntry(entry) {
    var logs = _load(KEYS.mood, []);
    entry.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    entry.timestamp = new Date().toISOString();
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
    var cutoffISO = cutoff.toISOString();
    return logs.filter(function(l) { return l.timestamp >= cutoffISO; });
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

    // 如果有金额，同时记录消费
    if (amount && amount > 0 && window.dailyTxAdd) {
      window.dailyTxAdd({ type: 'expense', amount: amount, category: 'food', note: mealType + ': ' + (items || ''), date: _today() });
    }

    var msg = '已记录' + mealType + (items ? '：' + items : '');
    if (amount) msg += '（¥' + amount + '）';

    return { matched: true, module: 'behavior', action: 'meal', message: msg };
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
    if (!/(?:心情|情绪|感觉|感到|好[开心高兴难过烦累]|开心|高兴|难过|伤心|焦虑|压力|烦躁|郁闷|疲惫|兴奋|沮丧|低落|不错|挺好的|崩溃|绝望|平静|感恩)/.test(text)) return null;

    var score = 3;
    var label = '一般';
    var trigger = '';

    if (/很开心|高兴|兴奋|太好了|棒|感恩|不错|很好|开心/.test(text)) { score = 5; label = '很好'; }
    else if (/开心|还行|还好|不错|挺好|平静/.test(text)) { score = 4; label = '不错'; }
    else if (/一般|还好|普通|凑合|正常/.test(text)) { score = 3; label = '一般'; }
    else if (/不开心|难过|低落|郁闷|沮丧|烦|焦虑|压力|累|疲惫|烦燥/.test(text)) { score = 2; label = '低落'; }
    else if (/很难过|崩溃|绝望|伤心|痛苦|抑郁|受不了/.test(text)) { score = 1; label = '很差'; }

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

  // ==================== UI 渲染 ====================
  function renderBehaviorHub(containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;

    var log = getTodayLog();
    var recentMoods = getRecentMoods(7);
    var recentLogs = getRecentLogs(7);

    var html = '<div class="bh-wrap">';

    // --- 今日概览 ---
    html += '<div class="bh-section">';
    html += '<div class="bh-section-title">' + svgIcon('M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', '#3b82f6') + ' 今日行为概览</div>';
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

    // --- 快捷记录按钮 ---
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

    // --- 今日详细日志 ---
    html += '<div class="bh-section">';
    html += '<div class="bh-section-title">' + svgIcon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', '#6b7280') + ' 今日详情</div>';

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
      html += '<div class="bh-empty-hint">今天还没有记录，试试对AI说：<br>"早餐吃了包子豆浆" / "跑步30分钟" / "心情不错"</div>';
    }

    html += '</div>'; // section

    // --- 近7天情绪趋势 ---
    if (recentMoods.length > 0) {
      html += '<div class="bh-section">';
      html += '<div class="bh-section-title">' + svgIcon('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', '#ec4899') + ' 近7天情绪</div>';
      html += '<div class="bh-mood-chart">';
      recentMoods.forEach(function(m) {
        var moodInfo = MOOD_LABELS.find(function(ml) { return ml.score === m.score; }) || MOOD_LABELS[2];
        var ts = new Date(m.timestamp);
        var dayStr = (ts.getMonth() + 1) + '/' + ts.getDate();
        html += '<div class="bh-mood-bar-wrap">';
        html += '<div class="bh-mood-bar" style="height:' + (moodInfo.score * 20) + '%;background:' + moodInfo.color + '"></div>';
        html += '<div class="bh-mood-label">' + moodInfo.label + '</div>';
        html += '<div class="bh-mood-date">' + dayStr + '</div>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
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
    h += '<div class="bh-form-row"><label>花费（可选）</label><input id="bhMealAmount" type="number" placeholder="元"></div>';
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
      '.bh-q-btn.active{color:#fff !important}',
      '@media(max-width:380px){.bh-overview-grid{grid-template-columns:repeat(2,1fr)}.bh-quick-actions{grid-template-columns:repeat(2,1fr)}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ==================== 工具函数 ====================
  function _today() { return new Date().toISOString().substr(0, 10); }
  function _nowTime() {
    var n = new Date();
    return String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
  }
  function svgIcon(pathD, color, sz) {
    sz = sz || 16;
    return '<svg viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'" fill="none" stroke="'+(color||'currentColor')+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px">'+pathD+'</svg>';
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

  // 隐私保障：禁止任何外部数据发送
  // 所有数据操作仅使用 localStorage，模块内无任何 fetch/XMLHttpRequest/WebSocket 调用

})();
