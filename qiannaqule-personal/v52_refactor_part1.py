#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MiRun AI v52 架构终版重构脚本 - Part 1: 全局与对话Tab
"""
import re
import os

FILE_PATH = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/index.html'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ============ 1. 更新标题 ============
content = content.replace('<title>MiRun AI v51</title>', '<title>MiRun AI v52</title>')

# ============ 2. 更新SW版本引用 (script version) ============
content = content.replace('datastore.js?v=51', 'datastore.js?v=52')
content = content.replace('diagnosis-engine.js?v=51', 'diagnosis-engine.js?v=52')
content = content.replace('reminder-engine.js?v=51', 'reminder-engine.js?v=52')
content = content.replace('trend-view.js?v=51', 'trend-view.js?v=52')

# ============ 3. 重写 page-home (对话Tab) ============
# 匹配从 <div id="page-home" ... 到 <!-- END page-home -->
pattern_home = r'<div id="page-home" class="page-view page-active">.*?<!-- END page-home -->'
new_home = '''<div id="page-home" class="page-view page-active">
  <!-- v52 对话Tab顶部栏：LOGO + 分身状态 -->
  <div class="chat-top-v52">
    <div class="chat-top-left">
      <div class="chat-logo-wrap">
        <img src="./assets/mirun-ai-logo.png" alt="MiRun AI" class="chat-logo-img">
      </div>
      <div class="chat-title-group">
        <div class="chat-title-main">MiRun AI</div>
        <div class="chat-status-row">
          <span class="chat-status-dot status-online" id="agentStatusDot"></span>
          <span class="chat-status-text" id="agentStatusText">在线</span>
        </div>
      </div>
    </div>
    <div class="chat-top-right">
      <button class="chat-top-btn" onclick="toggleAgentPanel()" title="分身状态">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 2l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
      </button>
      <button class="chat-top-btn" onclick="toggleChatHistoryPanel()" title="对话历史">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
    </div>
  </div>

  <!-- 今日概览：3项卡片式 -->
  <div class="today-overview-v52">
    <div class="ov-card" onclick="switchModule('work'); switchSubTab('work', 'schedule')">
      <div class="ov-card-icon" style="background:#f5f3ff;color:#8b5cf6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </div>
      <div class="ov-card-body">
        <div class="ov-card-value" id="ovTodoCount">0</div>
        <div class="ov-card-label">待办事项</div>
      </div>
    </div>
    <div class="ov-card" onclick="openWeatherPanel()">
      <div class="ov-card-icon" style="background:#eff6ff;color:#2563eb">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/></svg>
      </div>
      <div class="ov-card-body">
        <div class="ov-card-value" id="ovWeatherTemp">--°</div>
        <div class="ov-card-label">今天天气</div>
      </div>
    </div>
    <div class="ov-card" onclick="switchModule('health'); switchSubTab('health', 'solar')">
      <div class="ov-card-icon" style="background:#f0fdf4;color:#16a34a">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96c.8 1.02 1.3 2.27 1.3 4.04 0 6.5-4.78 12-10.5 13Z"/><path d="MM2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
      </div>
      <div class="ov-card-body">
        <div class="ov-card-value" id="ovSolarFood">--</div>
        <div class="ov-card-label">时令食材</div>
      </div>
    </div>
  </div>

  <!-- 对话主区域（仿扣子风格） -->
  <div class="chat-main-area" id="chatMainArea">
    <div class="chat-welcome" id="chatWelcome">
      <div class="chat-welcome-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M12 2l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
      </div>
      <div class="chat-welcome-title" id="chatWelcomeTitle">你好，我是你的智能分身</div>
      <div class="chat-welcome-desc">我可以帮你管理日程、记录收支、分析健康<br>有什么想聊的，直接告诉我</div>
    </div>
    <div class="chat-message-list" id="chatMessageList"></div>
  </div>

  <!-- 智能分身状态面板（可折叠） -->
  <div class="agent-panel" id="agentPanel" style="display:none">
    <div class="agent-panel-header">
      <span class="agent-panel-title">智能分身状态</span>
      <button class="agent-panel-close" onclick="toggleAgentPanel()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="agent-panel-body">
      <div class="agent-status-row">
        <span class="agent-status-label">运行状态</span>
        <span class="agent-status-val"><span class="dot-online" id="agentRunDot"></span><span id="agentRunStatus">空闲中</span></span>
      </div>
      <div class="agent-status-row">
        <span class="agent-status-label">今日已处理</span>
        <span class="agent-status-val" id="agentTodayTasks">0 件事</span>
      </div>
      <div class="agent-status-row">
        <span class="agent-status-label">记忆库条目</span>
        <span class="agent-status-val" id="agentMemoryCount">-- 条</span>
      </div>
      <div class="agent-dim-title">用户画像完整度</div>
      <div class="agent-dim-grid">
        <div class="agent-dim-item">
          <div class="agent-dim-bar"><div class="agent-dim-fill" id="dimWealth" style="width:40%"></div></div>
          <div class="agent-dim-label">财富</div>
        </div>
        <div class="agent-dim-item">
          <div class="agent-dim-bar"><div class="agent-dim-fill" id="dimHealth" style="width:35%"></div></div>
          <div class="agent-dim-label">健康</div>
        </div>
        <div class="agent-dim-item">
          <div class="agent-dim-bar"><div class="agent-dim-fill" id="dimWork" style="width:30%"></div></div>
          <div class="agent-dim-label">工作</div>
        </div>
        <div class="agent-dim-item">
          <div class="agent-dim-bar"><div class="agent-dim-fill" id="dimLife" style="width:45%"></div></div>
          <div class="agent-dim-label">生活</div>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- END page-home -->'''

content = re.sub(pattern_home, new_home, content, flags=re.DOTALL)

# ============ 4. 重写底部输入栏为多行输入 ============
pattern_input = r'<div class="app-input-bar">.*?</div>\s*<script src="datastore'
new_input = '''<div class="app-input-bar-v52">
  <button class="input-action-btn" id="imageUploadBtnV52" title="上传图片">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  </button>
  <input type="file" id="imageFileInput" accept="image/*" style="display:none" />
  <div class="input-textarea-wrap">
    <textarea class="input-textarea" id="aiInputField" placeholder="说点什么... (Shift+Enter 换行)" rows="1"></textarea>
  </div>
  <button class="input-action-btn" id="voiceBtnV52" title="语音输入">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
  </button>
  <button class="input-send-btn" onclick="submitAiInput()" title="发送">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
  </button>
</div>
<script src="datastore'''

content = re.sub(pattern_input, new_input, content, flags=re.DOTALL)

# ============ 5. 写回文件 ============
with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Part 1 完成: 全局+对话Tab重构")
print(f"当前文件行数: {len(content.splitlines())}")
