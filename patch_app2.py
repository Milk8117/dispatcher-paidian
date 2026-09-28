#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import io

path = 'app.html'
d = io.open(path, encoding='utf-8').read()

# ---------- 1: emotion recordMood calls -> recordDetectedMood ----------
old_neg = ("        // 写入情绪数据\n"
           "        if (window.HealthBridge && typeof window.HealthBridge.recordMood === 'function') {\n"
           "          try { window.HealthBridge.recordMood({ level: -1, source: 'auto_detect' }); } catch(e) {}\n"
           "        }\n")
old_pos = ("        if (window.HealthBridge && typeof window.HealthBridge.recordMood === 'function') {\n"
           "          try { window.HealthBridge.recordMood({ level: 1, source: 'auto_detect' }); } catch(e) {}\n"
           "        }\n")
assert old_neg in d, 'old_neg not found'
assert old_pos in d, 'old_pos not found'
d = d.replace(old_neg, "        recordDetectedMood('negative', text);\n")
d = d.replace(old_pos, "        recordDetectedMood('positive', text);\n")

# ---------- 2: add recordDetectedMood helper after detectMood ----------
anchor2 = ("      if (posCount > negCount && posCount >= 1) return 'positive';\n"
           "      return 'neutral';\n"
           "    }\n")
helper2 = ("      if (posCount > negCount && posCount >= 1) return 'positive';\n"
           "      return 'neutral';\n"
           "    }\n"
           "\n"
           "    // 情绪感知落库：统一走 BehaviorLog.addMoodEntry（与健康页同源），落库后刷新总览与情绪页\n"
           "    function recordDetectedMood(direction, text) {\n"
           "      var entry = null;\n"
           "      if (direction === 'negative') {\n"
           "        entry = { score: 2, label: '低落', level: -1, source: 'auto_detect', trigger: String(text || '').slice(0, 30) };\n"
           "      } else if (direction === 'positive') {\n"
           "        entry = { score: 4, label: '不错', level: 1, source: 'auto_detect', trigger: String(text || '').slice(0, 30) };\n"
           "      } else {\n"
           "        return;\n"
           "      }\n"
           "      if (window.BehaviorLog && typeof window.BehaviorLog.addMoodEntry === 'function') {\n"
           "        try { window.BehaviorLog.addMoodEntry(entry); } catch(e) {}\n"
           "      }\n"
           "      try { if (typeof updateHealthDashboard === 'function') updateHealthDashboard(); } catch(e) {}\n"
           "      try { if (window.HealthSpecial && typeof window.HealthSpecial.renderMood === 'function') window.HealthSpecial.renderMood(); } catch(e) {}\n"
           "    }\n")
assert anchor2 in d, 'anchor2 not found'
d = d.replace(anchor2, helper2, 1)

# ---------- 3: updateHealthDashboard unify to behavior-log source ----------
old3 = ("    var dietCount = 0, exerciseMin = 0, sleepHour = null, mood = null;\n"
        "\n"
        "    try {\n"
        "      if (window.DataStore && DataStore.load) {\n"
        "        var behaviors = DataStore.load('behavior_log', 'records', []) || [];\n"
        "        behaviors.forEach(function(b) {\n"
        "          if (b.date === todayStr) {\n"
        "            if (b.category === 'diet') dietCount++;\n"
        "            if (b.category === 'exercise') exerciseMin += Number(b.duration) || 0;\n"
        "            if (b.category === 'sleep') sleepHour = Number(b.duration) || null;\n"
        "            if (b.category === 'mood') mood = b.mood || b.value || null;\n"
        "          }\n"
        "        });\n"
        "      }\n"
        "    } catch(e) {}\n")
new3 = ("    var dietCount = 0, exerciseMin = 0, sleepHour = null, mood = null;\n"
        "\n"
        "    // 统一读 behavior-log 数据源（与运动/睡眠/饮食/情绪详情页同源，消除概览与详情页撕裂）\n"
        "    try {\n"
        "      if (window.BehaviorLog && typeof window.BehaviorLog.getLogForDate === 'function') {\n"
        "        var todayLog = window.BehaviorLog.getLogForDate(todayStr);\n"
        "        if (todayLog && !todayLog._empty) {\n"
        "          dietCount = (todayLog.meals || []).length;\n"
        "          exerciseMin = (todayLog.exercise || []).reduce(function(s,e){ return s + (Number(e.duration)||0); }, 0);\n"
        "          if (todayLog.sleep) {\n"
        "            var _b = todayLog.sleep.bedtime, _w = todayLog.sleep.waketime;\n"
        "            if (_b && _w) {\n"
        "              try {\n"
        "                var _bp = String(_b).split(':'), _wp = String(_w).split(':');\n"
        "                var _bm = (+_bp[0])*60 + (+_bp[1]||0), _wm = (+_wp[0])*60 + (+_wp[1]||0);\n"
        "                var _diff = _wm - _bm; if (_diff < 0) _diff += 1440;\n"
        "                sleepHour = Math.round(_diff / 60 * 10) / 10;\n"
        "              } catch(e2) {}\n"
        "            }\n"
        "            if (!sleepHour) sleepHour = Number(todayLog.sleep.duration) || null;\n"
        "          }\n"
        "        }\n"
        "      }\n"
        "    } catch(e) {}\n"
        "    // 情绪：统一读 behavior-log mood 数组（与情绪详情页同源）\n"
        "    try {\n"
        "      if (window.BehaviorLog && typeof window.BehaviorLog.getRecentMoods === 'function') {\n"
        "        var _todayMoods = window.BehaviorLog.getRecentMoods(7) || [];\n"
        "        for (var _mi = _todayMoods.length - 1; _mi >= 0; _mi--) {\n"
        "          if (_todayMoods[_mi].timestamp && _todayMoods[_mi].timestamp.substr(0,10) === todayStr) {\n"
        "            mood = (_todayMoods[_mi].label || '') + ' ' + (_todayMoods[_mi].score || 0) + '/5';\n"
        "            break;\n"
        "          }\n"
        "        }\n"
        "      }\n"
        "    } catch(e) {}\n")
assert old3 in d, 'old3 not found'
d = d.replace(old3, new3, 1)

# ---------- 4: add getExerciseAvoidance function before HealthSpecial ----------
anchor4 = "  window.HealthSpecial = {"
fn4 = ("  // ==================== 运动规避建议（基础疾病 + 体质） ====================\n"
       "  function getExerciseAvoidance() {\n"
       "    var items = [];\n"
       "    var disease = '未设置', constitution = '未设置';\n"
       "    try {\n"
       "      if (window.MemoryManager && window.MemoryManager.getSync) {\n"
       "        disease = window.MemoryManager.getSync('user', 'disease', '未设置');\n"
       "        constitution = window.MemoryManager.getSync('user', 'constitution', '未设置');\n"
       "      }\n"
       "    } catch(e) {}\n"
       "    // 基础疾病规避\n"
       "    var dmap = [\n"
       "      { kw: ['高血压','血压高'], tip: '忌清晨5-7点血压峰值时段剧烈运动，宜餐后1小时温和有氧（快走、骑车）' },\n"
       "      { kw: ['糖尿病','血糖','消渴'], tip: '忌空腹剧烈运动易诱发低血糖，宜餐后1小时运动并随身备糖，避免足部受伤' },\n"
       "      { kw: ['高血脂','高脂血','血脂'], tip: '宜每周5-7次中等强度有氧，忌久坐不动' },\n"
       "      { kw: ['冠心病','心血管','心绞痛','冠脉'], tip: '忌剧烈运动致大汗，宜温和有氧，晨练推迟至日出后，注意保暖' },\n"
       "      { kw: ['胃炎','胃病'], tip: '忌餐后立即剧烈运动与空腹高强度运动，宜餐后1小时舒缓活动' },\n"
       "      { kw: ['失眠','睡眠障碍'], tip: '忌睡前2小时剧烈运动，宜日间适度有氧助眠' }\n"
       "    ];\n"
       "    if (disease && disease !== '未设置') {\n"
       "      dmap.forEach(function(o) {\n"
       "        var hit = o.kw.some(function(k){ return disease.indexOf(k) >= 0; });\n"
       "        if (hit) items.push({ title: '疾病规避', text: o.tip });\n"
       "      });\n"
       "    }\n"
       "    // 体质规避\n"
       "    var cmap = {\n"
       "      '寒湿': '忌冷水刺激与大汗后受风，宜温和有氧逐渐升温，避免清晨/雨后湿冷时段运动，运动前后注意保暖',\n"
       "      '湿热': '忌在闷热潮湿环境剧烈运动，忌久坐生湿，运动后及时补水擦干',\n"
       "      '平和': '保持每周规律的中等强度运动即可',\n"
       "      '气虚': '忌剧烈耗气大汗运动，宜散步、太极拳、八段锦等温和运动',\n"
       "      '血瘀': '忌久坐不动，宜快走、散步等适度活血运动，促进气血流通',\n"
       "      '阳虚': '忌剧烈大汗与冷水刺激，宜晴日阳光下温和运动以助阳气',\n"
       "      '阴虚': '忌过量剧烈运动致大汗伤阴，宜温和有氧并早睡养阴',\n"
       "      '气郁': '忌久坐不动情志压抑，宜拉伸、散步、瑜伽等舒畅情志的运动'\n"
       "    };\n"
       "    if (constitution && constitution !== '未设置') {\n"
       "      var added = {};\n"
       "      Object.keys(cmap).forEach(function(k) {\n"
       "        if (constitution.indexOf(k) >= 0 && !added[k]) { added[k] = 1; items.push({ title: k + '体质', text: cmap[k] }); }\n"
       "      });\n"
       "    }\n"
       "    return items;\n"
       "  }\n"
       "\n"
       "  window.HealthSpecial = {")
assert anchor4 in d, 'anchor4 not found'
d = d.replace(anchor4, fn4, 1)

# ---------- 5: renderExercise - declare avEl ----------
old5 = ("      var calEl = document.getElementById('exCalories');\n"
        "      var listEl = document.getElementById('exerciseRecordList');\n")
new5 = ("      var calEl = document.getElementById('exCalories');\n"
        "      var listEl = document.getElementById('exerciseRecordList');\n"
        "      var avEl = document.getElementById('exerciseAvoidCard');\n")
assert old5 in d, 'old5 not found'
d = d.replace(old5, new5, 1)

# ---------- 6: renderExercise - fill avoidance card ----------
old6 = ("        }\n"
        "      }\n"
        "    },\n"
        "\n"
        "    // 渲染睡眠专项页")
fill6 = ("        }\n"
         "      }\n"
         "\n"
         "      // 运动规避建议（基础疾病+体质）\n"
         "      if (avEl) {\n"
         "        var aItems = [];\n"
         "        try { aItems = (typeof getExerciseAvoidance === 'function') ? getExerciseAvoidance() : []; } catch(e) { aItems = []; }\n"
         "        if (aItems.length > 0) {\n"
         "          var avHtml = '<div class=\"exercise-avoid-card\">';\n"
         "          avHtml += '<div class=\"exercise-avoid-title\"><svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"#f59e0b\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align:-2px;margin-right:5px\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 8v4\"/><path d=\"M12 16h.01\"/></svg>运动规避建议</div>';\n"
         "          aItems.forEach(function(it) {\n"
         "            avHtml += '<div class=\"exercise-avoid-item\"><span class=\"exercise-avoid-tag\">' + it.title + '</span><span class=\"exercise-avoid-text\">' + it.text + '</span></div>';\n"
         "          });\n"
         "          avHtml += '</div>';\n"
         "          avEl.innerHTML = avHtml;\n"
         "          avEl.style.display = 'block';\n"
         "        } else {\n"
         "          avEl.style.display = 'none';\n"
         "        }\n"
         "      }\n"
         "    },\n"
         "\n"
         "    // 渲染睡眠专项页")
assert old6 in d, 'old6 not found'
d = d.replace(old6, fill6, 1)

# ---------- 7: add exercise avoidance card container in exercise page HTML ----------
old7 = "      <!-- 运动记录列表 -->\n"
card7 = ("      <!-- 运动规避建议（基础疾病+体质，渲染填充） -->\n"
         "      <div id=\"exerciseAvoidCard\" style=\"display:none\"></div>\n"
         "      <!-- 运动记录列表 -->\n")
assert old7 in d, 'old7 not found'
d = d.replace(old7, card7, 1)

# ---------- 8: CSS for exercise avoidance card ----------
old8 = ".profile-multi-chip.selected svg { opacity: 1; }"
css8 = ('.profile-multi-chip.selected svg { opacity: 1; }\n'
        '.exercise-avoid-card { background:#fff; border:1px solid #f1f5f9; border-radius:12px; padding:14px 16px; margin-bottom:12px; }\n'
        '.exercise-avoid-title { font-size:14px; font-weight:600; color:#0f172a; margin-bottom:10px; display:flex; align-items:center; }\n'
        '.exercise-avoid-item { display:flex; align-items:flex-start; gap:8px; padding:7px 0; border-bottom:1px solid #f8fafc; }\n'
        '.exercise-avoid-item:last-child { border-bottom:none; }\n'
        '.exercise-avoid-tag { flex-shrink:0; font-size:11px; color:#fff; background:#f59e0b; border-radius:4px; padding:1px 6px; margin-top:1px; }\n'
        '.exercise-avoid-text { font-size:13px; color:#475569; line-height:1.5; }')
assert old8 in d, 'old8 not found'
d = d.replace(old8, css8, 1)

io.open(path, 'w', encoding='utf-8').write(d)
print('patch_app2 done')