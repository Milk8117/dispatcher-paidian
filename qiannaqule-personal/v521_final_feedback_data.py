#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MiRun AI v52.1 最终拼：意见反馈系统 + 数据联通 + 血肉填充收尾
"""

import re

FILE_PATH = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/index.html'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

print(f'原始文件大小: {len(content)} 字符')

# ============================================================
# 1. CSS: 反馈系统样式
# ============================================================
feedback_css = '''
/* ===== v52.1 意见反馈系统 ===== */
.feedback-overlay { position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:flex-end;justify-content:center; }
.feedback-panel { background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;animation:feedbackSlideUp 0.3s ease; }
@keyframes feedbackSlideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
.feedback-header { display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f1f5f9;position:sticky;top:0;background:#fff;z-index:1; }
.feedback-title { font-size:16px;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:8px; }
.feedback-close-btn { width:32px;height:32px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;color:#64748b; }
.feedback-close-btn:hover { background:#e2e8f0; }
.feedback-body { padding:16px 20px 20px; }
.feedback-type-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px; }
.feedback-type-item { display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border:1.5px solid #e2e8f0;border-radius:12px;cursor:pointer;transition:all 0.2s; }
.feedback-type-item:hover { border-color:#8b5cf6;background:#faf5ff; }
.feedback-type-item.active { border-color:#8b5cf6;background:#faf5ff; }
.feedback-type-icon { width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center; }
.feedback-type-label { font-size:12px;color:#475569;font-weight:500; }
.feedback-form-group { margin-bottom:14px; }
.feedback-form-label { font-size:13px;font-weight:600;color:#334155;margin-bottom:6px;display:block; }
.feedback-textarea { width:100%;min-height:100px;padding:12px;border:1px solid #e2e8f0;border-radius:12px;font-size:14px;color:#0f172a;resize:vertical;outline:none;font-family:inherit;transition:border-color 0.2s; }
.feedback-textarea:focus { border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,0.1); }
.feedback-attach-area { display:flex;align-items:center;gap:10px;flex-wrap:wrap; }
.feedback-attach-btn { display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;cursor:pointer;font-size:13px;color:#64748b; }
.feedback-attach-btn:hover { border-color:#8b5cf6;color:#8b5cf6;background:#faf5ff; }
.feedback-submit-btn { width:100%;padding:14px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:opacity 0.2s; }
.feedback-submit-btn:hover { opacity:0.9; }
.feedback-submit-btn:disabled { opacity:0.5;cursor:not-allowed; }
.feedback-auto-info { background:#f8fafc;border-radius:10px;padding:10px 12px;font-size:11px;color:#94a3b8;margin-bottom:14px;display:flex;align-items:flex-start;gap:6px; }
.feedback-auto-info svg { flex-shrink:0;margin-top:1px; }

/* 反馈列表 */
.feedback-list-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:12px; }
.feedback-list-title { font-size:15px;font-weight:700;color:#0f172a; }
.feedback-list-count { font-size:12px;color:#94a3b8; }
.feedback-list-item { background:#fff;border:1px solid #f1f5f9;border-radius:12px;padding:14px;margin-bottom:10px; }
.fli-top { display:flex;align-items:center;justify-content:space-between;margin-bottom:8px; }
.fli-type { display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600; }
.fli-status { font-size:11px;padding:3px 8px;border-radius:10px;font-weight:500; }
.fli-status.pending { background:#fef3c7;color:#92400e; }
.fli-status.processing { background:#dbeafe;color:#1e40af; }
.fli-status.done { background:#dcfce7;color:#166534; }
.fli-content { font-size:13px;color:#334155;line-height:1.5;margin-bottom:8px;word-break:break-word; }
.fli-meta { font-size:11px;color:#94a3b8;display:flex;align-items:center;gap:10px; }
.feedback-empty { text-align:center;padding:40px 20px;color:#94a3b8;font-size:13px; }
.feedback-empty svg { margin-bottom:10px;opacity:0.5; }

/* 成功提示弹窗 */
.feedback-success-modal { position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:20px;padding:30px 24px;text-align:center;z-index:10001;width:80%;max-width:320px;box-shadow:0 10px 40px rgba(0,0,0,0.15); }
.fs-icon { width:56px;height:56px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;margin:0 auto 14px; }
.fs-title { font-size:16px;font-weight:700;color:#0f172a;margin-bottom:6px; }
.fs-desc { font-size:13px;color:#64748b;margin-bottom:18px;line-height:1.5; }
.fs-btn { padding:10px 24px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;border:none;border-radius:10px;font-size:14px;cursor:pointer;font-weight:600; }

/* 空状态优化 */
.mrl-empty { text-align:center;padding:24px 16px;color:#94a3b8;font-size:13px;line-height:1.6; }
.mrl-hint { font-size:12px;color:#cbd5e1; }
.empty-state-card { text-align:center;padding:32px 16px; }
.empty-state-icon { width:48px;height:48px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;color:#94a3b8; }
.empty-state-title { font-size:14px;color:#64748b;margin-bottom:4px;font-weight:600; }
.empty-state-desc { font-size:12px;color:#94a3b8;line-height:1.5; }
.empty-state-action { margin-top:12px;display:inline-flex;align-items:center;gap:4px;padding:6px 14px;background:#f5f3ff;color:#8b5cf6;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;border:none; }
.empty-state-action:hover { background:#ede9fe; }
'''

# 找插入点：在 .dashboard-ai-section 相关CSS前插入
css_insert_point = '/* v52 系统设置区 */'
if css_insert_point in content:
    content = content.replace(css_insert_point, feedback_css + '\n' + css_insert_point)
    print('[CSS] 反馈系统样式已添加')
else:
    print('[CSS] 警告：未找到插入点')

# ============================================================
# 2. 在我的Tab的"数据与设置"卡片中添加意见反馈入口
# ============================================================
# 找到"AI 设置"那一项之后，添加意见反馈
settings_feedback_item = '''
      <div class="me-list-item" onclick="openFeedbackPanel()" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;border-top:1px solid #f8fafc">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:10px;background:#fef3c7;display:flex;align-items:center;justify-content:center;color:#d97706">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <span style="font-size:14px;color:#1e293b">意见反馈</span>
        </div>
        <span style="font-size:13px;color:#94a3b8">→</span>
      </div>'''

# 找到"AI 设置"列表项，在它后面加意见反馈
ai_settings_item_pattern = r'(<div class="me-list-item" onclick="openAiSettings\(\)"[^>]*?>.*?</div>)'
match = re.search(ai_settings_item_pattern, content, re.DOTALL)
if match:
    content = content.replace(match.group(1), match.group(1) + settings_feedback_item, 1)
    print('[UI] 意见反馈入口已添加到我的Tab')
else:
    print('[UI] 警告：未找到AI设置入口')

# ============================================================
# 3. 更新版本号 v52 → v52.1
# ============================================================
content = content.replace('<span style="font-size:13px;color:#94a3b8">版本</span>\n        <span style="font-size:13px;color:#94a3b8">v52</span>',
    '<span style="font-size:13px;color:#94a3b8">版本</span>\n        <span style="font-size:13px;color:#94a3b8">v52.1</span>')

content = content.replace('MiRun AI v52 · 越用越懂你的数字分身',
    'MiRun AI v52.1 · 越用越懂你的数字分身')
print('[UI] 版本号已更新为v52.1')

# ============================================================
# 4. 在container结束前插入反馈系统HTML
# ============================================================
feedback_html = '''
<!-- ==================== 意见反馈系统 ==================== -->
<div class="feedback-overlay" id="feedbackOverlay" style="display:none">
  <div class="feedback-panel" id="feedbackPanel">
    <div class="feedback-header">
      <div class="feedback-title" id="feedbackPanelTitle">
        <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        意见反馈
      </div>
      <button class="feedback-close-btn" onclick="closeFeedbackPanel()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="feedback-body" id="feedbackBody">
      <!-- 新建反馈视图 -->
      <div id="feedbackCreateView">
        <div class="feedback-form-group">
          <div class="feedback-form-label">反馈类型</div>
          <div class="feedback-type-grid">
            <div class="feedback-type-item active" data-type="bug" onclick="selectFeedbackType('bug')">
              <div class="feedback-type-icon" style="background:#fef2f2;color:#ef4444">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 22c-4 0-7-3-7-7V9a7 7 0 0 1 14 0v6c0 4-3 7-7 7z"/><path d="M12 2a4 4 0 0 0-4 4"/><path d="M12 2a4 4 0 0 1 4 4"/><line x1="9" y1="14" x2="9" y2="17"/><line x1="15" y1="14" x2="15" y2="17"/></svg>
              </div>
              <span class="feedback-type-label">Bug反馈</span>
            </div>
            <div class="feedback-type-item" data-type="feature" onclick="selectFeedbackType('feature')">
              <div class="feedback-type-icon" style="background:#f0fdf4;color:#16a34a">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>
              </div>
              <span class="feedback-type-label">功能建议</span>
            </div>
            <div class="feedback-type-item" data-type="experience" onclick="selectFeedbackType('experience')">
              <div class="feedback-type-icon" style="background:#eff6ff;color:#2563eb">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              </div>
              <span class="feedback-type-label">体验问题</span>
            </div>
            <div class="feedback-type-item" data-type="other" onclick="selectFeedbackType('other')">
              <div class="feedback-type-icon" style="background:#f5f3ff;color:#8b5cf6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <span class="feedback-type-label">其他</span>
            </div>
          </div>
        </div>
        <div class="feedback-form-group">
          <div class="feedback-form-label">问题描述</div>
          <textarea class="feedback-textarea" id="feedbackDescInput" placeholder="请详细描述您遇到的问题或建议，以便我们更好地改进..."></textarea>
        </div>
        <div class="feedback-auto-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <div>提交时将自动附带：应用版本、设备信息、最近10条对话记录（帮助复现问题）。所有数据仅用于问题排查。</div>
        </div>
        <button class="feedback-submit-btn" onclick="submitFeedback()" id="feedbackSubmitBtn">提交反馈</button>
        <div style="text-align:center;margin-top:12px">
          <button onclick="showFeedbackList()" style="background:none;border:none;color:#8b5cf6;font-size:13px;cursor:pointer;font-weight:500">查看我的反馈 · <span id="feedbackCountBadge">0</span>条</button>
        </div>
      </div>
      <!-- 反馈列表视图 -->
      <div id="feedbackListView" style="display:none">
        <div class="feedback-list-header">
          <div class="feedback-list-title">我的反馈</div>
          <button onclick="showFeedbackCreate()" style="background:none;border:none;color:#8b5cf6;font-size:13px;cursor:pointer;font-weight:500">+ 新建反馈</button>
        </div>
        <div id="feedbackListContainer">
          <!-- 动态填充 -->
        </div>
      </div>
    </div>
  </div>
</div>
'''

# 在 <!-- END page-me --> 之后、</div><!-- END container --> 之前插入
if '<!-- END page-me -->' in content:
    content = content.replace('<!-- END page-me -->', '<!-- END page-me -->\n' + feedback_html, 1)
    print('[HTML] 意见反馈面板HTML已添加')
else:
    print('[HTML] 警告：未找到END page-me标记')

# ============================================================
# 5. JS: 意见反馈系统完整逻辑
# ============================================================
feedback_js = '''
  // ========== v52.1 意见反馈系统 ==========
  var FEEDBACK_STORAGE_KEY = 'mirun_feedback_list';
  var _currentFeedbackType = 'bug';

  function getFeedbackList() {
    try {
      var raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
  }

  function saveFeedbackList(list) {
    try { localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(list)); } catch(e) {}
  }

  window.openFeedbackPanel = function() {
    var overlay = document.getElementById('feedbackOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      showFeedbackCreate();
      updateFeedbackCountBadge();
    }
  };

  window.closeFeedbackPanel = function() {
    var overlay = document.getElementById('feedbackOverlay');
    if (overlay) overlay.style.display = 'none';
  };

  window.selectFeedbackType = function(type) {
    _currentFeedbackType = type;
    var items = document.querySelectorAll('.feedback-type-item');
    for (var i = 0; i < items.length; i++) {
      if (items[i].getAttribute('data-type') === type) {
        items[i].classList.add('active');
      } else {
        items[i].classList.remove('active');
      }
    }
  };

  function getFeedbackAutoInfo() {
    var info = {
      appVersion: 'v52.1',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent || '',
      screenSize: window.innerWidth + 'x' + window.innerHeight,
      currentPage: typeof currentModule !== 'undefined' ? currentModule : 'home',
      recentMessages: []
    };
    // 获取最近10条对话
    try {
      var msgs = JSON.parse(localStorage.getItem('mirun_chat_messages_v1') || '[]');
      info.recentMessages = msgs.slice(-10).map(function(m) {
        return { role: m.role || m.type, content: (m.content || m.text || '').substring(0, 200) };
      });
    } catch(e) {}
    return info;
  }

  window.submitFeedback = function() {
    var descEl = document.getElementById('feedbackDescInput');
    var desc = descEl ? descEl.value.trim() : '';
    if (!desc) {
      showToast('请描述一下您的反馈');
      descEl && descEl.focus();
      return;
    }

    var autoInfo = getFeedbackAutoInfo();
    var typeMap = { bug: 'Bug反馈', feature: '功能建议', experience: '体验问题', other: '其他' };

    var feedback = {
      id: 'fb_' + Date.now(),
      type: _currentFeedbackType,
      typeLabel: typeMap[_currentFeedbackType] || '其他',
      description: desc,
      status: 'pending',
      statusLabel: '待处理',
      createdAt: new Date().toISOString(),
      autoInfo: autoInfo
    };

    var list = getFeedbackList();
    list.unshift(feedback);
    saveFeedbackList(list);

    // 清空输入
    if (descEl) descEl.value = '';
    updateFeedbackCountBadge();

    // 显示成功弹窗
    showFeedbackSuccess();
  };

  function showFeedbackSuccess() {
    // 先关闭面板
    closeFeedbackPanel();

    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:10002;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = '<div class="feedback-success-modal">' +
      '<div class="fs-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><polyline points="20 6 9 17 4 12"/></svg></div>' +
      '<div class="fs-title">感谢反馈</div>' +
      '<div class="fs-desc">我们已收到您的反馈，会尽快处理。<br>您可以在「意见反馈」中查看处理进度。</div>' +
      '<button class="fs-btn" onclick="this.closest(\\'div[style*=position\\\\:fixed]\\').style.display=\\'none\\'">知道了</button>' +
      '</div>';
    document.body.appendChild(modal);
  }

  window.showFeedbackCreate = function() {
    var createView = document.getElementById('feedbackCreateView');
    var listView = document.getElementById('feedbackListView');
    var title = document.getElementById('feedbackPanelTitle');
    if (createView) createView.style.display = 'block';
    if (listView) listView.style.display = 'none';
    if (title) {
      title.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>意见反馈';
    }
  };

  window.showFeedbackList = function() {
    var createView = document.getElementById('feedbackCreateView');
    var listView = document.getElementById('feedbackListView');
    var title = document.getElementById('feedbackPanelTitle');
    if (createView) createView.style.display = 'none';
    if (listView) listView.style.display = 'block';
    if (title) {
      title.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>我的反馈';
    }
    renderFeedbackList();
  };

  function renderFeedbackList() {
    var container = document.getElementById('feedbackListContainer');
    if (!container) return;
    var list = getFeedbackList();

    if (list.length === 0) {
      container.innerHTML = '<div class="feedback-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="40" height="40"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '<div>还没有反馈记录</div></div>';
      return;
    }

    var statusClass = { pending: 'pending', processing: 'processing', done: 'done' };
    var typeIconMap = {
      bug: { bg: '#fef2f2', color: '#ef4444', path: 'M12 22c-4 0-7-3-7-7V9a7 7 0 0 1 14 0v6c0 4-3 7-7 7zM12 2a4 4 0 0 0-4 4M12 2a4 4 0 0 1 4 4M9 14v3M15 14v3' },
      feature: { bg: '#f0fdf4', color: '#16a34a', path: 'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z' },
      experience: { bg: '#eff6ff', color: '#2563eb', path: 'M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01' },
      other: { bg: '#f5f3ff', color: '#8b5cf6', path: 'M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10zM12 8v4M12 16h.01' }
    };

    var html = '';
    list.forEach(function(fb) {
      var icon = typeIconMap[fb.type] || typeIconMap.other;
      var dateStr = fb.createdAt ? new Date(fb.createdAt).toLocaleDateString('zh-CN') : '';
      html += '<div class="feedback-list-item">';
      html += '<div class="fli-top">';
      html += '<div class="fli-type">';
      html += '<svg viewBox="0 0 24 24" fill="none" stroke="' + icon.color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">' + icon.path + '</svg>';
      html += fb.typeLabel || '反馈';
      html += '</div>';
      html += '<span class="fli-status ' + (statusClass[fb.status] || 'pending') + '">' + (fb.statusLabel || '待处理') + '</span>';
      html += '</div>';
      html += '<div class="fli-content">' + escapeHtml(fb.description) + '</div>';
      html += '<div class="fli-meta"><span>' + dateStr + '</span>';
      // 导出按钮
      html += '<span style="margin-left:auto;cursor:pointer;color:#8b5cf6" onclick="exportFeedbackItem(\\'' + fb.id + '\\')">导出</span></div>';
      html += '</div>';
    });
    container.innerHTML = html;
  }

  function updateFeedbackCountBadge() {
    var badge = document.getElementById('feedbackCountBadge');
    if (badge) {
      var list = getFeedbackList();
      badge.textContent = list.length;
    }
  }

  window.exportFeedbackItem = function(id) {
    var list = getFeedbackList();
    var fb = list.find(function(f) { return f.id === id; });
    if (!fb) return;

    var jsonStr = JSON.stringify(fb, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'feedback_' + id + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('反馈文件已导出');
  };

  // 对话中触发反馈（意图识别）
  function detectFeedbackIntent(text) {
    var lower = text.toLowerCase();
    var keywords = ['提个bug', '反馈', 'bug', '建议', '问题', '意见', '吐槽'];
    for (var i = 0; i < keywords.length; i++) {
      if (lower.indexOf(keywords[i]) !== -1) return true;
    }
    // 模式匹配
    var patterns = [
      /有个(建议|bug|问题|意见)/,
      /反馈一下/,
      /提个(建议|bug|问题)/
    ];
    for (var j = 0; j < patterns.length; j++) {
      if (patterns[j].test(text)) return true;
    }
    return false;
  }

  function handleFeedbackFromChat(text) {
    addChatMessage('user', text);
    // 预填描述
    setTimeout(function() {
      openFeedbackPanel();
      var descEl = document.getElementById('feedbackDescInput');
      if (descEl) {
        // 如果用户已经说了具体问题，预填
        var clean = text.replace(/^(提个bug|有个建议|反馈|有个问题|提个|意见反馈)[，,。.]?\s*/, '').trim();
        if (clean && clean.length > 2) {
          descEl.value = clean;
        }
      }
      // 自动选择类型
      if (/bug|报错|崩溃|打不开|出错|无法/.test(text.toLowerCase())) {
        selectFeedbackType('bug');
      } else if (/建议|希望|想要|能不能/.test(text)) {
        selectFeedbackType('feature');
      } else if (/体验|卡|慢|难用|不好/.test(text)) {
        selectFeedbackType('experience');
      }
    }, 300);
    addChatMessage('ai', '好的，我帮你打开反馈面板 👇 请补充更多细节，方便我们更快定位和解决问题。');
  }
'''

# 找到合适的JS插入位置：在医疗模块之前
js_insert_point = '  // ========== 医疗健康模块 =========='
if js_insert_point in content:
    content = content.replace(js_insert_point, feedback_js + '\n' + js_insert_point)
    print('[JS] 意见反馈系统JS逻辑已添加')
else:
    print('[JS] 警告：未找到医疗模块插入点')

# ============================================================
# 6. 在submitAiInput中添加反馈意图检测
# ============================================================
# 在改名检测之后添加反馈检测
rename_check_code = '''    // 检测改名意图
    var renameName = detectRenameIntent(text);
    if (renameName) {
      addChatMessage('user', text);
      setAgentName(renameName);
      addChatMessage('ai', '好的！以后我就叫「' + renameName + '」了，很高兴认识你～');
      return;
    }'''

feedback_intent_check = '''    // 检测反馈意图
    if (detectFeedbackIntent(text)) {
      handleFeedbackFromChat(text);
      return;
    }

    // 检测改名意图
    var renameName = detectRenameIntent(text);
    if (renameName) {
      addChatMessage('user', text);
      setAgentName(renameName);
      addChatMessage('ai', '好的！以后我就叫「' + renameName + '」了，很高兴认识你～');
      return;
    }'''

if rename_check_code in content:
    content = content.replace(rename_check_code, feedback_intent_check)
    print('[JS] 反馈意图检测已接入对话入口')
else:
    print('[JS] 警告：未找到改名检测代码')

# ============================================================
# 7. 医疗记录对话录入解析（chat → medical）
# ============================================================
medical_chat_js = '''
  // ========== 医疗记录对话解析 ==========
  // 从对话文本中提取医疗信息
  function detectMedicalIntent(text) {
    var lower = text.toLowerCase();
    // 就诊
    if (/就诊|看病|医院|挂号|诊断|检查|化验|拍片子|CT|核磁|门诊|住院/.test(text)) {
      return { type: 'visit', confidence: 0.7 };
    }
    // 用药
    if (/吃药|服用|用药|开始吃|每天.*次|.*片/.test(text) && /(阿莫西林|头孢|布洛芬|感冒灵|维生素|降压药|降糖药|中药|西药)/.test(text) === false) {
      // 简单检测：包含"吃XX药"模式
      var medPattern = /(?:吃|服用|开始吃|用)([\u4e00-\u9fa5A-Za-z0-9]{2,8})(?:药|片|胶囊|颗粒)?/;
      if (medPattern.test(text)) {
        return { type: 'medication', confidence: 0.6 };
      }
    }
    // 体检
    if (/体检|体检报告|体检结果/.test(text)) {
      return { type: 'exam', confidence: 0.8 };
    }
    // 疫苗
    if (/疫苗|接种|打了.*针|第.*针/.test(text)) {
      return { type: 'vaccine', confidence: 0.75 };
    }
    return null;
  }

  // 简单解析就诊信息
  function parseVisitFromText(text) {
    var result = { hospital: '', department: '', diagnosis: '', date: new Date().toISOString().slice(0,10) };

    // 医院
    var hospMatch = text.match(/(在|去)(.+?)医院/);
    if (hospMatch && hospMatch[2]) {
      result.hospital = hospMatch[2].replace(/[，,。.的了]/g, '') + '医院';
    }

    // 科室
    var deptMatch = text.match(/(.+?)科/);
    if (deptMatch && deptMatch[1]) {
      var dept = deptMatch[1].slice(-4);
      if (dept.length > 1) result.department = dept + '科';
    }

    // 诊断
    var diagMatch = text.match(/诊断(?:是|为|：|:)?(.+?)(?:，|。|,|\.|$)/);
    if (diagMatch && diagMatch[1]) {
      result.diagnosis = diagMatch[1].trim();
    } else {
      // 用"得了XX"模式
      var sickMatch = text.match(/(?:得了|诊断是|查出|发现)(.+?)(?:，|。|,|\.|$)/);
      if (sickMatch && sickMatch[1]) {
        result.diagnosis = sickMatch[1].trim();
      }
    }

    return result;
  }

  // 简单解析用药信息
  function parseMedicationFromText(text) {
    var result = { name: '', dosage: '每日3次，每次1片', startDate: new Date().toISOString().slice(0,10) };

    // 药品名
    var medPatterns = [
      /(?:吃|服用|开始吃|用)([\u4e00-\u9fa5A-Za-z0-9]{2,10})(?:药|片|胶囊|颗粒|合剂)?/,
      /(阿莫西林|头孢|布洛芬|感冒灵|维生素|降压药|降糖药|阿司匹林|甲硝唑|左氧氟沙星)/i
    ];
    for (var i = 0; i < medPatterns.length; i++) {
      var m = text.match(medPatterns[i]);
      if (m && m[1]) {
        result.name = m[1];
        break;
      }
    }

    // 用法
    var freqMatch = text.match(/每天(\d+)次/);
    if (freqMatch && freqMatch[1]) {
      result.dosage = '每日' + freqMatch[1] + '次';
      var doseMatch = text.match(/每次(\d+)(?:片|粒|袋|ml|毫升)?/);
      if (doseMatch && doseMatch[1]) {
        result.dosage += '，每次' + doseMatch[1] + '片';
      }
    }

    return result;
  }

  // 简单解析疫苗信息
  function parseVaccineFromText(text) {
    var result = { name: '', date: new Date().toISOString().slice(0,10), dose: '' };

    // 疫苗名
    var vacMatch = text.match(/(?:打了|接种)(.+?)(?:疫苗|针)/);
    if (vacMatch && vacMatch[1]) {
      result.name = vacMatch[1].trim() + '疫苗';
    } else {
      var vacMatch2 = text.match(/(.+?)疫苗/);
      if (vacMatch2 && vacMatch2[1]) {
        result.name = vacMatch2[1].trim() + '疫苗';
      }
    }

    // 剂次
    var doseMatch = text.match(/第([一二三四五六1-6])针/);
    if (doseMatch && doseMatch[1]) {
      result.dose = '第' + doseMatch[1] + '针';
    }

    return result;
  }

  // 处理医疗类对话
  function handleMedicalFromChat(text) {
    var intent = detectMedicalIntent(text);
    if (!intent) return false;

    addChatMessage('user', text);
    showThinkingMsg();

    var data = getMedicalData();
    var replyText = '';
    var addedItem = null;

    if (intent.type === 'visit') {
      var visitInfo = parseVisitFromText(text);
      var visit = {
        id: 'v_' + Date.now(),
        date: visitInfo.date,
        hospital: visitInfo.hospital || '未填写',
        department: visitInfo.department || '未填写',
        diagnosis: visitInfo.diagnosis || '未填写',
        advice: ''
      };
      data.visits.unshift(visit);
      replyText = '好的，已记录就诊信息：' + (visit.hospital !== '未填写' ? visit.hospital : '') +
        (visit.department !== '未填写' ? ' · ' + visit.department : '') +
        (visit.diagnosis !== '未填写' ? '，诊断：' + visit.diagnosis : '') +
        '。可以在健康Tab医疗分段查看详情。';
      addedItem = 'visit';
    } else if (intent.type === 'medication') {
      var medInfo = parseMedicationFromText(text);
      if (!medInfo.name) {
        removeThinkingMsg();
        addChatMessage('ai', '你可以告诉我具体吃什么药，比如"开始吃阿莫西林，每天3次每次1片"，我帮你记录。');
        return true;
      }
      var med = {
        id: 'm_' + Date.now(),
        name: medInfo.name,
        dosage: medInfo.dosage,
        startDate: medInfo.startDate,
        status: 'active'
      };
      data.medications.unshift(med);
      replyText = '好的，已添加用药记录：' + med.name + '（' + med.dosage + '）。我会帮你记住按时服药。';
      addedItem = 'medication';
    } else if (intent.type === 'vaccine') {
      var vacInfo = parseVaccineFromText(text);
      if (!vacInfo.name) {
        removeThinkingMsg();
        addChatMessage('ai', '你可以告诉我接种了什么疫苗，比如"今天打了新冠疫苗第三针"。');
        return true;
      }
      var vac = {
        id: 'vac_' + Date.now(),
        name: vacInfo.name,
        date: vacInfo.date,
        dose: vacInfo.dose || ''
      };
      data.vaccines.unshift(vac);
      replyText = '好的，已记录疫苗接种：' + vac.name + (vac.dose ? '（' + vac.dose + '）' : '') + '。下次接种前我会提醒你。';
      addedItem = 'vaccine';
    } else if (intent.type === 'exam') {
      removeThinkingMsg();
      addChatMessage('ai', '好的，体检记录可以这样添加：\\n· 直接上传体检报告图片\\n· 或者告诉我"2024年体检，血压偏高"\\n\\n也可以到健康Tab→医疗分段手动添加。');
      return true;
    }

    saveMedicalData(data);
    // 刷新医疗分段
    if (addedItem) {
      try {
        renderMedicalVisits();
        renderMedications();
        renderVaccines();
        renderExams();
        updateMedicalStats();
      } catch(e) {}
      // 记录分身动态
      if (window.ProactiveCare) {
        window.ProactiveCare.recordActivity('medical', '帮你记录了医疗数据',
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>');
      }
    }

    removeThinkingMsg();
    addChatMessage('ai', replyText);
    saveChatToHistory(text, replyText);
    return true;
  }
'''

# 在反馈JS之后插入医疗对话解析
med_insert_after = '      addChatMessage(\'ai\', \'好的，我帮你打开反馈面板 👇 请补充更多细节，方便我们更快定位和解决问题。\');\n  }'
if med_insert_after in content:
    content = content.replace(med_insert_after, med_insert_after + '\n' + medical_chat_js)
    print('[JS] 医疗记录对话解析已添加')
else:
    print('[JS] 警告：未找到医疗插入点1')

# 在submitAiInput中加入医疗检测
med_check_in_submit = '''    // 检测反馈意图
    if (detectFeedbackIntent(text)) {
      handleFeedbackFromChat(text);
      return;
    }'''

med_check_added = '''    // 检测医疗记录意图
    if (detectMedicalIntent && detectMedicalIntent(text)) {
      var handled = handleMedicalFromChat(text);
      if (handled) return;
    }

    // 检测反馈意图
    if (detectFeedbackIntent(text)) {
      handleFeedbackFromChat(text);
      return;
    }'''

if med_check_in_submit in content:
    content = content.replace(med_check_in_submit, med_check_added)
    print('[JS] 医疗意图检测已接入对话入口')
else:
    print('[JS] 警告：未找到反馈检测代码')

# ============================================================
# 8. 财富健康分真实计算
# ============================================================
wealth_score_js = '''
  // ========== 财富健康分真实计算 ==========
  function calculateWealthScore() {
    var score = 60; // 基础分
    var details = { incomeScore: 0, savingScore: 0, investScore: 0, insuranceScore: 0, total: 60 };

    try {
      // 1. 收支比（30分）：月结余率越高分越高
      if (window.getDailyTxSummary) {
        var summary = window.getDailyTxSummary();
        if (summary && summary.totalIncome > 0) {
          var savingRate = summary.balance / summary.totalIncome;
          // 结余率 0% → 0分，30%+ → 满分30
          var incomeScore = Math.min(30, Math.max(0, savingRate * 100));
          details.incomeScore = Math.round(incomeScore);
          score += incomeScore - 15; // 基线调整
        }
      }

      // 2. 投资配置（20分）
      if (window.getStockHoldingsSummary) {
        var holdings = window.getStockHoldingsSummary();
        if (holdings && holdings.totalValue > 0) {
          details.investScore = 15;
          score += 15;
        }
      }

      // 3. 保障配置（10分）
      details.insuranceScore = 5; // 默认基础保障分
      score += 5;

    } catch(e) {
      console.warn('财富健康分计算异常:', e);
    }

    // 确保在合理范围
    score = Math.max(30, Math.min(98, Math.round(score)));
    details.total = score;
    return details;
  }

  function updateWealthScore() {
    var scoreEl = document.getElementById('wealthScore');
    if (!scoreEl) return;
    var result = calculateWealthScore();
    scoreEl.textContent = result.total;

    // 健康分级文案
    var levelEl = document.getElementById('wealthLevel');
    if (levelEl) {
      var level = '待完善';
      if (result.total >= 85) level = '优秀';
      else if (result.total >= 70) level = '良好';
      else if (result.total >= 55) level = '一般';
      levelEl.textContent = level;
    }
  }
'''

# 在财富域相关JS附近插入 - 找 updateFinanceDashboard 之前
wealth_dash_point = '  function updateFinanceDashboard() {'
if wealth_dash_point in content:
    content = content.replace(wealth_dash_point, wealth_score_js + '\n' + wealth_dash_point)
    print('[JS] 财富健康分计算函数已添加')
else:
    print('[JS] 警告：未找到updateFinanceDashboard')

# 在 updateFinanceDashboard 中调用 updateWealthScore
# 找到函数末尾
# 先看一下函数有什么内容
ufd_match = re.search(r'function updateFinanceDashboard\(\) \{([\s\S]*?)\n  \}', content)
if ufd_match:
    ufd_body = ufd_match.group(1)
    if 'updateWealthScore' not in ufd_body:
        # 在函数末尾添加调用
        old_func = 'function updateFinanceDashboard() {' + ufd_body + '\n  }'
        new_func = 'function updateFinanceDashboard() {' + ufd_body + '\n    // v52.1: 更新财富健康分\n    if (typeof updateWealthScore === \'function\') { updateWealthScore(); }\n  }'
        content = content.replace(old_func, new_func)
        print('[JS] updateFinanceDashboard已接入财富健康分')

# ============================================================
# 9. 医疗支出 ↔ daily-tx 联动
# ============================================================
medical_expense_link_js = '''
  // ========== 医疗支出联动 ==========
  // 从daily-tx中计算医疗类支出
  function calculateMedicalExpense() {
    var total = 0;
    try {
      var txList = [];
      if (window.DataStore && DataStore.load) {
        txList = DataStore.load('daily_tx', 'records', []) || [];
      } else {
        txList = JSON.parse(localStorage.getItem('mijieai_daily_tx') || '[]');
      }
      var currentYear = new Date().getFullYear();
      txList.forEach(function(t) {
        if (t.type === 'expense' && t.date) {
          var txYear = parseInt(t.date.substring(0, 4));
          if (txYear === currentYear) {
            // 医疗相关分类
            var medCategories = ['expenseMedical', '医疗', '看病', '药品', '体检', '医院'];
            var isMed = false;
            if (t.category && medCategories.indexOf(t.category) !== -1) isMed = true;
            if (t.note) {
              var note = t.note.toLowerCase();
              if (/医院|看病|药|体检|疫苗|挂号|检查|医疗/.test(note)) isMed = true;
            }
            if (isMed) total += Number(t.amount) || 0;
          }
        }
      });
    } catch(e) {}
    return total;
  }

  function updateMedicalExpenseCard() {
    var el = document.getElementById('medicalExpense');
    if (el) {
      var exp = calculateMedicalExpense();
      el.textContent = exp > 0 ? exp.toFixed(0) : '0';
    }
  }
'''

# 加在医疗模块JS中
med_js_insert_point = '  function updateMedicalStats() {'
# 先找到这个函数
if med_js_insert_point in content:
    content = content.replace(med_js_insert_point, medical_expense_link_js + '\n' + med_js_insert_point)
    print('[JS] 医疗支出联动计算已添加')
else:
    print('[JS] 警告：未找到updateMedicalStats')

# 在 updateMedicalStats 函数中加入 updateMedicalExpenseCard 调用
# 先找到函数
ums_match = re.search(r'function updateMedicalStats\(\) \{([\s\S]*?)\n  \}', content)
if ums_match:
    ums_body = ums_match.group(1)
    if 'updateMedicalExpenseCard' not in ums_body:
        old_func = 'function updateMedicalStats() {' + ums_body + '\n  }'
        new_func = 'function updateMedicalStats() {' + ums_body + '\n    updateMedicalExpenseCard();\n  }'
        content = content.replace(old_func, new_func)
        print('[JS] updateMedicalStats已接入医疗支出')

# 确保在收支变化时也更新医疗支出
dailytx_changed_handler = "window.addEventListener('dailytx:changed', function() {"
if dailytx_changed_handler in content:
    # 在这个监听器里添加医疗支出更新
    med_expense_refresh = '''    // v52.1: 同步更新医疗支出卡片
    try { if (typeof updateMedicalExpenseCard === 'function') updateMedicalExpenseCard(); } catch(e) {}
'''
    # 找到监听器的闭合位置（第一个});）
    pattern = r"(window\.addEventListener\('dailytx:changed', function\(\) \{[\s\S]*?\n  \}\);)"
    match = re.search(pattern, content)
    if match and 'updateMedicalExpenseCard' not in match.group(1):
        old_handler = match.group(1)
        # 在最后一个});前插入
        new_handler = old_handler.replace('  });', med_expense_refresh + '  });')
        content = content.replace(old_handler, new_handler)
        print('[JS] 收支变化事件已接入医疗支出更新')

# ============================================================
# 10. 工作Tab血肉填充 - 日程列表真展示
# ============================================================
work_dashboard_js = '''
  // ========== v52.1 工作Tab数据联动增强 ==========
  function getTodayTodoCount() {
    try {
      if (window.scheduleGetTasks) {
        var today = new Date().toISOString().slice(0, 10);
        var tasks = window.scheduleGetTasks().filter(function(t) {
          return t.date === today && t.status !== 'done';
        });
        return tasks.length;
      }
    } catch(e) {}
    return 0;
  }

  function getWeeklyTaskStats() {
    try {
      if (window.scheduleGetTasks) {
        var all = window.scheduleGetTasks();
        var now = new Date();
        var weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0,0,0,0);
        var weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23,59,59,999);

        var weekTasks = all.filter(function(t) {
          var td = new Date(t.date);
          return td >= weekStart && td <= weekEnd;
        });
        var doneCount = weekTasks.filter(function(t) { return t.status === 'done'; }).length;
        var total = weekTasks.length;
        return { total: total, done: doneCount, pending: total - doneCount, rate: total > 0 ? Math.round(doneCount/total*100) : 0 };
      }
    } catch(e) {}
    return { total: 0, done: 0, pending: 0, rate: 0 };
  }
'''

work_dash_point = '  function updateWorkDashboard() {'
if work_dash_point in content:
    content = content.replace(work_dash_point, work_dashboard_js + '\n' + work_dash_point)
    print('[JS] 工作Tab数据统计函数已添加')

# 检查 updateWorkDashboard 函数并增强
uwd_match = re.search(r'function updateWorkDashboard\(\) \{([\s\S]*?)\n  \}', content)
if uwd_match:
    uwd_body = uwd_match.group(1)
    if 'getWeeklyTaskStats' not in uwd_body:
        # 增强函数
        enhanced = '''
    // v52.1: 今日待办数量
    var todayTodo = getTodayTodoCount();
    var todayTodoEl = document.getElementById('workTodayTodo');
    if (todayTodoEl) todayTodoEl.textContent = todayTodo;
    // v52.1: 本周完成率
    var weekStats = getWeeklyTaskStats();
    var weekRateEl = document.getElementById('workWeekRate');
    if (weekRateEl) weekRateEl.textContent = weekStats.rate + '%';
'''
        old_func = 'function updateWorkDashboard() {' + uwd_body + '\n  }'
        new_func = 'function updateWorkDashboard() {' + enhanced + uwd_body + '\n  }'
        content = content.replace(old_func, new_func)
        print('[JS] updateWorkDashboard已增强')

# ============================================================
# 11. 更新服务工作者版本号
# ============================================================
with open('/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/service-worker.js', 'r') as f:
    sw_content = f.read()

# 确认版本号
if 'mirunai-v52.1' in sw_content:
    print('[SW] SW版本已是v52.1')
else:
    sw_content = sw_content.replace('mirunai-v52', 'mirunai-v52.1')
    with open('/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/service-worker.js', 'w') as f:
        f.write(sw_content)
    print('[SW] SW版本已更新为v52.1')

# 保存HTML
with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\\n最终文件大小: {len(content)} 字符')
print('v52.1最终拼脚本执行完成！')
