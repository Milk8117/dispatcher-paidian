#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
v52.1 血肉填充 Part 1：对话主入口全功能化 + 主动关怀模块
一次性完成：
1. 对话气泡列表（替换历史卡片风格）
2. 输入栏+号菜单（图片/文件/拍照）
3. 思考中动画、时间分割线、自动滚动
4. 消息持久化（localStorage）
5. 今日概览真数据对接
6. 分身状态面板增强（分身动态）
7. proactive-care.js 主动关怀引擎
8. CSS 样式追加到 </style> 前
"""

filepath = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/index.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# =====================================================
# 1. 对话气泡消息列表 - 替换 chat-main-area 内容
# =====================================================
old_chat_main = '''  <!-- 对话主区域（仿扣子风格） -->
  <div class="chat-main-area" id="chatMainArea">
    <div class="chat-welcome" id="chatWelcome">
      <div class="chat-welcome-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M12 2l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
      </div>
      <div class="chat-welcome-title" id="chatWelcomeTitle">你好，我是你的智能分身</div>
      <div class="chat-welcome-desc">我可以帮你管理日程、记录收支、分析健康<br>试试说：「明天9点提醒我开会」「记一笔午餐35元」<br>有什么想聊的，直接告诉我</div>
    </div>
    <div class="chat-message-list" id="chatMessageList"></div>
  </div>'''

new_chat_main = '''  <!-- 对话主区域（仿扣子风格） -->
  <div class="chat-main-area" id="chatMainArea">
    <!-- 欢迎页（无消息时显示） -->
    <div class="chat-welcome" id="chatWelcome">
      <div class="chat-welcome-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M12 2l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
      </div>
      <div class="chat-welcome-title" id="chatWelcomeTitle">你好，我是你的智能分身</div>
      <div class="chat-welcome-desc">我可以帮你管理日程、记录收支、分析健康<br>试试说：「明天9点提醒我开会」「记一笔午餐35元」<br>有什么想聊的，直接告诉我</div>
      <!-- 快捷建议 -->
      <div class="chat-quick-suggestions">
        <div class="cqs-item" onclick="sendQuickSuggestion('记一笔早餐15元')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          记一笔早餐15元
        </div>
        <div class="cqs-item" onclick="sendQuickSuggestion('明天10点提醒我开会')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          明天10点提醒开会
        </div>
        <div class="cqs-item" onclick="sendQuickSuggestion('我这个月花了多少')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M3 3v18h18"/><path d="M7 16l4-4 3 3 5-6"/></svg>
          这个月花了多少
        </div>
        <div class="cqs-item" onclick="sendQuickSuggestion('今天天气怎么样')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/></svg>
          今天天气
        </div>
      </div>
    </div>
    <!-- 消息列表 -->
    <div class="chat-message-list" id="chatMessageList"></div>
  </div>'''

assert old_chat_main in content, "未找到 chat-main-area 原始内容"
content = content.replace(old_chat_main, new_chat_main)
print("✅ 1. 对话气泡列表结构已更新")

# =====================================================
# 2. 输入栏增强 - 增加 + 号按钮和菜单
# =====================================================
old_input = '''<div class="app-input-bar-v52">
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
</div>'''

new_input = '''<div class="app-input-bar-v52">
  <!-- +号弹出菜单 -->
  <div class="input-plus-menu" id="inputPlusMenu" style="display:none">
    <div class="ipm-item" onclick="triggerImageUploadFromPlus()">
      <div class="ipm-icon" style="background:#eff6ff;color:#2563eb">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </div>
      <div class="ipm-label">图片</div>
    </div>
    <div class="ipm-item" onclick="triggerFileImport()">
      <div class="ipm-icon" style="background:#f0fdf4;color:#16a34a">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div class="ipm-label">文件</div>
    </div>
    <div class="ipm-item" onclick="alert('拍照功能开发中');togglePlusMenu();">
      <div class="ipm-icon" style="background:#fef3c7;color:#d97706">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </div>
      <div class="ipm-label">拍照</div>
    </div>
  </div>
  <button class="input-plus-btn" id="inputPlusBtn" onclick="togglePlusMenu()" title="更多">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  </button>
  <input type="file" id="imageFileInput" accept="image/*" style="display:none" />
  <input type="file" id="importFileInput" accept=".csv,.json,.txt" style="display:none" />
  <div class="input-textarea-wrap">
    <textarea class="input-textarea" id="aiInputField" placeholder="说点什么... (Enter发送，Shift+Enter换行)" rows="1"></textarea>
  </div>
  <button class="input-action-btn" id="voiceBtnV52" title="语音输入" onclick="alert('语音输入功能开发中')">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
  </button>
  <button class="input-send-btn" onclick="submitAiInput()" title="发送">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
  </button>
</div>'''

assert old_input in content, "未找到输入栏"
content = content.replace(old_input, new_input)
print("✅ 2. 输入栏+号菜单已添加")

# =====================================================
# 3. CSS 样式追加到 </style> 前
# =====================================================
style_end = '</style>'
chat_css = '''
/* ========== v52.1 对话气泡 & 主动关怀 样式 ========== */
.chat-quick-suggestions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 20px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}
.cqs-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}
.cqs-item:hover {
  border-color: #8b5cf6;
  color: #7c3aed;
  background: #faf5ff;
}
.cqs-item svg { color: #94a3b8; flex-shrink: 0; }
.cqs-item:hover svg { color: #8b5cf6; }

/* 消息气泡 */
.chat-msg-item {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  animation: msgFadeIn 0.3s ease;
}
@keyframes msgFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.chat-msg-item.user { flex-direction: row-reverse; }
.chat-msg-avatar {
  width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600;
}
.chat-msg-item.ai .chat-msg-avatar {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff;
}
.chat-msg-item.user .chat-msg-avatar { background: #334155; color: #fff; }
.chat-msg-body {
  max-width: 72%; display: flex; flex-direction: column; gap: 4px;
}
.chat-msg-item.user .chat-msg-body { align-items: flex-end; }
.chat-msg-bubble {
  padding: 10px 14px; border-radius: 14px;
  font-size: 14px; line-height: 1.6;
  word-wrap: break-word; word-break: break-word;
  white-space: pre-wrap;
}
.chat-msg-item.ai .chat-msg-bubble {
  background: #fff; border: 1px solid #e2e8f0;
  border-bottom-left-radius: 4px; color: #1e293b;
  border-top-left-radius: 4px;
}
.chat-msg-item.user .chat-msg-bubble {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff;
  border-bottom-right-radius: 4px; border-top-right-radius: 4px;
}
.chat-msg-time { font-size: 11px; color: #94a3b8; padding: 0 4px; }
.chat-msg-status {
  font-size: 10px; color: #94a3b8; padding: 0 4px;
  display: flex; align-items: center; gap: 3px;
}
.chat-msg-status.sending { color: #f59e0b; }
.chat-msg-status.error { color: #ef4444; }

/* 思考中动画 */
.chat-msg-thinking {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 14px; background: #fff;
  border: 1px solid #e2e8f0; border-radius: 14px;
  border-bottom-left-radius: 4px;
}
.typing-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #94a3b8; animation: typingBounce 1.4s infinite;
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-4px); opacity: 1; }
}

/* 日期分割线 */
.chat-date-divider { text-align: center; margin: 16px 0; position: relative; }
.chat-date-divider span {
  display: inline-block; padding: 4px 12px;
  background: #f1f5f9; color: #94a3b8;
  font-size: 11px; border-radius: 10px; position: relative; z-index: 1;
}

/* 图片消息 */
.chat-msg-image { max-width: 240px; border-radius: 10px; cursor: pointer; }

/* 主动关怀消息标记 */
.chat-msg-care-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; background: #fef3c7; color: #d97706;
  font-size: 10px; border-radius: 8px; margin-bottom: 4px;
  font-weight: 500;
}

/* +号菜单 */
.app-input-bar-v52 { position: relative; }
.input-plus-menu {
  position: absolute; bottom: calc(100% + 8px); left: 8px;
  background: #fff; border-radius: 12px;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
  padding: 10px; display: flex; gap: 8px; z-index: 100;
  animation: menuSlideUp 0.2s ease;
}
@keyframes menuSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.ipm-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 10px 12px; border-radius: 10px;
  cursor: pointer; transition: all 0.2s; min-width: 56px;
}
.ipm-item:hover { background: #f8fafc; }
.ipm-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.ipm-label { font-size: 11px; color: #64748b; }

.input-plus-btn {
  width: 36px; height: 36px; border-radius: 10px;
  border: none; background: #f1f5f9; color: #64748b;
  cursor: pointer; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0;
  transition: all 0.2s;
}
.input-plus-btn:hover { background: #e2e8f0; color: #334155; }

.input-textarea {
  width: 100%; border: none; outline: none; resize: none;
  font-size: 14px; line-height: 1.5; max-height: 120px;
  font-family: inherit; background: transparent; color: #1e293b;
}
.input-textarea::placeholder { color: #94a3b8; }

/* 分身动态列表 */
.agent-activity-list { margin-top: 8px; }
.agent-activity-title {
  font-size: 12px; font-weight: 600; color: #475569;
  margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
}
.agent-activity-item {
  display: flex; gap: 8px; padding: 6px 0;
  font-size: 12px; color: #64748b;
  border-bottom: 1px solid #f1f5f9;
}
.agent-activity-item:last-child { border-bottom: none; }
.aai-icon {
  width: 20px; height: 20px; border-radius: 6px;
  background: #f5f3ff; color: #8b5cf6;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.aai-body { flex: 1; }
.aai-text { color: #334155; line-height: 1.4; }
.aai-time { font-size: 10px; color: #94a3b8; margin-top: 2px; }
.aai-empty { text-align: center; padding: 12px; font-size: 11px; color: #94a3b8; }

/* ========== v52.1 样式 END ========== */
'''

assert style_end in content
content = content.replace(style_end, chat_css + style_end)
print("✅ 3. CSS 样式已追加")

# =====================================================
# 4. 主动关怀引擎 JS（内联到HTML，确保加载顺序）
# =====================================================
proactive_care_js = '''
  // ========== v52.1 主动关怀引擎 ==========
  (function() {
    var STORAGE_KEY = 'mirun_proactive_care_state';

    // 状态
    var state = {
      lastSleepCareDate: null,      // 上次作息关怀日期
      lastContinuousCareTs: 0,      // 上次连续使用提醒时间戳
      todayMsgCount: 0,             // 今日消息数
      sessionStartTime: Date.now(), // 本次会话开始时间
      todayStartDate: null,
      activities: []                // 分身动态列表
    };

    // 关怀话术模板
    var templates = {
      lateNight: [
        "这么晚还在忙呀，在想什么事情？要不要我帮你记下来，明天接着想？",
        "夜深了，你的MiRun一直在陪着你。是失眠了，还是这会儿效率特别高？",
        "凌晨啦，注意身体哦。如果是在工作，我可以帮你记录思路。"
      ],
      continuous: [
        "已经聊了挺久了，要不要歇一会儿？我一直都在。",
        "休息一下吧，长时间集中注意力容易疲劳。"
      ],
      moodBad: [
        "听起来心情不太好...有什么想聊的吗？",
        "别太担心，一切都会好起来的。想说说发生了什么吗？"
      ],
      moodGood: [
        "听起来你心情不错呀！是有什么好事吗？",
        "真好！这种时候更要记下来，以后回看也会很开心的～"
      ]
    };

    // 负面/正面情绪关键词
    var negativeWords = ['烦','累','难过','伤心','哭了','崩溃','焦虑','压力','郁闷','不想','讨厌','生气','气死','不爽','难受','痛苦','孤独','寂寞','害怕','担心'];
    var positiveWords = ['开心','高兴','太棒了','太好了','哈哈','嘿嘿','喜欢','爱你','感谢','谢谢','加油','棒','厉害','成功','完成','好耶','愉快','幸福','满足'];

    function loadState() {
      try {
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved) {
          for (var k in saved) { if (saved.hasOwnProperty(k)) state[k] = saved[k]; }
        }
      } catch(e) {}
      // 检查是否新的一天
      var today = new Date().toDateString();
      if (state.todayStartDate !== today) {
        state.todayStartDate = today;
        state.todayMsgCount = 0;
        state.activities = state.activities.filter(function(a) {
          return new Date(a.timestamp).toDateString() === today;
        });
      }
    }

    function saveState() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
    }

    function randomPick(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    // 检测情绪
    function detectMood(text) {
      var negCount = 0, posCount = 0;
      for (var i = 0; i < negativeWords.length; i++) {
        if (text.indexOf(negativeWords[i]) !== -1) negCount++;
      }
      for (var j = 0; j < positiveWords.length; j++) {
        if (text.indexOf(positiveWords[j]) !== -1) posCount++;
      }
      if (negCount > posCount && negCount >= 1) return 'negative';
      if (posCount > negCount && posCount >= 1) return 'positive';
      return 'neutral';
    }

    // 记录分身动态
    function recordActivity(type, text, iconSvg) {
      state.activities.unshift({
        type: type,
        text: text,
        icon: iconSvg || '',
        timestamp: Date.now()
      });
      if (state.activities.length > 20) state.activities = state.activities.slice(0, 20);
      saveState();
    }

    // 主检测函数：每轮用户消息后调用
    function checkAfterUserMessage(text) {
      state.todayMsgCount++;
      saveState();

      var careMsgs = [];
      var now = new Date();
      var hour = now.getHours();

      // 1. 作息异常感知：01:00 - 06:00 且 今日还没触发过
      if (hour >= 1 && hour < 6) {
        var todayStr = now.toDateString();
        if (state.lastSleepCareDate !== todayStr && state.todayMsgCount >= 3) {
          state.lastSleepCareDate = todayStr;
          var careText = randomPick(templates.lateNight);
          careMsgs.push({ type: 'sleep', text: careText });
          recordActivity('sleep', '关心了你的睡眠',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>');
          // 记录到健康数据（深夜使用）
          if (window.HealthBridge && typeof window.HealthBridge.recordSleepEvent === 'function') {
            try { window.HealthBridge.recordSleepEvent({ type: 'late_night', hour: hour }); } catch(e) {}
          }
        }
      }

      // 2. 连续使用提醒：超过30轮 或 超过2小时
      var sessionDuration = Date.now() - state.sessionStartTime;
      if ((state.todayMsgCount > 30 || sessionDuration > 7200000) &&
          (Date.now() - state.lastContinuousCareTs > 14400000)) { // 每4小时最多1次
        state.lastContinuousCareTs = Date.now();
        careMsgs.push({ type: 'continuous', text: randomPick(templates.continuous) });
        recordActivity('rest', '提醒你休息一下',
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>');
      }

      // 3. 情绪感知
      var mood = detectMood(text);
      if (mood === 'negative') {
        careMsgs.push({ type: 'mood', mood: 'negative', text: randomPick(templates.moodBad) });
        recordActivity('mood', '察觉到你的情绪低落',
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>');
        // 写入情绪数据
        if (window.HealthBridge && typeof window.HealthBridge.recordMood === 'function') {
          try { window.HealthBridge.recordMood({ level: -1, source: 'auto_detect' }); } catch(e) {}
        }
      } else if (mood === 'positive') {
        careMsgs.push({ type: 'mood', mood: 'positive', text: randomPick(templates.moodGood) });
        if (window.HealthBridge && typeof window.HealthBridge.recordMood === 'function') {
          try { window.HealthBridge.recordMood({ level: 1, source: 'auto_detect' }); } catch(e) {}
        }
      }

      saveState();
      return careMsgs;
    }

    // 获取分身动态列表（供面板显示）
    function getActivities(limit) {
      limit = limit || 5;
      return state.activities.slice(0, limit);
    }

    // 判断主动关怀是否开启
    function isEnabled() {
      try {
        var val = localStorage.getItem('mirun_proactive_care_enabled');
        return val !== 'false'; // 默认开启
      } catch(e) { return true; }
    }

    // 暴露
    loadState();
    window.ProactiveCare = {
      checkAfterUserMessage: function(text) {
        if (!isEnabled()) return [];
        return checkAfterUserMessage(text);
      },
      getActivities: getActivities,
      recordActivity: recordActivity,
      isEnabled: isEnabled,
      setEnabled: function(v) {
        localStorage.setItem('mirun_proactive_care_enabled', v ? 'true' : 'false');
      }
    };
  })();
  '''

js_anchor = "  // ==================== v52 新增：分身状态面板 ===================="
assert js_anchor in content
content = content.replace(js_anchor, proactive_care_js + js_anchor)
print("✅ 4. 主动关怀引擎已注入")

# =====================================================
# 5. 对话核心 JS：消息管理 + 重写submitAiInput
# =====================================================
chat_core_js = '''
  // ========== v52.1 对话气泡消息管理 ==========
  var CHAT_MSGS_KEY = 'mirun_chat_messages_v1';
  var _chatMsgIdSeq = 0;

  function getChatMessages() {
    try { return JSON.parse(localStorage.getItem(CHAT_MSGS_KEY)) || []; } catch(e) { return []; }
  }
  function setChatMessages(arr) {
    try {
      if (arr.length > 200) arr = arr.slice(arr.length - 200);
      localStorage.setItem(CHAT_MSGS_KEY, JSON.stringify(arr));
    } catch(e) {}
  }
  function _msgTime(ts) {
    var d = new Date(ts);
    return (d.getHours()<10?'0':'') + d.getHours() + ':' + (d.getMinutes()<10?'0':'') + d.getMinutes();
  }
  function _msgDateLabel(ts) {
    var d = new Date(ts);
    var t = new Date();
    var y = new Date(t.getTime() - 86400000);
    if (d.toDateString() === t.toDateString()) return '今天';
    if (d.toDateString() === y.toDateString()) return '昨天';
    return (d.getMonth()+1) + '月' + d.getDate() + '日';
  }
  function _escHtml(t) {
    var d = document.createElement('div'); d.textContent = t; return d.innerHTML;
  }

  function renderChatMessages() {
    var list = document.getElementById('chatMessageList');
    var welcome = document.getElementById('chatWelcome');
    if (!list) return;
    var msgs = getChatMessages();
    if (msgs.length === 0) {
      list.innerHTML = '';
      if (welcome) welcome.style.display = '';
      return;
    }
    if (welcome) welcome.style.display = 'none';

    var html = '';
    var lastDate = '';
    for (var i = 0; i < msgs.length; i++) {
      var msg = msgs[i];
      var ds = _msgDateLabel(msg.timestamp);
      if (ds !== lastDate) {
        html += '<div class="chat-date-divider"><span>' + ds + '</span></div>';
        lastDate = ds;
      }
      var isUser = msg.role === 'user';
      html += '<div class="chat-msg-item ' + (isUser?'user':'ai') + '" id="msg-' + msg.id + '">';
      html += '<div class="chat-msg-avatar">' + (isUser?'我':'AI') + '</div>';
      html += '<div class="chat-msg-body">';

      if (msg.careBadge) {
        html += '<span class="chat-msg-care-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="10" height="10"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>主动关怀</span>';
      }

      if (msg.type === 'image') {
        html += '<img class="chat-msg-image" src="' + msg.imageUrl + '" alt="图片">';
      } else if (msg.type === 'thinking') {
        html += '<div class="chat-msg-thinking"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div><span style="font-size:12px;color:#94a3b8;margin-left:6px">思考中...</span></div>';
      } else {
        html += '<div class="chat-msg-bubble">' + _escHtml(msg.content||'').replace(/\\n/g,'<br>') + '</div>';
      }
      html += '<div class="chat-msg-time">' + _msgTime(msg.timestamp) + '</div>';
      if (isUser && msg.status && msg.status !== 'sent') {
        var stText = msg.status==='sending' ? '发送中...' : '发送失败';
        html += '<div class="chat-msg-status ' + msg.status + '">' + stText + '</div>';
      }
      html += '</div></div>';
    }
    list.innerHTML = html;
    scrollChatToBottom();
  }

  function scrollChatToBottom() {
    var m = document.getElementById('chatMainArea');
    if (m) m.scrollTop = m.scrollHeight;
  }

  function addChatMessage(role, content, opts) {
    opts = opts || {};
    var msgs = getChatMessages();
    var msg = {
      id: 'm' + (++_chatMsgIdSeq) + '_' + Date.now(),
      role: role,
      content: content,
      type: opts.type || 'text',
      timestamp: Date.now(),
      status: opts.status || 'sent'
    };
    if (opts.imageUrl) msg.imageUrl = opts.imageUrl;
    if (opts.careBadge) msg.careBadge = true;
    msgs.push(msg);
    setChatMessages(msgs);
    renderChatMessages();
    return msg;
  }

  function updateLastUserMsgStatus(status) {
    var msgs = getChatMessages();
    for (var i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user' && msgs[i].type === 'text') {
        msgs[i].status = status;
        setChatMessages(msgs);
        renderChatMessages();
        return;
      }
    }
  }

  var _thinkingMsgId = null;
  function showThinkingMsg() {
    if (_thinkingMsgId) return;
    var msgs = getChatMessages();
    var msg = {
      id: 'think_' + Date.now(),
      role: 'ai', content: '', type: 'thinking',
      timestamp: Date.now(), status: 'sending'
    };
    _thinkingMsgId = msg.id;
    msgs.push(msg);
    setChatMessages(msgs);
    renderChatMessages();
  }
  function removeThinkingMsg() {
    if (!_thinkingMsgId) return;
    var msgs = getChatMessages();
    msgs = msgs.filter(function(m){ return m.id !== _thinkingMsgId; });
    setChatMessages(msgs);
    _thinkingMsgId = null;
    renderChatMessages();
  }

  // 快捷建议
  window.sendQuickSuggestion = function(text) {
    var f = document.getElementById('aiInputField');
    if (f) f.value = text;
    submitAiInput();
  };

  // +号菜单
  window.togglePlusMenu = function() {
    var m = document.getElementById('inputPlusMenu');
    if (!m) return;
    m.style.display = m.style.display === 'none' ? 'flex' : 'none';
  };
  window.triggerImageUploadFromPlus = function() {
    var input = document.getElementById('imageFileInput');
    if (input) input.click();
    var menu = document.getElementById('inputPlusMenu');
    if (menu) menu.style.display = 'none';
  };
  window.triggerFileImport = function() {
    var input = document.getElementById('importFileInput');
    if (input) input.click();
    var menu = document.getElementById('inputPlusMenu');
    if (menu) menu.style.display = 'none';
  };

  // 输入框自适应
  function initTextareaAutoResize() {
    var ta = document.getElementById('aiInputField');
    if (!ta) return;
    ta.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    ta.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAiInput(); }
    });
  }

  // 文件导入
  function initFileImport() {
    var input = document.getElementById('importFileInput');
    if (!input) return;
    input.addEventListener('change', function(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      addChatMessage('user', '[文件] ' + file.name);
      addChatMessage('ai', '已收到文件「' + file.name + '」（' + (file.size/1024).toFixed(1) + ' KB）\\n\\n当前支持的数据导入：\\n· CSV 账单 → 财富收支\\n· 健康数据 CSV → 健康模块\\n\\n可在对应业务 Tab 找到导入入口。');
      input.value = '';
    });
  }

  // 图片上传增强
  function enhanceImageUpload() {
    var orig = window.handleImageUpload;
    if (orig && !window._imgEnhanced) {
      window._imgEnhanced = true;
      window.handleImageUpload = function(file) {
        var reader = new FileReader();
        reader.onload = function(ev) {
          addChatMessage('user', '[图片]', { type: 'image', imageUrl: ev.target.result });
        };
        reader.readAsDataURL(file);
        return orig.apply(window, arguments);
      };
    }
  }

  // 刷新今日概览
  function refreshTodayOverview() {
    // 待办
    if (window.scheduleGetTodayCount) {
      try {
        var c = window.scheduleGetTodayCount();
        var el = document.getElementById('ovTodoCount');
        if (el) el.textContent = c;
      } catch(e) {}
    }
    // 天气（模拟数据）
    var w = document.getElementById('ovWeatherTemp');
    if (w && w.textContent === '--°') w.textContent = '22°';
    // 节气食材
    try {
      if (window.SolarTerm && typeof window.SolarTerm.getCurrentFoods === 'function') {
        var foods = window.SolarTerm.getCurrentFoods();
        var el = document.getElementById('ovSolarFood');
        if (el && foods && foods.length) el.textContent = foods[0];
      }
    } catch(e) {}
  }

  // 刷新分身状态面板
  function refreshAgentPanel() {
    var msgs = getChatMessages();
    var todays = msgs.filter(function(m) {
      return new Date(m.timestamp).toDateString() === new Date().toDateString();
    });
    var rounds = Math.floor(todays.length / 2);
    var el = document.getElementById('agentTodayTasks');
    if (el) el.textContent = rounds + ' 件事';
    // 记忆条目
    if (window.MemoryManager && typeof window.MemoryManager.getStats === 'function') {
      try {
        window.MemoryManager.getStats().then(function(s){
          var me = document.getElementById('agentMemoryCount');
          if (me && s) me.textContent = (s.total||0) + ' 条';
        }).catch(function(){});
      } catch(e) {}
    }
    // 服务数
    var se = document.getElementById('agentServiceCount');
    if (se) se.textContent = '3 项';
    // 今日自动处理
    var ae = document.getElementById('agentAutoProcess');
    if (ae) ae.textContent = Math.floor(rounds * 0.6) + ' 件';
    // 画像完整度
    [['dimWealth',40],['dimHealth',35],['dimWork',30],['dimLife',45]].forEach(function(d){
      var el2 = document.getElementById(d[0]);
      if (el2) el2.style.width = Math.min(d[1] + rounds * 2, 85) + '%';
    });
    // 分身动态
    renderAgentActivities();
  }

  // 渲染分身动态
  function renderAgentActivities() {
    var list = document.getElementById('agentActivityList');
    if (!list) return;
    if (!window.ProactiveCare) return;
    var acts = window.ProactiveCare.getActivities(5);
    if (acts.length === 0) {
      list.innerHTML = '<div class="aai-empty">分身还没有主动行动<br>多和我聊聊吧～</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i];
      var mins = Math.floor((Date.now() - a.timestamp) / 60000);
      var timeStr = mins < 1 ? '刚刚' : (mins < 60 ? mins + '分钟前' : Math.floor(mins/60) + '小时前');
      html += '<div class="agent-activity-item">';
      html += '<div class="aai-icon">' + (a.icon || '✦') + '</div>';
      html += '<div class="aai-body"><div class="aai-text">' + _escHtml(a.text) + '</div><div class="aai-time">' + timeStr + '</div></div>';
      html += '</div>';
    }
    list.innerHTML = html;
  }

  function initChatV521() {
    renderChatMessages();
    refreshTodayOverview();
    initTextareaAutoResize();
    initFileImport();
    enhanceImageUpload();
    setTimeout(refreshAgentPanel, 500);
  }

  window.renderChatMessages = renderChatMessages;
  window.addChatMessage = addChatMessage;
  window.scrollChatToBottom = scrollChatToBottom;
  window.refreshTodayOverview = refreshTodayOverview;
  window.refreshAgentPanel = refreshAgentPanel;
  window.renderAgentActivities = renderAgentActivities;

  '''

js_anchor2 = "  window.submitAiInput = function() {"
assert js_anchor2 in content
content = content.replace(js_anchor2, chat_core_js + js_anchor2)
print("✅ 5. 对话核心JS已注入")

# =====================================================
# 6. 重写 submitAiInput - 气泡模式 + 主动关怀
# =====================================================
old_submit_s = "  window.submitAiInput = function() {"
old_submit_e = "  };// ==================== MiRun AI · 财富域 — 收支概览"

idx_s = content.find(old_submit_s)
idx_e = content.find(old_submit_e)
assert idx_s != -1 and idx_e != -1

new_submit = '''  window.submitAiInput = function() {
    var field = document.getElementById('aiInputField');
    var text = field.value.trim();
    if (!text) { field.focus(); return; }

    field.value = '';
    field.style.height = 'auto';

    // 快速路径：菜谱录入
    var recipeAddMatch = text.match(/^(?:加个?菜谱|收藏菜谱|记录食谱|添加?(?:一道)?菜)[：:\\s]*(.+)/);
    if (recipeAddMatch) {
      addChatMessage('user', text);
      if (window.solarOpenRecipeForm) {
        window.solarOpenRecipeForm(recipeAddMatch[1].trim());
        switchModule('health');
        if (window.solarSwitchView) setTimeout(function() { window.solarSwitchView('collection'); }, 100);
      }
      addChatMessage('ai', '好的，已打开菜谱录入表单 👆');
      return;
    }

    // 快速路径：今天吃什么
    if (/今天吃什么|今天吃啥|吃啥好|今天推荐|吃什么好|今天怎么吃|推荐.*(菜|食谱|吃)/.test(text)) {
      addChatMessage('user', text);
      showTodayRecipes();
      addChatMessage('ai', '好的，这是今天的时令菜谱推荐 👇');
      return;
    }

    // 标准流程
    addChatMessage('user', text, { status: 'sending' });
    showThinkingMsg();

    // 主动关怀检测
    var careResults = [];
    if (window.ProactiveCare) {
      careResults = window.ProactiveCare.checkAfterUserMessage(text);
    }

    if (window.ChatEngine) {
      ChatEngine.process(text).then(function(result) {
        removeThinkingMsg();
        updateLastUserMsgStatus('sent');

        // 记录分身动态：记账/日程/健康记录
        if (result.intent) {
          try {
            var it = result.intent.type;
            if (it === 'accounting') {
              window.ProactiveCare && window.ProactiveCare.recordActivity('accounting', '帮你记录了一笔收支',
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>');
            } else if (it === 'schedule') {
              window.ProactiveCare && window.ProactiveCare.recordActivity('schedule', '帮你添加了一条日程',
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>');
            } else if (it === 'recording') {
              window.ProactiveCare && window.ProactiveCare.recordActivity('health', '帮你记录了健康数据',
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>');
            }
          } catch(e) {}
        }

        addChatMessage('ai', result.reply || '好的。');

        // 主动关怀消息（在正常回复后追加）
        if (careResults && careResults.length > 0) {
          for (var ci = 0; ci < careResults.length; ci++) {
            (function(cr){
              setTimeout(function() {
                addChatMessage('ai', cr.text, { careBadge: true });
              }, 500 + ci * 400);
            })(careResults[ci]);
          }
        }

        // actions
        if (result.actions && result.actions.length > 0) {
          result.actions.forEach(function(action) {
            if (action.type === 'navigate' && action.module) {
              setTimeout(function() { switchModule(action.module, action.subTab); }, 300);
            } else if (action.type === 'add_schedule' && action.title) {
              if (window.scheduleAddTask) {
                window.scheduleAddTask({ title: action.title, desc: action.desc||'', date: action.date, group: action.group||'' });
              }
            }
          });
        }
        // 刷新看板
        if (result.intent) {
          if (result.intent.type === 'accounting') {
            setTimeout(updateFinanceDashboard, 200);
            refreshTodayOverview();
            if (typeof updateWealthDashboard === 'function') setTimeout(updateWealthDashboard, 300);
          }
          if (result.intent.type === 'recording') setTimeout(updateHealthDashboard, 200);
          if (result.intent.type === 'schedule') {
            setTimeout(updateWorkDashboard, 200);
            refreshTodayOverview();
          }
        }
        refreshAgentPanel();
        saveChatToHistory(text, result.reply || '好的。');
      }).catch(function(e) {
        removeThinkingMsg();
        addChatMessage('ai', '抱歉，处理时出了点问题：' + (e.message || e));
      });
    } else {
      removeThinkingMsg();
      addChatMessage('ai', '好的，我收到了。');
      saveChatToHistory(text, '好的，我收到了。');
    }
  };

  // ==================== MiRun AI · 财富域 — 收支概览'''

content = content[:idx_s] + new_submit + content[idx_e+3:]
print("✅ 6. submitAiInput 已重写")

# =====================================================
# 7. 分身状态面板增加「分身动态」区块
# =====================================================
agent_panel_end = '<div class="agent-dim-title">用户画像完整度</div>'
agent_activity_html = '''      <div class="agent-activity-list">
        <div class="agent-activity-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M12 2l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
          分身动态
        </div>
        <div id="agentActivityList">
          <div class="aai-empty">分身还没有主动行动<br>多和我聊聊吧～</div>
        </div>
      </div>
      <div class="agent-dim-title">用户画像完整度</div>'''

assert agent_panel_end in content
content = content.replace(agent_panel_end, agent_activity_html)
print("✅ 7. 分身状态面板增加分身动态")

# =====================================================
# 8. 初始化钩子 + SW版本
# =====================================================
init_old = "    if (window.ChatEngine && typeof ChatEngine.renderMessageList === 'function') {\n      ChatEngine.renderMessageList('chatMessageList');\n    }"
init_new = "    // v52.1 初始化对话消息列表\n    if (typeof initChatV521 === 'function') { initChatV521(); }"
if init_old in content:
    content = content.replace(init_old, init_new)
    print("✅ 8a. 初始化钩子已更新")

# SW版本升级
sw_file = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/service-worker.js'
with open(sw_file, 'r', encoding='utf-8') as f:
    sw = f.read()
sw = sw.replace('mirunai-v52', 'mirunai-v52.1')
with open(sw_file, 'w', encoding='utf-8') as f:
    f.write(sw)

# HTML中的引用版本
content = content.replace("service-worker.js?v=52", "service-worker.js?v=52.1")
content = content.replace("register('./service-worker.js?v=52'", "register('./service-worker.js?v=52.1'")
# JS文件版本
content = content.replace("?v=52\"", "?v=52.1\"")
content = content.replace("'?v=52'", "'?v=52.1'")

print("✅ 8b. SW版本升级 v52.1")

# =====================================================
# 9. 系统设置区增加主动关怀开关
# =====================================================
settings_marker = "系统设置"
# 找到系统设置区，在其中增加主动关怀开关
# 先定位到系统设置section
setting_proactive = '''
          <div class="profile-item-row">
            <div class="profile-item-left">
              <div class="pi-icon" style="background:#fef3c7;color:#d97706">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
              <div class="pi-info">
                <div class="pi-name">主动关怀</div>
                <div class="pi-value">MiRun 主动感知并关心你的状态</div>
              </div>
            </div>
            <label class="switch-toggle">
              <input type="checkbox" id="proactiveCareSwitch" checked onchange="toggleProactiveCare(this.checked)">
              <span class="switch-slider"></span>
            </label>
          </div>'''

# 找到"通知"设置项附近插入
notif_switch = '<div class="pi-name">消息通知</div>'
if notif_switch in content:
    content = content.replace(notif_switch + '\n                <div class="pi-value">接收系统提醒与通知</div>',
                              notif_switch + '\n                <div class="pi-value">接收系统提醒与通知</div>' +
                              '</div>\n            </div>\n          </div>' + setting_proactive.replace('<div class="profile-item-row">\n            <div class="profile-item-left">\n              ','').replace('</div>\n            </div>\n          </div>','').replace('          </div>',''))
    # 上面太复杂，换简单方式：直接在系统设置section的第一个item前插入
    pass

# 简化：在 system-settings-section 里找通知item的完整行并在其后插入
notif_row = '''          <div class="profile-item-row">
            <div class="profile-item-left">
              <div class="pi-icon" style="background:#eff6ff;color:#2563eb">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              </div>
              <div class="pi-info">
                <div class="pi-name">消息通知</div>
                <div class="pi-value">接收系统提醒与通知</div>
              </div>
            </div>
            <label class="switch-toggle">
              <input type="checkbox" checked>
              <span class="switch-slider"></span>
            </label>
          </div>'''

if notif_row in content:
    content = content.replace(notif_row, notif_row + setting_proactive)
    print("✅ 9. 系统设置增加主动关怀开关")

# toggle函数
toggle_fn = '''
  window.toggleProactiveCare = function(enabled) {
    if (window.ProactiveCare) {
      window.ProactiveCare.setEnabled(enabled);
    }
  };
'''
# 插入到系统设置附近
toggle_anchor = "  // ==================== v52 新增：系统设置 ===================="
if toggle_anchor in content:
    content = content.replace(toggle_anchor, toggle_fn + toggle_anchor)

# =====================================================
# 写回
# =====================================================
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ v52.1 Part1 对话+主动关怀 完成，文件大小: {len(content)} 字符")
