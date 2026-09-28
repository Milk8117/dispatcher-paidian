#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import io, sys

path = 'solar-term.js'
d = io.open(path, encoding='utf-8').read()
orig = d

# ---------- A: remove health tab button line ----------
d = '\n'.join([l for l in d.split('\n') if 'data-view="health"' not in l])

# ---------- B: remove ' // 读取健康档案' + var healthProfile line ----------
d = d.replace("    // 读取健康档案\n    var healthProfile = getHealthProfile();\n\n", "")

# ---------- C: remove healthy view branch in switchSolarView ----------
_s = d.index("else if (view === 'health') {")
_seg = d[_s:]
_close = _seg.find("\n      }\n")
d = d[:_s] + _seg[_close + len("\n      }\n"):]

# ---------- D: remove screening block ----------
_s = d.index('    // 首次进入检查健康筛查')
_seg = d[_s:]
_c = _seg.find("\n    }\n")
d = d[:_s] + "    // 直接显示节气视图（健康数据统一走「我的」user 层）\n    switchSolarView('term');" + _seg[_c + len("\n    }\n"):]

# ---------- E: remove solarGetHealthProfile line ----------
d = '\n'.join([l for l in d.split('\n') if 'solarGetHealthProfile' not in l])

# ---------- F: replace region 健康档案 localStorage..renderHealthProfile with unified helpers ----------
_start = d.index('  // ==================== 健康档案 localStorage =================')
_end = d.index('  // ==================== 智能过滤：根据健康档案过滤菜谱 =================')

NEW_SECTION = """  // ==================== 健康档案统一数据源（读「我的」user 层） ====================
  // 体质辨证库（食/动禁忌用于菜谱与运动过滤；寒湿为主，其余为可选）
  var CONSTITUTIONS = [
    { id: 'hanShi', name: '寒湿', avoidFood: ['生冷','寒凉','冷饮','冰镇','冰饮'], avoidTip: '忌生冷寒凉与冰镇冷饮，宜温中散寒祛湿，可食生姜、花椒、羊肉、茯苓、薏苡仁', exerciseAvoid: '忌冷水刺激与大汗后受风，宜温和有氧逐渐升温，避免清晨/雨后湿冷时段运动，运动前后注意保暖' },
    { id: 'pingHe', name: '平和', avoidFood: [], avoidTip: '体质平和，均衡饮食即可，无需特别禁忌', exerciseAvoid: '保持每周规律的中等强度运动即可' },
    { id: 'shiRe', name: '湿热', avoidFood: ['辛辣','烧烤','油炸','肥甘厚味','火锅','烟酒','白酒'], avoidTip: '忌辛辣刺激、油炸烧烤与肥甘厚味，宜清淡清热利湿，可食冬瓜、薏苡仁、赤小豆、绿豆', exerciseAvoid: '忌在闷热潮湿环境剧烈运动，忌久坐生湿，运动后及时补水擦干汗液' },
    { id: 'qiXu', name: '气虚', avoidFood: ['生冷','萝卜','山楂','槟榔','冰饮'], avoidTip: '忌生冷及行气耗气之品，宜温补益气，可食黄芪、山药、大枣、鸡肉', exerciseAvoid: '忌剧烈耗气大汗运动，宜散步、太极拳、八段锦等温和运动' },
    { id: 'xueYu', name: '血瘀', avoidFood: ['生冷','寒凉','冰饮','肥甘厚腻'], avoidTip: '忌寒凉生冷致血凝，宜活血化瘀，可食山楂、黑木耳、洋葱、玫瑰花', exerciseAvoid: '忌久坐不动，宜快走、散步等适度活血运动，促进气血流通' },
    { id: 'yangXu', name: '阳虚', avoidFood: ['生冷','寒凉','冷饮','冰镇','西瓜','苦瓜','绿豆'], avoidTip: '忌生冷寒凉伤阳气，宜温阳散寒，可食羊肉、韭菜、生姜、桂圆', exerciseAvoid: '忌剧烈大汗与冷水刺激，宜晴日阳光下温和运动以助阳气' },
    { id: 'yinXu', name: '阴虚', avoidFood: ['辛辣','燥热','油炸','烧烤','羊肉','狗肉','桂圆','荔枝'], avoidTip: '忌辛温燥热伤津，宜滋阴润燥，可食百合、银耳、鸭肉、枸杞', exerciseAvoid: '忌过量剧烈运动致大汗伤阴，宜温和有氧并早睡养阴' },
    { id: 'qiYu', name: '气郁', avoidFood: ['辛辣','油炸','难消化','浓茶','咖啡'], avoidTip: '忌辛辣燥热及难消化食物，宜疏肝理气，可食萝卜、佛手、山楂、玫瑰花', exerciseAvoid: '忌久坐不动情志压抑，宜拉伸、散步、瑜伽等舒畅情志的运动' }
  ];

  // 读取「我的」user 层健康档案（疾病/体质统一数据源，废弃 mijieai_health_profile 双源）
  function getUserHealthCtx() {
    var ctx = { conditions: [], constitution: [], diseaseText: '', constitutionText: '' };
    try {
      if (window.MemoryManager && window.MemoryManager.getSync) {
        var d = window.MemoryManager.getSync('user', 'disease', '未设置');
        var c = window.MemoryManager.getSync('user', 'constitution', '未设置');
        ctx.diseaseText = (d && d !== '未设置') ? String(d) : '';
        ctx.constitutionText = (c && c !== '未设置') ? String(c) : '';
        if (ctx.diseaseText) ctx.conditions = matchDiseases(ctx.diseaseText);
        if (ctx.constitutionText) ctx.constitution = parseConstitution(ctx.constitutionText);
      }
    } catch(e) {}
    return ctx;
  }

  // 从疾病文本匹配 CHRONIC_DISEASES id（中文名 + 别名）
  function matchDiseases(text) {
    var ids = [];
    if (!window.CHRONIC_DISEASES || !text) return ids;
    var t = String(text);
    for (var i = 0; i < window.CHRONIC_DISEASES.length; i++) {
      var dis = window.CHRONIC_DISEASES[i];
      if (!dis || !dis.id) continue;
      if (dis.name && t.indexOf(dis.name) >= 0) { ids.push(dis.id); continue; }
      var al = aliasesForDisease(dis.id);
      for (var j = 0; j < al.length; j++) {
        if (t.indexOf(al[j]) >= 0) { ids.push(dis.id); break; }
      }
    }
    return ids;
  }

  function aliasesForDisease(id) {
    switch (id) {
      case 'hypertension': return ['高血压病','血压高','血压偏高'];
      case 'diabetes': return ['血糖高','血糖偏高','消渴','2型糖尿病','糖尿病足'];
      case 'hyperlipidemia': return ['高脂血','高脂血症','血脂高','血脂偏高','高胆固醇'];
      case 'chd': return ['心血管','冠状','冠脉','心绞痛','心肌缺血','动脉硬化'];
      case 'gastritis': return ['胃病','胃溃疡','萎缩性胃炎'];
      case 'insomnia': return ['睡眠障碍','入睡困难','神经衰弱','睡不好'];
      default: return [];
    }
  }

  // 从体质文本匹配已选体质名
  function parseConstitution(text) {
    var result = [];
    var t = String(text);
    for (var i = 0; i < CONSTITUTIONS.length; i++) {
      if (t.indexOf(CONSTITUTIONS[i].name) >= 0) result.push(CONSTITUTIONS[i].name);
    }
    return result;
  }

  // 由体质名取体质对象
  function getConstitutionObjs(names) {
    var objs = [];
    for (var i = 0; i < names.length; i++) {
      for (var j = 0; j < CONSTITUTIONS.length; j++) {
        if (CONSTITUTIONS[j].name === names[i]) { objs.push(CONSTITUTIONS[j]); break; }
      }
    }
    return objs;
  }

  // 构建饮食禁忌 map（基础疾病 + 体质 双重过滤）→ { 食材: [来源...] }
  function buildAvoidMap(ctx) {
    var avoidMap = {};
    ctx = ctx || getUserHealthCtx();
    function add(list, source) {
      (list || []).forEach(function(food) {
        food = String(food);
        if (!avoidMap[food]) avoidMap[food] = [];
        if (avoidMap[food].indexOf(source) < 0) avoidMap[food].push(source);
      });
    }
    if (ctx.conditions.length > 0 && window.CHRONIC_DISEASES) {
      ctx.conditions.forEach(function(condId) {
        var dis = null;
        for (var i = 0; i < window.CHRONIC_DISEASES.length; i++) {
          if (window.CHRONIC_DISEASES[i].id === condId) { dis = window.CHRONIC_DISEASES[i]; break; }
        }
        if (dis && dis.avoid) add(dis.avoid, dis.name);
      });
    }
    getConstitutionObjs(ctx.constitution).forEach(function(c) {
      if (c.avoidFood) add(c.avoidFood, c.name + '体质');
    });
    return avoidMap;
  }
  """

d = d[:_start] + NEW_SECTION + '\n' + d[_end:]

# ---------- G: replace filterRecipesByHealth function body ----------
_s = d.index('function filterRecipesByHealth(recipes) {')
_seg = d[_s:]
_close = _seg.index('    return { safe: safe, blocked: blocked };') + len('    return { safe: safe, blocked: blocked };')
NEW_FILTER = """function filterRecipesByHealth(recipes) {
    var ctx = getUserHealthCtx();
    var avoidMap = buildAvoidMap(ctx);
    var keys = Object.keys(avoidMap);
    if (keys.length === 0) return { safe: recipes, blocked: [] };
    var safe = [], blocked = [];
    recipes.forEach(function(r) {
      var hasConflict = false;
      var conflictFoods = [];
      var recipeText = r.name + ' ' + (r.ingredients || r.ing || '');
      keys.forEach(function(avoidFood) {
        if (recipeText.indexOf(avoidFood) >= 0 || avoidFood.indexOf(getRecipeKeyword(r)) >= 0) {
          hasConflict = true;
          conflictFoods.push(avoidFood);
        }
      });
      if (hasConflict) {
        blocked.push({ recipe: r, conflicts: conflictFoods, reason: avoidMap[conflictFoods[0]] || [] });
      } else {
        safe.push(r);
      }
    });
    return { safe: safe, blocked: blocked };"""
d = d[:_s] + NEW_FILTER + _seg[_close:]

# ---------- H: replace renderTermDetail recipe filter block ----------
_s = d.index('        var profile = getHealthProfile();')
_seg = d[_s:]
_close = _seg.find('\n        }\n')
NEW_BLOCK = """        var _ctx = getUserHealthCtx();
        var _avoidMap = buildAvoidMap(_ctx);
        var _avoidKeys = Object.keys(_avoidMap);
        if (_avoidKeys.length > 0) {
          var recipeText = recipe.name + ' ' + (recipe.ingredients || recipe.ing || '');
          _avoidKeys.forEach(function(food) {
            if (recipeText.indexOf(food) >= 0) {
              isBlocked = true;
              blockReasons.push(food + '（' + (_avoidMap[food] || ['健康档案']).join('/') + '忌食）');
            }
          });
        }"""
d = d[:_s] + NEW_BLOCK + '\n' + _seg[_close + len('\n        }\n'):]

# ---------- I: remove remaining 'var profile = getHealthProfile();' (solarTodayRecipes) ----------
d = d.replace('    var profile = getHealthProfile();\n', '')

io.open(path, 'w', encoding='utf-8').write(d)
print('done, old_len=%d new_len=%d' % (len(orig), len(d)))
print('remaining getHealthProfile refs:', d.count('getHealthProfile'))