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
      tips: '早卧早起，收敛神气，防秋燥' },
    { name: '处暑', date: '8月23日', season: 'autumn', element: '金',
      summary: '暑气至此而止', principle: '养阴清热，益胃生津',
      foods: ['百合','莲子','银耳','梨','蜂蜜','鸭子'],
      忌: ['辛辣','生姜过量'],
      tips: '秋乏多睡，适量运动，防秋燥伤肺' },
    { name: '白露', date: '9月7日', season: 'autumn', element: '金',
      summary: '露凝而白，天气转凉', principle: '润肺生津，健脾益肾',
      foods: ['梨','龙眼','百合','银耳','核桃','红薯'],
      忌: ['寒凉','露脐'],
      tips: '添衣防凉，滋阴润肺，不露脐' },
    { name: '秋分', date: '9月23日', season: 'autumn', element: '金',
      summary: '秋色平分，阴阳相半', principle: '滋阴润燥，平衡阴阳',
      foods: ['桂花','栗子','芋头','莲藕','百合','鸭肉'],
      忌: ['辛散','寒凉'],
      tips: '早睡早起，调畅情志，防悲秋' },
    { name: '寒露', date: '10月8日', season: 'autumn', element: '金',
      summary: '露气寒冷，将凝结也', principle: '润肺滋阴，温养脾胃',
      foods: ['芝麻','糯米','菊花','山楂','柿子','萝卜'],
      忌: ['寒凉','生冷'],
      tips: '足部保暖，早卧早起，防感冒' },
    { name: '霜降', date: '10月23日', season: 'autumn', element: '土',
      summary: '气肃而霜降，阴始凝也', principle: '平补肝肾，润燥养胃',
      foods: ['柿子','栗子','牛肉','羊肉','萝卜','山药'],
      忌: ['寒凉瓜果'],
      tips: '注意保暖，补益脾胃，迎冬准备' },
    { name: '立冬', date: '11月7日', season: 'winter', element: '水',
      summary: '冬季始立，万物收藏', principle: '滋阴潜阳，温补肝肾',
      foods: ['羊肉','牛肉','核桃','黑芝麻','栗子','萝卜'],
      忌: ['寒凉','生冷'],
      tips: '早卧晚起，必待日光，防寒保暖' },
    { name: '小雪', date: '11月22日', season: 'winter', element: '水',
      summary: '天渐寒冷，雪花初现', principle: '温补心肾，益脾养肝',
      foods: ['羊肉','牛肉','红薯','栗子','红枣','生姜'],
      忌: ['寒凉','黏腻'],
      tips: '注意头部保暖，适度进补，防抑郁' },
    { name: '大雪', date: '12月7日', season: 'winter', element: '水',
      summary: '大雪纷飞，阴气渐盛', principle: '温补助阳，补肾固本',
      foods: ['羊肉','桂圆','核桃','黑芝麻','红枣','姜茶'],
      忌: ['寒凉','冷饮'],
      tips: '早卧晚起，护好头颈，冬令进补' },
    { name: '冬至', date: '12月22日', season: 'winter', element: '水',
      summary: '阴极之至，阳气始生', principle: '温补心肾，养血安神',
      foods: ['饺子','汤圆','羊肉','桂圆','生姜','红枣'],
      忌: ['寒凉','生冷'],
      tips: '静养蓄精，少汗少泄，冬至大如年' },
    { name: '小寒', date: '1月5日', season: 'winter', element: '水',
      summary: '寒气至极，尚未大寒', principle: '温补脾肾，散寒暖身',
      foods: ['羊肉','牛肉','生姜','红糖','核桃','栗子'],
      忌: ['冰冷','寒性瓜果'],
      tips: '三九补冬，注意心脑血管保暖' },
    { name: '大寒', date: '1月20日', season: 'winter', element: '水',
      summary: '一年最冷，寒极将暖', principle: '固护阳气，滋阴温补',
      foods: ['八宝饭','羊肉','桂圆','红枣','生姜','糯米'],
      忌: ['寒凉','生冷'],
      tips: '防寒保暖迎春，进补收尾，准备过渡' }
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
      // 吸附到最近的节气 — 正确旋转方向与角度映射
      // 推导：rotateTo(i) 设置 r = -(i*15+7.5)，指针指向 i 当 (i+0.5)*15+r ≡ 0
      // 故 nearestIdx = round(r/15 - 0.5)，加48保证取模前为正
      var nearestIdx = (Math.round(currentRotation / anglePerSegment - 0.5) + 48) % 24;
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
          window.initChronicDisease('cdContainer', currentIdx);
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
