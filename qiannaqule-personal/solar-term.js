/**
 * 米界AI — 节气养生模块
 * 二十四节气转盘 · 时令食疗 · 东方养生智慧
 * 
 * 知识体系：倪海厦《人纪》、徐文兵《字里藏医》
 */

(function() {
  'use strict';

  // ==================== 年份自适应节气日期计算 ====================
  // 基准年份2026年精确天文日期 [月, 日]
  var BASE_YEAR = 2026;
  var BASE_DATES = [
    [2,4],[2,18],[3,5],[3,20],[4,5],[4,20],
    [5,5],[5,21],[6,5],[6,21],[7,7],[7,23],
    [8,7],[8,23],[9,7],[9,23],[10,8],[10,23],
    [11,7],[11,22],[12,7],[12,22],[1,5],[1,20]
  ];
  var TROPICAL_YEAR = 365.2422; // 回归年天数

  // 计算指定年份的24节气日期
  function computeTermDates(year) {
    var offset = (year - BASE_YEAR) * TROPICAL_YEAR;
    return BASE_DATES.map(function(base) {
      var baseDate = new Date(BASE_YEAR, base[0] - 1, base[1], 12, 0, 0);
      var targetTime = baseDate.getTime() + offset * 86400000;
      var d = new Date(targetTime);
      // 处理跨年边界
      if (base[0] === 1 && year > BASE_YEAR) {
        d = new Date(year, base[0] - 1, base[1] + Math.round((year - BASE_YEAR) * TROPICAL_YEAR - Math.floor((year - BASE_YEAR) * TROPICAL_YEAR / 4) * 1), 12, 0, 0);
      }
      return { month: d.getMonth() + 1, day: d.getDate() };
    });
  }

  // 获取当年节气日期（带缓存）
  var _cachedYear = 0;
  var _cachedDates = null;
  function getYearTermDates(year) {
    if (_cachedYear === year && _cachedDates) return _cachedDates;
    _cachedYear = year;
    _cachedDates = computeTermDates(year);
    return _cachedDates;
  }

  // ==================== 二十四节气数据 ====================
  var SOLAR_TERMS = [
    { name: '立春', date: '2月4日', season: 'spring', element: '木',
      summary: '阳气初生，万物复苏', principle: '升阳养肝，疏达气机',
      foods: ['豆芽','韭菜','香椿','春笋','荠菜','豌豆苗'],
     忌: ['酸辣','油腻','生冷'],
      tips: '早睡早起，散步舒展，忌动怒伤肝' },
    { name: '雨水', date: '2月18日', season: 'spring', element: '木',
      summary: '春雨润物，湿气渐生', principle: '健脾祛湿，养护脾胃',
      foods: ['山药','红枣','蜂蜜','薏米','莲子','菠菜'],
      忌: ['寒凉','甜腻'],
      tips: '春捂防寒，适量运动，预防倒春寒' },
    { name: '惊蛰', date: '3月5日', season: 'spring', element: '木',
      summary: '春雷始鸣，蛰虫惊醒', principle: '平肝息风，清热解毒',
      foods: ['梨','芹菜','荠菜','菠菜','枸杞','菊花'],
      忌: ['辛辣','烧烤'],
      tips: '起居有常，适当伸展，防春瘟' },
    { name: '春分', date: '3月20日', season: 'spring', element: '木',
      summary: '昼夜平分，阴阳平衡', principle: '调和阴阳，养血柔肝',
      foods: ['香椿','春笋','枸杞','百合','银耳','草莓'],
      忌: ['大寒大热'],
      tips: '运动适中，情志舒畅，防过敏' },
    { name: '清明', date: '4月5日', season: 'spring', element: '木',
      summary: '天清气朗，万物皆明', principle: '养肝补肾，祛湿健脾',
      foods: ['青团','艾草','马兰头','菊花脑','枸杞芽','嫩柳芽'],
      忌: ['辛辣燥热'],
      tips: '踏青赏春，调畅情志，防花粉过敏' },
    { name: '谷雨', date: '4月20日', season: 'spring', element: '土',
      summary: '雨生百谷，春将尽矣', principle: '健脾利湿，益气养血',
      foods: ['谷雨茶','香椿','薏仁','冬瓜','赤小豆','茯苓'],
      忌: ['冰冷','甜腻'],
      tips: '预防春困，适度锻炼，注意防潮' },
    { name: '立夏', date: '5月5日', season: 'summer', element: '火',
      summary: '夏季开始，万物繁茂', principle: '养心安神，清热消暑',
      foods: ['蚕豆','苋菜','黄瓜','樱桃','莲子心','绿豆'],
      忌: ['冰饮','辛辣'],
      tips: '晚睡早起，午间小憩，忌大汗伤阳' },
    { name: '小满', date: '5月21日', season: 'summer', element: '火',
      summary: '麦类渐满，未至全熟', principle: '清热利湿，健脾和胃',
      foods: ['苦瓜','黄瓜','樱桃','番茄','冬瓜','绿豆'],
      忌: ['辛辣','烧烤'],
      tips: '穿着透气，饮食清淡，防皮肤病' },
    { name: '芒种', date: '6月5日', season: 'summer', element: '火',
      summary: '有芒之种当播，湿热交蒸', principle: '清暑化湿，养心健脾',
      foods: ['杨梅','青梅','西瓜','荷叶','薏米','鸭肉'],
      忌: ['油腻','生冷'],
      tips: '勤换衣物，防暑降温，适当出汗排湿' },
    { name: '夏至', date: '6月21日', season: 'summer', element: '火',
      summary: '日最长，阳极阴生', principle: '养心安神，清补消暑',
      foods: ['面条','苦瓜','绿豆','西瓜翠衣','荷叶','莲子'],
      忌: ['大寒','冰镇'],
      tips: '避暑防晒，静心养神，冬病夏治好时机' },
    { name: '小暑', date: '7月7日', season: 'summer', element: '火',
      summary: '暑气渐盛，未至极热', principle: '消暑清热，健脾化湿',
      foods: ['绿豆汤','荷叶粥','苦瓜','丝瓜','冬瓜','酸梅汤'],
      忌: ['冰饮','烧烤'],
      tips: '少户外活动，多食清淡，午后避暑' },
    { name: '大暑', date: '7月23日', season: 'summer', element: '火',
      summary: '一年最热，湿热交蒸', principle: '清暑祛湿，养气护心',
      foods: ['冬瓜','苦瓜','丝瓜','黄瓜','老鸭','薏米','绿豆','百合','莲子','秋葵'],
      忌: ['冰镇生冷','辛辣烧烤','甜腻厚味','过量苦寒'],
      tips: '晚睡不超23点，午憩15-30分，运动以微汗为度',
      // 大暑为完整样板，含详细食谱
      recipes: [
        { name: '冬瓜薏米老鸭汤', method: '煲汤',
          desc: '鸭肉滋阴补虚，冬瓜带皮利水祛湿，薏米健脾渗湿。清补兼顾，祛湿不伤正。',
          ingredients: '老鸭半只(500g)、冬瓜带皮300g、炒薏米30g、茯苓15g、生姜3片、陈皮1小块、红枣3颗',
          steps: '鸭肉焯水去沫→薏米泡30分钟→鸭肉与干货入砂锅加清水→大火烧开转小火炖1.5小时→加冬瓜块炖30分钟→调味',
          nutrition: { kcal: 280, protein: 28, fat: 15, carb: 12, fiber: 3, calcium: 45, iron: 3.2, vitC: 18 }
        },
        { name: '苦瓜丝瓜炒鲜百合', method: '清炒',
          desc: '苦瓜清心泻火，丝瓜清热利水，百合养阴安神。清暑不峻烈，祛湿不伤阴。',
          ingredients: '苦瓜1根(200g)、嫩丝瓜1条(150g)、鲜百合10g、蒜末适量',
          steps: '苦瓜去瓤切片盐腌5分钟→丝瓜去皮切块→热油爆香蒜末→先炒苦瓜1分钟→加丝瓜炒2分钟→放百合翻炒30秒→调味出锅',
          nutrition: { kcal: 85, protein: 3, fat: 4, carb: 12, fiber: 4, calcium: 35, iron: 1.5, vitC: 45 }
        },
        { name: '凉拌秋葵木耳', method: '凉拌',
          desc: '秋葵健脾润肠补肾，黑木耳凉血润燥活血。少油清爽，适合湿热天气开胃。',
          ingredients: '秋葵200g、干黑木耳15g、蒜末2瓣、生抽1汤匙、香油少许、米醋半汤匙',
          steps: '秋葵整根沸水焯2分钟→过凉水切段→木耳泡发焯2分钟→调酱汁(蒜末+生抽+香油+米醋)→摆盘淋酱拌匀',
          nutrition: { kcal: 65, protein: 3, fat: 3, carb: 9, fiber: 5, calcium: 95, iron: 2.8, vitC: 22 }
        },
        { name: '清蒸鲈鱼配姜丝', method: '蒸煮',
          desc: '鲈鱼高蛋白低脂肪好吸收，补体力不生湿热；生姜温中散寒醒脾，中和鱼性凉。',
          ingredients: '鲈鱼1条(400g)、姜丝15g、葱丝适量、蒸鱼豉油2汤匙、料酒1汤匙',
          steps: '鲈鱼处理干净划刀抹料酒腌10分钟→鱼身垫姜片架空→水开大火蒸8分钟→倒掉汤汁去腥→铺姜丝葱丝淋豉油→热油浇上激香',
          nutrition: { kcal: 195, protein: 32, fat: 7, carb: 3, fiber: 0, calcium: 55, iron: 1.8, vitC: 5 }
        },
        { name: '绿豆百合莲子粥', method: '粥饮',
          desc: '绿豆清热解暑，百合润肺清热，莲子养心安神健脾。清心安神，适合心烦失眠。',
          ingredients: '绿豆50g、干百合20g、干莲子30g、粳米80g、冰糖适量(可不加)',
          steps: '绿豆泡2小时、莲子去芯泡2小时、百合泡30分钟→粳米与绿豆莲子入锅加水→大火煮沸转小火熬30分钟→加百合煮10分钟→温热食用(不冰镇)',
          nutrition: { kcal: 210, protein: 8, fat: 1, carb: 42, fiber: 6, calcium: 30, iron: 2.5, vitC: 3 }
        }
      ],
      tea: [
        { name: '荷叶麦冬茯苓饮', formula: '干荷叶6g、麦冬6g、茯苓6g、乌梅1颗', effect: '清暑养阴健脾' },
        { name: '姜枣茶', formula: '生姜3-5片带皮、红枣3枚、红糖少许', effect: '温中散寒升脾阳(上午9点前饮)' },
        { name: '古法酸梅汤', formula: '乌梅50g、山楂30g、陈皮15g、炙甘草10g', effect: '生津止渴收敛心气(温饮)' },
        { name: '陈皮绿豆汤', formula: '绿豆+陈皮1小块', effect: '清火配陈皮护胃(不冰镇)' }
      ]
    },
    { name: '立秋', date: '8月7日', season: 'autumn', element: '金',
      summary: '秋季始立，暑去凉来', principle: '滋阴润燥，养肺生津',
      foods: ['百合','银耳','梨','蜂蜜','莲藕','山药'],
      忌: ['辛辣','燥热'],
      tips: '早卧早起，收敛神气，防秋燥' ,
      recipes: [
        { name: '百合莲子山药粥', method: '粥饮',
          desc: '百合润肺养阴，莲子健脾安神，山药补肺脾肾三脏，立秋时节清补兼施，既润肺燥又养脾胃。',
          ingredients: '鲜百合15g、莲子15g（去芯）、山药200g、粳米50g、小米30g、冰糖适量',
          steps: '百合莲子提前浸泡30分钟→粳米小米洗净→锅中加清水放入粳米小米莲子大火煮沸转小火煮20分钟→加入百合山药块继续煮15-20分钟→加少许冰糖调味',
          nutrition: { kcal: 468.3, protein: 9, fat: 0.9, carb: 105.5, fiber: 8.9, calcium: 72.4, iron: 3.8, vitC: 34.2 } },
        { name: '沙参玉竹水鸭汤', method: '煲汤',
          desc: '水鸭滋阴补虚，沙参玉竹润肺生津，搭配生姜陈皮中和寒性，立秋清补不滋腻，适合气阴两虚之人。',
          ingredients: '玉竹20g、沙参20g、水鸭半只（约400g）、陈皮1瓣、生姜3片、盐适量',
          steps: '陈皮洗净泡5分钟→水鸭洗净切块焯水后生姜爆炒去水分→玉竹沙参水鸭生姜陈皮放入锅内倒入开水→大火烧开后改小火煲1.5小时→加盐调味',
          nutrition: { kcal: 1623.2, protein: 46.2, fat: 157.5, carb: 1.6, fiber: 0.2, calcium: 45.4, iron: 9.7, vitC: 11.6 } },
        { name: '银耳雪梨百合羹', method: '甜羹',
          desc: '银耳滋阴润燥，雪梨清热润肺，百合清心安神，三物合用为立秋温燥时节的「润燥神仙水」，润肺止咳又养心。',
          ingredients: '干银耳10g、雪梨1个（约200g）、鲜百合30g、枸杞5g、冰糖适量',
          steps: '银耳提前冷水浸泡1小时撕小碎片→雪梨去核切块百合洗净→银耳冷水下锅大火煮沸转小火炖30分钟至胶质析出→放入梨块百合继续炖15分钟→关火前5分钟加枸杞冰糖调味',
          nutrition: { kcal: 131.4, protein: 1.4, fat: 0.3, carb: 34.4, fiber: 6.9, calcium: 27.5, iron: 0.7, vitC: 11 } },
        { name: '莲藕炒木耳', method: '清炒',
          desc: '莲藕清热生津、凉血散瘀，木耳润肺养胃、清理肠道，立秋食用既清暑热余邪，又润秋燥伤津。',
          ingredients: '莲藕300g、干木耳10g（泡发约100g）、青椒30g、生姜3g、盐适量',
          steps: '木耳提前泡发撕小朵→莲藕去皮切薄片清水浸泡防氧化→藕片木耳分别焯水1分钟捞出→热锅凉油下姜丝爆香放入藕片翻炒1分钟→加入木耳青椒继续翻炒2分钟→加盐调味淋少许水淀粉勾芡',
          nutrition: { kcal: 224.4, protein: 7.9, fat: 0.3, carb: 52.2, fiber: 14.8, calcium: 135.5, iron: 3.5, vitC: 132.1 } }
      ],
      tea: [
        { name: '沙参玉竹饮', formula: '南沙参5g、麦冬5g、玉竹5g、冰糖适量', effect: '滋阴润肺，养护肺津，缓解咽干口燥、干咳少痰等秋燥初起症状' },
        { name: '荷叶山楂茶', formula: '干荷叶3g、山楂5g、陈皮2g', effect: '清暑祛湿、消食化积，适合立秋仍处三伏天、暑湿未消、食欲不佳者饮用' },
        { name: '百合雪梨饮', formula: '干百合10g、雪梨片20g、冰糖适量', effect: '润肺止咳、生津清热，立秋温燥时节最温和的润燥茶饮，老少皆宜' }
      ]
    },
    { name: '处暑', date: '8月23日', season: 'autumn', element: '金',
      summary: '暑气至此而止', principle: '养阴清热，益胃生津',
      foods: ['百合','莲子','银耳','梨','蜂蜜','鸭子'],
      忌: ['辛辣','生姜过量'],
      tips: '秋乏多睡，适量运动，防秋燥伤肺' ,
      recipes: [
        { name: '山药薏米芡实粥', method: '粥饮',
          desc: '山药健脾补肺，薏米祛湿利水，芡实固肾涩精，三味合用为经典「三米粥」，处暑时节培土生金、健脾养肺。',
          ingredients: '山药200g、薏米30g、芡实20g、粳米50g、红枣5颗',
          steps: '薏米芡实提前浸泡2小时→粳米淘洗干净→山药去皮切块红枣去核→锅中加适量水放入薏米芡实粳米大火煮沸转小火煮30分钟→加入山药红枣继续煮20分钟至粥体黏稠→可根据口味加少许冰糖调味',
          nutrition: { kcal: 502.8, protein: 8.1, fat: 0.7, carb: 117.6, fiber: 10.7, calcium: 66.9, iron: 4.8, vitC: 99.5 } },
        { name: '百合银耳雪梨羹', method: '甜羹',
          desc: '百合润肺清心，银耳滋阴生津，雪梨清热润燥，处暑秋燥初盛时饮用，润肺止咳、安神解乏效果显著。',
          ingredients: '干银耳10g、干百合15g、雪梨1个（约200g）、冰糖适量',
          steps: '银耳百合分别冷水泡发30分钟银耳撕小朵→雪梨去核切小块→银耳冷水入锅大火煮开转小火熬30分钟至出胶→加入百合雪梨继续煮15分钟→加冰糖调味',
          nutrition: { kcal: 114, protein: 0.7, fat: 0.3, carb: 30.5, fiber: 6.2, calcium: 18, iron: 0.4, vitC: 8.6 } },
        { name: '清蒸鲈鱼', method: '蒸煮',
          desc: '鲈鱼健脾益气、补肝肾，清蒸最能保持鲜味和营养，处暑食用清而不寒、补而不燥，适合脾胃虚弱者。',
          ingredients: '鲈鱼1条（约400g）、生姜5g、葱10g、蒸鱼豉油15ml、盐少许',
          steps: '鲈鱼处理干净两面划几刀用少许盐抹匀腌制10分钟→鱼身铺姜片放入蒸锅水开后大火蒸8-10分钟→取出倒掉盘中蒸出的水铺上新葱丝→淋上蒸鱼豉油热油浇在葱丝上激发香味',
          nutrition: { kcal: 4, protein: 0.1, fat: 0, carb: 0.9, fiber: 0.1, calcium: 0.8, iron: 0, vitC: 0.2 } },
        { name: '蜂蜜柚子茶', method: '茶饮/冲饮',
          desc: '柚子理气化痰、润肺清肠，蜂蜜补中润燥，处暑时节饮用，既能润肺燥又可解秋乏带来的消化不良。',
          ingredients: '柚子肉200g、蜂蜜50g、冰糖30g',
          steps: '柚子肉剥出去除白膜→柚子肉放入锅中加少量清水和冰糖小火熬煮至浓稠→关火放凉至40℃以下加入蜂蜜搅拌均匀→密封冷藏每次取1-2勺用温水冲泡饮用',
          nutrition: { kcal: 152, protein: 0.1, fat: 0, carb: 41.2, fiber: 0.1, calcium: 3, iron: 0.2, vitC: 0.2 } }
      ],
      tea: [
        { name: '麦冬玉竹茶', formula: '麦冬5g、玉竹5g、甘草2g', effect: '滋阴润肺、生津止渴，处暑秋燥明显时饮用，缓解口干咽燥、干咳少痰' },
        { name: '玫瑰茉莉花茶', formula: '玫瑰花3g、茉莉花3g', effect: '行气解郁、疏肝理气，秋季肺金克肝木易情绪低落，可调畅情志、缓解秋悲' },
        { name: '薏米红豆水', formula: '薏米20g、红豆20g、陈皮3g', effect: '健脾祛湿、利水消肿，处暑时节暑湿未尽，适合仍有湿气困脾、身体困重者饮用' }
      ]
    },
    { name: '白露', date: '9月7日', season: 'autumn', element: '金',
      summary: '露凝而白，天气转凉', principle: '润肺生津，健脾益肾',
      foods: ['梨','龙眼','百合','银耳','核桃','红薯'],
      忌: ['寒凉','露脐'],
      tips: '添衣防凉，滋阴润肺，不露脐' ,
      recipes: [
        { name: '银耳杏仁羹', method: '甜羹',
          desc: '银耳滋阴润肺，南杏仁（甜杏仁）降气止咳，二者合用润燥力强，白露秋燥伤肺时食用，润肺止咳效果显著。',
          ingredients: '干银耳10g、南杏仁10g、冰糖适量',
          steps: '银耳提前泡发撕小朵杏仁捣碎→一同放入锅中加水炖煮至银耳软糯粘稠→加入冰糖溶化即可→早晚温热食用效果更佳',
          nutrition: { kcal: 0, protein: 0, fat: 0, carb: 0, fiber: 0, calcium: 0, iron: 0, vitC: 0 } },
        { name: '南杏仁山药炖鸡', method: '煲汤',
          desc: '鸡肉温中益气，南杏仁润肺止咳，山药健脾补肺，白露时节食用，补气固表又润肺防燥。',
          ingredients: '土鸡半只（约500g）、南杏仁10g、铁棍山药200g、枸杞子5g、生姜3片、盐适量',
          steps: '土鸡洗净切块焯水去血沫→山药去皮切段杏仁洗净→所有食材放入砂锅加足量清水→大火烧开转小火炖1.5小时→加盐调味',
          nutrition: { kcal: 860.6, protein: 116.5, fat: 13.5, carb: 61.3, fiber: 9.1, calcium: 69.9, iron: 3.4, vitC: 37 } },
        { name: '山药薏米粥', method: '粥饮',
          desc: '山药健脾益气、润肺固肾，薏米健脾祛湿，脾肺同补、补而不燥，白露时节适合平素脾胃虚弱、气短乏力者。',
          ingredients: '鲜山药150g、薏米30g、粳米50g、小米30g',
          steps: '薏米提前浸泡2小时粳米小米淘洗干净→山药去皮切小块→锅中加水放入薏米粳米小米大火煮沸转小火煮30分钟→加入山药块继续煮20分钟至粥体黏稠→可加盐或少许糖调味',
          nutrition: { kcal: 359.5, protein: 5.9, fat: 0.6, carb: 81.8, fiber: 6.8, calcium: 39.5, iron: 3, vitC: 25.7 } },
        { name: '沙参麦冬润燥汤', method: '煲汤',
          desc: '北沙参、麦冬、百合三味滋阴润燥药食，搭配猪瘦肉补虚，适合白露秋燥所致口燥咽干、干咳少痰、心烦失眠。',
          ingredients: '猪瘦肉250g、北沙参15g、麦冬10g、干百合15g、无花果3颗、生姜2片、盐适量',
          steps: '猪瘦肉洗净切块焯水→所有材料洗净放入炖盅加足量清水→大火煮沸后转小火慢炖1.5小时→加盐调味',
          nutrition: { kcal: 277.3, protein: 52.5, fat: 5.4, carb: 1.1, fiber: 0.1, calcium: 13.5, iron: 2.5, vitC: 0.3 } }
      ],
      tea: [
        { name: '百合金银花茶', formula: '干百合5g、金银花3g、麦冬3g', effect: '润肺利咽、清热解毒，白露时节感冒初起、咽喉干痛时饮用，温润不寒' },
        { name: '桂花乌龙茶', formula: '桂花2g、乌龙茶5g', effect: '温中散寒、理气和胃，白露转凉后饮用，暖身散寒又解秋燥引起的消化不良' },
        { name: '红枣桂圆茶', formula: '红枣3颗、桂圆5颗、枸杞5g', effect: '补气养血、安神暖身，白露天气转凉、气血不足、手脚易凉者常饮有益' }
      ]
    },
    { name: '秋分', date: '9月23日', season: 'autumn', element: '金',
      summary: '秋色平分，阴阳相半', principle: '滋阴润燥，平衡阴阳',
      foods: ['桂花','栗子','芋头','莲藕','百合','鸭肉'],
      忌: ['辛散','寒凉'],
      tips: '早睡早起，调畅情志，防悲秋' ,
      recipes: [
        { name: '枸杞核桃粥', method: '粥饮',
          desc: '枸杞滋补肝肾、益精明目，核桃补肾健脑、温肺定喘，秋分阴阳平衡期食用，平补肝肾而不燥，为冬藏打基础。',
          ingredients: '枸杞子10g、核桃仁20g、粳米60g、红枣3颗',
          steps: '粳米淘洗干净核桃掰碎→锅中加适量水放入粳米红枣大火煮沸转小火煮30分钟→加入核桃碎枸杞继续煮10分钟→可根据口味加少许冰糖调味',
          nutrition: { kcal: 440.9, protein: 9.6, fat: 13.5, carb: 72.9, fiber: 4.6, calcium: 68, iron: 4.9, vitC: 48.6 } },
        { name: '桂花糯米藕', method: '蒸煮',
          desc: '莲藕清热生津、凉血散瘀，糯米补中益气、健脾暖胃，桂花温中散寒、理气和胃，秋分时节食用温润而不燥。',
          ingredients: '莲藕1节（约400g）、糯米100g、干桂花3g、冰糖30g、红枣5颗',
          steps: '糯米提前浸泡3小时莲藕去皮洗净从一端切下2cm做盖→将泡好的糯米灌入藕孔中边灌边用筷子压实→盖上藕盖用牙签固定→锅中加足量清水放入莲藕红枣冰糖桂花→大火烧开转小火煮1.5-2小时至糯米软糯→捞出切片淋上汤汁即可食用',
          nutrition: { kcal: 745.3, protein: 18.9, fat: 1.2, carb: 170.7, fiber: 22.7, calcium: 226.9, iron: 10.4, vitC: 241.3 } },
        { name: '萝卜丝鲫鱼汤', method: '煲汤',
          desc: '鲫鱼健脾利湿，白萝卜下气消食、润肺止咳，二者搭配秋分凉燥时节食用，健脾开胃又润肺化痰。',
          ingredients: '鲫鱼1条（约300g）、白萝卜200g、生姜3片、葱1根、盐适量',
          steps: '鲫鱼处理干净两面抹少许盐腌制10分钟→白萝卜去皮切丝→热锅冷油下鲫鱼煎至两面金黄→加入足量开水姜片大火煮10分钟至汤色奶白→加入萝卜丝转小火继续煮15分钟→加盐葱花调味',
          nutrition: { kcal: 43.2, protein: 1.4, fat: 0.3, carb: 9.8, fiber: 3.4, calcium: 55.4, iron: 0.9, vitC: 44.4 } },
        { name: '芝麻糊', method: '糊羹',
          desc: '黑芝麻补肝肾、润五脏、乌须发，秋分食用润燥滑肠、滋补肝肾，为冬季收藏储备阴液。',
          ingredients: '黑芝麻50g、糯米30g、冰糖适量',
          steps: '黑芝麻小火炒香注意不要炒糊糯米小火炒至微黄→将炒好的芝麻和糯米放入破壁机加适量清水打成细浆→倒出后加冰糖小火加热搅拌至浓稠即可→早晚温热饮用',
          nutrition: { kcal: 396, protein: 11, fat: 25, carb: 35.7, fiber: 6.3, calcium: 495.9, iron: 8.6, vitC: 0 } }
      ],
      tea: [
        { name: '陈皮普洱茶', formula: '陈皮3g、普洱熟茶5g', effect: '理气健脾、燥湿化痰，秋分天气转凉、脾胃消化功能减弱时饮用，帮助消化、温而不燥' },
        { name: '蜂蜜柚子茶', formula: '柚子肉30g、蜂蜜10g', effect: '理气化痰、润肺清肠，秋分凉燥季节饮用，润肺又不伤阳，适合秋季咳嗽痰多者' },
        { name: '山楂枸杞茶', formula: '山楂干5g、枸杞子5g、菊花3朵', effect: '消食化积、滋补肝肾，秋分时节饮食渐丰，此茶助消化、清肝火、明目' }
      ]
    },
    { name: '寒露', date: '10月8日', season: 'autumn', element: '金',
      summary: '露气寒冷，将凝结也', principle: '润肺滋阴，温养脾胃',
      foods: ['芝麻','糯米','菊花','山楂','柿子','萝卜'],
      忌: ['寒凉','生冷'],
      tips: '足部保暖，早卧早起，防感冒' ,
      recipes: [
        { name: '板栗烧鸡', method: '烧菜',
          desc: '板栗健脾养胃、补肾强筋，鸡肉温中益气、补精填髓，寒露时节食用，脾肾同补、温润御寒，是深秋平补佳品。',
          ingredients: '鸡肉500g、板栗150g、生姜5g、葱10g、酱油10ml、冰糖5g、盐适量',
          steps: '鸡肉切块焯水板栗去壳去皮→锅中放少许油加冰糖炒糖色放入鸡块翻炒上色→加姜片葱段酱油炒匀→加开水没过食材大火烧开转小火炖30分钟→放入板栗继续炖20分钟至板栗软糯→大火收汁加盐调味',
          nutrition: { kcal: 940, protein: 118.9, fat: 14.8, carb: 74.5, fiber: 0.1, calcium: 52.8, iron: 4, vitC: 54.2 } },
        { name: '当归生姜羊肉汤（轻量版）', method: '煲汤',
          desc: '羊肉温补气血，当归补血活血，生姜温中散寒，寒露初寒时节少量食用，温而不燥，为冬季温补打基础。',
          ingredients: '羊肉250g、当归5g、生姜15g、红枣3颗、盐适量',
          steps: '羊肉切块焯水去血沫→生姜切片当归红枣洗净→所有食材放入砂锅加足量清水→大火烧开转小火炖1.5-2小时→加盐调味→湿热体质者减量可加白萝卜中和温性',
          nutrition: { kcal: 773.2, protein: 42.6, fat: 58.7, carb: 17.2, fiber: 1.5, calcium: 55, iron: 5, vitC: 44.3 } },
        { name: '芝麻核桃粥', method: '粥饮',
          desc: '芝麻补肾润燥、乌发明目，核桃温肺补肾，寒露时节食用，既能润肺燥又能补肾气，金水相生、秋冬并补。',
          ingredients: '黑芝麻20g、核桃仁20g、粳米60g',
          steps: '黑芝麻小火炒香核桃掰碎粳米淘洗干净→锅中加水放入粳米大火煮沸转小火煮30分钟→加入芝麻核桃碎继续煮10分钟至粥体黏稠→可加少许冰糖或盐调味',
          nutrition: { kcal: 464.4, protein: 10.8, fat: 23.3, carb: 55.4, fiber: 4.5, calcium: 231.4, iron: 6.1, vitC: 0.3 } },
        { name: '南瓜小米粥', method: '粥饮',
          desc: '南瓜健脾和胃、补中益气，小米健脾安神、养胃气，寒露时节早晚温食，暖胃养胃、温润不燥。',
          ingredients: '南瓜200g、小米50g、红枣3颗',
          steps: '南瓜去皮切小块小米淘洗干净红枣去核→锅中加适量水放入小米红枣大火煮沸转小火煮20分钟→加入南瓜块继续煮15分钟至南瓜软烂→用勺子轻轻搅拌使南瓜融入粥中→可加少许冰糖调味',
          nutrition: { kcal: 108.2, protein: 2.9, fat: 0.3, carb: 27.5, fiber: 2.2, calcium: 54.6, iron: 2.6, vitC: 61.5 } }
      ],
      tea: [
        { name: '姜枣茶', formula: '生姜3片、红枣5颗、红糖适量', effect: '温中散寒、补气养血，寒露天气转冷，晨起一杯暖身驱寒，预防风寒感冒' },
        { name: '枸杞菊花茶', formula: '枸杞子5g、菊花3朵', effect: '滋补肝肾、清肝明目，深秋燥气伤肝、用眼过度者饮用，润燥明目两相宜' },
        { name: '蜂蜜芝麻饮', formula: '黑芝麻粉10g、蜂蜜5g', effect: '润肠通便、滋养肝肾，寒露秋燥引起便秘、皮肤干燥者饮用，内调外润' }
      ]
    },
    { name: '霜降', date: '10月23日', season: 'autumn', element: '土',
      summary: '气肃而霜降，阴始凝也', principle: '平补肝肾，润燥养胃',
      foods: ['柿子','栗子','牛肉','羊肉','萝卜','山药'],
      忌: ['寒凉瓜果'],
      tips: '注意保暖，补益脾胃，迎冬准备' ,
      recipes: [
        { name: '牛肉炖萝卜', method: '炖菜',
          desc: '牛肉补脾胃、益气血、强筋骨，白萝卜下气消食、润肺化痰，一补一消，补而不滞，霜降平补最为适宜。',
          ingredients: '牛肉400g、白萝卜300g、生姜5g、葱10g、八角1个、盐适量',
          steps: '牛肉切块焯水去血沫萝卜切滚刀块→锅中放少许油下姜片葱段八角爆香→放入牛肉翻炒至表面微焦→加开水没过牛肉大火烧开转小火炖1小时→加入萝卜块继续炖30分钟至软烂→加盐调味大火收汁',
          nutrition: { kcal: 1074, protein: 70.6, fat: 80.3, carb: 13.2, fiber: 4.9, calcium: 153.8, iron: 9, vitC: 66.2 } },
        { name: '枸杞炖乌鸡', method: '煲汤',
          desc: '乌鸡滋阴清热、补肝益肾，枸杞滋补肝肾、益精明目，霜降秋末食用，平补肝肾、滋阴养血，为冬藏储备精气。',
          ingredients: '乌鸡半只（约500g）、枸杞子10g、红枣5颗、生姜3片、盐适量',
          steps: '乌鸡洗净切块焯水去血沫→将乌鸡枸杞红枣姜片放入炖盅→加足量清水隔水炖2小时→加盐调味',
          nutrition: { kcal: 726.4, protein: 115.5, fat: 13.3, carb: 31.1, fiber: 3.3, calcium: 64.3, iron: 4.2, vitC: 70.5 } },
        { name: '山药芡实莲子粥', method: '粥饮',
          desc: '山药健脾补肺、固肾益精，芡实益肾固精、健脾止泻，莲子养心安神、健脾止泻，霜降食用健脾固肾、为冬藏打底。',
          ingredients: '山药150g、芡实20g、莲子20g、粳米50g、红枣3颗',
          steps: '芡实莲子提前浸泡1小时粳米淘洗干净→山药去皮切小块红枣去核→锅中加适量水放入芡实莲子粳米红枣大火煮沸转小火煮30分钟→加入山药块继续煮20分钟至粥体黏稠→可加少许冰糖或盐调味',
          nutrition: { kcal: 482.1, protein: 9.9, fat: 1.1, carb: 109.2, fiber: 8, calcium: 84.7, iron: 4.7, vitC: 69.2 } },
        { name: '红枣蒸板栗', method: '蒸煮',
          desc: '板栗补肾强筋、健脾养胃，红枣补中益气、养血安神，霜降时节当零食食用，温补脾肾、香甜可口。',
          ingredients: '板栗200g、红枣50g、冰糖10g',
          steps: '板栗去外壳底部划十字方便去皮→红枣洗净去核→板栗红枣放入碗中撒上冰糖→蒸锅水开后放入大火蒸20分钟至板栗软糯→取出趁热食用',
          nutrition: { kcal: 588.5, protein: 10.8, fat: 2.4, carb: 134.4, fiber: 3, calcium: 67.5, iron: 5.3, vitC: 180.8 } }
      ],
      tea: [
        { name: '桂圆红枣茶', formula: '桂圆肉5g、红枣3颗、枸杞3g', effect: '补益心脾、养血安神，霜降天气转冷、气血不足、睡眠不佳者饮用，暖身又养心' },
        { name: '陈皮生姜茶', formula: '陈皮3g、生姜3片、红糖适量', effect: '温中散寒、理气和胃，霜降脾胃虚寒、脘腹冷痛、消化不良者饮用' },
        { name: '枸杞黄芪茶', formula: '枸杞子5g、黄芪5g、红枣2颗', effect: '补气养阴、益精固表，霜降时节正气不足、容易感冒者饮用，增强抵抗力' }
      ]
    },
    { name: '立冬', date: '11月7日', season: 'winter', element: '水',
      summary: '冬季始立，万物收藏', principle: '滋阴潜阳，温补肝肾',
      foods: ['羊肉','牛肉','核桃','黑芝麻','栗子','萝卜'],
      忌: ['寒凉','生冷'],
      tips: '早卧晚起，必待日光，防寒保暖' ,
      recipes: [
        { name: '黑芝麻核桃粥', method: '粥饮',
          desc: '黑芝麻补肝肾、润五脏，核桃补肾温肺，粳米养胃气，立冬晨食温补肾精、养血乌发，黑色入肾最应冬令。',
          ingredients: '黑芝麻30g、核桃仁20g、粳米60g、红枣3颗',
          steps: '黑芝麻小火炒香核桃掰碎粳米淘洗干净→锅中加适量水放入粳米红枣大火煮沸转小火煮30分钟→加入黑芝麻核桃碎继续煮10分钟至粥体黏稠→可加少许冰糖调味',
          nutrition: { kcal: 577.9, protein: 13.5, fat: 28.4, carb: 72.2, fiber: 6.8, calcium: 341.5, iron: 8.6, vitC: 43.8 } },
        { name: '羊肉萝卜汤', method: '煲汤',
          desc: '羊肉温中补虚、益气补血，白萝卜下气消食、润肺化痰，一温一清，补而不燥，是立冬温补的经典搭配。',
          ingredients: '羊肉300g、白萝卜200g、生姜5g、葱10g、花椒5粒、盐适量',
          steps: '羊肉切块焯水去血沫萝卜切滚刀块→锅中放清水放入羊肉姜片花椒大火烧开转小火炖1小时→加入萝卜块继续炖30分钟至羊肉软烂→加盐葱花调味',
          nutrition: { kcal: 886, protein: 51, fat: 70.4, carb: 9.1, fiber: 3.3, calcium: 102.8, iron: 5.5, vitC: 44.2 } },
        { name: '山药枸杞炖鸡', method: '煲汤',
          desc: '鸡肉温中益气，山药健脾补肺固肾，枸杞滋补肝肾，立冬食用脾肾同补、温和不燥，适合各类体质人群。',
          ingredients: '土鸡半只（约500g）、山药200g、枸杞子10g、红枣5颗、生姜3片、盐适量',
          steps: '土鸡洗净切块焯水去血沫→山药去皮切滚刀块→将鸡肉山药红枣姜片放入砂锅→加足量清水大火烧开转小火炖1.5小时→加入枸杞继续炖10分钟→加盐调味',
          nutrition: { kcal: 962.4, protein: 118.6, fat: 13.6, carb: 86.9, fiber: 11.5, calcium: 98.3, iron: 5.3, vitC: 104.7 } },
        { name: '黑豆瘦肉汤', method: '煲汤',
          desc: '黑豆补肾益阴、活血利水，猪瘦肉补肾养血，立冬食用以形补形、黑色入肾，温补肾气而不峻补。',
          ingredients: '黑豆50g、猪瘦肉200g、生姜3片、盐适量',
          steps: '黑豆提前浸泡4小时→猪瘦肉切块焯水→所有材料放入砂锅加足量清水→大火烧开转小火炖1.5小时→加盐调味',
          nutrition: { kcal: 395.7, protein: 52.9, fat: 5.1, carb: 32.8, fiber: 8, calcium: 72.9, iron: 4.6, vitC: 0.4 } }
      ],
      tea: [
        { name: '桂圆红枣枸杞茶', formula: '桂圆肉5g、红枣3颗、枸杞子5g', effect: '补气养血、暖身安神，立冬后天气寒冷，日常饮用温而不燥，改善手脚冰凉' },
        { name: '生姜红茶', formula: '生姜3片、红茶5g、红糖适量', effect: '温中散寒、暖胃驱寒，立冬晨起一杯，温暖脾胃、促进气血循环' },
        { name: '枸杞桑葚茶', formula: '枸杞子5g、桑葚干5g', effect: '滋补肝肾、明目乌发，冬季养肾正当时，适合肝肾阴虚、眼干发落者饮用' }
      ]
    },
    { name: '小雪', date: '11月22日', season: 'winter', element: '水',
      summary: '天渐寒冷，雪花初现', principle: '温补心肾，益脾养肝',
      foods: ['羊肉','牛肉','红薯','栗子','红枣','生姜'],
      忌: ['寒凉','黏腻'],
      tips: '注意头部保暖，适度进补，防抑郁' ,
      recipes: [
        { name: '黑豆核桃粥', method: '粥饮',
          desc: '黑豆补肾益阴、活血利水，核桃补肾健脑、温肺定喘，小雪时节黑色入肾，补肾益精、健脑安神。',
          ingredients: '黑豆30g、核桃仁20g、粳米50g、红枣3颗',
          steps: '黑豆提前浸泡4小时粳米淘洗干净→锅中加适量水放入黑豆粳米红枣大火煮沸转小火煮40分钟→加入核桃碎继续煮10分钟至粥体黏稠→可加少许冰糖或盐调味',
          nutrition: { kcal: 471.8, protein: 14, fat: 13.8, carb: 75.9, fiber: 7.8, calcium: 83.1, iron: 5.3, vitC: 43.8 } },
        { name: '当归生姜羊肉汤', method: '煲汤',
          desc: '当归补血活血、调经止痛，生姜温中散寒，羊肉温中补虚，三味合用为仲景经典方，小雪时节温补气血、散寒暖身。',
          ingredients: '羊肉300g、当归10g、生姜20g、红枣5颗、盐适量',
          steps: '羊肉切块焯水去血沫→生姜切片当归红枣洗净→所有食材放入砂锅加足量清水→大火烧开转小火炖1.5-2小时→加盐调味→湿热体质阴虚火旺者不宜多食',
          nutrition: { kcal: 946.3, protein: 51.5, fat: 70.5, carb: 25.4, fiber: 2.2, calcium: 70.1, iron: 6.3, vitC: 66.3 } },
        { name: '山药茴香燕麦粥', method: '粥饮',
          desc: '山药健脾补肾，小茴香温肾散寒、理气和胃，燕麦补虚益气，小雪时节温而不燥、散寒安神，适合中寒体弱者。',
          ingredients: '山药150g、燕麦30g、小茴香2g、粳米30g、枸杞子5g',
          steps: '燕麦粳米提前浸泡30分钟→山药去皮切小块→锅中加水放入燕麦粳米小茴香大火煮沸转小火煮30分钟→加入山药枸杞继续煮15分钟至粥体黏稠→可加盐调味',
          nutrition: { kcal: 417.6, protein: 9, fat: 2.5, carb: 90, fiber: 10.2, calcium: 59, iron: 3.7, vitC: 28.1 } },
        { name: '黑芝麻糊', method: '糊羹',
          desc: '黑芝麻补肝肾、润五脏、乌须发，是经典的冬季补肾食品，小雪时节食用，补肾精、润肠燥、安神志。',
          ingredients: '黑芝麻40g、糯米20g、冰糖适量',
          steps: '黑芝麻小火炒香糯米小火炒至微黄→将炒好的芝麻和糯米放入破壁机加适量清水打成细浆→倒出后加冰糖小火加热搅拌至浓稠→早晚温热饮用',
          nutrition: { kcal: 302.2, protein: 8.5, fat: 20, carb: 25.4, fiber: 5, calcium: 395.6, iron: 6.7, vitC: 0 } }
      ],
      tea: [
        { name: '肉桂红糖茶', formula: '肉桂粉3g、红糖适量', effect: '散寒活血、温通经脉，小雪寒气渐深时饮用，暖身驱寒、改善手脚冰凉' },
        { name: '陈皮玫瑰饮', formula: '陈皮5g、玫瑰花3g', effect: '疏肝解郁、理气和胃，小雪日照减少易情绪低落，此茶调畅情志、防冬季抑郁' },
        { name: '枸杞黄精茶', formula: '黄精5g、枸杞子5g', effect: '填精益髓、滋养肾阴，小雪时节补肾阴、益精血，适合肾阴不足、口干腰酸者' }
      ]
    },
    { name: '大雪', date: '12月7日', season: 'winter', element: '水',
      summary: '大雪纷飞，阴气渐盛', principle: '温补助阳，补肾固本',
      foods: ['羊肉','桂圆','核桃','黑芝麻','红枣','姜茶'],
      忌: ['寒凉','冷饮'],
      tips: '早卧晚起，护好头颈，冬令进补' ,
      recipes: [
        { name: '当归生姜羊肉汤', method: '煲汤',
          desc: '当归补血活血，生姜温中散寒，羊肉温补气血，大雪时节寒邪最盛，此汤为温补第一方，温而不燥、补而不滞。',
          ingredients: '羊肉500g、当归10g、生姜30g、红枣5颗、枸杞5g、盐适量',
          steps: '羊肉切块焯水去血沫→生姜切片当归红枣枸杞洗净→所有食材放入砂锅加足量清水→大火烧开转小火炖2小时→加盐调味→湿热体质阴虚火旺者减量食用',
          nutrition: { kcal: 1535.7, protein: 85.4, fat: 117.3, carb: 31, fiber: 3.1, calcium: 113.2, iron: 9.8, vitC: 69.2 } },
        { name: '栗子鸡', method: '烧菜',
          desc: '栗子健脾养胃、补肾强筋，鸡肉温中益气、补精填髓，大雪时节食用，脾肾双补、温中散寒，是冬季滋补佳品。',
          ingredients: '鸡肉500g、栗子200g、生姜5g、葱10g、酱油15ml、冰糖5g、盐适量',
          steps: '鸡肉切块焯水板栗去壳去皮→锅中放少许油加冰糖炒糖色放入鸡块翻炒上色→加姜片葱段酱油炒匀→加开水没过食材大火烧开转小火炖30分钟→放入板栗继续炖20分钟至板栗软糯→大火收汁加盐调味',
          nutrition: { kcal: 1052, protein: 121, fat: 15.3, carb: 99, fiber: 0.1, calcium: 61.8, iron: 4.7, vitC: 72.2 } },
        { name: '黑芝麻核桃黑豆粥', method: '粥饮',
          desc: '黑芝麻、黑豆、核桃三味黑色食品，入肾经，大雪时节食用最应冬令，补肾益精、乌发明目、强筋健骨。',
          ingredients: '黑芝麻20g、黑豆30g、核桃仁20g、粳米50g、红枣3颗',
          steps: '黑豆提前浸泡4小时黑芝麻炒香核桃掰碎→锅中加水放入黑豆粳米红枣大火煮沸转小火煮40分钟→加入黑芝麻核桃碎继续煮10分钟至粥体黏稠→可加少许冰糖调味',
          nutrition: { kcal: 586.4, protein: 17.5, fat: 23.7, carb: 80.6, fiber: 10.2, calcium: 278.1, iron: 8.2, vitC: 43.8 } },
        { name: '山药枸杞炖羊肉', method: '煲汤',
          desc: '羊肉温补肾阳，山药健脾补肺固肾，枸杞滋补肝肾，三者合用阳中求阴、温润不燥，大雪温补不上火。',
          ingredients: '羊肉300g、山药200g、枸杞子10g、生姜5g、红枣3颗、盐适量',
          steps: '羊肉切块焯水去血沫→山药去皮切滚刀块→将羊肉山药姜片红枣放入砂锅→加足量清水大火烧开转小火炖1.5小时→加入枸杞继续炖10分钟→加盐调味',
          nutrition: { kcal: 1177.1, protein: 55.2, fat: 70.6, carb: 78.9, fiber: 10.8, calcium: 114.4, iron: 7.5, vitC: 82.7 } }
      ],
      tea: [
        { name: '陈皮生姜茶', formula: '陈皮5g、生姜5片、红糖适量', effect: '温中散寒、理气和胃，大雪时节寒邪最盛，日常饮用暖胃驱寒、预防风寒感冒' },
        { name: '桂圆红枣生姜茶', formula: '桂圆5颗、红枣3颗、生姜3片、红糖适量', effect: '温阳散寒、补气养血，大雪天气严寒，晨起一杯暖身驱寒、改善手脚冰凉' },
        { name: '枸杞人参茶', formula: '枸杞子5g、西洋参3g（或人参1g）', effect: '补气养阴、益精明目，大雪山寒气重，体虚乏力、精神不振者适量饮用，提神补气' }
      ]
    },
    { name: '冬至', date: '12月22日', season: 'winter', element: '水',
      summary: '阴极之至，阳气始生', principle: '温补心肾，养血安神',
      foods: ['饺子','汤圆','羊肉','桂圆','生姜','红枣'],
      忌: ['寒凉','生冷'],
      tips: '静养蓄精，少汗少泄，冬至大如年' ,
      recipes: [
        { name: '韭菜鸡蛋饺子', method: '蒸煮',
          desc: '韭菜辛温通阳、温中散寒，鸡蛋滋阴养血，一阳一阴，呼应冬至阴阳交替，温阳固肾又滋阴润燥。',
          ingredients: '饺子皮20张、韭菜150g、鸡蛋2个（约100g）、虾米10g、盐适量',
          steps: '鸡蛋打散炒熟切碎韭菜洗净切碎虾米泡软→将鸡蛋韭菜虾米混合加盐香油调味成馅→取饺子皮包入馅料捏紧封口→锅中水开后下饺子煮至浮起后加两次凉水→饺子鼓起熟透即可捞出',
          nutrition: { kcal: 151.5, protein: 14.6, fat: 9.6, carb: 0.7, fiber: 0, calcium: 62.4, iron: 1.9, vitC: 0 } },
        { name: '当归生姜羊肉汤（冬至版）', method: '煲汤',
          desc: '冬至是温补最佳时机，此汤为温补气血经典方，温阳散寒、补血暖身，最适合阳虚怕冷、手脚冰凉之人。',
          ingredients: '羊肉400g、当归15g、生姜30g、红枣7颗、马蹄5个、盐适量',
          steps: '羊肉切块焯水去血沫→生姜切片当归红枣洗净马蹄去皮拍裂→所有食材放入砂锅加足量清水→大火烧开转小火炖1.5-2小时→加盐调味→马蹄可中和羊肉温燥使汤温润不燥',
          nutrition: { kcal: 1292.5, protein: 69.1, fat: 94, carb: 41.6, fiber: 3.6, calcium: 100.3, iron: 8.9, vitC: 110.3 } },
        { name: '红枣糯米粥', method: '粥饮',
          desc: '红枣补中益气、养血安神，糯米温脾暖胃，冬至阴盛阳生时食用，养血滋阴、固本培元。',
          ingredients: '红枣5颗、糯米60g、红糖适量',
          steps: '糯米淘洗干净红枣去核→锅中加水放入糯米红枣大火煮沸转小火煮40分钟至粥体黏稠→加红糖调味→晨起温热食用',
          nutrition: { kcal: 303.3, protein: 5.7, fat: 0.5, carb: 69.8, fiber: 2.6, calcium: 35.7, iron: 4.1, vitC: 65.3 } },
        { name: '山药枸杞炖鸡', method: '煲汤',
          desc: '鸡肉温补气血，山药健脾固肾，枸杞滋补肝肾，冬至食用阴阳双补、温和养正，适合体质虚弱者。',
          ingredients: '鸡肉300g、山药150g、枸杞子10g、红枣5颗、生姜3片、盐适量',
          steps: '鸡肉洗净切块焯水→山药去皮切滚刀块→所有食材放入炖盅加足量清水→隔水炖1.5-2小时→加盐调味',
          nutrition: { kcal: 663.4, protein: 72.8, fat: 8.4, carb: 72.9, fiber: 9.4, calcium: 79.8, iron: 4.2, vitC: 96.2 } }
      ],
      tea: [
        { name: '姜枣红糖茶', formula: '生姜5片、红枣5颗、红糖20g', effect: '温中散寒、补气养血，冬至数九寒天，晨起一杯驱寒暖身，预防风寒感冒' },
        { name: '桂圆红枣枸杞茶', formula: '桂圆肉5g、红枣3颗、枸杞子5g', effect: '补益心脾、养血安神，冬至后阳气渐生，此茶助阳生长、改善睡眠' },
        { name: '菟丝子枸杞茶', formula: '菟丝子5g、枸杞子5g、红枣2颗', effect: '补肾益精、养肝明目，冬季养肾正当时，适合腰膝酸软、视物模糊者饮用' }
      ]
    },
    { name: '小寒', date: '1月5日', season: 'winter', element: '水',
      summary: '寒气至极，尚未大寒', principle: '温补脾肾，散寒暖身',
      foods: ['羊肉','牛肉','生姜','红糖','核桃','栗子'],
      忌: ['冰冷','寒性瓜果'],
      tips: '三九补冬，注意心脑血管保暖' ,
      recipes: [
        { name: '花椒炖羊肉', method: '煲汤',
          desc: '羊肉温中补虚，花椒温中散寒、除湿止痛，小寒时节寒邪入骨，此汤温散之力更强，适合脘腹冷痛、关节冷痛者。',
          ingredients: '羊肉400g、花椒5g、生姜10g、白萝卜100g、盐适量',
          steps: '羊肉切块焯水去血沫萝卜切滚刀块→花椒装入调料包生姜切片→砂锅中加清水放入羊肉花椒包姜片→大火烧开转小火炖1.5小时→加入萝卜块继续炖30分钟→取出花椒包加盐调味→阴虚火旺者不宜多食',
          nutrition: { kcal: 1154, protein: 67, fat: 93.8, carb: 5.9, fiber: 1.8, calcium: 92.6, iron: 6.7, vitC: 22.5 } },
        { name: '黄芪炖牛肉', method: '煲汤',
          desc: '黄芪补气升阳、固表止汗，牛肉补脾胃、益气血、强筋骨，小寒食用益气健脾、强筋壮骨，适合气虚乏力、抵抗力弱者。',
          ingredients: '牛肉400g、黄芪15g、枸杞子10g、红枣5颗、生姜3片、盐适量',
          steps: '牛肉切块焯水去血沫→黄芪枸杞红枣洗净→所有食材放入砂锅加足量清水→大火烧开转小火炖2小时→加盐调味',
          nutrition: { kcal: 1142.4, protein: 71.7, fat: 80.2, carb: 31.1, fiber: 3.3, calcium: 111.3, iron: 10.1, vitC: 70.5 } },
        { name: '当归红枣粥', method: '粥饮',
          desc: '当归补血活血，红枣补中益气，糯米温脾暖胃，小寒三九天食用，温经散寒、养血暖身，适合血虚体寒者。',
          ingredients: '当归5g、红枣7颗、糯米60g、红糖适量',
          steps: '糯米淘洗干净红枣去核当归洗净→锅中加适量水放入糯米当归红枣→大火煮沸转小火煮40分钟至粥体黏稠→加红糖调味→晨起温热食用',
          nutrition: { kcal: 359.5, protein: 6.7, fat: 0.6, carb: 84.3, fiber: 3.8, calcium: 48.3, iron: 5.1, vitC: 108.8 } },
        { name: '山药莲子瘦肉汤', method: '煲汤',
          desc: '猪瘦肉补虚养血，山药健脾益胃，莲子养心安神、健脾止泻，小寒食用温中健脾、暖胃散寒，适合脾胃虚寒者。',
          ingredients: '猪瘦肉250g、山药150g、莲子15g、红枣5颗、生姜5片、盐适量',
          steps: '猪瘦肉切块焯水→山药去皮切块莲子去芯→所有食材放入砂锅加足量清水→大火烧开转小火炖1.5小时→加盐调味',
          nutrition: { kcal: 595.6, protein: 58.7, fat: 6.2, carb: 76, fiber: 8.2, calcium: 83.7, iron: 5.4, vitC: 91.8 } }
      ],
      tea: [
        { name: '丹参山楂茶', formula: '丹参5g、山楂干3片', effect: '活血化瘀、护心通络，小寒寒凝血瘀、心脑血管负担重，此茶辅助改善血液循环' },
        { name: '生姜花椒红糖茶', formula: '生姜5片、花椒3g、红糖20g', effect: '温中祛湿、散寒止痛，小寒寒气入骨，关节冷痛、胃寒腹痛者饮用效果佳' },
        { name: '党参红枣茶', formula: '党参5g、红枣5颗、枸杞子5g', effect: '补中益气、养血安神，小寒时节气虚乏力、精神不振者饮用，补气提神' }
      ]
    },
    { name: '大寒', date: '1月20日', season: 'winter', element: '水',
      summary: '一年最冷，寒极将暖', principle: '固护阳气，滋阴温补',
      foods: ['八宝饭','羊肉','桂圆','红枣','生姜','糯米'],
      忌: ['寒凉','生冷'],
      tips: '防寒保暖迎春，进补收尾，准备过渡' ,
      recipes: [
        { name: '八宝粥（腊八粥）', method: '粥饮',
          desc: '腊八粥汇集五谷杂粮，健脾养胃、益气补血、补肾养心，大寒时节食用，温和滋补、全面均衡，为迎春调理脾胃。',
          ingredients: '大米50g、小米30g、红豆20g、花生20g、莲子15g、红枣20g、核桃15g、桂圆10g、冰糖适量',
          steps: '红豆花生莲子提前浸泡4小时→大米小米淘洗干净红枣去核桂圆去壳核桃掰碎→锅中加足量水放入所有食材冰糖除外→大火烧开转小火熬煮1-1.5小时→期间不时搅拌防止糊底→加冰糖调味再熬5分钟',
          nutrition: { kcal: 568, protein: 18.8, fat: 20.6, carb: 81.8, fiber: 7.8, calcium: 103.5, iron: 6.2, vitC: 44.6 } },
        { name: '山药枸杞炖鸡', method: '煲汤',
          desc: '鸡肉温补气血，山药健脾益肺固肾，枸杞滋补肝肾，大寒食用温和进补、不峻不燥，为春季升发打好基础。',
          ingredients: '鸡肉300g、山药200g、枸杞子15g、红枣5枚、生姜3片、盐适量',
          steps: '鸡肉洗净切块焯水→山药去皮切滚刀块→所有食材放入砂锅加足量清水→大火烧开转小火炖1.5小时→加盐调味',
          nutrition: { kcal: 739.9, protein: 74.3, fat: 8.5, carb: 90.8, fiber: 12.1, calcium: 97.8, iron: 4.8, vitC: 107.2 } },
        { name: '小米姜枣粥', method: '粥饮',
          desc: '小米健脾和胃、安神补虚，生姜温中散寒，红枣补中益气，大寒时节早晚温食，暖胃祛湿、助阳散寒，又不滋腻碍胃。',
          ingredients: '小米60g、生姜3片（约9g）、大枣5颗（约30g）、红糖适量',
          steps: '小米淘洗干净红枣去核生姜切丝→锅中加适量水放入小米红枣姜丝→大火煮沸转小火煮30分钟至粥体黏稠→加红糖调味→晨起温食暖胃驱寒效果最佳',
          nutrition: { kcal: 91.5, protein: 1.6, fat: 0.2, carb: 23.4, fiber: 2, calcium: 20.3, iron: 1.6, vitC: 65.7 } },
        { name: '当归生姜羊肉汤（平补版）', method: '煲汤',
          desc: '大寒虽寒但已近春，此汤减少羊肉用量，加入萝卜、山药平衡温燥，温补而不助火，为过渡到春季做准备。',
          ingredients: '羊肉250g、当归5g、生姜15g、白萝卜150g、山药100g、红枣3颗、盐适量',
          steps: '羊肉切块焯水去血沫→白萝卜山药去皮切滚刀块→砂锅中加清水放入羊肉当归姜片红枣→大火烧开转小火炖1小时→加入萝卜山药继续炖30分钟→加盐调味',
          nutrition: { kcal: 918.2, protein: 45, fat: 59.1, carb: 51.2, fiber: 8, calcium: 112.5, iron: 6.1, vitC: 94.4 } }
      ],
      tea: [
        { name: '陈皮枸杞茶', formula: '陈皮3g、枸杞子5g、菊花2朵', effect: '健脾理气、滋补肝肾，大寒接近春季，此茶补而不滞、为肝气升发做准备' },
        { name: '玫瑰红枣茶', formula: '玫瑰花3g、红枣3颗', effect: '疏肝理气、养血活血，大寒过后春季将至，此茶助肝气疏泄、调畅情志' },
        { name: '生姜红枣枸杞茶', formula: '生姜3片、红枣5颗、枸杞子5g', effect: '温中散寒、补气养血，大寒仍寒，日常暖身必备，但温性已较小寒时减轻' }
      ]
    }
  ];

  // ==================== 节气颜色主题 ====================
  var SEASON_COLORS = {
    spring: { bg: '#f0fdf4', accent: '#22c55e', text: '#166534', light: '#dcfce7' },
    summer: { bg: '#fef9ee', accent: '#f59e0b', text: '#92400e', light: '#fef3c7' },
    autumn: { bg: '#fdf4ff', accent: '#a855f7', text: '#6b21a8', light: '#f3e8ff' },
    winter: { bg: '#eff6ff', accent: '#3b82f6', text: '#1e40af', light: '#dbeafe' }
  };

  // ==================== 获取当前节气 ====================
  function getCurrentTermIndex() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();

    // 动态获取当年节气日期
    var termDates = getYearTermDates(year);
    var termDatesArr = [];
    for (var j = 0; j < termDates.length; j++) {
      termDatesArr.push({ idx: j, m: termDates[j].month, d: termDates[j].day });
    }

    // 找到当前所处节气：找到第一个尚未到来的节气，前一个即为当前节气
    var currentIdx = 23; // 默认冬至（年末最后一个节气）
    for (var i = 0; i < termDatesArr.length; i++) {
      var t = termDatesArr[i];
      if (month < t.m || (month === t.m && day < t.d)) {
        currentIdx = (i === 0) ? 23 : termDatesArr[i - 1].idx;
        break;
      }
    }

    return currentIdx;
  }

  // ==================== 构建转盘SVG ====================
  function buildWheel(containerEl, currentIdx, onClickTerm) {
    var size = 320;
    var cx = size / 2, cy = size / 2, r = 140;
    var svgNS = 'http://www.w3.org/2000/svg';

    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.style.display = 'block';
    svg.style.margin = '0 auto';
    svg.style.touchAction = 'none';
    svg.style.userSelect = 'none';

    // 旋转容器
    var wheelGroup = document.createElementNS(svgNS, 'g');
    wheelGroup.setAttribute('class', 'solar-wheel-group');
    wheelGroup.style.transition = 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
    wheelGroup.style.transformOrigin = cx + 'px ' + cy + 'px';

    // 绘制24个扇区
    var anglePerSegment = 360 / 24;
    for (var i = 0; i < 24; i++) {
      var startAngle = (i * anglePerSegment - 90) * Math.PI / 180;
      var endAngle = ((i + 1) * anglePerSegment - 90) * Math.PI / 180;

      var x1 = cx + r * Math.cos(startAngle);
      var y1 = cy + r * Math.sin(startAngle);
      var x2 = cx + r * Math.cos(endAngle);
      var y2 = cy + r * Math.sin(endAngle);

      var path = document.createElementNS(svgNS, 'path');
      var d = 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 +
              ' A ' + r + ' ' + r + ' 0 0 1 ' + x2 + ' ' + y2 + ' Z';
      path.setAttribute('d', d);

      var term = SOLAR_TERMS[i];
      var colors = SEASON_COLORS[term.season];
      path.setAttribute('fill', i === currentIdx ? colors.accent : colors.light);
      path.setAttribute('stroke', '#fff');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('data-idx', i);
      path.style.cursor = 'pointer';
      path.style.transition = 'fill 0.3s';

      // 点击事件
      path.addEventListener('click', (function(idx) {
        return function() {
          rotateTo(idx);
          onClickTerm(idx);
        };
      })(i));

      // hover效果
      path.addEventListener('mouseenter', function() {
        if (parseInt(this.getAttribute('data-idx')) !== currentIdx) {
          this.setAttribute('fill', SEASON_COLORS[SOLAR_TERMS[parseInt(this.getAttribute('data-idx'))].season].accent + '44');
        }
      });
      path.addEventListener('mouseleave', function() {
        var idx = parseInt(this.getAttribute('data-idx'));
        var t = SOLAR_TERMS[idx];
        this.setAttribute('fill', idx === getCurrentTermIndex() ? SEASON_COLORS[t.season].accent : SEASON_COLORS[t.season].light);
      });

      wheelGroup.appendChild(path);

      // 文字标签
      var midAngle = ((i + 0.5) * anglePerSegment - 90) * Math.PI / 180;
      var labelR = r * 0.68;
      var lx = cx + labelR * Math.cos(midAngle);
      var ly = cy + labelR * Math.sin(midAngle);

      var text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', lx);
      text.setAttribute('y', ly);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', i === currentIdx ? 'bold' : 'normal');
      text.setAttribute('fill', i === currentIdx ? '#fff' : colors.text);
      text.setAttribute('transform', 'rotate(' + ((i + 0.5) * anglePerSegment) + ' ' + lx + ' ' + ly + ')');
      text.textContent = term.name;
      text.style.pointerEvents = 'none';
      wheelGroup.appendChild(text);
    }

    svg.appendChild(wheelGroup);

    // 中心圆
    var centerCircle = document.createElementNS(svgNS, 'circle');
    centerCircle.setAttribute('cx', cx);
    centerCircle.setAttribute('cy', cy);
    centerCircle.setAttribute('r', '32');
    centerCircle.setAttribute('fill', '#fff');
    centerCircle.setAttribute('stroke', '#e5e7eb');
    centerCircle.setAttribute('stroke-width', '2');
    svg.appendChild(centerCircle);

    // 中心文字
    var centerText = document.createElementNS(svgNS, 'text');
    centerText.setAttribute('x', cx);
    centerText.setAttribute('y', cy - 6);
    centerText.setAttribute('text-anchor', 'middle');
    centerText.setAttribute('font-size', '11');
    centerText.setAttribute('fill', '#6b7280');
    centerText.textContent = '节气';
    svg.appendChild(centerText);

    var centerText2 = document.createElementNS(svgNS, 'text');
    centerText2.setAttribute('x', cx);
    centerText2.setAttribute('y', cy + 10);
    centerText2.setAttribute('text-anchor', 'middle');
    centerText2.setAttribute('font-size', '10');
    centerText2.setAttribute('fill', '#9ca3af');
    centerText2.textContent = '养生';
    svg.appendChild(centerText2);

    // 指针（顶部三角形）
    var pointer = document.createElementNS(svgNS, 'polygon');
    pointer.setAttribute('points', (cx) + ',' + (cy - r - 8) + ' ' + (cx - 8) + ',' + (cy - r + 6) + ' ' + (cx + 8) + ',' + (cy - r + 6));
    pointer.setAttribute('fill', '#ef4444');
    pointer.setAttribute('stroke', '#fff');
    pointer.setAttribute('stroke-width', '2');
    pointer.setAttribute('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');
    svg.appendChild(pointer);

    containerEl.appendChild(svg);

    // 旋转逻辑
    var currentRotation = 0;
    function rotateTo(idx) {
      var targetAngle = -(idx * anglePerSegment + anglePerSegment / 2);
      currentRotation = targetAngle;
      wheelGroup.style.transform = 'rotate(' + targetAngle + 'deg)';
    }

    // 初始旋转到当前节气
    rotateTo(currentIdx);

    // 触摸/拖拽旋转
    var isDragging = false;
    var startAngle = 0;
    var dragStartRotation = 0;

    function getAngleFromCenter(clientX, clientY) {
      var rect = svg.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;
      return Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI;
    }

    svg.addEventListener('pointerdown', function(e) {
      isDragging = true;
      startAngle = getAngleFromCenter(e.clientX, e.clientY);
      dragStartRotation = currentRotation;
      wheelGroup.style.transition = 'none';
      svg.setPointerCapture(e.pointerId);
    });

    svg.addEventListener('pointermove', function(e) {
      if (!isDragging) return;
      var currentAngle = getAngleFromCenter(e.clientX, e.clientY);
      var delta = currentAngle - startAngle;
      currentRotation = dragStartRotation + delta;
      wheelGroup.style.transform = 'rotate(' + currentRotation + 'deg)';
    });

    svg.addEventListener('pointerup', function(e) {
      if (!isDragging) return;
      isDragging = false;
      wheelGroup.style.transition = 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)';
      // 吸附到最近的节气 — 正确公式推导：
      // rotateTo(i) 设置 r = -(i*15 + 7.5)
      // 反推：i = -r/15 - 0.5 → 取整 → nearestIdx = (-round(r/15 + 0.5) + 24) % 24
      var nearestIdx = (-Math.round(currentRotation / anglePerSegment + 0.5) + 24) % 24;
      rotateTo(nearestIdx);
      onClickTerm(nearestIdx);
    });

    return { rotateTo: rotateTo };
  }

  // ==================== 渲染节气详情 ====================
  function renderTermDetail(containerEl, idx) {
    var term = SOLAR_TERMS[idx];
    var colors = SEASON_COLORS[term.season];

    var html = '';

    // 标题区
    html += '<div class="st-detail-header" style="background:' + colors.bg + ';border-left:4px solid ' + colors.accent + '">';
    html += '<div class="st-detail-name">' + term.name + '</div>';
    html += '<div class="st-detail-date">' + term.date + ' · ' + term.element + '</div>';
    html += '<div class="st-detail-summary">' + term.summary + '</div>';
    html += '</div>';

    // 养生原则
    html += '<div class="st-section">';
    html += '<div class="st-section-title"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="' + colors.accent + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>养生原则</div>';
    html += '<div class="st-principle">' + term.principle + '</div>';
    html += '</div>';

    // 时令食材
    html += '<div class="st-section">';
    html += '<div class="st-section-title"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="' + colors.accent + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M11 20A6 6 0 015 14c0-6 6-10 6-10s6 4 6 10a6 6 0 01-6 6z"/><path d="M11 8v6"/></svg>时令食材</div>';
    html += '<div class="st-foods">';
    term.foods.forEach(function(f) {
      html += '<span class="st-food-tag" style="background:' + colors.light + ';color:' + colors.text + '">' + f + '</span>';
    });
    html += '</div>';
    if (term['忌']) {
      html += '<div class="st-avoid">忌：' + term['忌'].join('、') + '</div>';
    }
    html += '</div>';

    // 起居建议
    html += '<div class="st-section">';
    html += '<div class="st-section-title"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="' + colors.accent + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>起居建议</div>';
    html += '<div class="st-tips">' + term.tips + '</div>';
    html += '</div>';

    // 详细食谱（仅大暑有完整数据）
    if (term.recipes && term.recipes.length > 0) {
      html += '<div class="st-section">';
      html += '<div class="st-section-title"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="' + colors.accent + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><path d="M6 1v3M10 1v3M14 1v3"/></svg>推荐食谱</div>';

      term.recipes.forEach(function(recipe) {
        // 智能过滤：检查是否与用户健康档案冲突
        var isBlocked = false;
        var blockReasons = [];
        var profile = getHealthProfile();
        if (profile.conditions && profile.conditions.length > 0 && window.CHRONIC_DISEASES) {
          var recipeText = recipe.name + ' ' + (recipe.ingredients || recipe.ing || '');
          profile.conditions.forEach(function(condId) {
            for (var i = 0; i < window.CHRONIC_DISEASES.length; i++) {
              var d = window.CHRONIC_DISEASES[i];
              if (d.id === condId && d.avoid) {
                d.avoid.forEach(function(food) {
                  if (recipeText.indexOf(food) >= 0) {
                    isBlocked = true;
                    blockReasons.push(food + '（' + d.name + '忌食）');
                  }
                });
              }
            }
          });
        }
        var collected = isInCollection(recipe.name);
        html += '<div class="st-recipe-card' + (isBlocked ? ' st-recipe-blocked' : '') + '">';
        if (isBlocked) {
          html += '<div class="st-recipe-warning"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> 与您的健康档案冲突：' + blockReasons.join('、') + '</div>';
        }
        html += '<div class="st-recipe-header">';
        html += '<span class="st-recipe-name">' + recipe.name + '</span>';
        html += '<div class="st-recipe-actions">';
        html += '<button class="st-collect-btn' + (collected ? ' collected' : '') + '" data-name="' + recipe.name + '" data-ing="' + (recipe.ingredients || recipe.ing || '').replace(/"/g, '&quot;') + '" data-method="' + (recipe.steps || recipe.method || '').replace(/"/g, '&quot;') + '" data-term="' + term.name + '" title="收藏">';
        html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="' + (collected ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
        html += '</button>';
        html += '<span class="st-recipe-method" style="background:' + colors.light + ';color:' + colors.text + '">' + recipe.method + '</span>';
        html += '</div>';
        html += '</div>';
        html += '<div class="st-recipe-desc">' + recipe.desc + '</div>';
        html += '<div class="st-recipe-ingredients"><strong>食材：</strong>' + recipe.ingredients + '</div>';
        html += '<div class="st-recipe-steps"><strong>做法：</strong>' + recipe.steps + '</div>';
        if (recipe.nutrition) {
          html += '<div class="st-nutrition-bar">';
          html += '<span class="st-nutrition-item"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>' + recipe.nutrition.kcal + 'kcal</span>';
          html += '<span class="st-nutrition-item"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px"><path d="M12 2v20M2 12h20"/></svg>蛋白' + recipe.nutrition.protein + 'g</span>';
          html += '<span class="st-nutrition-item"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>脂肪' + recipe.nutrition.fat + 'g</span>';
          html += '<span class="st-nutrition-item"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"/></svg>碳水' + recipe.nutrition.carb + 'g</span>';
          html += '<span class="st-nutrition-item"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>纤维' + recipe.nutrition.fiber + 'g</span>';
          if (recipe.nutrition.calcium != null) {
            html += '<span class="st-nutrition-item"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>钙' + recipe.nutrition.calcium + 'mg</span>';
          }
          if (recipe.nutrition.iron != null) {
            html += '<span class="st-nutrition-item"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px"><path d="M6 18L18 6M6 6l12 12"/></svg>铁' + recipe.nutrition.iron + 'mg</span>';
          }
          if (recipe.nutrition.vitC != null) {
            html += '<span class="st-nutrition-item"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>维C' + recipe.nutrition.vitC + 'mg</span>';
          }
          html += '</div>';
        }
        html += '</div>';
      });

      html += '</div>';
    }

    // 养生茶饮（仅大暑有）
    if (term.tea && term.tea.length > 0) {
      html += '<div class="st-section">';
      html += '<div class="st-section-title"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="' + colors.accent + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M17 8h1a4 4 0 010 8h-1"/><path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z"/></svg>养生茶饮</div>';
      term.tea.forEach(function(t) {
        html += '<div class="st-tea-item">';
        html += '<span class="st-tea-name">' + t.name + '</span>';
        html += '<span class="st-tea-formula">' + t.formula + '</span>';
        html += '<span class="st-tea-effect">' + t.effect + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }

    // 其他节气显示"即将上线"
    if (!term.recipes || term.recipes.length === 0) {
      html += '<div class="st-coming-soon">';
      html += '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#9ca3af" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
      html += '<div>详细食谱与茶饮即将上线</div>';
      html += '</div>';
    }

    containerEl.innerHTML = html;

    // 收藏按钮事件
    containerEl.querySelectorAll('.st-collect-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var name = this.getAttribute('data-name');
        var ing = this.getAttribute('data-ing');
        var method = this.getAttribute('data-method');
        var termName = this.getAttribute('data-term');
        if (isInCollection(name)) {
          // 取消收藏
          var collection = getCollection();
          for (var ci = 0; ci < collection.length; ci++) {
            if (collection[ci].name === name) { removeFromCollection(ci); break; }
          }
          this.classList.remove('collected');
          this.querySelector('svg').setAttribute('fill', 'none');
        } else {
          addToCollection({ name: name, ingredients: ing, method: method }, termName);
          this.classList.add('collected');
          this.querySelector('svg').setAttribute('fill', 'currentColor');
        }
      });
    });
  }

  // ==================== 注入CSS样式 ====================
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '.solar-term-page { padding: 16px; max-width: 480px; margin: 0 auto; }',
      '.solar-wheel-container { text-align: center; margin-bottom: 16px; }',
      '.solar-wheel-hint { font-size: 12px; color: #9ca3af; margin-top: 8px; }',
      '.solar-wheel-hint svg { vertical-align: -2px; margin-right: 2px; }',

      '.st-detail-header { padding: 16px; border-radius: 12px; margin-bottom: 16px; }',
      '.st-detail-name { font-size: 24px; font-weight: bold; color: #1f2937; }',
      '.st-detail-date { font-size: 13px; color: #6b7280; margin-top: 2px; }',
      '.st-detail-summary { font-size: 14px; color: #4b5563; margin-top: 6px; font-style: italic; }',

      '.st-section { margin-bottom: 16px; }',
      '.st-section-title { font-size: 15px; font-weight: 600; color: #374151; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #f3f4f6; }',
      '.st-principle { font-size: 15px; color: #1f2937; font-weight: 500; padding: 8px 12px; background: #f9fafb; border-radius: 8px; }',
      '.st-foods { display: flex; flex-wrap: wrap; gap: 6px; }',
      '.st-food-tag { font-size: 13px; padding: 4px 10px; border-radius: 16px; }',
      '.st-avoid { font-size: 13px; color: #ef4444; margin-top: 6px; }',
      '.st-tips { font-size: 14px; color: #4b5563; line-height: 1.6; }',

      '.st-recipe-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 10px; }',
      '.st-recipe-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }',
      '.st-recipe-name { font-size: 15px; font-weight: 600; color: #1f2937; }',
      '.st-recipe-method { font-size: 11px; padding: 2px 8px; border-radius: 10px; }',
      '.st-recipe-desc { font-size: 13px; color: #6b7280; margin-bottom: 6px; font-style: italic; }',
      '.st-recipe-ingredients { font-size: 13px; color: #374151; margin-bottom: 4px; }',
      '.st-recipe-steps { font-size: 13px; color: #4b5563; line-height: 1.5; }',

      '.st-nutrition-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e5e7eb; }',
      '.st-nutrition-item { font-size: 12px; color: #6b7280; background: #f9fafb; padding: 2px 6px; border-radius: 4px; }',

      '.st-tea-item { display: flex; flex-direction: column; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }',
      '.st-tea-item:last-child { border-bottom: none; }',
      '.st-tea-name { font-size: 14px; font-weight: 600; color: #374151; }',
      '.st-tea-formula { font-size: 13px; color: #6b7280; }',
      '.st-tea-effect { font-size: 12px; color: #059669; margin-top: 2px; }',

      '.st-coming-soon { text-align: center; padding: 32px 16px; color: #9ca3af; font-size: 14px; }',

      // ---- Tabs ----
      '.solar-tabs { display: flex; gap: 4px; padding: 0 0 12px; overflow-x: auto; -webkit-overflow-scrolling: touch; }',
      '.solar-tab { flex-shrink: 0; display: flex; align-items: center; gap: 4px; padding: 7px 12px; border-radius: 20px; border: 1px solid #e5e7eb; background: #fff; font-size: 12px; color: #6b7280; cursor: pointer; transition: all .2s; white-space: nowrap; }',
      '.solar-tab svg { vertical-align: -2px; }',
      '.solar-tab.active { background: #1f2937; color: #fff; border-color: #1f2937; }',
      '.solar-tab:hover:not(.active) { background: #f3f4f6; }',

      // ---- Recipe collect & blocked ----
      '.st-recipe-actions { display: flex; align-items: center; gap: 6px; }',
      '.st-collect-btn { background: none; border: none; padding: 4px; cursor: pointer; color: #9ca3af; border-radius: 4px; transition: all .15s; display: flex; align-items: center; }',
      '.st-collect-btn:hover { color: #f59e0b; background: #fef3c7; }',
      '.st-collect-btn.collected { color: #f59e0b; }',
      '.st-recipe-blocked { opacity: 0.55; border-color: #fca5a5; background: #fef2f2; }',
      '.st-recipe-warning { font-size: 11px; color: #dc2626; margin-bottom: 6px; display: flex; align-items: center; gap: 3px; }',
      '.st-recipe-warning svg { vertical-align: -2px; flex-shrink: 0; }',

      // ---- Screening ----
      '.screening-wrap { padding: 20px 16px; max-width: 480px; margin: 0 auto; }',
      '.screening-header { text-align: center; margin-bottom: 20px; }',
      '.screening-icon { margin-bottom: 8px; }',
      '.screening-title { font-size: 18px; font-weight: 700; color: #1f2937; }',
      '.screening-desc { font-size: 12px; color: #6b7280; margin-top: 4px; line-height: 1.5; }',
      '.screening-section { font-size: 13px; font-weight: 600; color: #374151; margin: 16px 0 8px; }',
      '.screening-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }',
      '.screening-card { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: all .2s; background: #fff; font-size: 13px; color: #374151; }',
      '.screening-card:hover { border-color: #22c55e; background: #f0fdf4; }',
      '.screening-card.selected { border-color: #22c55e; background: #f0fdf4; color: #166534; font-weight: 600; }',
      '.screening-sym { justify-content: center; text-align: center; }',
      '.screening-actions { display: flex; gap: 10px; margin-top: 24px; }',
      '.screening-skip { flex: 1; padding: 10px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; font-size: 14px; color: #6b7280; cursor: pointer; }',
      '.screening-skip:hover { background: #f9fafb; }',
      '.screening-done { flex: 2; padding: 10px; border: none; border-radius: 10px; background: #22c55e; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }',
      '.screening-done:hover { background: #16a34a; }',

      // ---- Health Profile ----
      '.health-profile-wrap { padding: 20px 16px; max-width: 480px; margin: 0 auto; }',
      '.health-profile-title { font-size: 18px; font-weight: 700; color: #1f2937; }',
      '.health-profile-desc { font-size: 12px; color: #6b7280; margin-top: 4px; margin-bottom: 16px; }',
      '.health-conditions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }',
      '.health-cond-card { display: flex; align-items: center; gap: 6px; padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: all .2s; background: #fff; font-size: 13px; color: #374151; position: relative; }',
      '.health-cond-card:hover { border-color: #9ca3af; }',
      '.health-cond-card.active { font-weight: 600; }',
      '.health-cond-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }',
      '.health-cond-card svg { margin-left: auto; }',
      '.health-updated { font-size: 11px; color: #9ca3af; margin-top: 12px; text-align: center; }',
      '.health-save-btn { width: 100%; padding: 10px; border: none; border-radius: 10px; background: #1f2937; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 16px; transition: all .2s; }',
      '.health-save-btn:hover { background: #374151; }',

      // ---- Collection ----
      '.collection-wrap { padding: 16px; max-width: 480px; margin: 0 auto; }',
      '.collection-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }',
      '.collection-title { font-size: 16px; font-weight: 700; color: #1f2937; }',
      '.collection-count { font-size: 12px; color: #9ca3af; }',
      '.collection-empty { text-align: center; padding: 40px 16px; color: #9ca3af; }',
      '.collection-empty div { margin-top: 8px; font-size: 14px; }',
      '.collection-empty-hint { font-size: 12px !important; color: #d1d5db !important; }',
      '.collection-group-title { font-size: 12px; font-weight: 600; color: #9ca3af; margin: 12px 0 6px; padding-left: 4px; border-left: 2px solid #e5e7eb; padding-left: 8px; }',
      '.collection-recipe-card { position: relative; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 8px; }',
      '.collection-recipe-name { font-size: 14px; font-weight: 600; color: #1f2937; }',
      '.collection-recipe-ing { font-size: 12px; color: #6b7280; margin-top: 4px; }',
      '.collection-recipe-method { font-size: 12px; color: #4b5563; margin-top: 2px; }',
      '.collection-del-btn { position: absolute; top: 8px; right: 8px; background: none; border: none; color: #d1d5db; cursor: pointer; padding: 4px; border-radius: 4px; }',
      '.collection-del-btn:hover { color: #ef4444; background: #fef2f2; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ==================== 初始化 ====================
  window.initSolarTerm = function(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    injectStyles();

    // 动态更新当年节气显示日期
    var year = new Date().getFullYear();
    var termDates = getYearTermDates(year);
    for (var k = 0; k < SOLAR_TERMS.length; k++) {
      SOLAR_TERMS[k].date = termDates[k].month + '月' + termDates[k].day + '日';
    }

    var currentIdx = getCurrentTermIndex();

    // 读取健康档案
    var healthProfile = getHealthProfile();

    // 主HTML结构
    var html = '<div class="solar-term-page">';
    // Tab导航
    html += '<div class="solar-tabs">';
    html += '<button class="solar-tab active" data-view="term"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>节气养生</button>';
    html += '<button class="solar-tab" data-view="disease"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>慢病调养</button>';
    html += '<button class="solar-tab" data-view="collection"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>我的收藏</button>';
    html += '<button class="solar-tab" data-view="health"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>健康档案</button>';
    html += '</div>';
    // 内容区
    html += '<div id="solarViewContent"></div>';
    html += '</div>';

    container.innerHTML = html;

    var contentEl = document.getElementById('solarViewContent');

    // Tab切换
    container.querySelectorAll('.solar-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        container.querySelectorAll('.solar-tab').forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        switchSolarView(this.getAttribute('data-view'));
      });
    });

    // 默认渲染节气转盘视图
    function switchSolarView(view) {
      if (view === 'term') {
        var viewHtml = '<div class="solar-wheel-container" id="solarWheelBox"></div>';
        viewHtml += '<div class="solar-wheel-hint"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 15l-2 5L9 9l11 4-5 2z"/></svg>点击或拖拽转盘查看各节气养生</div>';
        viewHtml += '<div id="solarTermDetail"></div>';
        contentEl.innerHTML = viewHtml;
        var detailEl = document.getElementById('solarTermDetail');
        var wheelBox = document.getElementById('solarWheelBox');
        buildWheel(wheelBox, currentIdx, function(idx) {
          renderTermDetail(detailEl, idx);
        });
        renderTermDetail(detailEl, currentIdx);
      } else if (view === 'disease') {
        contentEl.innerHTML = '<div id="cdContainer"></div>';
        if (window.initChronicDisease) {
          window.initChronicDisease('cdContainer', currentIdx, SOLAR_TERMS[currentIdx].name);
        }
      } else if (view === 'collection') {
        contentEl.innerHTML = '<div id="collectionContainer"></div>';
        renderCollection(document.getElementById('collectionContainer'), currentIdx);
      } else if (view === 'health') {
        contentEl.innerHTML = '<div id="healthContainer"></div>';
        renderHealthProfile(document.getElementById('healthContainer'));
      }
    }

    // 首次进入检查健康筛查
    if (!healthProfile.screened) {
      setTimeout(function() {
        contentEl.innerHTML = '<div id="screeningContainer"></div>';
        renderScreening(document.getElementById('screeningContainer'), function() {
          switchSolarView('term');
          container.querySelector('.solar-tab[data-view="term"]').click();
        });
      }, 500);
    }

    // 暴露全局接口供"今天吃什么"使用
    window.solarGetCurrentTerm = function() { return currentIdx; };
    window.solarGetCurrentTermData = function() { return SOLAR_TERMS[currentIdx]; };
    window.solarGetHealthProfile = function() { return getHealthProfile(); };
    window.solarSwitchView = function(view) {
      var tab = container.querySelector('.solar-tab[data-view="' + view + '"]');
      if (tab) tab.click();
    };
  };

  // ==================== 健康档案 localStorage ====================
  function getHealthProfile() {
    try {
      var data = localStorage.getItem('mijieai_health_profile');
      return data ? JSON.parse(data) : { screened: false, conditions: [], symptoms: [], updatedAt: null };
    } catch(e) { return { screened: false, conditions: [], symptoms: [], updatedAt: null }; }
  }

  function saveHealthProfile(profile) {
    profile.updatedAt = new Date().toISOString();
    try { localStorage.setItem('mijieai_health_profile', JSON.stringify(profile)); } catch(e) {}
  }

  // ==================== 健康筛查问卷 ====================
  function renderScreening(containerEl, onComplete) {
    var conditions = [
      { id: 'hypertension', name: '高血压', icon: 'M19.5 12.572l-7.5 7.428-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572', color: '#E53E3E' },
      { id: 'diabetes', name: '糖尿病', icon: 'M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v2', color: '#D97706' },
      { id: 'hyperlipidemia', name: '高血脂', icon: 'M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z', color: '#9333EA' },
      { id: 'chd', name: '冠心病/心血管', icon: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z', color: '#DC2626' },
      { id: 'gastritis', name: '慢性胃炎', icon: 'M12 20V10M18 20V4M6 20v-4', color: '#EA580C' },
      { id: 'insomnia', name: '失眠/睡眠障碍', icon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z', color: '#4F46E5' }
    ];
    var symptoms = [
      { id: 'dizzy', name: '经常头晕头痛', tags: ['hypertension'] },
      { id: 'thirsty', name: '口干多饮多尿', tags: ['diabetes'] },
      { id: 'obese', name: '体型偏胖痰多', tags: ['hyperlipidemia'] },
      { id: 'chest', name: '胸闷心悸气短', tags: ['chd'] },
      { id: 'stomach', name: '胃胀胃痛反酸', tags: ['gastritis'] },
      { id: 'sleep', name: '入睡困难易醒', tags: ['insomnia'] }
    ];

    var selected = [];
    var symSelected = [];

    var html = '<div class="screening-wrap">';
    html += '<div class="screening-header">';
    html += '<div class="screening-icon"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>';
    html += '<div class="screening-title">健康筛查</div>';
    html += '<div class="screening-desc">选择您已知或疑似的健康状况，系统将在推荐菜谱时自动规避禁忌食材</div>';
    html += '</div>';
    html += '<div class="screening-section">已确诊疾病（可多选）</div>';
    html += '<div class="screening-grid">';
    conditions.forEach(function(c) {
      html += '<div class="screening-card" data-id="' + c.id + '">';
      html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="' + c.color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + c.icon + '"/></svg>';
      html += '<span>' + c.name + '</span>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div class="screening-section">常见症状自筛（辅助参考）</div>';
    html += '<div class="screening-grid screening-symptoms">';
    symptoms.forEach(function(s) {
      html += '<div class="screening-card screening-sym" data-id="' + s.id + '" data-tags="' + s.tags.join(',') + '">';
      html += '<span>' + s.name + '</span>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div class="screening-actions">';
    html += '<button class="screening-skip" id="screenSkip">跳过</button>';
    html += '<button class="screening-done" id="screenDone">保存并开始</button>';
    html += '</div>';
    html += '</div>';
    containerEl.innerHTML = html;

    // 疾病卡片点击
    containerEl.querySelectorAll('.screening-card:not(.screening-sym)').forEach(function(card) {
      card.addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        var idx = selected.indexOf(id);
        if (idx >= 0) { selected.splice(idx, 1); this.classList.remove('selected'); }
        else { selected.push(id); this.classList.add('selected'); }
      });
    });

    // 症状卡片点击
    containerEl.querySelectorAll('.screening-sym').forEach(function(card) {
      card.addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        var idx = symSelected.indexOf(id);
        if (idx >= 0) { symSelected.splice(idx, 1); this.classList.remove('selected'); }
        else { symSelected.push(id); this.classList.add('selected'); }
      });
    });

    // 保存
    document.getElementById('screenDone').addEventListener('click', function() {
      // 合并症状对应的疾病标签
      var allConditions = selected.slice();
      symSelected.forEach(function(sid) {
        var card = containerEl.querySelector('.screening-sym[data-id="' + sid + '"]');
        if (card) {
          card.getAttribute('data-tags').split(',').forEach(function(t) {
            if (allConditions.indexOf(t) < 0) allConditions.push(t);
          });
        }
      });
      saveHealthProfile({ screened: true, conditions: allConditions, symptoms: symSelected });
      onComplete();
    });

    // 跳过
    document.getElementById('screenSkip').addEventListener('click', function() {
      saveHealthProfile({ screened: true, conditions: [], symptoms: [] });
      onComplete();
    });
  }

  // ==================== 健康档案视图 ====================
  function renderHealthProfile(containerEl) {
    var profile = getHealthProfile();
    var conditions = [
      { id: 'hypertension', name: '高血压', color: '#E53E3E' },
      { id: 'diabetes', name: '糖尿病', color: '#D97706' },
      { id: 'hyperlipidemia', name: '高血脂', color: '#9333EA' },
      { id: 'chd', name: '冠心病/心血管', color: '#DC2626' },
      { id: 'gastritis', name: '慢性胃炎', color: '#EA580C' },
      { id: 'insomnia', name: '失眠/睡眠障碍', color: '#4F46E5' }
    ];
    var html = '<div class="health-profile-wrap">';
    html += '<div class="health-profile-title">健康档案</div>';
    html += '<div class="health-profile-desc">管理您的健康状况，菜谱将根据此档案智能过滤禁忌食材</div>';
    html += '<div class="health-conditions-grid">';
    conditions.forEach(function(c) {
      var isActive = profile.conditions.indexOf(c.id) >= 0;
      html += '<div class="health-cond-card' + (isActive ? ' active' : '') + '" data-id="' + c.id + '" style="' + (isActive ? 'border-color:' + c.color + ';background:' + c.color + '10' : '') + '">';
      html += '<div class="health-cond-dot" style="background:' + c.color + '"></div>';
      html += '<span>' + c.name + '</span>';
      if (isActive) html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="' + c.color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
      html += '</div>';
    });
    html += '</div>';
    if (profile.updatedAt) {
      html += '<div class="health-updated">上次更新：' + new Date(profile.updatedAt).toLocaleDateString('zh-CN') + '</div>';
    }
    html += '<button class="health-save-btn" id="healthSaveBtn">保存修改</button>';
    html += '</div>';
    containerEl.innerHTML = html;

    // 切换
    var currentConditions = profile.conditions.slice();
    containerEl.querySelectorAll('.health-cond-card').forEach(function(card) {
      card.addEventListener('click', function() {
        var id = this.getAttribute('data-id');
        var idx = currentConditions.indexOf(id);
        if (idx >= 0) { currentConditions.splice(idx, 1); }
        else { currentConditions.push(id); }
        this.classList.toggle('active');
      });
    });

    document.getElementById('healthSaveBtn').addEventListener('click', function() {
      saveHealthProfile({ screened: true, conditions: currentConditions, symptoms: profile.symptoms });
      this.textContent = '已保存';
      this.style.background = '#22c55e';
      setTimeout(function() { renderHealthProfile(containerEl); }, 800);
    });
  }

  // ==================== 智能过滤：根据健康档案过滤菜谱 ====================
  function filterRecipesByHealth(recipes) {
    var profile = getHealthProfile();
    if (!profile.conditions || profile.conditions.length === 0) return { safe: recipes, blocked: [] };
    // 获取所有相关疾病的禁忌食材
    var avoidMap = {};
    if (window.CHRONIC_DISEASES) {
      profile.conditions.forEach(function(condId) {
        var disease = null;
        for (var i = 0; i < window.CHRONIC_DISEASES.length; i++) {
          if (window.CHRONIC_DISEASES[i].id === condId) { disease = window.CHRONIC_DISEASES[i]; break; }
        }
        if (disease && disease.avoid) {
          disease.avoid.forEach(function(food) { avoidMap[food] = condId; });
        }
      });
    }
    var safe = [], blocked = [];
    recipes.forEach(function(r) {
      var hasConflict = false;
      var conflictFoods = [];
      // 检查食谱食材名是否包含禁忌食材关键词
      var recipeText = r.name + ' ' + (r.ingredients || r.ing || '');
      Object.keys(avoidMap).forEach(function(avoidFood) {
        if (recipeText.indexOf(avoidFood) >= 0 || avoidFood.indexOf(getRecipeKeyword(r)) >= 0) {
          hasConflict = true;
          conflictFoods.push(avoidFood);
        }
      });
      if (hasConflict) {
        blocked.push({ recipe: r, conflicts: conflictFoods });
      } else {
        safe.push(r);
      }
    });
    return { safe: safe, blocked: blocked };
  }

  function getRecipeKeyword(recipe) {
    return recipe.name || '';
  }

  // ==================== 个人菜谱收藏 localStorage ====================
  function getCollection() {
    try {
      var data = localStorage.getItem('mijieai_recipe_collection');
      return data ? JSON.parse(data) : [];
    } catch(e) { return []; }
  }

  function saveCollection(collection) {
    try { localStorage.setItem('mijieai_recipe_collection', JSON.stringify(collection)); } catch(e) {}
  }

  function addToCollection(recipe, termName) {
    var collection = getCollection();
    recipe._termName = termName;
    recipe._addedAt = new Date().toISOString();
    collection.push(recipe);
    saveCollection(collection);
  }

  function removeFromCollection(index) {
    var collection = getCollection();
    collection.splice(index, 1);
    saveCollection(collection);
  }

  function isInCollection(recipeName) {
    var collection = getCollection();
    return collection.some(function(r) { return r.name === recipeName; });
  }

  // ==================== 收藏视图渲染 ====================
  function renderCollection(containerEl, currentTermIdx) {
    var collection = getCollection();
    var html = '<div class="collection-wrap">';
    html += '<div class="collection-header">';
    html += '<div class="collection-title">我的收藏</div>';
    html += '<div class="collection-count">共 ' + collection.length + ' 道菜谱</div>';
    html += '</div>';

    if (collection.length === 0) {
      html += '<div class="collection-empty">';
      html += '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
      html += '<div>还没有收藏菜谱</div>';
      html += '<div class="collection-empty-hint">在节气养生页面浏览食谱时，点击收藏按钮即可添加</div>';
      html += '</div>';
    } else {
      // 按节气分组
      var grouped = {};
      collection.forEach(function(r, i) {
        var term = r._termName || '其他';
        if (!grouped[term]) grouped[term] = [];
        grouped[term].push({ recipe: r, index: i });
      });
      Object.keys(grouped).forEach(function(term) {
        html += '<div class="collection-group-title">' + term + '</div>';
        grouped[term].forEach(function(item) {
          var r = item.recipe;
          html += '<div class="collection-recipe-card">';
          html += '<div class="collection-recipe-name">' + r.name + '</div>';
          if (r.ingredients || r.ing) html += '<div class="collection-recipe-ing">' + (r.ingredients || r.ing) + '</div>';
          if (r.method) html += '<div class="collection-recipe-method">' + r.method + '</div>';
          html += '<button class="collection-del-btn" data-idx="' + item.index + '"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>';
          html += '</div>';
        });
      });
    }
    html += '</div>';
    containerEl.innerHTML = html;

    // 删除事件
    containerEl.querySelectorAll('.collection-del-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = parseInt(this.getAttribute('data-idx'));
        removeFromCollection(idx);
        renderCollection(containerEl, currentTermIdx);
      });
    });
  }

  // ==================== "今天吃什么"接口 ====================
  window.solarTodayRecipes = function() {
    var idx = getCurrentTermIndex();
    var term = SOLAR_TERMS[idx];
    var termName = term.name;
    var profile = getHealthProfile();

    // 构建推荐信息
    var result = {
      termName: termName,
      principle: term.principle,
      foods: term.foods,
      avoid: term['忌']
    };

    // 如果有食谱数据，进行智能过滤
    if (term.recipes && term.recipes.length > 0) {
      var filtered = filterRecipesByHealth(term.recipes);
      result.recipes = filtered.safe;
      result.blockedRecipes = filtered.blocked;
    }

    return result;
  };

})();
