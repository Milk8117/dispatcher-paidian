#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
v52.1 分身名称自定义
1. 我的Tab→基本信息增加"分身名称"字段
2. 全局同步：顶部栏、欢迎语、消息气泡、分身动态
3. 对话中可修改："以后叫你XXX"
4. 品牌LOGO和底部署名不改
"""

filepath = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/index.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# =====================================================
# 1. 基本信息区增加分身名称字段
# =====================================================
old_city_row = '''        <div class="profile-field-row">
          <span class="profile-field-label">城市</span>
          <span class="profile-field-value" id="profileCity">未设置</span>
        </div>
        <button class="profile-edit-btn" onclick="event.stopPropagation();editProfileSection('basic')">编辑基本信息</button>'''

new_city_row = '''        <div class="profile-field-row">
          <span class="profile-field-label">城市</span>
          <span class="profile-field-value" id="profileCity">未设置</span>
        </div>
        <div class="profile-divider-line"></div>
        <div class="profile-field-row">
          <span class="profile-field-label">分身名称</span>
          <span class="profile-field-value" id="profileAgentName">MiRun AI</span>
        </div>
        <button class="profile-edit-btn" onclick="event.stopPropagation();editAgentName()">修改分身名称</button>
        <button class="profile-edit-btn" onclick="event.stopPropagation();editProfileSection('basic')">编辑基本信息</button>'''

assert old_city_row in content, "未找到城市字段行"
content = content.replace(old_city_row, new_city_row)
print("✅ 1. 基本信息增加分身名称字段")

# =====================================================
# 2. 顶部栏分身名称 + 欢迎语加 id
# =====================================================
# 顶部栏聊天标题
content = content.replace(
    '<div class="chat-title-main">MiRun AI</div>',
    '<div class="chat-title-main" id="chatTopAgentName">MiRun AI</div>'
)

# 欢迎语标题
content = content.replace(
    '<div class="chat-welcome-title" id="chatWelcomeTitle">你好，我是你的智能分身</div>',
    '<div class="chat-welcome-title" id="chatWelcomeTitle">你好，我是 <span id="chatWelcomeAgentName">MiRun AI</span></div>'
)

print("✅ 2. 顶部栏+欢迎语加了id钩子")

# =====================================================
# 3. 添加分身名称管理 JS
# =====================================================
agent_name_js = '''
  // ========== 分身名称管理 ==========
  var AGENT_NAME_KEY = 'mirun_agent_name';
  var DEFAULT_AGENT_NAME = 'MiRun AI';

  function getAgentName() {
    try {
      return localStorage.getItem(AGENT_NAME_KEY) || DEFAULT_AGENT_NAME;
    } catch(e) { return DEFAULT_AGENT_NAME; }
  }

  function setAgentName(name) {
    name = (name || '').trim();
    if (!name) name = DEFAULT_AGENT_NAME;
    try { localStorage.setItem(AGENT_NAME_KEY, name); } catch(e) {}
    applyAgentName();
    return name;
  }

  function applyAgentName() {
    var name = getAgentName();
    // 顶部栏分身名称
    var topEl = document.getElementById('chatTopAgentName');
    if (topEl) topEl.textContent = name;
    // 欢迎语
    var welEl = document.getElementById('chatWelcomeAgentName');
    if (welEl) welEl.textContent = name;
    // 我的Tab - 分身名称字段
    var profEl = document.getElementById('profileAgentName');
    if (profEl) profEl.textContent = name;
    // 分身动态标题等其他引用点
    // （消息气泡头像旁的"AI"简化保留为"AI"，不做过多改动）
  }

  window.editAgentName = function() {
    var current = getAgentName();
    var input = prompt('给你的分身起个名字：', current);
    if (input !== null) {
      var newName = input.trim();
      if (newName && newName.length <= 20) {
        setAgentName(newName);
        // 如果对话模块已初始化，发一条确认消息
        if (typeof addChatMessage === 'function') {
          addChatMessage('ai', '好的，以后你可以叫我「' + newName + '」啦！✨');
        }
      } else if (newName.length > 20) {
        alert('名字太长啦，最多20个字符～');
      }
    }
  };

  // 对话中修改分身名称意图检测
  function detectRenameIntent(text) {
    // 匹配：以后叫你XXX / 改名叫XXX / 你的名字是XXX / 就叫你XXX
    var patterns = [
      /(?:以后|以后就|就|给你)?叫你(?:为|叫)?(.+?)(?:吧|好了|就行|了)?[。！!？?]?$/,
      /(?:改名叫|改成|换名|名字叫)(.+?)(?:吧|好了)?[。！!？?]?$/,
      /你的名字(?:是|叫)(.+?)[。！!？?]?$/
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = text.match(patterns[i]);
      if (m && m[1]) {
        var name = m[1].trim();
        // 过滤太短或明显不是名字的
        if (name.length >= 1 && name.length <= 20 && !/的|了|是|吗|呢|啊|什么|怎么|为什么/.test(name)) {
          return name;
        }
      }
    }
    return null;
  }

  // 暴露给全局
  window.getAgentName = getAgentName;
  window.setAgentName = setAgentName;
  window.applyAgentName = applyAgentName;
  window.detectRenameIntent = detectRenameIntent;

  '''

js_anchor = "  // ========== v51 家庭空间管理 =========="
assert js_anchor in content
content = content.replace(js_anchor, agent_name_js + js_anchor)
print("✅ 3. 分身名称管理JS已注入")

# =====================================================
# 4. 在submitAiInput中加入改名意图检测
# =====================================================
rename_check = '''    // 检测改名意图
    var renameName = detectRenameIntent(text);
    if (renameName) {
      addChatMessage('user', text);
      setAgentName(renameName);
      addChatMessage('ai', '好的！以后我就叫「' + renameName + '」了，很高兴认识你～');
      return;
    }

    // 标准流程'''

old_standard = "    // 标准流程\n    addChatMessage('user', text, { status: 'sending' });"
assert old_standard in content
content = content.replace(old_standard, rename_check)
print("✅ 4. 改名意图检测已接入对话流程")

# =====================================================
# 5. CSS: profile-divider-line
# =====================================================
divider_css = '''
.profile-divider-line {
  height: 1px;
  background: #f1f5f9;
  margin: 8px 0;
}
'''
css_end = '/* ========== v52.1 样式 END ========== */'
assert css_end in content
content = content.replace(css_end, divider_css + css_end)

# =====================================================
# 6. 初始化时调用 applyAgentName
# =====================================================
init_call = "    if (typeof initChatV521 === 'function') { initChatV521(); }"
if init_call in content:
    content = content.replace(init_call,
      init_call + "\n    // 应用分身名称\n    if (typeof applyAgentName === 'function') { applyAgentName(); }")
    print("✅ 6. 初始化时应用分身名称")

# =====================================================
# 写回
# =====================================================
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ 分身名称自定义完成，文件大小: {len(content)} 字符")
