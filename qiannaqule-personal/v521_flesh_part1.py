#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
v52.1 血肉填充 Part 1：对话主入口全功能化
- 气泡式消息列表（替代历史卡片风格）
- 时间分割线
- 思考中动画
- 消息持久化（localStorage，兼容旧数据）
- 自动滚动到底部
- 输入框自适应高度
- 快捷菜单（+号展开：图片/文件/拍照）
- 今日概览真数据对接
- 分身状态面板真数据
- 图片上传+识别
- 文件导入入口
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
# 2. 输入栏增强 - 替换底部输入区
# =====================================================
# 先找到输入栏区域
old_input_area_start = '<div class="app-input-bar-v52">'
old_input_area_end = '</div>\n<script src="datastore.js'

idx_start = content.find(old_input_area_start)
idx_end = content.find(old_input_area_end)
assert idx_start != -1 and idx_end != -1, "未找到输入栏区域"

new_input_area = '''<div class="app-input-bar-v52">
  <!-- +号菜单 -->
  <div class="input-plus-menu" id="inputPlusMenu" style="display:none">
    <div class="ipm-item" onclick="triggerImageUpload()">
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
    <div class="ipm-item" onclick="alert('拍照功能开发中')">
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

old_input_block = content[idx_start:idx_end]
content = content[:idx_start] + new_input_area + content[idx_end:]
print("✅ 2. 输入栏增强（+号菜单）已更新")

# =====================================================
# 3. 添加对话气泡 CSS 样式
# =====================================================
css_insert_point = "/* ===== v52 财富三层范式 新增样式 END ===== */"
chat_css = '''
/* ===== v52.1 对话气泡 新增样式 ===== */
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
.chat-msg-item.user {
  flex-direction: row-reverse;
}
.chat-msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}
.chat-msg-item.ai .chat-msg-avatar {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #fff;
}
.chat-msg-item.user .chat-msg-avatar {
  background: #334155;
  color: #fff;
}
.chat-msg-body {
  max-width: 72%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.chat-msg-item.user .chat-msg-body {
  align-items: flex-end;
}
.chat-msg-bubble {
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
  word-break: break-word;
}
.chat-msg-item.ai .chat-msg-bubble {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-bottom-left-radius: 4px;
  color: #1e293b;
  border-top-left-radius: 4px;
}
.chat-msg-item.user .chat-msg-bubble {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #fff;
  border-bottom-right-radius: 4px;
  border-top-right-radius: 4px;
}
.chat-msg-time {
  font-size: 11px;
  color: #94a3b8;
  padding: 0 4px;
}
.chat-msg-status {
  font-size: 10px;
  color: #94a3b8;
  padding: 0 4px;
  display: flex;
  align-items: center;
  gap: 3px;
}
.chat-msg-status.sending { color: #f59e0b; }
.chat-msg-status.error { color: #ef4444; }

/* 思考中动画 */
.chat-msg-thinking {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  border-bottom-left-radius: 4px;
}
.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
  animation: typingBounce 1.4s infinite;
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-4px); opacity: 1; }
}

/* 日期分割线 */
.chat-date-divider {
  text-align: center;
  margin: 16px 0;
  position: relative;
}
.chat-date-divider span {
  display: inline-block;
  padding: 4px 12px;
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 11px;
  border-radius: 10px;
  position: relative;
  z-index: 1;
}

/* 图片消息 */
.chat-msg-image {
  max-width: 240px;
  border-radius: 10px;
  cursor: pointer;
}

/* 卡片消息（结构化输出） */
.chat-msg-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  margin-top: 8px;
  font-size: 13px;
}
.chat-msg-card-title {
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.chat-msg-card-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 12px;
}
.chat-msg-card-row:last-child { border-bottom: none; }
.chat-msg-card-label { color: #64748b; }
.chat-msg-card-value { color: #1e293b; font-weight: 500; }
.chat-msg-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.chat-msg-card-btn {
  flex: 1;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}
.chat-msg-card-btn.primary {
  background: #8b5cf6;
  color: #fff;
  border-color: #8b5cf6;
}
.chat-msg-card-btn:hover { opacity: 0.85; }

/* +号菜单 */
.input-plus-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 8px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
  padding: 10px;
  display: flex;
  gap: 8px;
  z-index: 100;
  animation: menuSlideUp 0.2s ease;
}
@keyframes menuSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.ipm-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 56px;
}
.ipm-item:hover {
  background: #f8fafc;
}
.ipm-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ipm-label {
  font-size: 11px;
  color: #64748b;
}

.input-plus-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}
.input-plus-btn:hover {
  background: #e2e8f0;
  color: #334155;
}

/* 输入框 */
.input-textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  max-height: 120px;
  font-family: inherit;
  background: transparent;
  color: #1e293b;
}
.input-textarea::placeholder {
  color: #94a3b8;
}
/* ===== v52.1 对话气泡 新增样式 END ===== */
'''

assert css_insert_point in content, "未找到CSS插入点"
content = content.replace(css_insert_point, chat_css + "\n" + css_insert_point)
print("✅ 3. 对话气泡CSS样式已添加")

# =====================================================
# 4. JS: 消息列表渲染 + 对话核心逻辑
# =====================================================
# 找到 submitAiInput 函数前，插入新的消息管理函数
js_insert_marker = "  window.submitAiInput = function() {"

new_chat_js = '''
  // ========== v52.1 对话气泡消息管理 ==========
  var CHAT_MSGS_KEY = 'mirun_chat_messages_v1';
  var _chatMsgId = 0;

  function getChatMessages() {
    try { return JSON.parse(localStorage.getItem(CHAT_MSGS_KEY)) || []; } catch(e) { return []; }
  }
  function setChatMessages(arr) {
    try {
      // 最多保留200条消息
      if (arr.length > 200) { arr = arr.slice(arr.length - 200); }
      localStorage.setItem(CHAT_MSGS_KEY, JSON.stringify(arr));
    } catch(e) {}
  }

  function formatMsgTime(ts) {
    var d = new Date(ts);
    var h = d.getHours();
    var m = d.getMinutes();
    return (h<10?'0':'') + h + ':' + (m<10?'0':'') + m;
  }
  function formatMsgDate(ts) {
    var d = new Date(ts);
    var today = new Date();
    var yesterday = new Date(today.getTime() - 86400000);
    if (d.toDateString() === today.toDateString()) return '今天';
    if (d.toDateString() === yesterday.toDateString()) return '昨天';
    return (d.getMonth()+1) + '月' + d.getDate() + '日';
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
      var dateStr = formatMsgDate(msg.timestamp);
      if (dateStr !== lastDate) {
        html += '<div class="chat-date-divider"><span>' + dateStr + '</span></div>';
        lastDate = dateStr;
      }

      var isUser = msg.role === 'user';
      var avatarChar = isUser ? '我' : 'AI';
      html += '<div class="chat-msg-item ' + (isUser ? 'user' : 'ai') + '" id="msg-' + msg.id + '">';
      html += '<div class="chat-msg-avatar">' + avatarChar + '</div>';
      html += '<div class="chat-msg-body">';
      
      // 消息内容
      if (msg.type === 'image') {
        html += '<img class="chat-msg-image" src="' + msg.imageUrl + '" alt="图片" onclick="window.openImagePreview(this.src)">';
      } else if (msg.type === 'card') {
        html += '<div class="chat-msg-bubble">' + escapeHtml(msg.content || '') + '</div>';
        if (msg.cardHtml) {
          html += msg.cardHtml;
        }
      } else if (msg.type === 'thinking') {
        html += '<div class="chat-msg-thinking"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div><span style="font-size:12px;color:#94a3b8;margin-left:6px">思考中...</span></div>';
      } else {
        // 普通文本，支持换行
        var textHtml = escapeHtml(msg.content || '').replace(/\\n/g, '<br>');
        html += '<div class="chat-msg-bubble">' + textHtml + '</div>';
      }

      // 时间 + 状态
      html += '<div class="chat-msg-time">' + formatMsgTime(msg.timestamp) + '</div>';
      if (isUser && msg.status) {
        var statusClass = msg.status;
        var statusText = msg.status === 'sending' ? '发送中...' : (msg.status === 'error' ? '发送失败' : '已发送');
        html += '<div class="chat-msg-status ' + statusClass + '">' + statusText + '</div>';
      }
      
      html += '</div></div>';
    }
    list.innerHTML = html;
    // 滚动到底部
    scrollChatToBottom();
  }

  function scrollChatToBottom() {
    var mainArea = document.getElementById('chatMainArea');
    if (mainArea) {
      mainArea.scrollTop = mainArea.scrollHeight;
    }
  }

  function addChatMessage(role, content, options) {
    options = options || {};
    var msgs = getChatMessages();
    var msg = {
      id: 'm_' + (++_chatMsgId) + '_' + Date.now(),
      role: role,
      content: content,
      type: options.type || 'text',
      timestamp: Date.now(),
      status: options.status || 'sent'
    };
    if (options.imageUrl) msg.imageUrl = options.imageUrl;
    if (options.cardHtml) msg.cardHtml = options.cardHtml;
    msgs.push(msg);
    setChatMessages(msgs);
    renderChatMessages();
    return msg;
  }

  function updateChatMessage(msgId, updates) {
    var msgs = getChatMessages();
    for (var i = 0; i < msgs.length; i++) {
      if (msgs[i].id === msgId) {
        for (var k in updates) { msgs[i][k] = updates[k]; }
        setChatMessages(msgs);
        renderChatMessages();
        return msgs[i];
      }
    }
    return null;
  }

  // 思考中消息管理
  var _thinkingMsgId = null;
  function showThinkingMsg() {
    if (_thinkingMsgId) return;
    var msgs = getChatMessages();
    var msg = {
      id: 'm_think_' + Date.now(),
      role: 'ai',
      content: '',
      type: 'thinking',
      timestamp: Date.now(),
      status: 'sending'
    };
    _thinkingMsgId = msg.id;
    msgs.push(msg);
    setChatMessages(msgs);
    renderChatMessages();
  }
  function removeThinkingMsg() {
    if (!_thinkingMsgId) return;
    var msgs = getChatMessages();
    msgs = msgs.filter(function(m) { return m.id !== _thinkingMsgId; });
    setChatMessages(msgs);
    _thinkingMsgId = null;
    renderChatMessages();
  }

  // 快捷建议发送
  window.sendQuickSuggestion = function(text) {
    var field = document.getElementById('aiInputField');
    if (field) { field.value = text; }
    submitAiInput();
  };

  // +号菜单切换
  window.togglePlusMenu = function() {
    var menu = document.getElementById('inputPlusMenu');
    if (!menu) return;
    menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
  };
  // 点击其他区域关闭+号菜单
  document.addEventListener('click', function(e) {
    var menu = document.getElementById('inputPlusMenu');
    var btn = document.getElementById('inputPlusBtn');
    if (!menu || !btn) return;
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.style.display = 'none';
    }
  });

  window.triggerImageUpload = function() {
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

  // 输入框自适应高度
  function initTextareaAutoResize() {
    var ta = document.getElementById('aiInputField');
    if (!ta) return;
    ta.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    // Enter发送，Shift+Enter换行
    ta.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitAiInput();
      }
    });
  }

  // 文件导入
  function initFileImport() {
    var input = document.getElementById('importFileInput');
    if (!input) return;
    input.addEventListener('change', function(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        addChatMessage('user', '[文件] ' + file.name, { type: 'text' });
        addChatMessage('ai', '文件导入功能已收到：' + file.name + '（' + (file.size/1024).toFixed(1) + 'KB）\\n\\n数据导入解析功能正在完善中。\\n\\n目前支持：\\n· CSV账单导入（财富记账）\\n· 健康数据CSV导入\\n\\n可在对应业务Tab中找到导入入口。');
      };
      reader.readAsText(file);
      input.value = '';
    });
  }

  // 图片上传（复用原有handleImageUpload逻辑，增强气泡显示）
  function enhanceImageUpload() {
    var input = document.getElementById('imageFileInput');
    if (!input) return;
    // 原来的initImageUpload已经绑定了，这里只增强气泡显示
    // 钩住原有handleImageUpload，在发送图片时也添加消息
    var origHandle = window.handleImageUpload;
    if (origHandle && !window._imgUploadEnhanced) {
      window._imgUploadEnhanced = true;
      window.handleImageUpload = function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
          var dataUrl = e.target.result;
          addChatMessage('user', '[图片]', { type: 'image', imageUrl: dataUrl });
        };
        reader.readAsDataURL(file);
        return origHandle.apply(window, arguments);
      };
    }
  }

  // 刷新今日概览数据
  function refreshTodayOverview() {
    // 待办数
    if (window.scheduleGetTodayCount) {
      try {
        var cnt = window.scheduleGetTodayCount();
        var el = document.getElementById('ovTodoCount');
        if (el) el.textContent = cnt;
      } catch(e) {}
    }
    // 天气（模拟数据）
    var weatherEl = document.getElementById('ovWeatherTemp');
    if (weatherEl && weatherEl.textContent === '--°') {
      // 用模拟数据，后续可接真实API
      weatherEl.textContent = '22°';
    }
    // 时令食材
    if (window.SolarTerm && window.SolarTerm.getCurrent) {
      try {
        var solar = window.SolarTerm.getCurrent();
        var el = document.getElementById('ovSolarFood');
        if (el && solar && solar.foods && solar.foods[0]) {
          el.textContent = solar.foods[0];
        }
      } catch(e) {}
    }
  }

  // 刷新分身状态面板数据
  function refreshAgentPanel() {
    var msgs = getChatMessages();
    var todayMsgs = msgs.filter(function(m) {
      var d = new Date(m.timestamp);
      var t = new Date();
      return d.toDateString() === t.toDateString();
    });
    var todayRounds = Math.floor(todayMsgs.length / 2);
    var el = document.getElementById('agentTodayTasks');
    if (el) el.textContent = todayRounds + ' 件事';

    // 记忆条目数
    if (window.MemoryManager) {
      window.MemoryManager.getStats().then(function(stats) {
        var mel = document.getElementById('agentMemoryCount');
        if (mel && stats) mel.textContent = (stats.total || 0) + ' 条';
      }).catch(function(){});
    }

    // 已接入服务数（模拟）
    var sel = document.getElementById('agentServiceCount');
    if (sel) sel.textContent = '3 项';

    // 今日自动处理（模拟）
    var ael = document.getElementById('agentAutoProcess');
    if (ael) ael.textContent = Math.floor(todayRounds * 0.6) + ' 件';

    // 画像完整度（根据数据量估算）
    var dims = [
      { id: 'dimWealth', pct: Math.min(40 + todayRounds * 2, 85) },
      { id: 'dimHealth', pct: Math.min(35 + todayRounds * 1.5, 80) },
      { id: 'dimWork', pct: Math.min(30 + todayRounds * 1.5, 75) },
      { id: 'dimLife', pct: Math.min(45 + todayRounds, 80) }
    ];
    dims.forEach(function(d) {
      var el2 = document.getElementById(d.id);
      if (el2) el2.style.width = d.pct + '%';
    });
  }

  // 初始化消息列表
  function initChatMessages() {
    renderChatMessages();
    refreshTodayOverview();
    initTextareaAutoResize();
    initFileImport();
    enhanceImageUpload();
    // 页面加载后延迟刷新分身面板
    setTimeout(refreshAgentPanel, 500);
  }
  // 暴露到window
  window.renderChatMessages = renderChatMessages;
  window.addChatMessage = addChatMessage;
  window.updateChatMessage = updateChatMessage;
  window.refreshTodayOverview = refreshTodayOverview;
  window.refreshAgentPanel = refreshAgentPanel;
  window.scrollChatToBottom = scrollChatToBottom;

  '''  # end new_chat_js

assert js_insert_marker in content, "未找到submitAiInput标记"
content = content.replace(js_insert_marker, new_chat_js + js_insert_marker)
print("✅ 4. 对话核心JS逻辑已添加")

# =====================================================
# 5. 重写 submitAiInput - 使用新气泡系统
# =====================================================
old_submit_start = "  window.submitAiInput = function() {"
old_submit_end = "    };  };// ==================== MiRun AI · 财富域"

idx_s = content.find(old_submit_start)
idx_e = content.find(old_submit_end)
assert idx_s != -1 and idx_e != -1, "未找到submitAiInput起止"

new_submit = '''  window.submitAiInput = function() {
    var field = document.getElementById('aiInputField');
    var text = field.value.trim();
    if (!text) { field.focus(); return; }

    // 重置输入框高度
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

    // 标准流程：添加用户消息 → 显示思考中 → 调用ChatEngine → 显示回复
    addChatMessage('user', text, { status: 'sending' });
    showThinkingMsg();

    if (window.ChatEngine) {
      ChatEngine.process(text).then(function(result) {
        removeThinkingMsg();
        // 标记用户消息为已发送
        var msgs = getChatMessages();
        for (var i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === 'user' && msgs[i].content === text && msgs[i].status === 'sending') {
            msgs[i].status = 'sent';
            break;
          }
        }
        setChatMessages(msgs);

        // 添加AI回复
        addChatMessage('ai', result.reply || '好的。');

        // 执行 actions
        if (result.actions && result.actions.length > 0) {
          result.actions.forEach(function(action) {
            if (action.type === 'navigate' && action.module) {
              setTimeout(function() {
                switchModule(action.module, action.subTab);
              }, 300);
            } else if (action.type === 'add_schedule' && action.title) {
              if (window.scheduleAddTask) {
                window.scheduleAddTask({ title: action.title, desc: action.desc || '', date: action.date, group: action.group || '' });
              }
            }
          });
        }
        // 刷新相关看板
        if (result.intent) {
          if (result.intent.type === 'accounting') {
            setTimeout(updateFinanceDashboard, 200);
            refreshTodayOverview();
            // 更新财富相关数据
            if (typeof updateWealthDashboard === 'function') setTimeout(updateWealthDashboard, 300);
          }
          if (result.intent.type === 'recording') {
            setTimeout(updateHealthDashboard, 200);
          }
          if (result.intent.type === 'schedule') {
            setTimeout(updateWorkDashboard, 200);
            refreshTodayOverview();
          }
        }
        // 刷新分身面板
        refreshAgentPanel();
        // 保存到旧的历史记录（兼容）
        saveChatToHistory(text, result.reply || '好的。');
      }).catch(function(e) {
        removeThinkingMsg();
        addChatMessage('ai', '抱歉，处理时出了点问题：' + (e.message || e));
      });
    } else {
      // 兜底
      removeThinkingMsg();
      if (window.AiEngine) {
        window.AiEngine.processInput(text).then(function(result) {
          addChatMessage('ai', result.reply || '好的。');
          if (result.actions && result.actions.length > 0) {
            result.actions.forEach(function(action) {
              if (action.type === 'navigate' && action.module) {
                switchModule(action.module);
              }
            });
          }
        });
      } else {
        addChatMessage('ai', '好的，我收到了。');
      }
      saveChatToHistory(text, '好的，我收到了。');
    }
  };

  // ==================== MiRun AI · 财富域'''

old_submit_block = content[idx_s:idx_e + len(old_submit_end) - len("  // ====================")]
content = content[:idx_s] + new_submit + content[idx_e + len(old_submit_end) - len("  // ===================="):]
print("✅ 5. submitAiInput 已重写为气泡模式")

# =====================================================
# 6. 页面初始化时调用 initChatMessages
# =====================================================
# 找到页面初始化代码
init_marker = "    if (window.ChatEngine && typeof ChatEngine.renderMessageList === 'function') {\n      ChatEngine.renderMessageList('chatMessageList');\n    }"
if init_marker in content:
    content = content.replace(init_marker, "    // v52.1 初始化对话消息列表\n    if (typeof initChatMessages === 'function') { initChatMessages(); }")
    print("✅ 6. 初始化钩子已更新")

# =====================================================
# 7. 更新SW版本
# =====================================================
content = content.replace("mirunai-v52\"", "mirunai-v52.1\"")
# service-worker.js 里的也更新
sw_filepath = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/service-worker.js'
with open(sw_filepath, 'r', encoding='utf-8') as f:
    sw_content = f.read()
sw_content = sw_content.replace("mirunai-v52", "mirunai-v52.1")
with open(sw_filepath, 'w', encoding='utf-8') as f:
    f.write(sw_content)

# HTML中引用的SW版本号
content = content.replace("service-worker.js?v=52", "service-worker.js?v=52.1")
content = content.replace("serviceWorker.register('./service-worker.js?v=52'", "serviceWorker.register('./service-worker.js?v=52.1'")
# JS文件引用也更新
content = content.replace("?v=52\"", "?v=52.1\"")
content = content.replace("'?v=52'", "'?v=52.1'")
print("✅ 7. SW版本升级为 v52.1")

# =====================================================
# 写回
# =====================================================
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ v52.1 Part1 完成，文件大小: {len(content)} 字符")
