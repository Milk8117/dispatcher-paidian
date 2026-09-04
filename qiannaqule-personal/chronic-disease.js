/**
 * MiRun AI — 慢性病二十四节气调养模块
 * 六大慢性病 · 顺时调养 · 日常禁忌 · 食疗方
 * 
 * 知识来源：三甲医院指南、国家卫健委食养指南
 * 声明：传统养生智慧参考，不构成医疗建议
 */

(function() {
  'use strict';

  // ==================== 六大慢性病数据 ====================
  var CHRONIC_DISEASES = [
    {
      id: 'hypertension', name: '高血压', type: '肝阳上亢/阴虚阳亢型', color: '#E53E3E',
      icon: '<path d="M19.5 12.572l-7.5 7.428-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"/><path d="M12 6v-1"/><path d="M12 18v-6"/>',
      seasons: {
        spring: '疏肝理气，防肝阳上亢。多外出踏青舒展肝气，饮食偏清淡，增绿色蔬菜与平肝之品如菊花、芹菜。坚持"春捂"，尤其头颈腰背。',
        summer: '清热解暑，益气养阴。午间小憩15-30分钟养心气稳血压，多用荷叶、莲子、冬瓜等清热利湿食材，忌冰饮直灌。',
        autumn: '滋阴润燥，收敛神气。宜食银耳、百合、梨等润燥之品，早睡早起收敛阳气，适当减少户外运动避免大汗伤阴。',
        winter: '保暖御寒，固护阳气。注意全身保暖尤其头颈部，适当温补但忌过用温燥，晨练推迟至日出后避开清晨血压高峰。'
      },
      termTips: {
        spring: ['立春：阳气始升，肝气萌动，血压最易波动，常出现头晕耳鸣','惊蛰/春分：乍暖还寒昼夜温差大，血管一舒一缩，血压大幅波动','谷雨：湿浊渐盛，肝阳夹湿上扰，头晕头重感加重'],
        summer: ['小满：湿热交蒸使气机上逆，头晕头重心慌失眠明显','夏至/大暑：暑热引动肝阳则血压升，大汗耗气伤津则血压降，双向波动'],
        autumn: ['秋分：昼夜温差加大，寒燥叠加致血管收缩血压逐步回升','寒露/霜降：气温骤降秋燥与寒邪合邪，血压从夏季偏低区间反弹'],
        winter: ['冬至：阴气最盛，血压达全年峰值，波动幅度增大20%','小寒/大寒：最冷时段，寒凝血瘀最甚，心脑血管并发症最高危']
      },
      foods: ['芹菜','菊花','山楂','黑木耳','冬瓜','海带','菠菜','洋葱','玉米须','决明子','葛根','枸杞','香蕉','燕麦','夏枯草'],
      avoid: ['高盐腌制品','动物内脏与肥肉','油炸烧烤','浓茶浓咖啡','辛辣刺激','酒精','加工肉制品','高糖甜点饮料'],
      taboos: ['忌情志过激——怒则气上，大怒直接导致血压骤升','忌熬夜伤阴——23点前入睡，让肝脏得以休养','忌晨起剧烈运动——清晨5-7点为血压峰值时段','忌擅自减停药物——春暖血压降低也不可自行停药','忌贪凉过激——不直吹空调不冲冷水澡','忌便秘用力——腹压骤增诱发心脑血管事件','忌久坐不动——坚持每周4-7次中等强度运动','忌饮食过咸过油——每日食盐控制在5克以下'],
      recipes: [
        { name: '菊花决明子茶', ing: '杭白菊10克，炒决明子15克', method: '开水冲泡，加盖焖10分钟后代茶饮', apply: '肝阳上亢型，头晕目赤烦躁易怒者' },
        { name: '芹菜粥', ing: '新鲜芹菜60克，粳米100克', method: '芹菜洗净切碎，与粳米同煮粥，早晚餐温食', apply: '肝阳上亢型，伴头晕头胀面红目赤者' },
        { name: '天麻炖鱼头', ing: '天麻10克，鳙鱼头1个约250克，生姜3片', method: '鱼头去鳃洗净，与天麻生姜同入炖盅，隔水炖1小时', apply: '肝阳上亢、风痰上扰型，伴头晕头痛耳鸣失眠者' },
        { name: '夏枯草煲瘦肉', ing: '夏枯草15克，猪瘦肉100克', method: '夏枯草纱布包好，与瘦肉同入砂锅，文火煲1小时', apply: '肝火上炎型，头痛眩晕目赤肿痛口苦咽干者' }
      ]
    },
    {
      id: 'diabetes', name: '糖尿病', type: '消渴症·上/中/下消', color: '#D97706',
      icon: '<path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v2"/><circle cx="17" cy="17" r="3"/><path d="m21 21-1.5-1.5"/>',
      seasons: {
        spring: '疏肝防燥，养肝护脾。多食甘味食物健脾，绿色蔬菜润燥养肝。多外出踏青舒畅情志，注意保暖避免大汗受寒。',
        summer: '健脾祛湿，清暑益气。适当食苦（苦瓜清热解毒），用"祛湿三宝"冬瓜薏米红豆健脾渗湿，忌冰镇瓜果与冷饮。',
        autumn: '润肺生津，滋阴润燥。宜食白色润肺之品白萝卜雪梨百合银耳，少辛增酸忌燥热辛辣，重视情志养生防秋悲。',
        winter: '温补肾阳，稳糖防变。食黑色食物黑米黑豆黑芝麻补益肾精，核桃生姜温阳散寒，晨练推迟至9点后加强血糖监测。'
      },
      termTips: {
        spring: ['立春：肝木旺于春，肝气升发太过则木火刑金灼伤肺津，加剧口干多饮','春分：阴阳平衡节点，人体气血活动剧烈，血糖波动亦大'],
        summer: ['夏至：阳极阴生，呈现典型"上热下寒"格局——口干多饮兼脚凉浮肿','大暑：暑热引动内热使血糖升，大量出汗耗气伤津易致低血糖，双向波动'],
        autumn: ['秋分：凉燥渐重，昼夜温差拉大，影响血糖稳定','寒露：秋燥与寒凉并盛，上中下三焦津液均受影响，秋季血糖最难控时段'],
        winter: ['冬至：阴气最盛肾阳封藏失职，夜尿频繁晨起空腹高血糖尤为突出','小寒/大寒：糖尿病足、心脑血管并发症风险最高，全年最危险时刻']
      },
      foods: ['苦瓜','山药','桑叶','薏苡仁','菠菜','银耳','冬瓜','赤小豆','葛根','枸杞','荞麦','燕麦','洋葱','黑木耳','芹菜'],
      avoid: ['精制糖与甜点','高GI精制碳水','油炸肥腻','辛辣刺激','冰镇生冷','酒精饮品','蜜饯果脯','动物内脏与肥肉'],
      taboos: ['忌情志暴怒抑郁——肝气郁结化火加重消渴','忌熬夜耗阴——每晚10点前上床睡够7-8小时','忌空腹剧烈运动——易诱发低血糖，应餐后1小时运动随身备糖','忌足部受伤——每日温水泡脚37-40℃10分钟保持干燥','忌暴饮暴食——少食多餐七八分饱','忌久卧久坐——坚持每日散步太极拳30分钟','忌擅自减停药物','忌过度节食偏食——保证营养均衡'],
      recipes: [
        { name: '黄芪山药粥', ing: '黄芪30克，山药60克，粳米50克', method: '黄芪煎汁去渣，山药切片与粳米同入药汁中，文火煮粥', apply: '中消脾胃虚弱气阴两虚型，口渴善饥乏力便溏者' },
        { name: '山药枸杞粥', ing: '山药10克，枸杞子10克，大米50克', method: '山药切薄片，与大米同入锅加水500毫升，武火煮沸文火煮35分钟', apply: '下消肾阴亏虚型，尿频量多腰膝酸软者' },
        { name: '苦瓜排骨汤', ing: '苦瓜200克，排骨150克，生姜3片', method: '排骨焯水，苦瓜去瓤切块，共入砂锅加水文火煮1小时调味', apply: '上中消燥热偏盛型，口干多饮多食易饥者' },
        { name: '桑叶菊花茶', ing: '桑叶10克，菊花6克', method: '开水冲泡，加盖焖10分钟后代茶饮', apply: '上消肺热津伤型，烦渴多饮口干舌燥者' }
      ]
    },
    {
      id: 'hyperlipidemia', name: '高血脂', type: '痰湿内阻型', color: '#9333EA',
      icon: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
      seasons: {
        spring: '护阳保肝，疏肝理气。多食时令蔬菜芹菜芦笋，适当用佛手菊花等疏肝清肝之品，忌过食寒凉黏滞肥腻。',
        summer: '益气清心，健脾化湿。宜食鸭肉鱼类兔肉绿豆豆腐等清补之品，长夏以清利湿热健运脾胃为主，常用橘皮薏苡仁白扁豆。',
        autumn: '滋阴润肺，润燥化痰。宜食桑椹黑芝麻乌梅百合等滋阴不腻之品，少吃辛辣煎炸油腻，晨起叩齿咽津。',
        winter: '散寒温肾，化痰祛瘀。可适当食羊肉等温性食物及枸杞黄精等补肾之品，忌生冷，加强运动促进气血流通。'
      },
      termTips: {
        spring: ['惊蛰：调理血脂黄金时机，痰湿与血瘀易生，头昏困重胸闷腹胀','春分：痰浊随气机升降波动加大，痰浊阻遏证在春夏出现频率增高'],
        summer: ['小满：湿浊渐盛，体内外湿相引脂浊更难运化，症状加重','大暑：湿热鼎盛痰浊内生更甚，但夏季血脂检测可能偏低——是血液稀释假象'],
        autumn: ['秋分：痰湿体质"湿未去而燥又来"，滋阴则助湿燥湿则伤阴，需润燥平衡','霜降：气温骤降寒凝血瘀，痰瘀互结风险增高，心脑血管秋末高发'],
        winter: ['冬至：血脂水平全年最高，LDL-C和TC水平冬季升高夏季降低','小寒/大寒：寒凝血瘀与痰浊互结，动脉粥样硬化心血管事件最高危时段']
      },
      foods: ['山楂','决明子','陈皮','荷叶','茯苓','薏苡仁','赤小豆','冬瓜','白萝卜','芹菜','黑木耳','洋葱','海带','燕麦','大豆'],
      avoid: ['动物内脏（脑肝腰子）','肥肉与荤油','油炸食品','甜腻糕点','奶油黄油','酒精','精制糖与含糖饮料','高盐腌制品'],
      taboos: ['忌过食肥甘厚味——嗜食油腻甘甜是主因，务必清淡','忌久坐不动——每周5-7次每次30分钟中等强度运动','忌过量饮酒——高甘油三酯者尤需戒酒','忌熬夜伤肝——影响肝的脂质代谢功能','忌暴饮暴食——一次大量高脂高糖血脂骤升','忌长期精神紧张——压力通过神经内分泌影响脂代谢','忌过食生冷寒凉——损伤脾阳致运化无力痰湿内生','忌只靠药物忽视生活方式'],
      recipes: [
        { name: '降脂三清茶', ing: '山楂10克，决明子8克，陈皮6克', method: '药材清洗，沸水冲泡加盖焖15分钟代茶饮，饭后温服', apply: '痰浊内阻型，体形偏胖头昏困倦胸闷腹胀者' },
        { name: '荷叶薏米粥', ing: '鲜荷叶1张，薏苡仁30克，粳米50克', method: '薏苡仁与粳米先煮粥，临熟时放入荷叶再煮5-10分钟去荷叶食粥', apply: '痰湿内阻脾虚湿盛型，身体困重大便黏腻者' },
        { name: '冬瓜海带汤', ing: '冬瓜200克，海带50克，瘦猪肉50克，生姜2片', method: '冬瓜去皮切块，海带泡发，共入锅文火煮1小时调味', apply: '痰浊内阻水湿停滞型，肥胖水肿小便不利者' },
        { name: '山楂首乌茶', ing: '山楂10克，制何首乌10克', method: '二味同入砂锅，加水煎煮20分钟取汁代茶饮', apply: '痰瘀互结肝肾不足型，血脂偏高伴头晕耳鸣者' }
      ]
    },
    {
      id: 'chd', name: '冠心病', type: '心血瘀阻型', color: '#DC2626',
      icon: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
      seasons: {
        spring: '疏肝理气，春捂护脉。坚持"春捂"重点护头颈腰背脚踝，饮食清淡低盐低脂，忌温补与辛辣油腻。',
        summer: '清心养心，防暑祛湿。暑热多汗伤心气，用带芯莲子百合清心火，午间小憩15-30分钟养心气，忌剧烈运动致大汗。',
        autumn: '滋阴润肺，活血通脉。秋燥伤津致血液黏稠度升高，多食梨银耳百合山药等柔润之品，注意早晚温差及时添衣。',
        winter: '温阳散寒，固护心阳。寒邪收引致血管收缩血压升高，注意全身保暖尤其头颈胸背足部，晨练推迟至日出后。'
      },
      termTips: {
        spring: ['惊蛰：心血管疾病春季高发窗口，乍暖还寒血管一舒一缩血压大幅波动','春分：气血波动剧烈，心绞痛发作早搏房颤增多'],
        summer: ['夏至/大暑：湿热交蒸血液黏稠度升高，频繁进出空调房寒热骤变诱发冠脉痉挛'],
        autumn: ['秋分：寒燥叠加，燥邪伤津血液黏稠度升高，寒邪收引气血运行受阻','霜降：气温骤降秋末冬初之交，是心血管事件第二个高峰（仅次于冬季）'],
        winter: ['冬至：阴气最盛阳气初生，寒邪最易乘虚而入凝滞心脉，血压波动幅度增大20%','小寒/大寒：全年最冷时段，急性心梗心源性猝死最高发期']
      },
      foods: ['山楂','丹参','黑木耳','洋葱','大蒜','燕麦','芹菜','深海鱼','核桃','杏仁','豆腐','海带','香菇','苹果','红枣'],
      avoid: ['动物内脏','肥肉与荤油','油炸食品','高盐食物','浓茶浓咖啡','酒精饮品','辛辣刺激','过饱饮食'],
      taboos: ['忌清晨剧烈运动——清晨低温+血压晨峰+血液黏稠是事件高发时段','忌情绪大起大落——怒则气上直接升高血压诱发心律失常','忌饱餐后立即活动——餐后休息1小时再活动','忌寒冷刺激——冬季注意全身保暖避免冷风直吹','忌便秘用力——腹压骤增可诱发心绞痛甚至心梗','忌擅自减停药物——需长期规范用药不可自行停','忌过度劳累与熬夜','忌久坐不动——坚持适度有氧锻炼'],
      recipes: [
        { name: '丹参山楂茶', ing: '丹参8克，山楂10克', method: '丹参山楂洗净切片，沸水冲泡加盖焖15分钟后代茶饮', apply: '心血瘀阻型，胸闷刺痛痛有定处舌紫暗者' },
        { name: '黑木耳炖豆腐', ing: '黑木耳30克泡发，嫩豆腐200克，生姜3片', method: '黑木耳撕小朵豆腐切块，共入砂锅文火炖20分钟调味', apply: '瘀血内阻痰瘀互结型，胸闷心悸血脂偏高者' },
        { name: '桃仁粥', ing: '桃仁10克去皮尖，粳米50克', method: '桃仁捣烂加水研汁去渣，与粳米同煮为稀粥', apply: '心血瘀阻型，胸部刺痛固定不移者' },
        { name: '三七红枣炖瘦肉', ing: '三七粉3克，红枣5枚去核，瘦猪肉100克', method: '瘦肉切片与红枣入炖盅隔水炖1小时，出锅前调入三七粉', apply: '气虚血瘀型，胸闷隐痛心悸气短遇劳加重者' }
      ]
    },
    {
      id: 'gastritis', name: '慢性胃炎', type: '脾胃虚寒/肝胃不和型', color: '#EA580C',
      icon: '<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/><circle cx="12" cy="7" r="3"/>',
      seasons: {
        spring: '疏肝和胃，防木克土。保持情绪舒畅避免郁怒，饮食偏甘温健脾，适当用麦芽陈皮佛手等疏肝理气之品。',
        summer: '健脾化湿，防暑湿困脾。饮食清淡易消化，用薏苡仁白扁豆赤小豆健脾化湿，忌贪凉饮冷冰饮瓜果损伤脾阳。',
        autumn: '滋阴养胃，防秋燥伤胃阴。多食银耳百合梨蜂蜜等润燥之品，少辛辣煎炸，注意腹部保暖秋夜温差大防受凉。',
        winter: '温中健脾，防寒邪犯胃。注意腹部保暖可用暖宝宝，适当温补用生姜大枣羊肉温中散寒，饮食温热忌生冷寒凉。'
      },
      termTips: {
        spring: ['立春：肝气旺盛横逆犯胃，肝胃不和型胃炎高发','清明/谷雨：情绪波动大引发"气出来的胃病"，湿浊渐盛脾虚湿困'],
        summer: ['小暑/大暑：湿热交蒸"湿困脾"效应最显著，脘腹胀满食少纳呆'],
        autumn: ['秋分：秋燥伤津胃阴亏虚，胃脘灼热口干便干','寒露/霜降：气温骤降脾胃虚寒者发作冷痛，"燥与寒并见"'],
        winter: ['冬至：阴气最盛脾胃虚寒型最高发季节','小寒/大寒：寒邪直中脾胃，中阳被遏，若腹部保暖不当最易诱发胃痛腹泻']
      },
      foods: ['山药','小米','红枣','莲子','南瓜','胡萝卜','土豆','白扁豆','芡实','茯苓','生姜','蜂蜜','猴头菇','猪肚','粳米'],
      avoid: ['生冷寒凉（冰饮冰淇淋生鱼片）','辛辣刺激（辣椒花椒芥末）','油炸油腻','过烫食物','腌制食品','浓茶咖啡','酒精饮品','过酸食物'],
      taboos: ['忌饮食不规律——定时定量是养胃基础','忌狼吞虎咽——每口咀嚼20-30次减轻胃负担','忌生冷寒凉——脾胃虚寒者需常年忌冷食冷饮','忌情绪压抑恼怒——怒伤肝横逆犯胃','忌熬夜劳倦——劳倦伤脾熬夜耗伤胃阴','忌腹部受凉——季节交替尤须护腹','忌滥用止痛药——NSAIDs直接损伤胃黏膜','忌餐后立即运动或平卧——防反流'],
      recipes: [
        { name: '山药小米粥', ing: '山药100克，小米50克，红枣3枚', method: '山药去皮切块，小米淘净，与红枣同入锅煮至软烂成粥', apply: '脾胃虚弱/虚寒型，胃脘隐痛食欲不振便溏者' },
        { name: '黄芪炖鸡', ing: '黄芪15克，鸡肉200克，生姜3片，大枣3枚', method: '鸡肉切块焯水，与黄芪生姜大枣同入砂锅慢炖2小时', apply: '脾胃虚寒气虚型，胃脘冷痛神疲乏力畏寒肢冷者' },
        { name: '南瓜薏米汤', ing: '南瓜200克，薏苡仁30克', method: '南瓜去皮切块，薏苡仁先泡30分钟，共入锅炖煮1小时', apply: '脾虚湿盛型，胃脘胀满食少纳呆身体困重者' },
        { name: '莲子山药粥', ing: '莲子肉40克去心，怀山药20克，薏苡仁20克', method: '诸物同入砂锅加水共煮，熟后加少量白糖调味', apply: '肝脾不和脾虚型，脾虚泄泻食欲不振者' }
      ]
    },
    {
      id: 'insomnia', name: '失眠', type: '心肾不交/心脾两虚型', color: '#4F46E5',
      icon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M17 4a2 2 0 1 0 2 2"/><path d="M19 2v2"/><path d="M21 4h-2"/>',
      seasons: {
        spring: '疏肝理气，稳作息。晚睡早起23点前睡6点左右起，白天多户外活动舒展阳气，饮食增绿色蔬菜芽类食物助肝气条达。',
        summer: '清心泻火，祛湿安神。午间小憩20-30分钟补心气不超30分钟，用莲子心百合绿豆清心火，忌夜卧受凉生冷过度。',
        autumn: '滋阴润肺，安神定志。早卧早起21:30-22:30睡，多食百合银耳梨蜂蜜润燥安神之品，防秋悲忧思多接触阳光。',
        winter: '藏精养肾，加深睡眠。早睡晚起必待日光21-22点睡日出后起，适当温补但忌温燥太过防虚火扰眠。'
      },
      termTips: {
        spring: ['谷雨：全年睡眠质量最差节气之一，PSQI平均得分9.53为全年最高','春分：阴阳平衡剧烈变动，睡眠节律易受干扰'],
        summer: ['夏至/大暑（三伏天）：夜间温度>28℃核心温度难下降，"热失眠"高发，日照长致褪黑素分泌延迟'],
        autumn: ['寒露：全年睡眠质量最差第二个高峰，PSQI 9.48分，与谷雨并列为两大"失眠坎"','秋分：秋燥伤阴致阴虚火旺阳不入阴，凌晨三四点早醒与肺阴不足有关'],
        winter: ['冬至：阴阳交替关键节点，肾精不足心肾不交者易失眠加重','冬季熬夜对睡眠节律破坏性比夏季更大——褪黑素被抑制程度高18%']
      },
      foods: ['百合','莲子','桂圆','红枣','小米','酸枣仁','茯苓','银耳','蜂蜜','核桃','黑芝麻','山药','桑葚','莲子心','牛奶'],
      avoid: ['浓茶（下午4点后尤忌）','浓咖啡','酒精（扰乱睡眠结构）','辛辣刺激','油炸油腻','晚餐过饱与宵夜','巧克力','过量甜食'],
      taboos: ['忌睡前刷手机——蓝光抑制褪黑素，睡前1小时关闭电子设备','忌睡前剧烈运动——应在睡前2-3小时完成运动','忌晚餐过饱宵夜——胃不和则卧不安，晚餐七分饱','忌熬夜耗阴——23点前入睡，子时觉是养阴第一要务','忌久卧伤气——睡眠过多反致神气昏沉','忌睡前思虑过度——先睡心后睡眼，可做深呼吸冥想','忌睡前情绪激动——七情扰动心神','忌过度依赖助眠药——先调整生活方式'],
      recipes: [
        { name: '百合银耳羹', ing: '干银耳15克，干百合30克，枸杞5克', method: '银耳百合冷水泡发2小时，银耳撕碎加水800毫升小火炖40分钟，加百合再煮15分钟，出锅前加枸杞焖片刻', apply: '阴虚失眠心烦多梦口干咽燥者' },
        { name: '小米红枣粥', ing: '小米100克，干莲子15克，红枣10枚去核', method: '莲子泡发1小时，小米淘净与红枣同入锅加水1000毫升，大火煮沸转小火熬30分钟', apply: '心脾两虚型失眠心悸乏力食欲不振者' },
        { name: '百合莲子龙眼饮', ing: '百合15克，莲子20克，龙眼肉10克', method: '莲子百合提前浸泡30分钟，连泡好的水入锅加龙眼肉，大火烧开转小火炖40分钟', apply: '心肾不交兼心脾两虚型，既心烦难寐又神疲乏力者' },
        { name: '蜂蜜雪梨汤', ing: '大雪梨1个约300克，枸杞10克，蜂蜜20克', method: '雪梨去核填枸杞入碗蒸30分钟至软烂，晾至60℃以下淋入蜂蜜', apply: '肺燥干咳咽喉不适影响睡眠者，秋燥季节最宜' }
      ]
    },
    {
      id: 'spleen-cold-damp', name: '脾胃虚寒·寒湿体质', type: '脾阳不足·寒湿内生', color: '#0891B2',
      icon: '<path d="M12 2a7 7 0 0 1 7 7v1a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V9a7 7 0 0 1 7-7Z"/><path d="M4 14h16"/><path d="M8 14v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7"/>',
      seasons: {
        spring: '疏肝健脾，防木克土。春气升发，肝气偏旺最易横逆犯胃，宜食甘温健脾之物（山药小米南瓜），适当用陈皮佛手疏肝理气；忌生冷寒凉遏阻脾阳，注意腹部保暖春捂。',
        summer: '温中化湿，防暑湿困脾。长夏湿邪最盛，内外湿相合脾阳最易被困，用炒薏米白扁豆茯苓赤小豆健脾渗湿，生姜红枣温中和胃；大忌冰饮冰镇瓜果，贪凉一时爽，寒湿留一冬。',
        autumn: '温脾润燥，防燥湿相搏。秋燥伤津但脾虚者多湿，需润燥不伤脾、化湿不伤阴——山药莲子芡实三健客最宜，温润不燥；忌生冷寒凉与辛辣燥烈两端，水果蒸着吃更好。',
        winter: '温补脾阳，散寒除湿。寒邪最易直中脾胃，温脾是第一要务，生姜大枣羊肉桂圆温中散寒，冬季晒太阳（尤其是晒背）补阳最快；一切生冷寒凉绝对忌口，腹部保暖护好神阙关元。'
      },
      termTips: {
        spring: ['立春/雨水：肝气升发最盛，肝木克脾土，脾胃病高发，胀闷泄泻明显','清明/谷雨：湿浊渐盛，脾虚湿困加重，身体困重大便黏腻'],
        summer: ['小满：湿气始盛，脾虚者先于常人出现困重乏力','大暑/三伏：湿热鼎盛，寒湿体外热内寒——体表怕热内里虚寒，切忌贪凉饮冷'],
        autumn: ['白露：天气转凉露凝而白，脾胃虚寒者出现冷痛腹泻，白露身不露', '寒露/霜降：寒燥叠加，脾阳不足又遇燥邪，吃凉的胃疼吃热的又干，最难将息'],
        winter: ['冬至：阴气最盛，脾阳最弱，是温阳散寒最佳时机（三九补一冬）', '小寒/大寒：寒邪最重，最易出现胃寒痛、五更泻、手脚冰凉']
      },
      foods: ['山药','小米','生姜','红枣','南瓜','茯苓','炒薏米','白扁豆','芡实','莲子','陈皮','桂圆','羊肉','糯米','红茶'],
      avoid: ['生冷寒凉（冰饮冰水果生鱼片）','寒性水果（西瓜梨香蕉火龙果）','绿茶菊花茶金银花荷叶茶','甜腻滋腻（奶茶蛋糕蜂蜜榴莲）','油炸油腻','螃蟹田螺等寒水生物','苦丁茶凉茶','冰镇食物'],
      taboos: ['忌贪凉饮冷——冰饮冰水果直接伤脾阳，寒湿体质大忌','忌空腹吃水果——尤其寒性水果，上午蒸着吃最好','忌喝茶选寒凉——绿茶菊花金银花越喝越虚，改红茶熟普陈皮茶','忌久居湿地——潮湿环境加重外湿，多晒太阳多晒背','忌久坐不动——脾主肌肉，久坐伤脾，每日运动30分钟','忌忧思过度——思伤脾，想太多直接影响消化','忌腹部受凉——季节交替尤其护好肚子，可戴护腹带','忌宵夜熬夜——宵夜加重脾胃负担，熬夜伤脾阳'],
      recipes: [
        { name: '四神汤', ing: '山药15克，茯苓15克，莲子15克，芡实15克', method: '四味洗净，与排骨或瘦肉同入砂锅，文火炖1小时，每周2-3次', apply: '脾虚湿盛，身体困重、大便黏腻、舌有齿痕者' },
        { name: '小米山药红枣粥', ing: '小米50克，山药80克，红枣3枚（去核），生姜2片', method: '山药去皮切块，小米淘净，与红枣生姜同入锅，小火熬煮30分钟至软烂', apply: '脾胃虚寒，胃脘冷痛、食欲不振、神疲乏力者' },
        { name: '陈皮茯苓茶', ing: '陈皮6克（越陈越好），茯苓10克，炒薏米15克', method: '炒薏米先煎20分钟，再入陈皮茯苓煮10分钟，取汁代茶温饮', apply: '脾虚湿盛，脘腹胀满、身体困重、舌苔白腻者' },
        { name: '姜枣桂圆茶', ing: '生姜3片，红枣5枚（去核），桂圆肉6克', method: '红枣桂圆先煮15分钟，最后加生姜煮5分钟，上午温服最佳', apply: '脾胃虚寒，畏寒肢冷、胃脘冷痛、大便溏薄者' }
      ]
    },
    {
      id: 'stroke', name: '中风', type: '气虚血瘀/风痰阻络型', color: '#8B5CF6',
      icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
      seasons: {
        spring: '疏肝息风，防肝阳化风。春季肝阳易亢、血压波动，中风患者晨起宜缓、忌猛然起身，情绪保持平和勿大怒，清淡低盐，多食芹菜菊花等平肝之品，坚持规律服药监测血压。',
        summer: '清心涤痰，防暑热生风。暑热耗气伤津，阴虚阳亢夹痰则易化风，忌大汗脱水、及时补充水分，饮食清淡少油，午后小憩15-30分钟养心神，避免高温时段外出。',
        autumn: '滋阴润燥，防燥邪化风。秋燥伤津使血液黏稠、血脉收缩，是中风易发季。宜食黑木耳银耳百合梨等润燥活血之品，晨起先饮温水再活动，注意早晚保暖与血压监测，忌燥热辛辣与情绪激动。',
        winter: '温阳散寒，防寒凝血瘀。冬季最冷时段寒凝血瘀，是中风复发高危期。注意全身保暖尤其头颈与足部，晨练推迟至日出后，忌饱餐高脂与用力排便，坚持用药与血压控制。'
      },
      termTips: {
        spring: ['立春：血压随气温回升波动，晨起勿猛然起身，防体位性波动','春分：阴阳剧烈变动、肝阳上亢者中风复发风险上升，需稳情绪控血压'],
        summer: ['小暑：湿热交蒸气机逆乱，胸闷头重者尤须防中风','大暑：暑热大汗伤津耗气、血液黏稠度升高，务必及时补水忌脱水'],
        autumn: ['秋分：秋燥寒凉叠加，燥伤津致血液黏稠、血管收缩、血压抬升，是中风秋发关键拐点','霜降：气温骤降寒凝血瘀，中老年心脑血管事件第二个高峰临近'],
        winter: ['冬至：阴气最盛、血压达全年峰值，中风复发风险最高','小寒/大寒：全年最冷、寒凝血瘀，是中风及心脑血管事件最高发时段']
      },
      foods: ['黑木耳','山楂','芹菜','洋葱','大蒜','燕麦','深海鱼','海带','核桃','绿豆','冬瓜','葛根','玉米须','猕猴桃','番茄'],
      avoid: ['动物内脏','肥肉荤油','高盐腌制品','油炸烧烤','高糖甜点饮料','浓茶浓咖啡','酒精饮品','辛辣刺激'],
      taboos: ['忌情绪激动暴怒——怒则气上、气血上冲为中风首要诱因','忌晨起猛然起身——醒后先床上活动3-5分钟再缓起','忌用力排便——腹压骤增可诱发血压骤升或血管破裂','忌大汗与脱水——血液黏稠度升高易致血栓形成','忌擅自停降压调脂药——长期规范用药是防复发基石','忌冬季晨练过早——低温使血管收缩，改至日出后','忌饱餐高脂高盐——餐后血压血脂易升高','忌久坐不动——坚持每周5次每次30分钟有氧锻炼'],
      recipes: [
        { name: '黑木耳山楂饮', ing: '干黑木耳15克泡发，山楂10克', method: '黑木耳撕小朵，与山楂同入锅加水煮20分钟，取汁代茶饮，木耳一并食用', apply: '气虚血瘀型，血脂偏高血液黏稠、易疲劳者' },
        { name: '葛根茶', ing: '葛根15克', method: '葛根洗净切片，沸水冲泡加盖焖15分钟后代茶饮', apply: '肝阳上亢、气血瘀滞型，头晕颈项强痛者' },
        { name: '芹菜炖豆腐', ing: '鲜芹菜100克，嫩豆腐200克', method: '芹菜连根洗净切段，豆腐切块，同入锅加清水文火炖20分钟调味食用', apply: '肝阳上亢型，头晕头胀、面红目赤、血压偏高者' },
        { name: '丹参山楂粥', ing: '丹参10克，山楂10克，粳米100克', method: '丹参山楂先煎20分钟取汁，与粳米同煮为粥，早晚温食', apply: '气虚血瘀型恢复期，肢体麻木、舌质紫暗者' }
      ],
      weekMenu: {
        note: '通用原则：每日食盐≤5克（约一啤酒盖），以蒸煮炖为主、少油少盐；急性期若有吞咽困难，须将食物打成糊状或细碎再喂，防呛咳误吸。',
        days: [
          { day: '周一', meals: ['早：小米南瓜粥、水煮蛋(蛋白)、焯水菠菜', '午：清蒸鲈鱼、蒜蓉西兰花、杂粮饭', '晚：冬瓜瘦肉汤、蒸红薯、凉拌木耳'] },
          { day: '周二', meals: ['早：燕麦牛奶粥、全麦馒头半个、凉拌黄瓜', '午：番茄炒蛋(少油·蛋黄半个)、清炒芦笋、米饭', '晚：青菜豆腐汤、清蒸鳕鱼、玉米'] },
          { day: '周三', meals: ['早：山药胡萝卜粥、蒸蛋羹、焯水油麦菜', '午：鸡胸肉烩时蔬、糙米饭、凉拌芹菜', '晚：紫菜蛋花汤(去黄)、蒸南瓜、清炒白菜'] },
          { day: '周四', meals: ['早：绿豆百合粥、蒸山药、水煮蛋蛋白', '午：豆腐炒虾仁(少盐)、清炒荷兰豆、米饭', '晚：萝卜排骨汤(撇油去沫)、蒸芋头、凉拌茄子'] },
          { day: '周五', meals: ['早：菜肉馄饨(清淡汤底)、蒸蛋羹', '午：清蒸多宝鱼、蒜蓉木耳菜、杂粮饭', '晚：番茄豆腐汤、蒸玉米、清炒苋菜'] },
          { day: '周六', meals: ['早：黑米红枣粥(少枣)、全麦吐司、焯水生菜', '午：香菇炖鸡(去皮去油)、清炒西葫芦、米饭', '晚：冬瓜薏米汤、蒸山药、清炒豆角'] },
          { day: '周日', meals: ['早：小米粥、水煮蛋蛋白、凉拌豆腐丝', '午：白灼虾、蒜蓉空心菜、糙米饭', '晚：海带豆腐汤、蒸红薯、清炒芥蓝'] }
        ],
        tips: ['盐是头号红线：每日<5克，酱油、咸菜、腊味、腌制品一律不放', '油只用植物油、不放猪油，全免煎炸，肉类去皮去油', '蛋白以鱼虾豆腐蛋清鸡胸为主，红肉要少', '合并高血压需更严格减盐；合并糖尿病则粥类减量、多加粗粮；高尿酸者虾蟹菌菇要节制']
      }
    },
  ];

  // ==================== 获取当前季节 ====================
  // 根据节气索引(0-23)直接计算季节，不依赖外部变量
  function getSeasonForTerm(idx) {
    idx = ((idx % 24) + 24) % 24;
    if (idx >= 0 && idx <= 2) return 'spring';
    if (idx >= 3 && idx <= 8) return 'summer';
    if (idx >= 9 && idx <= 14) return 'autumn';
    return 'winter';
  }

  // ==================== 渲染慢病卡片列表 ====================
  function renderDiseaseList(containerEl, termIdx, termName) {
    var season = getSeasonForTerm(termIdx);
    var seasonLabel = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }[season];
    var html = '<div class="cd-header">';
    html += '<div class="cd-header-title">慢病调养</div>';
    html += '<div class="cd-header-sub">选择关注的慢性病，查看' + seasonLabel + '季调养建议' + (termName ? ' · 当前：' + termName : '') + '</div>';
    html += '</div>';
    html += '<div class="cd-grid">';
    CHRONIC_DISEASES.forEach(function(d) {
      html += '<div class="cd-card" data-disease="' + d.id + '">';
      html += '<div class="cd-card-icon" style="background:' + d.color + '18;border-color:' + d.color + '40">';
      html += '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="' + d.color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d.icon + '</svg>';
      html += '</div>';
      html += '<div class="cd-card-name">' + d.name + '</div>';
      html += '<div class="cd-card-type">' + d.type + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div class="cd-disclaimer"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> 以上内容为传统养生智慧参考，不构成医疗建议</div>';
    containerEl.innerHTML = html;

    // 绑定点击事件
    containerEl.querySelectorAll('.cd-card').forEach(function(card) {
      card.addEventListener('click', function() {
        var diseaseId = this.getAttribute('data-disease');
        renderDiseaseDetail(containerEl, diseaseId, termIdx, termName);
      });
    });
  }

  // ==================== 渲染慢病详情 ====================
  function renderDiseaseDetail(containerEl, diseaseId, termIdx, termName) {
    var disease = null;
    for (var i = 0; i < CHRONIC_DISEASES.length; i++) {
      if (CHRONIC_DISEASES[i].id === diseaseId) { disease = CHRONIC_DISEASES[i]; break; }
    }
    if (!disease) return;

    var season = getSeasonForTerm(termIdx);
    var seasonLabel = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }[season];

    var html = '<div class="cd-detail">';
    // 返回按钮
    html += '<button class="cd-back" id="cdBackBtn"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>返回</button>';
    // 标题
    html += '<div class="cd-detail-header" style="border-left:3px solid ' + disease.color + '">';
    html += '<div class="cd-detail-title">' + disease.name + '</div>';
    html += '<div class="cd-detail-type">' + disease.type + ' · ' + termName + '调养要点</div>';
    html += '</div>';

    // 当季调养核心
    html += '<div class="cd-section">';
    html += '<div class="cd-section-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="' + disease.color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' + seasonLabel + '季调养核心</div>';
    html += '<div class="cd-season-tip">' + disease.seasons[season] + '</div>';
    html += '</div>';

    // 节气特别注意
    html += '<div class="cd-section">';
    html += '<div class="cd-section-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="' + disease.color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>' + termName + '特别提示</div>';
    var tips = disease.termTips[season] || [];
    tips.forEach(function(tip) {
      html += '<div class="cd-term-tip-item">' + tip + '</div>';
    });
    html += '</div>';

    // 饮食宜忌
    html += '<div class="cd-section">';
    html += '<div class="cd-section-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="' + disease.color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"/></svg>饮食宜忌</div>';
    html += '<div class="cd-food-grid">';
    html += '<div class="cd-food-col"><div class="cd-food-label" style="color:#16a34a"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>宜食</div>';
    disease.foods.forEach(function(f) { html += '<span class="cd-food-tag cd-food-good">' + f + '</span>'; });
    html += '</div>';
    html += '<div class="cd-food-col"><div class="cd-food-label" style="color:#dc2626"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>忌食</div>';
    disease.avoid.forEach(function(f) { html += '<span class="cd-food-tag cd-food-bad">' + f + '</span>'; });
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // 日常禁忌
    html += '<div class="cd-section">';
    html += '<div class="cd-section-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="' + disease.color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>日常禁忌</div>';
    disease.taboos.forEach(function(t) {
      html += '<div class="cd-taboo-item">' + t + '</div>';
    });
    html += '</div>';

    // 食疗方
    html += '<div class="cd-section">';
    html += '<div class="cd-section-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="' + disease.color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>推荐食疗方</div>';
    disease.recipes.forEach(function(r) {
      html += '<div class="cd-recipe-card">';
      html += '<div class="cd-recipe-name">' + r.name + '</div>';
      html += '<div class="cd-recipe-row"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"/></svg> ' + r.ing + '</div>';
      html += '<div class="cd-recipe-row"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 15l-2 5L9 9l11 4-5 2z"/></svg> ' + r.method + '</div>';
      html += '<div class="cd-recipe-apply"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> ' + r.apply + '</div>';
      html += '</div>';
    });
    html += '</div>';
    // ===== 一周家常菜谱（仅中风板块）=====
    if (disease.weekMenu) {
      html += '\u003cdiv class=\"cd-section\"\u003e';
      html += '\u003cdiv class=\"cd-section-title\"\u003e\u003csvg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"'+disease.color+'\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"\u003e\u003cpath d=\"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2\"/\u003e\u003cpath d=\"M7 2v20\"/\u003e\u003cpath d=\"M21 15V2\"/\u003e\u003cpath d=\"M18 15a2 2 0 0 0 2 2 2 2 0 0 1 0 4 2 2 0 0 1-2-2z\"/\u003e\u003c/svg\u003e一周家常菜谱（低盐低脂）\u003c/div\u003e';
      html += '\u003cdiv class=\"cd-week-note\"\u003e'+disease.weekMenu.note+'\u003c/div\u003e';
      disease.weekMenu.days.forEach(function(w) {
        html += '\u003cdiv class=\"cd-week-day\"\u003e';
        html += '\u003cdiv class=\"cd-week-day-title\"\u003e'+w.day+'\u003c/div\u003e';
        w.meals.forEach(function(m) { html += '\u003cdiv class=\"cd-week-meal\"\u003e'+m+'\u003c/div\u003e'; });
        html += '\u003c/div\u003e';
      });
      html += '\u003cdiv class=\"cd-week-tip-title\"\u003e\u003csvg viewBox=\"0 0 24 24\" width=\"12\" height=\"12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"\u003e\u003ccircle cx=\"12\" cy=\"12\" r=\"10\"/\u003e\u003cpath d=\"M12 16v-4\"/\u003e\u003cpath d=\"M12 8h.01\"/\u003e\u003c/svg\u003e 关键提醒\u003c/div\u003e';
      disease.weekMenu.tips.forEach(function(t) { html += '\u003cdiv class=\"cd-week-tip\"\u003e'+t+'\u003c/div\u003e'; });
      html += '\u003c/div\u003e';
    }


    html += '</div>';
    containerEl.innerHTML = html;

    // 返回按钮事件
    document.getElementById('cdBackBtn').addEventListener('click', function() {
      renderDiseaseList(containerEl, termIdx, termName);
    });
  }

  // ==================== 暴露初始化函数 ====================
  window.initChronicDisease = function(containerId, termIdx, termName) {
    renderDiseaseList(document.getElementById(containerId), termIdx, termName);
  };

  // 暴露数据供外部使用
  window.CHRONIC_DISEASES = CHRONIC_DISEASES;

  // ==================== 注入样式 ====================
  (function() {
    var style = document.createElement('style');
    style.textContent = [
      '.cd-header{text-align:center;padding:16px 0 12px}',
      '.cd-header-title{font-size:16px;font-weight:700;color:#1a1a2e}',
      '.cd-header-sub{font-size:12px;color:#6b7280;margin-top:4px}',
      '.cd-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px 12px}',
      '.cd-card{background:#fff;border-radius:12px;padding:16px 12px;text-align:center;cursor:pointer;transition:all .2s;border:1px solid #f0f0f0}',
      '.cd-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,.08)}',
      '.cd-card-icon{width:40px;height:40px;border-radius:50%;border:1.5px solid;display:flex;align-items:center;justify-content:center;margin:0 auto 8px}',
      '.cd-card-name{font-size:14px;font-weight:600;color:#1a1a2e}',
      '.cd-card-type{font-size:11px;color:#9ca3af;margin-top:2px}',
      '.cd-disclaimer{font-size:11px;color:#9ca3af;text-align:center;padding:8px 16px 16px;display:flex;align-items:center;justify-content:center;gap:4px}',
      '.cd-detail{padding:0 16px 20px}',
      '.cd-back{background:none;border:none;color:#6b7280;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:4px;padding:8px 0;margin-bottom:8px}',
      '.cd-back:hover{color:#1a1a2e}',
      '.cd-detail-header{padding:8px 0 12px 12px}',
      '.cd-detail-title{font-size:18px;font-weight:700;color:#1a1a2e}',
      '.cd-detail-type{font-size:12px;color:#6b7280;margin-top:2px}',
      '.cd-section{margin-bottom:16px}',
      '.cd-section-title{font-size:13px;font-weight:600;color:#374151;display:flex;align-items:center;gap:6px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #f3f4f6}',
      '.cd-season-tip{font-size:13px;color:#4b5563;line-height:1.6;background:#f9fafb;padding:10px 12px;border-radius:8px}',
      '.cd-term-tip-item{font-size:12px;color:#6b7280;padding:6px 0 6px 16px;position:relative;line-height:1.5}',
      '.cd-term-tip-item::before{content:"";position:absolute;left:4px;top:12px;width:5px;height:5px;border-radius:50%;background:#d1d5db}',
      '.cd-food-grid{display:flex;gap:12px}',
      '.cd-food-col{flex:1;min-width:0}',
      '.cd-food-label{font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px;margin-bottom:6px}',
      '.cd-food-tag{display:inline-block;font-size:11px;padding:2px 8px;border-radius:10px;margin:2px 2px}',
      '.cd-food-good{background:#f0fdf4;color:#166534}',
      '.cd-food-bad{background:#fef2f2;color:#991b1b}',
      '.cd-taboo-item{font-size:12px;color:#4b5563;padding:5px 0 5px 14px;position:relative;line-height:1.5}',
      '.cd-taboo-item::before{content:"";position:absolute;left:3px;top:11px;width:4px;height:4px;border-radius:50%;background:#ef4444;opacity:.6}',
      '.cd-recipe-card{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;margin-bottom:8px}',
      '.cd-recipe-name{font-size:13px;font-weight:600;color:#92400e;margin-bottom:4px}',
      '.cd-recipe-row{font-size:11px;color:#78716c;display:flex;align-items:flex-start;gap:4px;margin:3px 0;line-height:1.4}',
      '.cd-recipe-apply{font-size:11px;color:#059669;display:flex;align-items:flex-start;gap:4px;margin-top:4px;line-height:1.4}',
      '.cd-week-note{font-size:12px;color:#4b5563;background:#f6f4ff;border-left:3px solid #8B5CF6;padding:8px 10px;border-radius:6px;margin-bottom:10px;line-height:1.6}',
      '.cd-week-day{background:#fff;border:1px solid #ede9fe;border-radius:8px;padding:8px 10px;margin-bottom:8px}',
      '.cd-week-day-title{font-size:13px;font-weight:600;color:#5b21b6;border-bottom:1px dashed #ddd6fe;padding-bottom:4px;margin-bottom:4px}',
      '.cd-week-meal{font-size:12px;color:#4b5563;line-height:1.6;padding:2px 0}',
      '.cd-week-meal::before{content:"· ";color:#8B5CF6}',
      '.cd-week-tip-title{font-size:12px;font-weight:600;color:#374151;display:flex;align-items:center;gap:4px;margin:10px 0 4px}',
      '.cd-week-tip{font-size:11px;color:#78716c;padding:4px 0 4px 14px;position:relative;line-height:1.5}',
      '.cd-week-tip::before{content:"";position:absolute;left:4px;top:11px;width:4px;height:4px;border-radius:50%;background:#8B5CF6;opacity:.5}'
    ].join('\n');
    document.head.appendChild(style);
  })();

})();
