#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MiRun AI v52 架构终版重构脚本 - Part 2: CSS样式新增 + 工作Tab重构
"""
import re

FILE_PATH = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/index.html'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ============ 6. 在CSS中插入 v52 新样式 ============
# 找到 page-view 样式后面插入
v52_css = '''
/* ========== v52 对话Tab样式 ========== */
.chat-top-v52 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  background: #fff;
  border-bottom: 1px solid #f1f5f9;
}
.chat-top-left { display: flex; align-items: center; gap: 12px; }
.chat-logo-wrap {
  width: 40px; height: 40px;
  background: linear-gradient(135deg, #faf5ff, #f5f3ff);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.chat-logo-img { width: 24px; height: 24px; object-fit: contain; }
.chat-title-group { display: flex; flex-direction: column; gap: 2px; }
.chat-title-main {
  font-size: 17px; font-weight: 700; color: #0f172a;
  letter-spacing: -0.3px;
}
.chat-status-row { display: flex; align-items: center; gap: 6px; }
.chat-status-dot {
  width: 6px; height: 6px; border-radius: 50%;
  display: inline-block;
}
.chat-status-dot.status-online {
  background: #10b981;
  animation: statusPulse 2s ease-in-out infinite;
}
.chat-status-dot.status-thinking {
  background: #8b5cf6;
  animation: statusPulse 1s ease-in-out infinite;
}
.chat-status-dot.status-offline { background: #94a3b8; }
@keyframes statusPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
  50% { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
}
.chat-status-text {
  font-size: 11px; color: #64748b; font-weight: 500;
}
.chat-top-right { display: flex; align-items: center; gap: 4px; }
.chat-top-btn {
  width: 36px; height: 36px; border: none; background: #f8fafc;
  border-radius: 10px; cursor: pointer; color: #64748b;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.chat-top-btn:active { background: #f1f5f9; transform: scale(0.95); }

/* 今日概览 v52 */
.today-overview-v52 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 12px 16px;
  background: #f8fafc;
}
.ov-card {
  background: #fff;
  border-radius: 14px;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.ov-card:active { transform: scale(0.97); }
.ov-card-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.ov-card-body { text-align: center; }
.ov-card-value {
  font-size: 16px; font-weight: 700; color: #0f172a;
  line-height: 1.2;
}
.ov-card-label {
  font-size: 11px; color: #94a3b8; margin-top: 2px;
}

/* 对话主区域 v52 */
.chat-main-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px 16px 20px;
  max-width: 680px;
  margin: 0 auto;
  min-height: 300px;
}
.chat-welcome {
  text-align: center;
  padding: 40px 20px;
}
.chat-welcome-avatar {
  width: 64px; height: 64px;
  background: linear-gradient(135deg, #faf5ff, #f5f3ff);
  border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
}
.chat-welcome-title {
  font-size: 18px; font-weight: 700; color: #0f172a;
  margin-bottom: 8px;
}
.chat-welcome-desc {
  font-size: 13px; color: #94a3b8; line-height: 1.7;
}
.chat-message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.chat-msg-row { display: flex; gap: 10px; }
.chat-msg-row.user { justify-content: flex-end; }
.chat-msg-row.ai { justify-content: flex-start; }
.chat-msg-avatar {
  width: 32px; height: 32px; border-radius: 10px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.chat-msg-row.ai .chat-msg-avatar {
  background: linear-gradient(135deg, #faf5ff, #f5f3ff);
}
.chat-msg-row.user .chat-msg-avatar {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
}
.chat-msg-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
  word-break: break-word;
}
.chat-msg-row.ai .chat-msg-bubble {
  background: #fff;
  color: #1e293b;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.chat-msg-row.user .chat-msg-bubble {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.chat-msg-time {
  font-size: 11px; color: #94a3b8;
  margin-top: 4px; text-align: center;
}

/* 底部输入栏 v52 */
.app-input-bar-v52 {
  position: fixed;
  bottom: 56px; left: 0; right: 0;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  padding: 10px 12px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  z-index: 90;
}
.input-action-btn {
  width: 36px; height: 36px;
  border: none; background: #f1f5f9;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #64748b;
  flex-shrink: 0;
  transition: all 0.2s;
}
.input-action-btn:active { background: #e2e8f0; transform: scale(0.95); }
.input-textarea-wrap {
  flex: 1;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 6px 10px;
  transition: border-color 0.2s;
}
.input-textarea-wrap:focus-within {
  border-color: #8b5cf6;
  background: #fff;
}
.input-textarea {
  width: 100%;
  border: none; background: transparent;
  outline: none; resize: none;
  font-size: 14px; color: #1e293b;
  line-height: 1.5;
  font-family: inherit;
  max-height: 120px;
  min-height: 24px;
  padding: 4px 0;
}
.input-textarea::placeholder { color: #94a3b8; }
.input-send-btn {
  width: 36px; height: 36px;
  border: none;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #fff;
  flex-shrink: 0;
  transition: all 0.2s;
}
.input-send-btn:active { transform: scale(0.95); opacity: 0.9; }
.input-send-btn svg { stroke: #fff; fill: none; }

/* 智能分身状态面板 */
.agent-panel {
  position: fixed;
  top: 0; right: 0;
  width: 280px; height: 100%;
  background: #fff;
  z-index: 200;
  box-shadow: -4px 0 20px rgba(0,0,0,0.1);
  animation: slideInRight 0.3s ease;
}
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.agent-panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #f1f5f9;
}
.agent-panel-title { font-size: 15px; font-weight: 700; color: #0f172a; }
.agent-panel-close {
  background: none; border: none; cursor: pointer;
  color: #94a3b8; padding: 4px;
}
.agent-panel-body { padding: 16px; }
.agent-status-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f8fafc;
}
.agent-status-label { font-size: 13px; color: #64748b; }
.agent-status-val {
  font-size: 13px; font-weight: 600; color: #0f172a;
  display: flex; align-items: center; gap: 6px;
}
.dot-online {
  width: 6px; height: 6px; border-radius: 50%;
  background: #10b981;
}
.agent-dim-title {
  font-size: 12px; color: #94a3b8;
  margin: 16px 0 10px;
  font-weight: 500;
}
.agent-dim-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.agent-dim-item { display: flex; flex-direction: column; gap: 6px; }
.agent-dim-bar {
  height: 4px; background: #f1f5f9; border-radius: 2px; overflow: hidden;
}
.agent-dim-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #a78bfa);
  border-radius: 2px;
  transition: width 0.5s ease;
}
.agent-dim-label { font-size: 11px; color: #94a3b8; }

/* v52 三层范式 Tab 切换（个人/家庭/社会） */
.layer-switcher {
  display: flex;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 3px;
  margin: 12px 16px 4px;
}
.layer-switcher-item {
  flex: 1;
  text-align: center;
  padding: 7px 0;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.layer-switcher-item.active {
  background: #fff;
  color: var(--tab-color, #8b5cf6);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* v52 占位提示 */
.placeholder-card {
  background: #fff;
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  margin: 12px 16px;
  border: 1px dashed #e2e8f0;
}
.placeholder-icon {
  width: 48px; height: 48px;
  background: #f8fafc;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 12px;
  color: #94a3b8;
}
.placeholder-title {
  font-size: 14px; font-weight: 600; color: #334155;
  margin-bottom: 6px;
}
.placeholder-desc {
  font-size: 12px; color: #94a3b8; line-height: 1.6;
}
'''

# 在 #page-me 样式后面插入
insert_pos = content.find('#page-me { --tab-color: #64748b; --tab-color-dark: #475569; --tab-color-light: #f1f5f9; }')
if insert_pos != -1:
    # 找到这行结束的位置
    line_end = content.find('\n', insert_pos)
    content = content[:line_end+1] + v52_css + content[line_end+1:]
    print("CSS 样式已插入")
else:
    print("未找到插入位置 #page-me")

# ============ 7. 重构工作Tab ============
# 替换 page-work 内容
pattern_work = r'<div id="page-work" class="page-view">.*?<!-- END page-work -->'
new_work = '''<div id="page-work" class="page-view">
  <div class="sub-tab-bar" id="workSubTabBar">
    <button class="sub-tab-item active" data-sub="schedule" onclick="switchSubTab('work', 'schedule')">
      <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
      <span class="sub-tab-text">日程</span>
    </button>
    <button class="sub-tab-item" data-sub="growth" onclick="switchSubTab('work', 'growth')">
      <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
      <span class="sub-tab-text">成长</span>
    </button>
    <button class="sub-tab-item" data-sub="knowledge" onclick="switchSubTab('work', 'knowledge')">
      <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>
      <span class="sub-tab-text">知识库</span>
    </button>
  </div>

  <!-- 日程安排 -->
  <div id="work-schedule" class="sub-tab-content active">
    <!-- 第一层：整体看板 -->
    <div class="dashboard-hero">
      <div class="dashboard-hero-label">今日待办完成率</div>
      <div class="dashboard-hero-score"><span id="workScheduleRate">-</span><span class="unit">%</span></div>
      <div class="dashboard-hero-trend">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        本周趋势
      </div>
      <div class="dashboard-hero-conclusion" id="workScheduleConclusion">
        开始规划你的日程，让每一天都高效有序。
      </div>
    </div>

    <!-- 层级切换：个人/家庭/社会 -->
    <div class="layer-switcher">
      <div class="layer-switcher-item active" onclick="switchWorkLayer('personal')">个人</div>
      <div class="layer-switcher-item" onclick="switchWorkLayer('family')">家庭</div>
      <div class="layer-switcher-item" onclick="switchWorkLayer('society')">社会</div>
    </div>

    <!-- 第二层：明细卡片 -->
    <div class="dashboard-detail-section">
      <div class="dashboard-detail-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        日程明细
      </div>
      <div class="dashboard-grid">
        <div class="dashboard-detail-card" onclick="if(window.Schedule) Schedule.openPanel()">
          <div class="ddc-icon" style="background:#f5f3ff;color:#8b5cf6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <div class="ddc-title">今日待办</div>
          <div class="ddc-value" id="workTodayTodo">-</div>
          <div class="ddc-desc">项待完成</div>
        </div>
        <div class="dashboard-detail-card">
          <div class="ddc-icon" style="background:#fef3c7;color:#d97706">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="ddc-title">本周工时</div>
          <div class="ddc-value" id="workWeekHours">-</div>
          <div class="ddc-desc">小时</div>
        </div>
        <div class="dashboard-detail-card">
          <div class="ddc-icon" style="background:#fee2e2;color:#ef4444">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div class="ddc-title">高优先级</div>
          <div class="ddc-value" id="workHighPrio">-</div>
          <div class="ddc-desc">项重点</div>
        </div>
        <div class="dashboard-detail-card">
          <div class="ddc-icon" style="background:#ecfdf5;color:#10b981">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="ddc-title">连续达标</div>
          <div class="ddc-value" id="workStreakDays">0</div>
          <div class="ddc-desc">天</div>
        </div>
      </div>
      <!-- 日程模块挂载点 -->
      <div id="scheduleContainer"></div>
    </div>

    <!-- 家庭层占位 -->
    <div id="workScheduleFamily" class="placeholder-card" style="display:none">
      <div class="placeholder-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <div class="placeholder-title">家庭共享日程</div>
      <div class="placeholder-desc">添加家庭成员后，可查看共享日程<br>家庭版功能规划中</div>
    </div>

    <!-- 社会层占位 -->
    <div id="workScheduleSociety" class="placeholder-card" style="display:none">
      <div class="placeholder-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      </div>
      <div class="placeholder-title">行业对标</div>
      <div class="placeholder-desc">查看同行业工作时长与效率对标<br>社会层功能规划中</div>
    </div>

    <!-- 第三层：AI建议 -->
    <div class="dashboard-ai-section">
      <div class="dashboard-ai-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 2l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
        AI 效率建议
      </div>
      <div class="ai-suggestion-card">
        <div class="ai-sug-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="ai-sug-content">
          <div class="ai-sug-text">番茄工作法：25分钟专注+5分钟休息，效率提升40%。</div>
          <span class="ai-sug-detail">查看详情 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
      </div>
      <div class="ai-suggestion-card">
        <div class="ai-sug-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
        </div>
        <div class="ai-sug-content">
          <div class="ai-sug-text">每天早上规划3件最重要的事，优先完成再处理其他。</div>
          <span class="ai-sug-detail">查看详情 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
        </div>
      </div>
    </div>
  </div>

  <!-- 个人成长 -->
  <div id="work-growth" class="sub-tab-content">
    <div class="dashboard-section">
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <div class="dashboard-card-title">成长目标</div>
            <div class="dashboard-card-subtitle">成为更好的自己</div>
          </div>
          <span class="dashboard-card-tag">规划中</span>
        </div>
        <div class="dashboard-big-number"><span id="workGrowthProgress">-</span><span class="unit">%</span></div>
        <div class="dashboard-conclusion">
          设定你的成长目标，我来陪你一步步达成。<br>
          对AI说：「帮我制定一个学习计划」
        </div>
      </div>

      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div class="dashboard-card-title">成长里程碑</div>
        </div>
        <div class="dashboard-conclusion" style="color:#94a3b8">
          暂无已达成的里程碑。<br>
          开始记录你的第一个目标吧。
        </div>
      </div>
    </div>
  </div>

  <!-- 知识库 -->
  <div id="work-knowledge" class="sub-tab-content">
    <div class="dashboard-section">
      <div class="dashboard-card">
        <div class="dashboard-card-header">
          <div>
            <div class="dashboard-card-title">知识库</div>
            <div class="dashboard-card-subtitle">你的第二大脑</div>
          </div>
          <span class="dashboard-card-tag">规划中</span>
        </div>
        <div style="display:flex;gap:12px;margin:16px 0">
          <div style="flex:1;text-align:center;padding:16px;background:#f8fafc;border-radius:12px">
            <div style="font-size:24px;font-weight:700;color:#8b5cf6" id="kbPrivateCount">0</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px">私有知识</div>
          </div>
          <div style="flex:1;text-align:center;padding:16px;background:#f8fafc;border-radius:12px">
            <div style="font-size:24px;font-weight:700;color:#16a34a" id="kbPublicCount">0</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px">公共知识</div>
          </div>
        </div>
        <div class="dashboard-conclusion">
          知识库功能规划中。<br>
          你可以通过对话让我记住重要的信息。
        </div>
      </div>
    </div>
  </div>

  <div class="app-brand-footer">
    <img src="./assets/mierke-logo.png" alt="米儿客" style="height:16px;vertical-align:middle;margin-right:6px;opacity:0.7">
    <span>米儿客出品 · 数据仅存本地</span>
  </div>
</div>
<!-- END page-work -->'''

content = re.sub(pattern_work, new_work, content, flags=re.DOTALL)
print("工作Tab已重构")

# 写回
with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Part 2 完成，当前行数: {len(content.splitlines())}")
