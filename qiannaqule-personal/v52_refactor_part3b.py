#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MiRun AI v52 架构终版重构脚本 - Part 3B: 生活Tab升级（财富+家庭教育双支柱）
"""
import re

FILE_PATH = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/index.html'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ============ 替换生活Tab为财富+家庭教育双支柱 ============
pattern_life = r'<div id="page-life" class="page-view">.*?<!-- END page-life -->'
new_life = '''<div id="page-life" class="page-view">
  <!-- 顶层分段：财富管理 / 家庭教育 -->
  <div class="domain-switcher" id="lifeDomainSwitcher">
    <button class="domain-switch-item active" data-domain="wealth" onclick="switchLifeDomain('wealth')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      财富管理
    </button>
    <button class="domain-switch-item" data-domain="education" onclick="switchLifeDomain('education')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
      家庭教育
    </button>
  </div>

  <!-- ========== 财富管理域 ========== -->
  <div id="life-wealth-domain" class="life-domain active">
    <div class="sub-tab-bar" id="lifeSubTabBar">
      <button class="sub-tab-item active" data-sub="finance" onclick="switchSubTab('life', 'finance')">
        <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
        <span class="sub-tab-text">收支</span>
      </button>
      <button class="sub-tab-item" data-sub="investment" onclick="switchSubTab('life', 'investment')">
        <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span>
        <span class="sub-tab-text">投资</span>
      </button>
      <button class="sub-tab-item" data-sub="insurance" onclick="switchSubTab('life', 'insurance')">
        <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
        <span class="sub-tab-text">保障</span>
      </button>
      <button class="sub-tab-item" data-sub="diagnosis" onclick="switchSubTab('life', 'diagnosis')">
        <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
        <span class="sub-tab-text">诊断</span>
      </button>
    </div>

    <!-- 收支管理 -->
    <div id="life-finance" class="sub-tab-content active">
      <!-- 第一层：整体看板 -->
      <div class="dashboard-hero">
        <div class="dashboard-hero-label">财富健康评分</div>
        <div class="dashboard-hero-score"><span id="wealthScore">-</span><span class="unit">分</span></div>
        <div class="dashboard-hero-trend">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          本月趋势
        </div>
        <div class="dashboard-hero-conclusion" id="wealthConclusion">
          收支·投资·保障 三大支柱<br>
          开始记录，生成你的财富画像。
        </div>
      </div>

      <!-- 层级切换：个人/家庭/社会 -->
      <div class="layer-switcher">
        <div class="layer-switcher-item active" onclick="switchLifeLayer('personal')">个人</div>
        <div class="layer-switcher-item" onclick="switchLifeLayer('family')">家庭</div>
        <div class="layer-switcher-item" onclick="switchLifeLayer('society')">社会</div>
      </div>

      <!-- 第二层：明细卡片 -->
      <div class="dashboard-detail-section">
        <div class="dashboard-detail-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          收支明细
        </div>
        <div class="dashboard-grid">
          <div class="dashboard-detail-card" onclick="showDailyTxDetail()">
            <div class="ddc-icon" style="background:#eff6ff;color:#2563eb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            </div>
            <div class="ddc-title">本月收入</div>
            <div class="ddc-value" id="lifeIncome">-</div>
            <div class="ddc-desc">元</div>
          </div>
          <div class="dashboard-detail-card" onclick="showDailyTxDetail()">
            <div class="ddc-icon" style="background:#fee2e2;color:#ef4444">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </div>
            <div class="ddc-title">本月支出</div>
            <div class="ddc-value" id="lifeExpense">-</div>
            <div class="ddc-desc">元</div>
          </div>
          <div class="dashboard-detail-card" onclick="showDailyTxDetail()">
            <div class="ddc-icon" style="background:#ecfdf5;color:#10b981">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div class="ddc-title">结余率</div>
            <div class="ddc-value" id="lifeSaveRate">-</div>
            <div class="ddc-desc">%</div>
          </div>
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#fef3c7;color:#d97706">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="ddc-title">记账天数</div>
            <div class="ddc-value" id="lifeTxDays">0</div>
            <div class="ddc-desc">天连续</div>
          </div>
        </div>
        <div id="dailyTxDetailContainer" style="display:none">
          <div id="dailyTxContainer"></div>
        </div>
      </div>

      <!-- 家庭层占位 -->
      <div id="lifeFinanceFamily" class="placeholder-card" style="display:none">
        <div class="placeholder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div class="placeholder-title">家庭资产总览</div>
        <div class="placeholder-desc">家庭资产合并统计 · 家庭财务目标<br>家庭版功能规划中</div>
      </div>
      <!-- 社会层占位 -->
      <div id="lifeFinanceSociety" class="placeholder-card" style="display:none">
        <div class="placeholder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3"/></svg>
        </div>
        <div class="placeholder-title">市场行情参考</div>
        <div class="placeholder-desc">通胀对冲建议 · 社会阶层跃迁路径<br>社会层功能规划中</div>
      </div>

      <!-- 第三层：AI建议 -->
      <div class="dashboard-ai-section">
        <div class="dashboard-ai-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 2l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
          AI 财富建议
        </div>
        <div class="ai-suggestion-card">
          <div class="ai-sug-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="ai-sug-content">
            <div class="ai-sug-text">每月存下收入的20%，是财务自由的第一步。</div>
            <span class="ai-sug-detail">查看详情 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
          </div>
        </div>
        <div class="ai-suggestion-card">
          <div class="ai-sug-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="ai-sug-content">
            <div class="ai-sug-text">建立3-6个月生活费的应急基金，再考虑投资。</div>
            <span class="ai-sug-detail">查看详情 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 投资持仓 -->
    <div id="life-investment" class="sub-tab-content">
      <div class="dashboard-section">
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <div class="dashboard-card-title">投资持仓</div>
              <div class="dashboard-card-subtitle">让钱为你工作</div>
            </div>
            <span class="dashboard-card-tag">持仓</span>
          </div>
          <div class="dashboard-big-number"><span id="investTotal">-</span><span class="unit">元</span></div>
          <div class="dashboard-conclusion" id="investConclusion">
            累计收益 <span class="highlight" id="investProfit">0</span> 元<br>
            用对话记录：「买入贵州茅台100股」
          </div>
        </div>
        <div id="holdingsDetailContainer">
          <div id="stockHoldingsContainer"></div>
        </div>
      </div>
    </div>

    <!-- 保险保障 -->
    <div id="life-insurance" class="sub-tab-content">
      <div class="dashboard-section">
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <div class="dashboard-card-title">保险与贷款</div>
              <div class="dashboard-card-subtitle">守护你的财富底线</div>
            </div>
            <span class="dashboard-card-tag">规划中</span>
          </div>
          <div style="display:flex;gap:12px;margin:16px 0">
            <div style="flex:1;text-align:center;padding:16px;background:#f8fafc;border-radius:12px">
              <div style="font-size:20px;font-weight:700;color:#2563eb" id="insuranceCount">0</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px">保单</div>
            </div>
            <div style="flex:1;text-align:center;padding:16px;background:#f8fafc;border-radius:12px">
              <div style="font-size:20px;font-weight:700;color:#ef4444" id="loanCount">0</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px">贷款</div>
            </div>
          </div>
          <div class="dashboard-conclusion">
            保障体系功能规划中。<br>
            先有保障，再谈投资。
          </div>
        </div>
      </div>
    </div>

    <!-- 财富诊断 -->
    <div id="life-diagnosis" class="sub-tab-content">
      <div class="dashboard-section">
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <div class="dashboard-card-title">财富诊断</div>
              <div class="dashboard-card-subtitle">全面评估你的财务健康</div>
            </div>
            <span class="dashboard-card-tag" id="wealthStageTag">吴晓波体系</span>
          </div>
          <div class="dashboard-big-number"><span id="wealthDiagnosisScore">-</span><span class="unit">分</span></div>
          <div class="dashboard-conclusion" id="wealthDiagnosisConclusion">
            基于收支·投资·保障三大维度<br>
            点击下方按钮生成完整诊断报告
          </div>
        </div>
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div class="dashboard-card-title">财富成长阶段</div>
          </div>
          <div class="wealth-stage-list">
            <div class="wealth-stage-item active">
              <div class="ws-num">1</div>
              <div class="ws-body">
                <div class="ws-title">财务生存</div>
                <div class="ws-desc">收入覆盖支出，略有结余</div>
              </div>
            </div>
            <div class="wealth-stage-item">
              <div class="ws-num">2</div>
              <div class="ws-body">
                <div class="ws-title">财务安全</div>
                <div class="ws-desc">6个月应急金+基础保障</div>
              </div>
            </div>
            <div class="wealth-stage-item">
              <div class="ws-num">3</div>
              <div class="ws-body">
                <div class="ws-title">财务自由</div>
                <div class="ws-desc">被动收入覆盖日常支出</div>
              </div>
            </div>
          </div>
          <button class="profile-edit-btn" onclick="runWealthDiagnosis()">生成财富诊断报告</button>
        </div>
      </div>
    </div>
  </div>
  <!-- END 财富管理域 -->

  <!-- ========== 家庭教育域 ========== -->
  <div id="life-education-domain" class="life-domain">
    <div class="sub-tab-bar" id="eduSubTabBar">
      <button class="sub-tab-item active" data-sub="overview" onclick="switchSubTab('edu', 'overview')">
        <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span>
        <span class="sub-tab-text">总览</span>
      </button>
      <button class="sub-tab-item" data-sub="learning" onclick="switchSubTab('edu', 'learning')">
        <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></span>
        <span class="sub-tab-text">学习</span>
      </button>
      <button class="sub-tab-item" data-sub="growth" onclick="switchSubTab('edu', 'growth')">
        <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
        <span class="sub-tab-text">成长</span>
      </button>
      <button class="sub-tab-item" data-sub="fund" onclick="switchSubTab('edu', 'fund')">
        <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
        <span class="sub-tab-text">教育金</span>
      </button>
      <button class="sub-tab-item" data-sub="activity" onclick="switchSubTab('edu', 'activity')">
        <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></span>
        <span class="sub-tab-text">亲子</span>
      </button>
    </div>

    <!-- 教育总览 -->
    <div id="edu-overview" class="sub-tab-content active">
      <!-- 第一层：整体看板 -->
      <div class="dashboard-hero" style="background:linear-gradient(135deg, #8b5cf6, #7c3aed)">
        <div class="dashboard-hero-label" style="color:rgba(255,255,255,0.8)">家庭教育指数</div>
        <div class="dashboard-hero-score" style="color:#fff"><span id="eduIndex">-</span><span class="unit" style="color:rgba(255,255,255,0.7)">分</span></div>
        <div class="dashboard-hero-trend" style="color:rgba(255,255,255,0.7)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          家庭幸福度
        </div>
        <div class="dashboard-hero-conclusion" id="eduConclusion" style="color:rgba(255,255,255,0.85)">
          学习·成长·教育金·亲子活动<br>
          为孩子打造最好的成长环境。
        </div>
      </div>

      <!-- 层级切换：个人/家庭/社会 -->
      <div class="layer-switcher">
        <div class="layer-switcher-item active" onclick="switchEduLayer('personal')">个人</div>
        <div class="layer-switcher-item" onclick="switchEduLayer('family')">家庭</div>
        <div class="layer-switcher-item" onclick="switchEduLayer('society')">社会</div>
      </div>

      <!-- 第二层：明细卡片 -->
      <div class="dashboard-detail-section">
        <div class="dashboard-detail-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          四大维度
        </div>
        <div class="dashboard-grid">
          <div class="dashboard-detail-card" onclick="switchSubTab('edu', 'learning')">
            <div class="ddc-icon" style="background:#f5f3ff;color:#8b5cf6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <div class="ddc-title">学习规划</div>
            <div class="ddc-value" id="eduLearningCount">-</div>
            <div class="ddc-desc">项进行中</div>
          </div>
          <div class="dashboard-detail-card" onclick="switchSubTab('edu', 'growth')">
            <div class="ddc-icon" style="background:#ecfdf5;color:#10b981">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div class="ddc-title">成长记录</div>
            <div class="ddc-value" id="eduGrowthCount">0</div>
            <div class="ddc-desc">条里程碑</div>
          </div>
          <div class="dashboard-detail-card" onclick="switchSubTab('edu', 'fund')">
            <div class="ddc-icon" style="background:#fef3c7;color:#d97706">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="ddc-title">教育金</div>
            <div class="ddc-value" id="eduFundAmount">-</div>
            <div class="ddc-desc">元已存</div>
          </div>
          <div class="dashboard-detail-card" onclick="switchSubTab('edu', 'activity')">
            <div class="ddc-icon" style="background:#fee2e2;color:#ef4444">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </div>
            <div class="ddc-title">亲子活动</div>
            <div class="ddc-value" id="eduActivityCount">0</div>
            <div class="ddc-desc">本月活动</div>
          </div>
        </div>
      </div>

      <!-- 家庭层占位 -->
      <div id="eduFamily" class="placeholder-card" style="display:none">
        <div class="placeholder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="placeholder-title">家庭成员教育档案</div>
        <div class="placeholder-desc">每个孩子独立的学习成长档案<br>家庭版功能规划中</div>
      </div>
      <!-- 社会层占位 -->
      <div id="eduSociety" class="placeholder-card" style="display:none">
        <div class="placeholder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <div class="placeholder-title">升学政策与资源</div>
        <div class="placeholder-desc">学区政策 · 教育资源对比 · 升学路径规划<br>社会层功能规划中</div>
      </div>

      <!-- 第三层：AI建议 -->
      <div class="dashboard-ai-section">
        <div class="dashboard-ai-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 2l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
          AI 家庭教育建议
        </div>
        <div class="ai-suggestion-card">
          <div class="ai-sug-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <div class="ai-sug-content">
            <div class="ai-sug-text">每天15分钟高质量陪伴，胜过整天的"无效陪同"。</div>
            <span class="ai-sug-detail">查看详情 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
          </div>
        </div>
        <div class="ai-suggestion-card">
          <div class="ai-sug-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="ai-sug-content">
            <div class="ai-sug-text">教育金越早规划越好，复利的力量需要时间来体现。</div>
            <span class="ai-sug-detail">查看详情 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 学习规划 -->
    <div id="edu-learning" class="sub-tab-content">
      <div class="dashboard-section">
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <div class="dashboard-card-title">学习规划</div>
              <div class="dashboard-card-subtitle">学期目标 · 科目重点 · 进度追踪</div>
            </div>
            <span class="dashboard-card-tag">规划中</span>
          </div>
          <div class="dashboard-conclusion">
            学习规划功能规划中。<br>
            对AI说：「帮孩子制定一个学期学习计划」
          </div>
        </div>
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div class="dashboard-card-title">学习小贴士</div>
          </div>
          <div class="dashboard-conclusion">
            · 番茄工作法：25分钟专注+5分钟休息<br>
            · 费曼学习法：用自己的话讲出来<br>
            · 间隔重复：定期复习比一次学更多更有效
          </div>
        </div>
      </div>
    </div>

    <!-- 成长记录 -->
    <div id="edu-growth" class="sub-tab-content">
      <div class="dashboard-section">
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <div class="dashboard-card-title">成长记录</div>
              <div class="dashboard-card-subtitle">身高体重 · 里程碑 · 获奖证书</div>
            </div>
            <span class="dashboard-card-tag">规划中</span>
          </div>
          <div class="dashboard-conclusion">
            成长记录功能规划中。<br>
            记录孩子成长的每一个重要瞬间。
          </div>
        </div>
      </div>
    </div>

    <!-- 教育金 -->
    <div id="edu-fund" class="sub-tab-content">
      <div class="dashboard-section">
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <div class="dashboard-card-title">教育金计划</div>
              <div class="dashboard-card-subtitle">专项储蓄 · 投入收益追踪</div>
            </div>
            <span class="dashboard-card-tag">规划中</span>
          </div>
          <div class="dashboard-big-number"><span id="eduFundTotal">-</span><span class="unit">元</span></div>
          <div class="dashboard-conclusion">
            教育金是对孩子未来的最好投资。<br>
            对AI说：「帮我规划一份教育金储蓄计划」
          </div>
        </div>
      </div>
    </div>

    <!-- 亲子活动 -->
    <div id="edu-activity" class="sub-tab-content">
      <div class="dashboard-section">
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <div class="dashboard-card-title">亲子活动</div>
              <div class="dashboard-card-subtitle">家庭日历联动 · 活动推荐</div>
            </div>
            <span class="dashboard-card-tag">规划中</span>
          </div>
          <div class="dashboard-conclusion">
            亲子活动功能规划中。<br>
            让每一次陪伴都充满意义。
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- END 家庭教育域 -->

  <div class="app-brand-footer">
    <img src="./assets/mierke-logo.png" alt="米儿客" style="height:16px;vertical-align:middle;margin-right:6px;opacity:0.7">
    <span>米儿客出品 · 数据仅存本地</span>
  </div>
</div>
<!-- END page-life -->'''

content = re.sub(pattern_life, new_life, content, flags=re.DOTALL)
print("生活Tab已升级为财富+家庭教育双支柱")

# ============ 添加域名切换器CSS ============
domain_css = '''
/* v52 生活Tab - 域名切换器（财富/教育） */
.domain-switcher {
  display: flex;
  background: #fff;
  padding: 12px 16px 0;
  gap: 8px;
  border-bottom: 1px solid #f1f5f9;
}
.domain-switch-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  background: #f8fafc;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.25s ease;
}
.domain-switch-item.active {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  color: #2563eb;
  box-shadow: 0 2px 8px rgba(37,99,235,0.15);
}
.domain-switch-item svg { flex-shrink: 0; }
.life-domain { display: none; }
.life-domain.active { display: block; }
'''

# 在 .placeholder-desc 后插入（v52 CSS区域）
pp = content.rfind('.placeholder-desc {')
if pp != -1:
    # 找到这个规则的结束 }
    brace_end = content.find('}', pp + 20)
    content = content[:brace_end+1] + '\n' + domain_css + content[brace_end+1:]
    print("域名切换器CSS已添加")

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Part 3B 完成，当前行数: {len(content.splitlines())}")
