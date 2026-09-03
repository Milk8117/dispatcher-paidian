/**
 * DiagnosisEngine - MiRun AI财务诊断引擎模块
 * 
 * 职责：
 * 1. 接收用户录入数据，执行6维度评分
 * 2. 生成诊断结论、改善建议、保险建议
 * 3. 渲染结果到页面（分数环、维度条形图、诊断文本、建议列表）
 * 
 * 依赖：DataStore（可选，用于读取已保存数据）
 * 输入：data对象 或 无参（从DataStore自动读取）
 * 输出：{ total, grade, gradeLabel, gradeDesc, dimensions, diagnosis, suggestions, insuranceTip }
 */

(function(global) {
  'use strict';

  // ==================== 评分引擎 ====================
  /**
   * 6维度财务评分
   * @param {Object} data
   *   jobIncome, rentalIncome, investIncome, sideIncome,
   *   expense, savings, equityInvest, stableInvest,
   *   property, investProperty, bankDebt, otherDebt,
   *   monthlyPay, maxMonthlyPay,
   *   housingFund, housingFundYears, commercialPremium,
   *   insuranceList, ageGroup
   * @returns {Object} { total, grade, gradeLabel, gradeDesc, dimensions, diagnosis, suggestions, insuranceTip }
   */
  function scoringEngine(data) {
    var jobIncome = data.jobIncome;
    var rentalIncome = data.rentalIncome || 0;
    var investIncome = data.investIncome || 0;
    var sideIncome = data.sideIncome || 0;
    var otherIncome = rentalIncome + investIncome + sideIncome;
    var fixedExpense = data.expense;
    var savings = data.savings;
    var equityInvest = data.equityInvest;
    var stableInvest = data.stableInvest;
    var investment = equityInvest + stableInvest;
    var prop = data.property;
    var investProp = data.investProperty || 0;
    var bankDebt = data.bankDebt || 0;
    var otherDebt = data.otherDebt;
    var monthlyPay = data.monthlyPay;
    var maxMonthlyPay = data.maxMonthlyPay || monthlyPay;
    var housingFund = data.housingFund;
    var housingFundYears = data.housingFundYears;
    var commercialPremium = data.commercialPremium;
    var ageGroup = data.ageGroup;
    
    // 保险列表汇总
    var insuranceList = data.insuranceList || [];
    var lifeInsurance = 0;
    var totalInsurancePremium = 0;
    var insuranceDetails = [];
    
    insuranceList.forEach(function(ins) {
      if (ins.type === 'life') {
        lifeInsurance += ins.amount;
      }
      totalInsurancePremium += ins.premium;
      var remainingYears = Math.max(0, ins.term - ins.paid);
      insuranceDetails.push({
        type: ins.type,
        amount: ins.amount,
        premium: ins.premium,
        term: ins.term,
        paid: ins.paid,
        remaining: remainingYears
      });
    });

    // 投资持仓数据（来自投资持仓模块）
    var stockHoldings = data.stockHoldings || [];
    var stockCash = data.stockCash || 0;
    var holdingsValue = 0;
    var holdingsCost = 0;
    var holdingsPnl = 0;
    stockHoldings.forEach(function(h) {
      var q = parseFloat(h.quantity) || 0;
      var cp = parseFloat(h.cost_price) || 0;
      var curr = parseFloat(h.current_price) || 0;
      holdingsValue += q * curr;
      holdingsCost += q * cp;
      holdingsPnl += q * (curr - cp);
    });
    var holdingsPnlPct = holdingsCost > 0 ? holdingsPnl / holdingsCost : 0;

    var income = jobIncome + otherIncome;
    var debt = bankDebt + otherDebt;
    var totalAssets = savings + investment + prop + investProp;
    if (totalAssets === 0) totalAssets = 1;

    var isRetired = (ageGroup == 6) || (housingFund === 0 && housingFundYears >= 20);

    // ---- Dim1: 资产负债健康度 (20%) ----
    var effectiveMonthlyPay = maxMonthlyPay;
    var monthlyPayRatio = income > 0 ? effectiveMonthlyPay / income : 0;
    var score1a;
    if (effectiveMonthlyPay === 0) score1a = 100;
    else if (monthlyPayRatio <= 0.3) score1a = 100;
    else if (monthlyPayRatio <= 0.5) score1a = 60;
    else score1a = 0;

    var debtAssetRatio = totalAssets > 0 ? debt / totalAssets : 0;
    var score1b;
    if (debt === 0) score1b = 100;
    else if (debtAssetRatio <= 0.3) score1b = 100;
    else if (debtAssetRatio <= 0.5) score1b = 60;
    else score1b = 0;

    var bankDebtRatio = totalAssets > 0 ? bankDebt / totalAssets : 0;
    var score1c;
    if (bankDebt === 0) score1c = 100;
    else if (bankDebtRatio <= 0.5) score1c = 100;
    else if (bankDebtRatio <= 0.7) score1c = 60;
    else score1c = 20;

    var dim1Score = Math.round((score1a + score1b + score1c) / 3);

    // ---- Dim2: 流动性安全度 (15%) ----
    var monthlyRigid = fixedExpense + effectiveMonthlyPay;
    var savingsMonths = monthlyRigid > 0 ? savings / monthlyRigid : (savings > 0 ? 999 : 0);
    var dim2Score;
    if (fixedExpense === 0 && effectiveMonthlyPay === 0) dim2Score = 100;
    else if (savingsMonths >= 12) dim2Score = 100;
    else if (savingsMonths >= 6) dim2Score = 70;
    else if (savingsMonths >= 3) dim2Score = 40;
    else dim2Score = 0;

    // ---- Dim3: 收入结构合理性 (20%) ----
    var otherIncomeRatio = income > 0 ? otherIncome / income : 0;
    var dim3Score;
    if (income === 0) dim3Score = 0;
    else if (otherIncomeRatio >= 0.3) dim3Score = 100;
    else if (otherIncomeRatio >= 0.15) dim3Score = 70;
    else if (otherIncomeRatio >= 0.05) dim3Score = 40;
    else dim3Score = 0;

    // ---- Dim4: 支出与储蓄率 (15%) ----
    var savingsRate = income > 0 ? (income - fixedExpense - effectiveMonthlyPay) / income : 0;
    var dim4Score;
    if (income === 0) dim4Score = 0;
    else if (savingsRate >= 0.3) dim4Score = 100;
    else if (savingsRate >= 0.2) dim4Score = 70;
    else if (savingsRate >= 0.1) dim4Score = 40;
    else dim4Score = 0;

    // ---- Dim5: 资产配置均衡度 (20%) ----
    var totalProp = prop + investProp;
    var propRatio = totalAssets > 0 ? totalProp / totalAssets : 0;
    var score5a;
    if (totalProp === 0) score5a = 100;
    else if (propRatio <= 0.4) score5a = 100;
    else if (propRatio <= 0.55) score5a = 60;
    else score5a = 0;

    var investNonPropRatio = (savings + investment) > 0
      ? investment / (savings + investment)
      : 0;
    var score5b;
    if (investment === 0) score5b = 40;
    else if (investNonPropRatio >= 0.3) score5b = 100;
    else if (investNonPropRatio >= 0.15) score5b = 70;
    else score5b = 40;

    var score5c;
    if (investment === 0) {
      score5c = 40;
    } else {
      var equityRatio = equityInvest / investment;
      if (equityRatio >= 0.3 && equityRatio <= 0.6) score5c = 100;
      else if (equityRatio >= 0.15 && equityRatio <= 0.75) score5c = 70;
      else score5c = 40;
    }

    var dim5Score = Math.round((score5a + score5b + score5c) / 3);

    // ---- Dim6: 风险保障充足度 (10%) ----
    var annualIncome = income * 12;
    var annualJobIncome = jobIncome * 12;
    var annualExpense = (fixedExpense + effectiveMonthlyPay) * 12;

    var fundScore;
    if (isRetired) {
      if (housingFundYears >= 15) fundScore = 80;
      else if (housingFundYears >= 5) fundScore = 50;
      else fundScore = 20;
    } else {
      if (housingFund === 0 && housingFundYears === 0) fundScore = 0;
      else if (housingFund === 0) fundScore = 20;
      else if (housingFundYears >= 5) fundScore = 100;
      else if (housingFundYears >= 2) fundScore = 80;
      else fundScore = 50;
    }

    var premiumRatio = annualJobIncome > 0 ? totalInsurancePremium / annualJobIncome : 0;
    var premiumScore;
    if (totalInsurancePremium === 0) {
      premiumScore = 0;
    } else if (premiumRatio < 0.03) {
      premiumScore = 20;
    } else if (premiumRatio <= 0.08) {
      premiumScore = 60;
    } else if (premiumRatio <= 0.15) {
      premiumScore = 90;
    } else {
      premiumScore = 70;
    }

    var lifeInsuranceAmount = lifeInsurance;
    var coverageRatio = annualExpense > 0 ? lifeInsuranceAmount / annualExpense : 0;
    var coverageScore;
    if (lifeInsurance === 0) {
      coverageScore = 0;
    } else if (coverageRatio < 3) {
      coverageScore = 20;
    } else if (coverageRatio < 5) {
      coverageScore = 60;
    } else if (coverageRatio <= 10) {
      coverageScore = 90;
    } else {
      coverageScore = 100;
    }

    var dim6Score = Math.round(fundScore * 0.3 + premiumScore * 0.35 + coverageScore * 0.35);

    // ---- 保险建议 ----
    var insuranceParts = [];

    if (isRetired) {
      if (housingFundYears >= 15) {
        insuranceParts.push('公积金已缴满 ' + housingFundYears + ' 年，使用资格已获取，退休状态下保障基础良好。');
      } else {
        insuranceParts.push('已退休但公积金缴存年限 ' + housingFundYears + ' 年，保障基础较弱。');
      }
    } else if (housingFund === 0 && housingFundYears > 0) {
      insuranceParts.push('公积金已断缴（累计 ' + housingFundYears + ' 年），失去每月现金流入。创业或自由职业阶段建议关注社保接续，避免资格中断。');
    } else if (housingFund > 0) {
      insuranceParts.push('公积金正常缴存（累计 ' + housingFundYears + ' 年），职业基础保障到位。');
    } else {
      insuranceParts.push('无公积金保障，职业基础保障缺失。建议以商业保险补足风险缺口。');
    }

    if (insuranceList.length === 0 && commercialPremium === 0) {
      insuranceParts.push('商业保险配置为零，风险敞口极大。框架指出"中产家庭保险配置严重不足"是典型困境，建议立即配置基础寿险+医疗险。');
    } else {
      var lifeCount = 0, commercialCount = 0, educationCount = 0;
      var lifeAmount = 0;
      insuranceDetails.forEach(function(ins) {
        if (ins.type === 'life') { lifeCount++; lifeAmount += ins.amount; }
        else if (ins.type === 'commercial') { commercialCount++; }
        else if (ins.type === 'education') { educationCount++; }
      });

      if (lifeCount === 0) {
        insuranceParts.push('未配置人寿保险（身故/全残保障）。框架强调"是否配置了足够的人寿保险"是关键诊断问题，建议保额覆盖至少5-10年支出。');
      } else {
        var coverageRatioLife = annualExpense > 0 ? lifeAmount / annualExpense : 0;
        insuranceParts.push('已配置 ' + lifeCount + ' 份人寿保险，总保额 ' + lifeAmount.toLocaleString() + ' 元（约年支出的' + Math.round(coverageRatioLife) + '倍）。');
        if (coverageRatioLife < 5) {
          insuranceParts.push('保额偏低，建议提高至年支出的5-10倍。');
        }
      }

      if (commercialCount === 0 && commercialPremium === 0) {
        insuranceParts.push('未配置商业保险（重疾/医疗），建议补充。');
      } else {
        insuranceParts.push('已配置 ' + commercialCount + ' 份商业保险。');
      }

      if (educationCount > 0) {
        insuranceParts.push('已配置 ' + educationCount + ' 份教育险/补充险。');
      }

      if (premiumScore < 60) {
        insuranceParts.push('总保费占年职业收入' + Math.round(premiumRatio * 100) + '%，保障不足。框架建议不同年龄段配置比例为：30岁10-15%、40-50岁15-20%，目标为年收入的8-15%。');
      } else if (premiumScore >= 90) {
        insuranceParts.push('保费投入充足：占年职业收入' + Math.round(premiumRatio * 100) + '%。');
      }

      var activeInsurance = insuranceDetails.filter(function(ins) { return ins.premium > 0 && ins.term > 0; });
      if (activeInsurance.length > 0) {
        var longTermCount = activeInsurance.filter(function(ins) { return ins.remaining > 10; }).length;
        var shortTermCount = activeInsurance.filter(function(ins) { return ins.remaining > 0 && ins.remaining <= 10; }).length;
        var completedCount = activeInsurance.filter(function(ins) { return ins.remaining === 0; }).length;

        if (longTermCount > 0) {
          insuranceParts.push('有 ' + longTermCount + ' 份保险还需缴费超过10年，属于长期刚性支出，需确保未来收入能持续覆盖。');
        }
        if (shortTermCount > 0) {
          insuranceParts.push('有 ' + shortTermCount + ' 份保险还剩10年内缴费期，即将完成保费义务。');
        }
        if (completedCount > 0) {
          insuranceParts.push('有 ' + completedCount + ' 份保险缴费已完成，保障持续有效。');
        }
      }
    }

    var insuranceAdvice = insuranceParts.join('');

    // ---- Total Score ----
    var weights = [0.20, 0.15, 0.20, 0.15, 0.20, 0.10];
    var dimScores = [dim1Score, dim2Score, dim3Score, dim4Score, dim5Score, dim6Score];
    var totalScore = 0;
    for (var i = 0; i < 6; i++) {
      totalScore += dimScores[i] * weights[i];
    }
    totalScore = Math.round(totalScore);

    // ---- Grade ----
    var grade, gradeLabel, gradeDesc;
    if (totalScore >= 90) { grade = 'A'; gradeLabel = 'A 财务健康'; gradeDesc = '持续优化，保持良好习惯'; }
    else if (totalScore >= 75) { grade = 'B'; gradeLabel = 'B 基本健康'; gradeDesc = '局部调整，更上一层楼'; }
    else if (totalScore >= 60) { grade = 'C'; gradeLabel = 'C 需要改善'; gradeDesc = '重点优化，提升空间较大'; }
    else if (totalScore >= 40) { grade = 'D'; gradeLabel = 'D 风险较高'; gradeDesc = '急需调整，避免财务危机'; }
    else { grade = 'F'; gradeLabel = 'F 财务危险'; gradeDesc = '立即行动，扭转被动局面'; }

    // ---- Dimensions Info ----
    var dimNames = [
      '资产负债健康度',
      '流动性安全度',
      '收入结构合理性',
      '支出与储蓄率',
      '资产配置均衡度',
      '风险保障充足度'
    ];
    var dimDescs = [
      '评估标准：未来最高月供÷月收入≤30%为健康，负债/总资产≤30%为安全，银行负债占比≤50%为稳健（框架1.1）',
      '评估标准：（现金+活期）÷（固定支出+最高月供）≥6为安全，≥12为优秀（框架2.1）',
      '评估标准：（租金+投资收益）÷总收入≥30%为健康，体现被动收入质量（框架1.2）',
      '评估标准：（总收入-固定支出-月供）÷总收入≥30%为优秀，≥20%良好（框架通用储蓄原则）',
      '评估标准：（自住房+投资房）÷总资产≤40%为健康，金融资产中投资占比≥30%为合理（框架1.3）',
      '评估标准：公积金覆盖率30% + 商业保费/职业收入35% + 保额/年支出35%（框架推导）'
    ];
    var dimTargets = [
      '达标区间：未来最高月供÷收入 ≤ 30%，负债÷总资产 ≤ 30%，银行有息负债占比 ≤ 50%',
      '达标区间：现金储备 ÷ 月刚性支出（固定支出+最高月供）≥ 6 个月',
      '达标区间：（租金+投资收益）÷ 总收入 ≥ 30%（被动收入质量）',
      '达标区间：月储蓄率 ≥ 20%（即固定支出+月供 ≤ 收入的 80%）',
      '达标区间：（自住房+投资房）÷总资产 ≤ 40%，金融资产中投资占比 ≥ 30%',
      '达标区间：保费占年收入 8%~15%，保额 ≥ 5 年年支出'
    ];
    var dimensions = [];
    for (var j = 0; j < 6; j++) {
      dimensions.push({
        name: dimNames[j],
        score: dimScores[j],
        weight: Math.round(weights[j] * 100),
        desc: dimDescs[j],
        target: dimTargets[j]
      });
    }

    // ---- Suggestions ----
    var suggestionMap = {
      0: {
        problem: '负债压力较大，银行负债杠杆或月供占比超过安全线。',
        target: '月供收入比降至 ≤ 30%，负债/资产比 ≤ 30%，银行有息负债占总资产 ≤ 50%',
        principle: '财富管理的第一原则：资产负债表是财富的"地基"——净资产 = 总资产 - 总负债。月供占收入比超过 50% 时，家庭现金流极度脆弱，一旦遭遇失业、疾病或行业下行，断供风险急剧上升。2025 年全国房产断供 187 万人，核心原因就是杠杆超出了实际支付能力。',
        action: '优先偿还高息银行负债（信用卡分期、消费贷利率通常 15%+），适当延长房贷期限降低月供压力。每月将多余资金集中"狙击"利率最高的那一笔负债，还清后转入下一笔，形成雪效应。',
        benefit: '每降低 1 万元有息负债，每年就能省下 600-1500 元的利息支出，这笔钱相当于多赚了一个月的被动收入。负债率降到 30% 以下后，银行更愿意给你低利率贷款，整体财务弹性大幅提升。'
      },
      1: {
        problem: '流动性不足，应急储备金偏少。',
        target: '应急储备金达到 6~12 个月刚性支出（含月供），按 3 层流动性分层存放',
        principle: '现金流是家庭和企业的"血液"，对个人家庭同样适用。没有流动性储备，任何意外——失业、疾病、突发支出——都会迫使你变卖资产或借高息贷款，造成"越急越亏"的恶性循环。框架要求至少储备覆盖 6-12 个月刚性支出的现金。',
        action: '分三层存放：① 1-2 个月日常开销放活期或余额宝（随时取用）；② 2-4 个月放货币基金或短债基金（7 天内到账，收益高于活期 5-10 倍）； 剩余放债券基金（稳定增值，需要时可赎回）。每月工资到账后第一时间转入储备账户。',
        benefit: '有了充足储备金，你面对突发状况时不再焦虑，不需要低价抛售股票或借网贷。更重要的是，它给了你"选择权"——可以等更好的工作机会、可以择时投资、可以对不合理的报价说"不"。这是真正的财务自由第一步。'
      },
      2: {
        problem: '财产性收入占比过低，收入结构单一依赖职业收入。',
        target: '财产性收入（投资收益、租金、利息等）占总收入 ≥ 30%',
        principle: '财富增长的核心框架是"双轨收入"——职务性收入（工资）+ 财产性收入（利息、股息、租金、资本利得）。只靠工资的人，本质上是"用手换钱"，一旦停止工作收入立刻归零。健康家庭的财产性收入应占总收入的 30% 以上，这才是"钱为你工作"。',
        action: '从宽基指数基金定投开始（如沪深 300、中证 500），每月固定投入，利用"微笑曲线"在市场波动中摊低成本。先建仓位再谈择时，不要试图精准抄底。进阶后可逐步增加行业基金（科技、消费、医疗）提升收益弹性。',
        benefit: '基金定投 10 年年化收益约 8-12%，这意味着每月投 2000 元，10 年后约 35-45 万元。更重要的是，当财产性收入逐渐覆盖日常支出时，你不再被迫为钱工作，而是可以选择做自己真正想做的事——这才是财富增长的终极目的。'
      },
      3: {
        problem: '储蓄率偏低，入不敷出或所剩无几。',
        target: '月储蓄率 ≥ 20%（即月支出 ≤ 月收入的 80%），理想目标 30%+',
        principle: '专业理财框架强调"先存后花"是财富积累的第一性原理。大多数人"先花后存"，月底剩多少存多少，结果永远存不下来。框架要求储蓄率不低于 20%——这不是消费习惯问题，而是数学问题：如果收入 1 万、月花 8000，看似合理，但 10 年后净资产增量几乎为零。',
        action: '每月工资到账当天，立即将 20% 自动转入"不可动"账户（可设置定期存款或基金定投，增加提取难度）。剩余 80% 才是你的实际可支配收入，在这个预算内安排生活。记账 3 个月找出"拿铁因子"（每天一杯咖啡、会员自动续费等隐性支出），逐步优化。',
        benefit: '每月多存 1000 元，按年化 8% 复利计算，20 年后约 59 万元。差距看似不大，但关键在于习惯的力量——当你把储蓄变成"第一优先级支出"，消费决策会自动变理性，整个财务系统进入正向循环。这是所有富裕家庭的共同特征。'
      },
      4: {
        problem: '资产配置不均衡，不动产占比过大或投资不足。',
        target: '房产占总资产 ≤ 40%，金融资产中权益类占比 30%~60%，债券类 20%~40%，现金类 ≥ 10%',
        principle: '数据显示，中国家庭资产中房产占比平均超 70%，远高于国际健康值（30-50%）。房产流动性差、变现周期长、持有成本高，一旦市场下行就会被"套牢"。同时，缺乏金融资产意味着放弃了中国经济长期增长的红利。框架建议证券类资产占比逐步提升至 30% 左右。',
        action: '非必须不新购房产，持有两套即可。将每月结余资金的 50% 投入权益类基金（沪深 300 宽基 + 1-2 只行业基金），30% 配置债券基金降低波动，20% 保留现金类。每季度检视一次配比，偏离超过 5% 时做再平衡。',
        benefit: '多元化配置的核心好处是"东方不亮西方亮"——股市跌时债券涨，经济差时现金稳。历史数据显示，均衡配置的年化波动率比全仓房产或全仓股票低 40-60%，但长期收益差距不大。更重要的是，金融资产随时可以变现，给了你应对任何人生变化的底气。'
      },
      5: {
        problem: '风险保障不充分。',
        target: '保费占年收入 8%~15%，人寿保额 ≥ 5 年年支出，重疾险保额 ≥ 50 万，配百万医疗险',
        principle: '专业理财将保险定位为"防守型资产"——它不创造财富，但防止财富被一次意外清零。框架强调，一个家庭的底线保障应覆盖：重大疾病（保额 ≥ 3 年年收入）、意外身故（保额 ≥ 5 年年支出）、住院医疗（百万医疗险）。没有这些保障，前面所有的储蓄和投资都可能在一次事故中化为乌有。',
        action: '按年龄段配置：30 岁以下优先百万医疗险（年保费 300-500 元）+ 消费型重疾险（保额 50 万，年保费 2000-4000 元）；30-50 岁增加定期寿险（保额覆盖房贷余额 + 5 年生活费）；50 岁以上侧重防癌险和长期护理险。总保费控制在年收入的 8-15% 以内。',
        benefit: '一份年交 3000 元的重疾险，撬动的是 50 万保额——杠杆率 167 倍。没有保险的家庭，一场大病可能消耗 5-10 年积累；有保险的家庭，同样的情况只损失 3000 元保费。这就是保险的本质：用极小的确定性支出，对冲极大的不确定性损失。'
      }
    };

    var sorted = dimensions.slice().sort(function(a, b) { return a.score - b.score; });
    var suggestions = [];
    for (var k = 0; k < sorted.length && suggestions.length < 3; k++) {
      if (sorted[k].score < 70) {
        var idx = dimNames.indexOf(sorted[k].name);
        suggestions.push({ text: suggestionMap[idx], dim: sorted[k].name, score: sorted[k].score });
      }
    }
    if (suggestions.length === 0) {
      suggestions.push({ text: '整体财务状况良好，建议继续保持当前储蓄和投资习惯，定期（每年12月底）执行框架中的年度财务体检。', dim: '维持', score: 100 });
      suggestions.push({ text: '可考虑适当增加权益类资产配置，从散户进化为基金投资人，提升长期收益潜力。', dim: '优化', score: 100 });
    }
    if (suggestions.length < 2) {
      for (var m = 0; m < sorted.length && suggestions.length < 2; m++) {
        var idx2 = dimNames.indexOf(sorted[m].name);
        var already = suggestions.some(function(s) { return s.dim === sorted[m].name; });
        if (!already) {
          suggestions.push({ text: suggestionMap[idx2], dim: sorted[m].name, score: sorted[m].score });
        }
      }
    }

    // ---- Diagnosis ----
    var diagParts = [];
    if (totalScore >= 90) {
      diagParts.push('您的财务状况非常健康，资产负债、流动性、储蓄率和资产配置均表现优秀。');
      diagParts.push('当前最重要的是坚持好习惯，每年12月30-31日执行框架中的"年度财务体检"，跟踪净资产变化，同时关注保险保障和收入多元化。');
    } else if (totalScore >= 75) {
      diagParts.push('您的财务基本面良好，大部分指标处于健康区间，少数维度有优化空间。');
      var weakNames = sorted.filter(function(d) { return d.score < 70; }).map(function(d) { return d.name; });
      if (weakNames.length > 0) {
        diagParts.push('重点关注：' + weakNames.join('、') + '，针对性改善即可显著提升整体评分。');
      }
    } else if (totalScore >= 60) {
      diagParts.push('您的财务状况存在明显短板，' + sorted[0].name + '得分仅 ' + sorted[0].score + ' 分，是需要优先解决的问题。');
      if (sorted[1].score < 60) {
        diagParts.push(sorted[1].name + '同样偏低（' + sorted[1].score + ' 分），建议制定分步改善计划。');
      }
      diagParts.push('好消息是：只要聚焦最弱 2 个维度改善，整体评分可快速提升至 B 级以上。');
    } else if (totalScore >= 40) {
      diagParts.push('您的财务风险较高，多个维度处于警戒区间，需要尽快采取行动。');
      diagParts.push('最紧迫的是：' + sorted[0].name + '（' + sorted[0].score + ' 分）和 ' + sorted[1].name + '（' + sorted[1].score + ' 分），这两项不改善将可能引发连锁财务危机。');
    } else {
      diagParts.push('您的财务状况处于危险状态，多个核心指标严重不达标，需要立即采取纠偏行动。');
      diagParts.push('当务之急：先稳住流动性（确保有应急储备金），再逐步降低负债、提升储蓄率。框架强调"既无内债也无外债是与钱有仇"，但严禁超出支付能力负债。');
    }

    return {
      total: totalScore,
      grade: grade,
      gradeLabel: gradeLabel,
      gradeDesc: gradeDesc,
      dimensions: dimensions,
      diagnosis: diagParts.join(''),
      suggestions: suggestions,
      insuranceTip: insuranceAdvice,
      // 额外暴露关键指标，供后续存档/趋势对比使用
      metrics: {
        income: income,
        expense: fixedExpense,
        savings: savings,
        investment: investment,
        totalAssets: totalAssets,
        debt: debt,
        monthlyPay: effectiveMonthlyPay,
        savingsRate: savingsRate,
        otherIncomeRatio: otherIncomeRatio,
        debtAssetRatio: debtAssetRatio,
        savingsMonths: savingsMonths,
        lifeInsurance: lifeInsurance,
        totalInsurancePremium: totalInsurancePremium,
        // 投资持仓相关
        stockHoldingsCount: stockHoldings.length,
        holdingsValue: holdingsValue,
        holdingsCost: holdingsCost,
        holdingsPnl: holdingsPnl,
        holdingsPnlPct: holdingsPnlPct,
        stockCash: stockCash,
        holdingsTotalAssets: holdingsValue + stockCash
      }
    };
  }


  // ==================== 渲染引擎 ====================
  /**
   * 将诊断结果渲染到页面
   * @param {Object} result - scoringEngine返回的结果
   * @param {Object} containerIds - DOM元素ID映射
   *   { section, ring, scoreValue, scoreGrade, scoreGradeText,
   *     dimList, diagText, insuranceTip, suggestList }
   */
  function renderResults(result, containerIds) {
    var ids = containerIds || {};
    
    // 获取DOM元素
    var resultSection = ids.section ? document.getElementById(ids.section) : null;
    var ringProgress = ids.ring ? document.getElementById(ids.ring) : null;
    var scoreValue = ids.scoreValue ? document.getElementById(ids.scoreValue) : null;
    var scoreGrade = ids.scoreGrade ? document.getElementById(ids.scoreGrade) : null;
    var scoreGradeText = ids.scoreGradeText ? document.getElementById(ids.scoreGradeText) : null;
    var dimList = ids.dimList ? document.getElementById(ids.dimList) : null;
    var diagText = ids.diagText ? document.getElementById(ids.diagText) : null;
    var insuranceTip = ids.insuranceTip ? document.getElementById(ids.insuranceTip) : null;
    var suggestList = ids.suggestList ? document.getElementById(ids.suggestList) : null;

    // 显示结果区域
    if (resultSection) resultSection.classList.add('visible');
    setTimeout(function() {
      if (resultSection) resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // 分数环
    if (ringProgress) {
      var circumference = 2 * Math.PI * 75;
      ringProgress.style.strokeDasharray = circumference;
      ringProgress.style.strokeDashoffset = circumference;
      ringProgress.setAttribute('class', 'ring-progress ring-' + result.grade);
      setTimeout(function() {
        var offset = circumference - (result.total / 100) * circumference;
        ringProgress.style.strokeDashoffset = offset;
      }, 50);
    }

    // 分数动画
    if (scoreValue) animateNumber(scoreValue, 0, result.total, 1000);

    // 等级
    if (scoreGrade) {
      scoreGrade.setAttribute('class', 'score-grade grade-' + result.grade);
      scoreGrade.textContent = result.gradeLabel;
    }
    if (scoreGradeText) scoreGradeText.textContent = result.gradeDesc;

    // 六维
    if (dimList) {
      dimList.innerHTML = '';
      result.dimensions.forEach(function(dim) {
        var barClass = getBarClass(dim.score);
        var html = '<div class="dim-item">' +
          '<div class="dim-header">' +
            '<span class="dim-name">' + dim.name + '</span>' +
            '<span class="dim-score">' + dim.score + '<small>/100</small></span>' +
          '</div>' +
          '<div class="dim-bar-wrap"><div class="dim-bar ' + barClass + '" style="width:' + dim.score + '%"></div></div>' +
          '<div class="dim-desc">' + dim.desc + '</div>' +
          '<div class="dim-target">' + dim.target + '</div>' +
          '<div class="dim-weight">权重 ' + dim.weight + '%</div>' +
        '</div>';
        dimList.innerHTML += html;
      });
    }

    // 诊断文本
    if (diagText) diagText.textContent = result.diagnosis;

    // 保险建议
    if (insuranceTip) {
      insuranceTip.innerHTML = '<strong>保险建议：</strong>' + result.insuranceTip;
      insuranceTip.style.display = 'block';
    }

    // 投资持仓分析
    var holdingsEl = ids.holdingsPanel ? document.getElementById(ids.holdingsPanel) : null;
    if (holdingsEl && result.metrics) {
      var m = result.metrics;
      var hasHoldings = m.stockHoldingsCount > 0 || m.stockCash > 0;
      if (hasHoldings) {
        var pnlClass = m.holdingsPnl >= 0 ? 'up' : 'down';
        var pnlSign = m.holdingsPnl >= 0 ? '+' : '';
        var pctSign = m.holdingsPnlPct >= 0 ? '+' : '';
        var pnlColor = m.holdingsPnl >= 0 ? '#dc2626' : '#16a34a';
        var totalInvest = m.holdingsValue + m.stockCash;

        holdingsEl.style.display = 'block';
        holdingsEl.innerHTML =
          '<div class="diag-card" style="border-top-color:#2563eb;">' +
            '<h3 style="display:flex;align-items:center;gap:8px;">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>' +
              '投资资产分析' +
            '</h3>' +
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">' +
              '<div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;">' +
                '<div style="font-size:11px;color:#6b7280;margin-bottom:4px;">持仓市值</div>' +
                '<div style="font-size:17px;font-weight:700;color:#1e293b;">¥' + _fmt(m.holdingsValue) + '</div>' +
              '</div>' +
              '<div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;">' +
                '<div style="font-size:11px;color:#6b7280;margin-bottom:4px;">可用资金</div>' +
                '<div style="font-size:17px;font-weight:700;color:#2563eb;">¥' + _fmt(m.stockCash) + '</div>' +
              '</div>' +
              '<div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;">' +
                '<div style="font-size:11px;color:#6b7280;margin-bottom:4px;">投资总资产</div>' +
                '<div style="font-size:17px;font-weight:700;color:#1e40af;">¥' + _fmt(totalInvest) + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px;">' +
              '<div style="background:#f8fafc;border-radius:10px;padding:10px;text-align:center;">' +
                '<div style="font-size:11px;color:#6b7280;margin-bottom:4px;">持仓标的</div>' +
                '<div style="font-size:16px;font-weight:700;color:#1e293b;">' + m.stockHoldingsCount + ' 只</div>' +
              '</div>' +
              '<div style="background:#f8fafc;border-radius:10px;padding:10px;text-align:center;">' +
                '<div style="font-size:11px;color:#6b7280;margin-bottom:4px;">浮盈亏</div>' +
                '<div style="font-size:16px;font-weight:700;color:' + pnlColor + ';">' + pnlSign + '¥' + _fmt(m.holdingsPnl) + '</div>' +
              '</div>' +
              '<div style="background:#f8fafc;border-radius:10px;padding:10px;text-align:center;">' +
                '<div style="font-size:11px;color:#6b7280;margin-bottom:4px;">盈亏比例</div>' +
                '<div style="font-size:16px;font-weight:700;color:' + pnlColor + ';">' + pctSign + (m.holdingsPnlPct * 100).toFixed(2) + '%</div>' +
              '</div>' +
            '</div>' +
            '<div style="font-size:13px;color:#475569;line-height:1.7;">' +
              '<strong>分析：</strong>' +
              (m.holdingsCost > 0
                ? '当前持有 ' + m.stockHoldingsCount + ' 只投资标的，总成本 ¥' + _fmt(m.holdingsCost) + '，市值 ¥' + _fmt(m.holdingsValue) + '。' +
                  (m.holdingsPnl >= 0
                    ? '整体浮盈 ' + pnlSign + '¥' + _fmt(m.holdingsPnl) + '（' + pctSign + (m.holdingsPnlPct * 100).toFixed(2) + '%），投资处于盈利状态。'
                    : '整体浮亏 ' + pnlSign + '¥' + _fmt(Math.abs(m.holdingsPnl)) + '（' + pctSign + (m.holdingsPnlPct * 100).toFixed(2) + '%），建议审视持仓结构，考虑是否需要调仓。')
                : '暂无持仓记录，可用资金 ¥' + _fmt(m.stockCash) + '。') +
              (m.stockCash > 0 && totalInvest > 0
                ? '现金占投资资产比例为 ' + (m.stockCash / totalInvest * 100).toFixed(0) + '%，' +
                  (m.stockCash / totalInvest > 0.3 ? '仓位偏轻，可考虑逐步建仓。' : '仓位合理，留有充足弹药。')
                : '') +
            '</div>' +
          '</div>';
      } else {
        holdingsEl.style.display = 'none';
      }
    }

    // 改善建议
    if (suggestList) {
      suggestList.innerHTML = '';
      result.suggestions.forEach(function(sug, idx) {
        var s = sug.text;
        if (s && typeof s === 'object' && s.problem) {
          var html = '<div class="suggest-item">' +
            '<div class="suggest-icon">' + (idx + 1) + '</div>' +
            '<div class="suggest-text">' +
              '<div class="sug-problem"><strong>' + s.problem + '</strong></div>' +
              '<div class="sug-target"><span class="sug-label"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#6b7280" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:4px"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="6" width="4" height="15" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>达标区间</span>' + s.target + '</div>' +
              '<div class="sug-principle"><span class="sug-label"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>原理</span>' + s.principle + '</div>' +
              '<div class="sug-action"><span class="sug-label"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>怎么做</span>' + s.action + '</div>' +
              '<div class="sug-benefit"><span class="sug-label"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z"/></svg>好处</span>' + s.benefit + '</div>' +
            '</div>' +
          '</div>';
          suggestList.insertAdjacentHTML('beforeend', html);
        } else {
          var html2 = '<div class="suggest-item">' +
            '<div class="suggest-icon">' + (idx + 1) + '</div>' +
            '<div class="suggest-text">' + (typeof s === 'string' ? s : s.text) + '</div>' +
          '</div>';
          suggestList.insertAdjacentHTML('beforeend', html2);
        }
      });
    }
  }


  // ==================== 工具函数 ====================
  function getBarClass(score) {
    if (score >= 80) return 'bar-good';
    if (score >= 60) return 'bar-ok';
    if (score >= 40) return 'bar-warn';
    if (score >= 20) return 'bar-bad';
    return 'bar-danger';
  }

  function _fmt(v) {
    var n = parseFloat(v) || 0;
    return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function animateNumber(el, from, to, duration) {
    var start = performance.now();
    function tick(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(from + (to - from) * eased);
      el.innerHTML = current + '<small>/100</small>';
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }


  // ==================== 诊断存档（预留） ====================
  /**
   * 将本次诊断结果存档到DataStore
   * @param {Object} result - scoringEngine返回的结果
   * @param {string} tag - 存档标签（如 'manual' | 'auto'）
   */
  function saveSnapshot(result, tag) {
    if (!global.DataStore) {
      console.warn('[DiagnosisEngine] DataStore未加载，无法存档');
      return;
    }
    
    var snapshot = {
      timestamp: new Date().toISOString(),
      tag: tag || 'manual',
      total: result.total,
      grade: result.grade,
      gradeLabel: result.gradeLabel,
      metrics: result.metrics || {},
      dimensions: (result.dimensions || []).map(function(d) {
        return { name: d.name, score: d.score };
      })
    };

    // 读取已有存档列表
    var history = global.DataStore.load('wealth_ct', 'diagnosis_history', []);
    history.push(snapshot);
    
    // 最多保留24条（2年月报）
    if (history.length > 24) {
      history = history.slice(history.length - 24);
    }
    
    global.DataStore.save('wealth_ct', 'diagnosis_history', history);
    return snapshot;
  }

  /**
   * 获取诊断历史
   * @returns {Array} 诊断存档数组
   */
  function getHistory() {
    if (!global.DataStore) return [];
    return global.DataStore.load('wealth_ct', 'diagnosis_history', []);
  }


  // ==================== 真实数据桥接 + 完整诊断一键生成 ====================
  // v52.5.8：从新财富页（收支流水/投资持仓/保单/贷款）自动收集真实数据，
  // 组装成 scoringEngine 入参，供「财富诊断」一键生成完整报告。
  // 缺项一律按 0/空处理，不因数据不全而失败。
  function toNum(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  /**
   * 收集新财富页真实数据 → 组装为 scoringEngine 入参对象
   * 覆盖：收支(daily_tx)、储蓄/净资产(wealth_ct)、投资持仓(StockHoldings)、保险(WealthCT)、贷款(WealthCT)
   * @returns {Object} scoringEngine 入参
   */
  function collectWealthData() {
    var d = {
      jobIncome: 0, rentalIncome: 0, investIncome: 0, sideIncome: 0,
      expense: 0, savings: 0, equityInvest: 0, stableInvest: 0,
      property: 0, investProperty: 0, bankDebt: 0, otherDebt: 0,
      monthlyPay: 0, maxMonthlyPay: 0, housingFund: 0,
      housingFundYears: 0, commercialPremium: 0,
      insuranceList: [], stockHoldings: [], stockCash: 0, ageGroup: 0
    };

    // 1) 档案字段（wealth_ct_* 前缀，兼容旧版录入）
    if (global.WealthCT && typeof global.WealthCT.loadField === 'function') {
      var legacyKeys = [
        'jobIncome','rentalIncome','investIncome','sideIncome','expense','savings',
        'equityInvest','stableInvest','property','investProperty','otherDebt',
        'housingFund','housingFundYears','commercialPremium','ageGroup'
      ];
      legacyKeys.forEach(function(k) {
        var v = global.WealthCT.loadField(k, null);
        if (v !== null && v !== '' && v !== undefined) {
          d[k] = (k === 'ageGroup') ? toNum(v) : toNum(v);
        }
      });
    }

    // 2) 收支流水（本月按 CT 字段汇总）
    if (typeof global.getDailyTxSummary === 'function') {
      try {
        var s = global.getDailyTxSummary();
        if (s) {
          if (s.income) {
            d.jobIncome = Math.max(d.jobIncome, toNum(s.income.jobIncome));
            d.rentalIncome = Math.max(d.rentalIncome, toNum(s.income.rentalIncome));
            d.investIncome = Math.max(d.investIncome, toNum(s.income.investIncome));
            d.sideIncome = Math.max(d.sideIncome, toNum(s.income.sideIncome));
          }
          if (s.expense) {
            var exp = toNum(s.expense.expensePersonal) + toNum(s.expense.expenseFamily) +
                      toNum(s.expense.expenseEducation) + toNum(s.expense.expenseMedical);
            if (exp > 0) d.expense = Math.max(d.expense, exp);
          }
        }
      } catch(e) {}
    }

    // 3) 投资持仓（真实持仓优先，次之档案 equityInvest/stableInvest）
    if (global.StockHoldings && typeof global.StockHoldings.getHoldings === 'function') {
      try { d.stockHoldings = global.StockHoldings.getHoldings() || []; } catch(e) { d.stockHoldings = []; }
    }
    var holdingsValue = 0;
    (d.stockHoldings || []).forEach(function(h) {
      holdingsValue += toNum(h.quantity) * toNum(h.current_price);
    });
    if (holdingsValue > 0) d.equityInvest = Math.max(d.equityInvest, holdingsValue);
    try {
      if (global.StockHoldings && typeof global.StockHoldings.calcSummary === 'function') {
        var calc = global.StockHoldings.calcSummary();
        if (calc && calc.cash) d.stockCash = toNum(calc.cash);
      } else if (global.DataStore && typeof global.DataStore.load === 'function') {
        d.stockCash = toNum(global.DataStore.load('stock_holdings', 'cash', 0));
      }
    } catch(e) {}
    if (d.stockCash > 0) d.stableInvest = Math.max(d.stableInvest, d.stockCash);

    // 4) 贷款 + 保险（wealth_ct 前缀）
    var loans = [], insurance = [];
    if (global.WealthCT && typeof global.WealthCT.loadLoans === 'function') {
      try { loans = global.WealthCT.loadLoans() || []; } catch(e) {}
    }
    if (global.WealthCT && typeof global.WealthCT.loadInsurance === 'function') {
      try { insurance = global.WealthCT.loadInsurance() || []; } catch(e) {}
    }

    var totalBankDebt = 0, totalCurPay = 0, totalMaxPay = 0;
    loans.forEach(function(L) {
      var amt = toNum(L.amt);
      if (amt <= 0) return;
      totalBankDebt += amt;
      var rate = toNum(L.rate) / 100 / 12;
      var term = toNum(L.term) || 1;
      var cur = 0, mx = 0;
      if (rate > 0 && term > 0) {
        var f = Math.pow(1 + rate, term);
        cur = amt * rate * f / (f - 1);
        mx = cur;
      } else if (term > 0) {
        cur = amt / term;
        mx = cur;
      }
      totalCurPay += cur;
      totalMaxPay += Math.max(cur, mx);
    });
    if (totalBankDebt > 0) d.bankDebt = Math.max(d.bankDebt || 0, Math.round(totalBankDebt));
    if (totalCurPay > 0) d.monthlyPay = Math.max(d.monthlyPay || 0, Math.round(totalCurPay));
    if (totalMaxPay > 0) d.maxMonthlyPay = Math.max(d.maxMonthlyPay || 0, Math.round(totalMaxPay));

    var premiumSum = 0;
    var mapped = (insurance || []).map(function(it) {
      var premium = toNum(it.premium);
      premiumSum += premium;
      return {
        type: it.type || 'life',
        amount: toNum(it.amount),
        premium: premium,
        term: toNum(it.term),
        paid: toNum(it.paid)
      };
    });
    d.insuranceList = mapped;
    if (!d.commercialPremium && premiumSum > 0) d.commercialPremium = premiumSum;

    return d;
  }

  /**
   * 打开完整诊断报告弹层
   */
  function openDiagnosisModal() {
    var ov = document.getElementById('wealthDiagOverlay');
    if (ov) ov.classList.add('active');
    try { document.body.style.overflow = 'hidden'; } catch(e) {}
    var loading = document.getElementById('wealthDiagLoading');
    if (loading) loading.style.display = 'block';
  }

  /**
   * 关闭完整诊断报告弹层
   */
  function closeDiagnosisModal() {
    var ov = document.getElementById('wealthDiagOverlay');
    if (ov) ov.classList.remove('active');
    try { document.body.style.overflow = ''; } catch(e) {}
    if (typeof global.closeWealthDiagnosis === 'function') {
      try { global.closeWealthDiagnosis(); } catch(e) {}
    }
  }

  /**
   * 一键完整诊断：收集真实数据 → run 评分 → render 到弹层 → 存档
   * @param {Object} [opts] 保留参数
   * @returns {Object|null} scoringEngine 结果
   */
  function runFull(opts) {
    try {
      openDiagnosisModal();
      var data = collectWealthData();
      var result = scoringEngine(data);
      global.__wealthDiagLast = { result: result, data: data };
      renderResults(result, {
        section: 'wealthDiagSection',
        ring: 'wealthDiagRing',
        scoreValue: 'wealthDiagScoreValue',
        scoreGrade: 'wealthDiagScoreGrade',
        scoreGradeText: 'wealthDiagScoreGradeText',
        dimList: 'wealthDiagDimList',
        diagText: 'wealthDiagDiagText',
        insuranceTip: 'wealthDiagInsuranceTip',
        suggestList: 'wealthDiagSuggestList',
        holdingsPanel: 'wealthDiagHoldingsPanel'
      });
      var loading = document.getElementById('wealthDiagLoading');
      if (loading) loading.style.display = 'none';
      try { saveSnapshot(result, 'auto'); } catch(e) {}
      // 同步总览卡片诊断结论 / 渲染历史趋势（若页面已定义对应函数）——v52.8.0 追加 hero 主卡回写
      try {
        if (typeof global.updateWealthDiagnosisSummary === 'function') {
          global.updateWealthDiagnosisSummary(result);
        }
        if (typeof global.syncWealthScore === 'function') {
          global.syncWealthScore();
        }
        if (typeof global.afterWealthDiagRender === 'function') {
          global.afterWealthDiagRender(result);
        }
      } catch(e) {}
      return result;
    } catch(e) {
      try {
        if (typeof global.showToast === 'function') global.showToast('诊断生成失败：' + e.message);
        else alert('诊断生成失败：' + e.message);
      } catch(e2) {}
      return null;
    }
  }


  // ==================== 导出 ====================
  var DiagnosisEngine = {
    version: '1.1.0',

    // 核心方法
    run: scoringEngine,
    render: renderResults,

    // 存档方法
    saveSnapshot: saveSnapshot,
    getHistory: getHistory,

    // v52.5.8：一键完整诊断 + 真实数据桥接 + 弹层控制
    runFull: runFull,
    collectData: collectWealthData,
    openModal: openDiagnosisModal,
    closeModal: closeDiagnosisModal,

    // 工具方法
    getBarClass: getBarClass
  };

  global.DiagnosisEngine = DiagnosisEngine;

})(window);
