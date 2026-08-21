#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
v52 财富管理三层范式重构
将 life-wealth-domain 从4个平级子Tab改为三层范式：
第一层：整体看板（财富健康总分+评语+净资产+三大支柱占比+成长阶段）
第二层：明细卡片（收支/投资/保障 分段切换）
第三层：AI建议区（诊断报告+资产配置+成长路径+风险预警）
"""

import re

filepath = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/index.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ================== 1. 找到财富域起始和结束 ==================
start_marker = '  <!-- ========== 财富管理域 ========== -->'
end_marker = '  <!-- END 财富管理域 -->'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker) + len(end_marker)

assert start_idx != -1, "未找到财富管理域起始标记"
assert end_idx != len(end_marker) - 1, "未找到财富管理域结束标记"

old_block = content[start_idx:end_idx]
print(f"原财富域长度: {len(old_block)} 字符")

# ================== 2. 构建新的财富域内容 ==================
new_wealth_domain = '''  <!-- ========== 财富管理域 ========== -->
  <div id="life-wealth-domain" class="life-domain active">
    <!-- 第一层：整体看板 -->
    <div class="dashboard-hero" style="background:linear-gradient(135deg,#2563eb,#1d4ed8)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="dashboard-hero-label" style="color:rgba(255,255,255,0.8)">财富健康评分</div>
          <div class="dashboard-hero-score" style="color:#fff"><span id="wealthScore">-</span><span class="unit" style="color:rgba(255,255,255,0.7)">分</span></div>
        </div>
        <span class="dashboard-card-tag" style="background:rgba(255,255,255,0.2);color:#fff;border:none">财富成长体系</span>
      </div>
      <div class="dashboard-hero-trend" style="color:rgba(255,255,255,0.7)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        本月趋势
      </div>
      <div class="dashboard-hero-conclusion" id="wealthConclusion" style="color:rgba(255,255,255,0.85)">
        收支·投资·保障 三大支柱<br>
        开始记录，生成你的财富画像。
      </div>
      <!-- 净资产 & 三大支柱概览 -->
      <div class="wealth-hero-stats">
        <div class="whs-item">
          <div class="whs-label">净资产</div>
          <div class="whs-value" id="wealthNetAssets">-</div>
          <div class="whs-unit">元</div>
        </div>
        <div class="whs-divider"></div>
        <div class="whs-item">
          <div class="whs-label">总资产</div>
          <div class="whs-value" id="wealthTotalAssets">-</div>
          <div class="whs-unit">元</div>
        </div>
        <div class="whs-divider"></div>
        <div class="whs-item">
          <div class="whs-label">总负债</div>
          <div class="whs-value" id="wealthTotalLiabilities">-</div>
          <div class="whs-unit">元</div>
        </div>
      </div>
      <!-- 三大支柱占比环图 + 成长阶段 -->
      <div class="wealth-hero-bottom">
        <div class="wealth-pie-wrap">
          <svg viewBox="0 0 120 120" width="80" height="80" id="wealthPillarsPie">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="10"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#60a5fa" stroke-width="10" stroke-dasharray="157 314" stroke-dashoffset="0" transform="rotate(-90 60 60)"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#34d399" stroke-width="10" stroke-dasharray="94 314" stroke-dashoffset="-157" transform="rotate(-90 60 60)"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#fbbf24" stroke-width="10" stroke-dasharray="63 314" stroke-dashoffset="-251" transform="rotate(-90 60 60)"/>
          </svg>
          <div class="wealth-pie-legend">
            <div class="wpl-item"><span class="wpl-dot" style="background:#60a5fa"></span>收支 50%</div>
            <div class="wpl-item"><span class="wpl-dot" style="background:#34d399"></span>投资 30%</div>
            <div class="wpl-item"><span class="wpl-dot" style="background:#fbbf24"></span>保障 20%</div>
          </div>
        </div>
        <div class="wealth-stage-mini">
          <div class="wsm-title">财富成长阶段</div>
          <div class="wsm-steps">
            <div class="wsm-step active">
              <div class="wsm-dot"></div>
              <div class="wsm-label">财务生存</div>
            </div>
            <div class="wsm-line"></div>
            <div class="wsm-step">
              <div class="wsm-dot"></div>
              <div class="wsm-label">财务安全</div>
            </div>
            <div class="wsm-line"></div>
            <div class="wsm-step">
              <div class="wsm-dot"></div>
              <div class="wsm-label">财务自由</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 层级切换：个人/家庭/社会 -->
    <div class="layer-switcher">
      <div class="layer-switcher-item active" onclick="switchWealthLayer('personal')">个人</div>
      <div class="layer-switcher-item" onclick="switchWealthLayer('family')">家庭</div>
      <div class="layer-switcher-item" onclick="switchWealthLayer('society')">社会</div>
    </div>

    <!-- 第二层：明细卡片 - 三大支柱分段切换 -->
    <div class="dashboard-detail-section" id="wealthDetailSection">
      <!-- 分段切换器 -->
      <div class="wealth-pillar-switcher">
        <div class="wps-item active" data-pillar="income" onclick="switchWealthPillar('income')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          收支
        </div>
        <div class="wps-item" data-pillar="invest" onclick="switchWealthPillar('invest')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          投资
        </div>
        <div class="wps-item" data-pillar="insurance" onclick="switchWealthPillar('insurance')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          保障
        </div>
      </div>

      <!-- 收支柱内容 -->
      <div id="wealthPillarIncome" class="wealth-pillar-content active">
        <div class="dashboard-detail-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          收支明细
          <span class="ddc-source-tag small" title="对话录入" style="margin-left:auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="10" height="10"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            对话
          </span>
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
        <!-- 收支分类饼图 -->
        <div class="wealth-chart-card">
          <div class="wcc-title">支出分类</div>
          <div class="wcc-body">
            <div class="wcc-pie">
              <svg viewBox="0 0 100 100" width="90" height="90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" stroke-width="12"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#2563eb" stroke-width="12" stroke-dasharray="80 251" stroke-dashoffset="0" transform="rotate(-90 50 50)"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" stroke-width="12" stroke-dasharray="63 251" stroke-dashoffset="-80" transform="rotate(-90 50 50)"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" stroke-width="12" stroke-dasharray="50 251" stroke-dashoffset="-143" transform="rotate(-90 50 50)"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" stroke-width="12" stroke-dasharray="38 251" stroke-dashoffset="-193" transform="rotate(-90 50 50)"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" stroke-width="12" stroke-dasharray="20 251" stroke-dashoffset="-231" transform="rotate(-90 50 50)"/>
              </svg>
            </div>
            <div class="wcc-legend">
              <div class="wccl-item"><span class="wccl-dot" style="background:#2563eb"></span>餐饮 32%</div>
              <div class="wccl-item"><span class="wccl-dot" style="background:#10b981"></span>交通 25%</div>
              <div class="wccl-item"><span class="wccl-dot" style="background:#f59e0b"></span>购物 20%</div>
              <div class="wccl-item"><span class="wccl-dot" style="background:#8b5cf6"></span>居住 15%</div>
              <div class="wccl-item"><span class="wccl-dot" style="background:#ef4444"></span>其他 8%</div>
            </div>
          </div>
        </div>
        <!-- 最近5笔交易 -->
        <div class="wealth-list-card">
          <div class="wlc-header">
            <div class="wlc-title">最近交易</div>
            <div class="wlc-more" onclick="showDailyTxDetail()">查看全部
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
          <div id="wealthRecentTxList" class="wlc-list">
            <div class="wlc-empty">暂无交易记录，对AI说「记一笔午饭30元」开始记账</div>
          </div>
        </div>
        <div id="dailyTxDetailContainer" style="display:none">
          <div id="dailyTxContainer"></div>
        </div>
      </div>

      <!-- 投资柱内容 -->
      <div id="wealthPillarInvest" class="wealth-pillar-content">
        <div class="dashboard-detail-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          投资持仓
          <span class="ddc-source-tag small" title="手动录入" style="margin-left:auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="10" height="10"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            手动
          </span>
        </div>
        <div class="dashboard-grid">
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#eff6ff;color:#2563eb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="ddc-title">持仓总市值</div>
            <div class="ddc-value" id="investTotal">-</div>
            <div class="ddc-desc">元</div>
          </div>
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#ecfdf5;color:#10b981">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            </div>
            <div class="ddc-title">累计收益</div>
            <div class="ddc-value" id="investProfit">0</div>
            <div class="ddc-desc">元</div>
          </div>
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#fef3c7;color:#d97706">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div class="ddc-title">收益率</div>
            <div class="ddc-value" id="investReturnRate">-</div>
            <div class="ddc-desc">%</div>
          </div>
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#f5f3ff;color:#8b5cf6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/></svg>
            </div>
            <div class="ddc-title">持仓数量</div>
            <div class="ddc-value" id="investHoldingsCount">0</div>
            <div class="ddc-desc">只/支</div>
          </div>
        </div>
        <!-- 收益曲线迷你图 -->
        <div class="wealth-chart-card">
          <div class="wcc-title">收益走势</div>
          <div class="wcc-mini-chart">
            <svg viewBox="0 0 300 80" width="100%" height="60" preserveAspectRatio="none">
              <defs>
                <linearGradient id="investGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.3"/>
                  <stop offset="100%" style="stop-color:#10b981;stop-opacity:0"/>
                </linearGradient>
              </defs>
              <path d="M0,60 L30,55 L60,50 L90,45 L120,50 L150,40 L180,35 L210,30 L240,25 L270,20 L300,15 L300,80 L0,80 Z" fill="url(#investGrad)"/>
              <path d="M0,60 L30,55 L60,50 L90,45 L120,50 L150,40 L180,35 L210,30 L240,25 L270,20 L300,15" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <!-- 持仓TOP3 -->
        <div class="wealth-list-card">
          <div class="wlc-header">
            <div class="wlc-title">持仓 TOP3</div>
            <div class="wlc-more" onclick="openHoldingsManager()">管理持仓
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
          <div id="wealthTopHoldings" class="wlc-list">
            <div class="wlc-empty">暂无持仓，对AI说「买入贵州茅台100股」</div>
          </div>
        </div>
        <div id="holdingsDetailContainer">
          <div id="stockHoldingsContainer"></div>
        </div>
      </div>

      <!-- 保障柱内容 -->
      <div id="wealthPillarInsurance" class="wealth-pillar-content">
        <div class="dashboard-detail-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          保险与贷款
          <span class="ddc-source-tag small" title="手动录入" style="margin-left:auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="10" height="10"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            手动
          </span>
        </div>
        <div class="dashboard-grid">
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#eff6ff;color:#2563eb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div class="ddc-title">保单数量</div>
            <div class="ddc-value" id="insuranceCount">0</div>
            <div class="ddc-desc">份</div>
          </div>
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#fee2e2;color:#ef4444">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M2 20h20"/><path d="M5 20V8l7-4 7 4v12"/></svg>
            </div>
            <div class="ddc-title">贷款笔数</div>
            <div class="ddc-value" id="loanCount">0</div>
            <div class="ddc-desc">笔</div>
          </div>
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#ecfdf5;color:#10b981">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
            </div>
            <div class="ddc-title">总保额</div>
            <div class="ddc-value" id="insuranceTotalCoverage">-</div>
            <div class="ddc-desc">元</div>
          </div>
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#fef3c7;color:#d97706">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="ddc-title">年缴保费</div>
            <div class="ddc-value" id="insuranceAnnualPremium">-</div>
            <div class="ddc-desc">元/年</div>
          </div>
        </div>
        <!-- 保单类型分布 -->
        <div class="wealth-chart-card">
          <div class="wcc-title">保单类型分布</div>
          <div class="wcc-body">
            <div class="wcc-pie">
              <svg viewBox="0 0 100 100" width="90" height="90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" stroke-width="12"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#2563eb" stroke-width="12" stroke-dasharray="100 251" stroke-dashoffset="0" transform="rotate(-90 50 50)"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" stroke-width="12" stroke-dasharray="75 251" stroke-dashoffset="-100" transform="rotate(-90 50 50)"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" stroke-width="12" stroke-dasharray="50 251" stroke-dashoffset="-175" transform="rotate(-90 50 50)"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" stroke-width="12" stroke-dasharray="26 251" stroke-dashoffset="-225" transform="rotate(-90 50 50)"/>
              </svg>
            </div>
            <div class="wcc-legend">
              <div class="wccl-item"><span class="wccl-dot" style="background:#2563eb"></span>寿险 40%</div>
              <div class="wccl-item"><span class="wccl-dot" style="background:#10b981"></span>重疾 30%</div>
              <div class="wccl-item"><span class="wccl-dot" style="background:#f59e0b"></span>医疗 20%</div>
              <div class="wccl-item"><span class="wccl-dot" style="background:#8b5cf6"></span>意外 10%</div>
            </div>
          </div>
        </div>
        <!-- 保单列表 + 贷款列表 -->
        <div class="wealth-list-card">
          <div class="wlc-header">
            <div class="wlc-title">我的保单</div>
            <div class="wlc-more" onclick="addInsurance()">添加保单
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
          </div>
          <div id="wealthInsuranceList" class="wlc-list">
            <div class="wlc-empty">暂无保单，添加你的第一份保障</div>
          </div>
        </div>
        <div class="wealth-list-card">
          <div class="wlc-header">
            <div class="wlc-title">我的贷款</div>
            <div class="wlc-more" onclick="addLoan()">添加贷款
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
          </div>
          <div id="wealthLoanList" class="wlc-list">
            <div class="wlc-empty">暂无贷款记录</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 家庭层占位 -->
    <div id="wealthFamily" class="placeholder-card" style="display:none">
      <div class="placeholder-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <div class="placeholder-title">家庭资产总览</div>
      <div class="placeholder-desc">家庭资产合并统计 · 家庭财务目标<br>家庭版功能规划中</div>
    </div>
    <!-- 社会层占位 -->
    <div id="wealthSociety" class="placeholder-card" style="display:none">
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

      <!-- 建议卡片1：诊断报告入口 -->
      <div class="ai-suggestion-card ai-sug-primary">
        <div class="ai-sug-icon" style="background:#eff6ff;color:#2563eb">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div class="ai-sug-content">
          <div class="ai-sug-title">生成完整财富诊断报告</div>
          <div class="ai-sug-text" id="wealthDiagnosisSummary">基于收支·投资·保障三大维度，全面评估你的财务健康状况</div>
          <button class="ai-sug-btn" onclick="runWealthDiagnosis()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span id="wealthDiagnosisBtnText">生成诊断报告</span>
          </button>
        </div>
      </div>

      <!-- 建议卡片2：资产配置建议 -->
      <div class="ai-suggestion-card">
        <div class="ai-sug-icon" style="background:#ecfdf5;color:#10b981">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3"/></svg>
        </div>
        <div class="ai-sug-content">
          <div class="ai-sug-title">资产配置建议</div>
          <div class="ai-sug-text">参考标准普尔家庭资产象限图，建议按 4321 比例分配：40%投资增值、30%日常开销、20%储蓄保本、10%保障保险。</div>
          <span class="ai-sug-detail">查看详情 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
      </div>

      <!-- 建议卡片3：财富成长路径 -->
      <div class="ai-suggestion-card">
        <div class="ai-sug-icon" style="background:#fef3c7;color:#d97706">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="22 15 13.5 6.5 8.5 11.5 2 5"/><polyline points="16 15 22 15 22 9"/></svg>
        </div>
        <div class="ai-sug-content">
          <div class="ai-sug-title">财富成长路径</div>
          <div class="ai-sug-text">当前处于财务生存阶段。下一步目标：建立 3-6 个月应急基金，配置基础保障，进入财务安全阶段。</div>
          <span class="ai-sug-detail">查看路径 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
      </div>

      <!-- 建议卡片4：风险预警 -->
      <div class="ai-suggestion-card">
        <div class="ai-sug-icon" style="background:#fee2e2;color:#ef4444">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="ai-sug-content">
          <div class="ai-sug-title">风险预警</div>
          <div class="ai-sug-text">暂无明显风险。建议：尽快配置基础保障（重疾+医疗+意外），为家庭经济支柱建立安全垫。</div>
          <span class="ai-sug-detail">查看风险清单 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
      </div>
    </div>
  </div>
  <!-- END 财富管理域 -->'''

# ================== 3. 替换 ==================
content = content.replace(old_block, new_wealth_domain)
print(f"新财富域长度: {len(new_wealth_domain)} 字符")

# ================== 4. 更新 JS 函数 ==================
# 4.1 替换 switchLifeLayer 为 switchWealthLayer
content = content.replace(
    "  window.switchLifeLayer = function(layer) {\n    switchLayer('lifeFinance', layer);\n  };",
    "  window.switchWealthLayer = function(layer) {\n    switchLayer('wealth', layer);\n  };"
)

# 4.2 添加 switchWealthPillar 函数（在 switchWealthLayer 后面）
switch_wealth_pillar_js = '''
  // 财富三大支柱分段切换
  window.switchWealthPillar = function(pillar) {
    // 切换按钮状态
    var switcher = document.querySelector('#life-wealth-domain .wealth-pillar-switcher');
    if (switcher) {
      switcher.querySelectorAll('.wps-item').forEach(function(item) {
        item.classList.toggle('active', item.dataset.pillar === pillar);
      });
    }
    // 切换内容
    var pillars = ['income', 'invest', 'insurance'];
    pillars.forEach(function(p) {
      var el = document.getElementById('wealthPillar' + p.charAt(0).toUpperCase() + p.slice(1));
      if (el) {
        el.classList.toggle('active', p === pillar);
      }
    });
    // 切到投资柱时触发持仓渲染
    if (pillar === 'invest' && window.StockHoldings && typeof window.StockHoldings.render === 'function') {
      window.StockHoldings.render('stockHoldingsContainer');
    }
    // 切到收支柱时触发记账渲染
    if (pillar === 'income' && typeof refreshDailyTxSummary === 'function') {
      refreshDailyTxSummary();
    }
  };
'''

# 在 switchWealthLayer 函数后面插入
content = content.replace(
    "  window.switchWealthLayer = function(layer) {\n    switchLayer('wealth', layer);\n  };",
    "  window.switchWealthLayer = function(layer) {\n    switchLayer('wealth', layer);\n  };\n" + switch_wealth_pillar_js
)

# 4.3 添加 openHoldingsManager / addInsurance / addLoan 函数
extra_fns = '''
  window.openHoldingsManager = function() {
    if (window.StockHoldings && typeof window.StockHoldings.showManager === 'function') {
      window.StockHoldings.showManager();
    } else {
      alert('持仓管理功能加载中，请稍后再试');
    }
  };
  window.addInsurance = function() {
    // 复用原财富CT的添加保单功能，若不存在则提示
    if (typeof addNewInsurance === 'function') {
      addNewInsurance();
    } else {
      alert('保单管理功能加载中，请稍后再试\\n\\n也可以对AI说：「添加一份重疾险保单」');
    }
  };
  window.addLoan = function() {
    if (typeof addNewLoan === 'function') {
      addNewLoan();
    } else {
      alert('贷款管理功能加载中，请稍后再试\\n\\n也可以对AI说：「添加一笔房贷」');
    }
  };
'''

# 在 runWealthDiagnosis 函数前插入
content = content.replace(
    "  window.runWealthDiagnosis = function() {",
    extra_fns + "\n  window.runWealthDiagnosis = function() {"
)

# ================== 5. 添加 CSS 样式 ==================
# 找到 CSS 插入的位置（在 v52 样式区后面）
css_insert_point = "/* ===== v52 新增样式 END ===== */"
wealth_css = '''
/* ===== v52 财富三层范式 新增样式 ===== */
.wealth-hero-stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-top: 18px;
  padding: 14px 12px;
  background: rgba(255,255,255,0.12);
  border-radius: 12px;
  backdrop-filter: blur(4px);
}
.whs-item {
  flex: 1;
  text-align: center;
}
.whs-label {
  font-size: 11px;
  color: rgba(255,255,255,0.7);
  margin-bottom: 4px;
}
.whs-value {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}
.whs-unit {
  font-size: 10px;
  color: rgba(255,255,255,0.6);
  margin-top: 2px;
}
.whs-divider {
  width: 1px;
  height: 30px;
  background: rgba(255,255,255,0.2);
}
.wealth-hero-bottom {
  display: flex;
  gap: 12px;
  margin-top: 14px;
}
.wealth-pie-wrap {
  flex: 1;
  background: rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.wealth-pie-legend {
  flex: 1;
}
.wpl-item {
  font-size: 11px;
  color: rgba(255,255,255,0.85);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.wpl-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.wealth-stage-mini {
  flex: 1.2;
  background: rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 12px;
}
.wsm-title {
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  margin-bottom: 10px;
  font-weight: 500;
}
.wsm-steps {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wsm-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.wsm-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  border: 2px solid rgba(255,255,255,0.5);
}
.wsm-step.active .wsm-dot {
  background: #fff;
  border-color: #fff;
  box-shadow: 0 0 0 3px rgba(255,255,255,0.25);
}
.wsm-label {
  font-size: 10px;
  color: rgba(255,255,255,0.7);
  white-space: nowrap;
}
.wsm-step.active .wsm-label {
  color: #fff;
  font-weight: 600;
}
.wsm-line {
  flex: 1;
  height: 2px;
  background: rgba(255,255,255,0.2);
  margin: 0 4px;
  margin-bottom: 14px;
}

/* 支柱分段切换器 */
.wealth-pillar-switcher {
  display: flex;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 3px;
  margin-bottom: 16px;
}
.wps-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.wps-item.active {
  background: #fff;
  color: #2563eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  font-weight: 600;
}
.wps-item:hover:not(.active) {
  color: #334155;
}

/* 支柱内容 */
.wealth-pillar-content {
  display: none;
}
.wealth-pillar-content.active {
  display: block;
}

/* 图表卡片 */
.wealth-chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  margin-top: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.wcc-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.wcc-body {
  display: flex;
  align-items: center;
  gap: 16px;
}
.wcc-pie {
  flex-shrink: 0;
}
.wcc-legend {
  flex: 1;
}
.wccl-item {
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}
.wccl-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.wcc-mini-chart {
  width: 100%;
}

/* 列表卡片 */
.wealth-list-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  margin-top: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.wlc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.wlc-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}
.wlc-more {
  font-size: 12px;
  color: #2563eb;
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  font-weight: 500;
}
.wlc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wlc-empty {
  text-align: center;
  padding: 20px 0;
  font-size: 12px;
  color: #94a3b8;
}

/* AI建议主卡片 */
.ai-sug-primary {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid #bfdbfe;
}
.ai-sug-primary .ai-sug-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 6px;
}
.ai-sug-primary .ai-sug-text {
  font-size: 12px;
  color: #3b82f6;
  margin-bottom: 10px;
}
.ai-sug-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.ai-sug-btn:hover {
  background: #1d4ed8;
}

/* 普通AI建议卡片加标题 */
.ai-sug-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

/* 数据来源小标签 */
.ddc-source-tag.small {
  font-size: 9px;
  padding: 2px 5px;
  gap: 3px;
}
/* ===== v52 财富三层范式 新增样式 END ===== */
'''

# 在 v52 新增样式 END 前插入
if css_insert_point in content:
    content = content.replace(css_insert_point, wealth_css + "\n" + css_insert_point)
    print("CSS样式已插入")
else:
    print("警告: 未找到 v52 新增样式 END 标记")

# ================== 6. 保留旧id兼容 ==================
# 原有的 wealthDiagnosisScore 需要在新结构中也保留或映射
# 新结构用 wealthScore，老JS可能还在更新 wealthDiagnosisScore
# 加一个兼容函数：在 init 时把 wealthDiagnosisScore 的值同步到 wealthScore
compat_js = '''
  // 财富v52兼容：诊断得分同步到hero评分
  function syncWealthScore() {
    var diagScore = document.getElementById('wealthDiagnosisScore');
    var heroScore = document.getElementById('wealthScore');
    if (diagScore && heroScore && diagScore.textContent && diagScore.textContent !== '-') {
      heroScore.textContent = diagScore.textContent;
    }
  }
'''

# 在 syncWealthScore 相关处插入（放在 switchWealthPillar 后面）
content = content.replace(
    "  // 财富三大支柱分段切换",
    compat_js + "\n  // 财富三大支柱分段切换"
)

# ================== 7. 写回 ==================
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ 财富管理三层范式重构完成")
print(f"总文件大小: {len(content)} 字符")
