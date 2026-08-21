#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
v52 - 补充：健康Tab重构（重新执行）
"""
import re

FILE_PATH = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/index.html'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 健康Tab重构
pattern_health = r'<div id="page-health" class="page-view">.*?<!-- END page-health -->'
new_health = '''<div id="page-health" class="page-view">
  <div class="sub-tab-bar" id="healthSubTabBar">
    <button class="sub-tab-item active" data-sub="overview" onclick="switchSubTab('health', 'overview')">
      <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></span>
      <span class="sub-tab-text">总览</span>
    </button>
    <button class="sub-tab-item" data-sub="diet" onclick="switchSubTab('health', 'diet')">
      <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></span>
      <span class="sub-tab-text">饮食</span>
    </button>
    <button class="sub-tab-item" data-sub="sleep" onclick="switchSubTab('health', 'sleep')">
      <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg></span>
      <span class="sub-tab-text">睡眠</span>
    </button>
    <button class="sub-tab-item" data-sub="exercise" onclick="switchSubTab('health', 'exercise')">
      <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span>
      <span class="sub-tab-text">运动</span>
    </button>
    <button class="sub-tab-item" data-sub="mood" onclick="switchSubTab('health', 'mood')">
      <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></span>
      <span class="sub-tab-text">情绪</span>
    </button>
  </div>

  <!-- 健康总览 -->
  <div id="health-overview" class="sub-tab-content active">
    <!-- 第一层：整体看板 -->
    <div class="dashboard-hero">
      <div class="dashboard-hero-label">健康总分</div>
      <div class="dashboard-hero-score"><span id="healthScore">-</span><span class="unit">分</span></div>
      <div class="dashboard-hero-trend">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        本周趋势
      </div>
      <div class="dashboard-hero-conclusion" id="healthConclusion">
        综合饮食·睡眠·运动·情绪·体重五大维度<br>
        开始记录，生成你的专属健康画像。
      </div>
    </div>

    <!-- 节气养生重点卡片 -->
    <div class="solar-term-banner" id="solarTermBanner" onclick="switchSubTab('health', 'diet')">
      <div class="solar-term-left">
        <div class="solar-term-name" id="solarTermName">--</div>
        <div class="solar-term-tip" id="solarTermTip">顺应时节，食养有道</div>
      </div>
      <div class="solar-term-right">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96c.8 1.02 1.3 2.27 1.3 4.04 0 6.5-4.78 12-10.5 13Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
      </div>
    </div>

    <!-- 层级切换：个人/家庭/社会 -->
    <div class="layer-switcher">
      <div class="layer-switcher-item active" onclick="switchHealthLayer('personal')">个人</div>
      <div class="layer-switcher-item" onclick="switchHealthLayer('family')">家庭</div>
      <div class="layer-switcher-item" onclick="switchHealthLayer('society')">社会</div>
    </div>

    <!-- 第二层：明细卡片 -->
    <div class="dashboard-detail-section">
      <div class="dashboard-detail-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        五大维度
      </div>
      <div class="dashboard-grid">
        <div class="dashboard-detail-card" onclick="switchSubTab('health', 'diet')">
          <div class="ddc-icon" style="background:#f0fdf4;color:#16a34a">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
          </div>
          <div class="ddc-source-tag" title="对话录入">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            对话
          </div>
          <div class="ddc-title">饮食营养</div>
          <div class="ddc-value" id="healthDietCount">0</div>
          <div class="ddc-desc">条记录</div>
        </div>
        <div class="dashboard-detail-card" onclick="switchSubTab('health', 'sleep')">
          <div class="ddc-icon" style="background:#f5f3ff;color:#8b5cf6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          </div>
          <div class="ddc-source-tag" title="设备同步">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            设备
          </div>
          <div class="ddc-title">睡眠质量</div>
          <div class="ddc-value" id="healthSleepHour">-</div>
          <div class="ddc-desc">小时昨晚</div>
        </div>
        <div class="dashboard-detail-card" onclick="switchSubTab('health', 'exercise')">
          <div class="ddc-icon" style="background:#fef3c7;color:#d97706">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div class="ddc-source-tag" title="设备同步">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            设备
          </div>
          <div class="ddc-title">运动时长</div>
          <div class="ddc-value" id="healthExerciseMin">0</div>
          <div class="ddc-desc">分钟今日</div>
        </div>
        <div class="dashboard-detail-card" onclick="switchSubTab('health', 'mood')">
          <div class="ddc-icon" style="background:#ecfdf5;color:#10b981">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </div>
          <div class="ddc-source-tag" title="对话录入">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            对话
          </div>
          <div class="ddc-title">情绪状态</div>
          <div class="ddc-value" id="healthMood">--</div>
          <div class="ddc-desc">当前心情</div>
        </div>
      </div>
    </div>

    <!-- 家庭层占位 -->
    <div id="healthFamily" class="placeholder-card" style="display:none">
      <div class="placeholder-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <div class="placeholder-title">家庭成员健康</div>
      <div class="placeholder-desc">添加家庭成员后可查看家人健康档案<br>家庭版功能规划中</div>
    </div>
    <!-- 社会层占位 -->
    <div id="healthSociety" class="placeholder-card" style="display:none">
      <div class="placeholder-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      </div>
      <div class="placeholder-title">公共健康资讯</div>
      <div class="placeholder-desc">季节流行病预警 · 健康趋势对标<br>社会层功能规划中</div>
    </div>

    <!-- 第三层：AI建议 -->
    <div class="dashboard-ai-section">
      <div class="dashboard-ai-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 2l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
        AI 健康建议
      </div>
      <div class="ai-suggestion-card">
        <div class="ai-sug-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/></svg>
        </div>
        <div class="ai-sug-content">
          <div class="ai-sug-text">均衡饮食+适量运动，是保持健康的两大基石。</div>
          <span class="ai-sug-detail">查看详情 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
      </div>
      <div class="ai-suggestion-card">
        <div class="ai-sug-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </div>
        <div class="ai-sug-content">
          <div class="ai-sug-text">每晚11点前入睡，深度睡眠时间会显著增加。</div>
          <span class="ai-sug-detail">查看详情 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
      </div>
    </div>
  </div>

  <!-- 饮食 -->
  <div id="health-diet" class="sub-tab-content">
    <div class="dashboard-section">
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <div class="dashboard-card-title">饮食记录</div>
            <div class="dashboard-card-subtitle">你吃什么，就是什么</div>
          </div>
          <span class="dashboard-card-tag" id="healthDietTag">今日</span>
        </div>
        <div class="dashboard-big-number"><span id="dietCalories">-</span><span class="unit">kcal</span></div>
        <div class="dashboard-conclusion">
          今日已记录 <span class="highlight" id="dietMealCount">0</span> 餐。<br>
          用对话记录更方便：「早餐吃了两个包子」
        </div>
      </div>
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <div class="dashboard-card-title">节气食养</div>
            <div class="dashboard-card-subtitle">顺应时节，食养有道</div>
          </div>
        </div>
        <div id="solarFoodRecommend" class="dashboard-conclusion">
          加载中...
        </div>
      </div>
      <div id="foodRecogContainer" style="max-width:680px;margin:0 auto"></div>
    </div>
  </div>

  <!-- 睡眠 -->
  <div id="health-sleep" class="sub-tab-content">
    <div class="dashboard-section">
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <div class="dashboard-card-title">睡眠质量</div>
            <div class="dashboard-card-subtitle">睡个好觉比什么都重要</div>
          </div>
          <span class="dashboard-card-tag" id="sleepTag">最近</span>
        </div>
        <div class="dashboard-big-number"><span id="sleepAvg">-</span><span class="unit">小时/晚</span></div>
        <div class="dashboard-conclusion">
          记录你的睡眠时长和质量，<br>
          我来帮你找到最适合的作息规律。
        </div>
      </div>
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div class="dashboard-card-title">睡眠小贴士</div>
        </div>
        <div class="dashboard-conclusion">
          · 睡前1小时放下手机<br>
          · 卧室温度保持在18-22°C<br>
          · 固定作息时间，周末也不例外<br>
          · 下午3点后避免摄入咖啡因
        </div>
      </div>
    </div>
  </div>

  <!-- 运动 -->
  <div id="health-exercise" class="sub-tab-content">
    <div class="dashboard-section">
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <div class="dashboard-card-title">运动概览</div>
            <div class="dashboard-card-subtitle">身体是革命的本钱</div>
          </div>
          <span class="dashboard-card-tag" id="exerciseTag">本周</span>
        </div>
        <div class="dashboard-big-number"><span id="exerciseWeekMin">-</span><span class="unit">分钟</span></div>
        <div class="dashboard-conclusion">
          本周运动 <span class="highlight" id="exerciseTimes">0</span> 次。<br>
          用对话记录：「跑步30分钟」「走了5000步」
        </div>
      </div>
      <div id="behaviorHubContainer"></div>
    </div>
  </div>

  <!-- 情绪 -->
  <div id="health-mood" class="sub-tab-content">
    <div class="dashboard-section">
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <div class="dashboard-card-title">情绪记录</div>
            <div class="dashboard-card-subtitle">看见情绪，理解自己</div>
          </div>
          <span class="dashboard-card-tag">本周</span>
        </div>
        <div class="dashboard-big-number"><span id="moodAvg">-</span><span class="unit">分</span></div>
        <div class="dashboard-conclusion">
          情绪是内心的晴雨表。<br>
          用对话记录：「今天心情很好」或「有点焦虑」
        </div>
      </div>
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div class="dashboard-card-title">情绪小贴士</div>
        </div>
        <div class="dashboard-conclusion">
          · 每天花5分钟记录心情<br>
          · 深呼吸练习：4秒吸气+7秒屏息+8秒呼气<br>
          · 找到情绪的触发点，才能更好地管理
        </div>
      </div>
    </div>
  </div>

  <div class="app-brand-footer">
    <img src="./assets/mierke-logo.png" alt="米儿客" style="height:16px;vertical-align:middle;margin-right:6px;opacity:0.7">
    <span>米儿客出品 · 数据仅存本地</span>
  </div>
</div>
<!-- END page-health -->'''

result = re.sub(pattern_health, new_health, content, flags=re.DOTALL)
if result != content:
    content = result
    print("健康Tab已重构")
else:
    print("健康Tab替换失败！pattern未匹配")

# 节气banner CSS（如果还没加的话）
if '.solar-term-banner {' not in content:
    solar_css = '''
/* v52 节气养生banner */
.solar-term-banner {
  margin: 12px 16px 0;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.solar-term-left { flex: 1; }
.solar-term-name {
  font-size: 15px; font-weight: 700; color: #15803d;
  margin-bottom: 2px;
}
.solar-term-tip {
  font-size: 12px; color: #166534;
  line-height: 1.5;
}
.solar-term-right {
  color: #16a34a;
  width: 40px; height: 40px;
  background: rgba(255,255,255,0.6);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
'''
    pp = content.find('.placeholder-desc {')
    if pp != -1:
        brace_end = content.find('}', pp + 20)
        content = content[:brace_end+1] + '\n' + solar_css + content[brace_end+1:]
        print("节气banner CSS已添加")

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"完成，当前行数: {len(content.splitlines())}")
