#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MiRun AI v52 架构终版重构脚本 - Part 4: 我的Tab增加智能设备 + 我的Tab重构 + JS联动 + SW更新
"""
import re

FILE_PATH = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/index.html'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ============ 1. 在我的Tab的profileSection5后面插入profileSection6（智能设备） ============
# 找到 </div>\n    </div>\n\n    <!-- 数据与设置 --> 前面
device_section = '''    <div class="profile-section" id="profileSection6" onclick="toggleProfileSection(6)">
      <div class="profile-section-header">
        <div class="profile-section-title">
          <div class="profile-section-icon" style="background:#f0f9ff;color:#0284c7"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
          <div>
            <div class="profile-section-name">智能设备</div>
            <div class="profile-section-summary" id="profileDeviceSummary">0 台设备</div>
          </div>
        </div>
        <span class="profile-section-toggle"><svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg></span>
      </div>
      <div class="profile-section-body">
        <!-- 个人穿戴 -->
        <div class="device-group">
          <div class="device-group-title">个人穿戴</div>
          <div class="device-list" id="devicePersonalList">
            <div class="device-item" onclick="event.stopPropagation();openDeviceDetail('phone')">
              <div class="device-icon" style="background:#eff6ff;color:#2563eb">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              </div>
              <div class="device-info">
                <div class="device-name">智能手机</div>
                <div class="device-desc">健康 · 效率 · 位置数据</div>
              </div>
              <div class="device-status status-connected">已连接</div>
            </div>
            <div class="device-item" onclick="event.stopPropagation();openDeviceDetail('watch')">
              <div class="device-icon" style="background:#f5f3ff;color:#8b5cf6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="6" y="3" width="12" height="18" rx="2"/><line x1="9" y1="1" x2="15" y2="1"/><line x1="9" y1="23" x2="15" y2="23"/></svg>
              </div>
              <div class="device-info">
                <div class="device-name">智能手表</div>
                <div class="device-desc">运动 · 心率 · 睡眠数据</div>
              </div>
              <div class="device-status status-disconnected">未连接</div>
            </div>
          </div>
        </div>
        <!-- 家庭健康 -->
        <div class="device-group">
          <div class="device-group-title">家庭健康</div>
          <div class="device-list" id="deviceHealthList">
            <div class="device-item" onclick="event.stopPropagation();openDeviceDetail('scale')">
              <div class="device-icon" style="background:#ecfdf5;color:#10b981">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M3 16h18l-2-5H5L3 16Z"/><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/><path d="M12 8v4"/></svg>
              </div>
              <div class="device-info">
                <div class="device-name">体脂秤</div>
                <div class="device-desc">体重 · 体脂 · 肌肉量</div>
              </div>
              <div class="device-status status-disconnected">未连接</div>
            </div>
          </div>
        </div>
        <!-- 智能家居 -->
        <div class="device-group">
          <div class="device-group-title">智能家居</div>
          <div class="device-list" id="deviceHomeList">
            <div class="device-item" onclick="event.stopPropagation();openDeviceDetail('speaker')">
              <div class="device-icon" style="background:#fef3c7;color:#d97706">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
              </div>
              <div class="device-info">
                <div class="device-name">智能音箱</div>
                <div class="device-desc">语音助手 · 日程提醒</div>
              </div>
              <div class="device-status status-disconnected">未连接</div>
            </div>
          </div>
        </div>
        <button class="profile-edit-btn" onclick="event.stopPropagation();addDevice()">+ 添加智能设备</button>
        <div class="device-tip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          设备数据自动流向对应业务Tab，无需手动导入
        </div>
      </div>
    </div>

'''

# 在 profileSection5 结束标签后面插入（在"数据与设置"section之前）
insert_pos = content.find('<!-- 数据与设置 -->')
if insert_pos != -1:
    content = content[:insert_pos] + device_section + content[insert_pos:]
    print("智能设备模块已添加到我的Tab")
else:
    print("未找到插入位置：数据与设置")

# ============ 2. 版本号改为v52 ============
content = content.replace('MiRun AI v51 · 越用越懂你的数字分身', 'MiRun AI v52 · 越用越懂你的数字分身')
content = content.replace('<span style="font-size:13px;color:#94a3b8">v51</span>', '<span style="font-size:13px;color:#94a3b8">v52</span>')

# ============ 3. 新增设备相关CSS ============
device_css = '''
/* v52 智能设备模块 */
.device-group { margin-bottom: 16px; }
.device-group:first-child { margin-top: 8px; }
.device-group-title {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding: 0 4px;
  text-transform: uppercase;
}
.device-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.device-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.device-item:active { background: #f1f5f9; transform: scale(0.98); }
.device-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.device-info { flex: 1; min-width: 0; }
.device-name {
  font-size: 14px; font-weight: 600; color: #0f172a;
  margin-bottom: 2px;
}
.device-desc {
  font-size: 12px; color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.device-status {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;
  flex-shrink: 0;
}
.device-status.status-connected {
  background: #dcfce7;
  color: #15803d;
}
.device-status.status-disconnected {
  background: #f1f5f9;
  color: #94a3b8;
}
.device-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f0f9ff;
  border-radius: 10px;
  margin-top: 12px;
  font-size: 12px;
  color: #0369a1;
  line-height: 1.5;
}
.device-tip svg { flex-shrink: 0; color: #0ea5e9; }
'''

# 在 profile-section-body 样式后插入（找合适位置）
pp = content.rfind('.profile-section-body {')
if pp != -1:
    # 找到这个规则的 } 结束
    # 往后找第一个 }
    brace_start = content.find('{', pp)
    brace_end = content.find('}', brace_start)
    # 再找第二个 }（因为是嵌套的）
    brace_end2 = content.find('}', brace_end + 1)
    # 取更靠后且合理的位置
    insert_at = brace_end2
    # 实际上profile-section-body只有一层，用brace_end即可
    content = content[:brace_end+1] + '\n' + device_css + content[brace_end+1:]
    print("设备CSS已添加")

# ============ 4. 新增JS辅助函数（toggleAgentPanel, toggleChatHistoryPanel, 层级切换等） ============
# 找到 initV50 函数位置，在后面注入新的全局函数
js_functions = '''
  // ==================== v52 新增：分身状态面板 ====================
  window.toggleAgentPanel = function() {
    var panel = document.getElementById('agentPanel');
    if (!panel) return;
    if (panel.style.display === 'none' || panel.style.display === '') {
      panel.style.display = 'block';
      // 刷新数据
      updateAgentPanel();
    } else {
      panel.style.display = 'none';
    }
  };

  function updateAgentPanel() {
    try {
      // 记忆条目
      if (window.MemoryManager) {
        var count = 0;
        try {
          var mem = JSON.parse(localStorage.getItem('mijieai_memory') || '{}');
          if (mem.user) count += Object.keys(mem.user).length;
          if (mem.facts) count += mem.facts.length || 0;
          if (mem.preferences) count += Object.keys(mem.preferences).length;
        } catch(e) {}
        var el = document.getElementById('agentMemoryCount');
        if (el) el.textContent = count + ' 条';
      }
      // 今日待办数
      var todoCount = 0;
      try {
        if (window.scheduleGetTodayTasks) {
          var tasks = scheduleGetTodayTasks() || [];
          todoCount = tasks.length;
        }
      } catch(e) {}
      var ttEl = document.getElementById('agentTodayTasks');
      if (ttEl) ttEl.textContent = todoCount + ' 件事';
    } catch(e) {}
  }

  // ==================== v52 新增：对话历史面板 ====================
  window.toggleChatHistoryPanel = function() {
    var panel = document.getElementById('chatHistorySection');
    if (!panel) return;
    if (panel.style.display === 'none' || panel.style.display === '') {
      panel.style.display = 'block';
      renderChatHistory();
    } else {
      panel.style.display = 'none';
    }
  };

  // ==================== v52 新增：今日概览数据刷新 ====================
  function updateTodayOverview() {
    // 待办数量
    try {
      var todoCount = 0;
      if (window.scheduleGetTodayTasks) {
        var tasks = scheduleGetTodayTasks() || [];
        todoCount = tasks.filter(function(t){ return t.status !== 'done'; }).length;
      }
      var el = document.getElementById('ovTodoCount');
      if (el) el.textContent = todoCount;
    } catch(e) {}
    // 天气（占位）
    try {
      var el = document.getElementById('ovWeatherTemp');
      if (el) el.textContent = '24°';
    } catch(e) {}
    // 时令食材
    try {
      if (window.solarGetCurrentTermData) {
        var td = window.solarGetCurrentTermData();
        var el = document.getElementById('ovSolarFood');
        if (el && td && td.foods && td.foods.length) {
          el.textContent = td.foods[0];
        } else if (el) {
          el.textContent = '--';
        }
      }
    } catch(e) {}
  }

  // ==================== v52 新增：生活Tab域切换（财富/教育） ====================
  var currentLifeDomain = 'wealth';
  window.switchLifeDomain = function(domain) {
    currentLifeDomain = domain;
    // 切换按钮状态
    var btns = document.querySelectorAll('#lifeDomainSwitcher .domain-switch-item');
    btns.forEach(function(b) {
      b.classList.toggle('active', b.getAttribute('data-domain') === domain);
    });
    // 切换域显示
    var domains = document.querySelectorAll('.life-domain');
    domains.forEach(function(d) {
      d.classList.remove('active');
    });
    var target = document.getElementById('life-' + domain + '-domain');
    if (target) target.classList.add('active');
  };

  // ==================== v52 新增：三层辐射切换（各Tab通用） ====================
  window.switchWorkLayer = function(layer) {
    switchLayer('workSchedule', layer);
  };
  window.switchHealthLayer = function(layer) {
    switchLayer('health', layer);
  };
  window.switchLifeLayer = function(layer) {
    switchLayer('lifeFinance', layer);
  };
  window.switchEduLayer = function(layer) {
    switchLayer('edu', layer);
  };

  function switchLayer(prefix, layer) {
    // 切换按钮状态（通用，找到当前激活域下的layer-switcher）
    var activePage = document.querySelector('.page-view.page-active');
    if (!activePage) return;
    var switcher = activePage.querySelector('.layer-switcher');
    if (!switcher) return;
    var items = switcher.querySelectorAll('.layer-switcher-item');
    items.forEach(function(item, idx) {
      item.classList.toggle('active', 
        (layer === 'personal' && idx === 0) ||
        (layer === 'family' && idx === 1) ||
        (layer === 'society' && idx === 2)
      );
    });

    // 显示/隐藏对应层级内容
    // 个人层：显示明细卡片（默认就是显示的）
    // 家庭层/社会层：显示placeholder卡片
    var detailSection = activePage.querySelector('.dashboard-detail-section');
    var familyCard = activePage.querySelector('[id$="Family"]');
    var societyCard = activePage.querySelector('[id$="Society"]');

    if (layer === 'personal') {
      if (detailSection) detailSection.style.display = '';
      if (familyCard) familyCard.style.display = 'none';
      if (societyCard) societyCard.style.display = 'none';
    } else if (layer === 'family') {
      if (detailSection) detailSection.style.display = 'none';
      if (familyCard) familyCard.style.display = '';
      if (societyCard) societyCard.style.display = 'none';
    } else if (layer === 'society') {
      if (detailSection) detailSection.style.display = 'none';
      if (familyCard) familyCard.style.display = 'none';
      if (societyCard) societyCard.style.display = '';
    }
  }

  // ==================== v52 新增：设备详情 & 添加设备 ====================
  window.openDeviceDetail = function(deviceId) {
    alert('设备详情功能开发中\\n设备ID: ' + deviceId + '\\n\\nMVP阶段支持CSV导入，后续将接入API直连。');
  };
  window.addDevice = function() {
    alert('添加智能设备\\n\\n方式1：通过对话告诉我"添加智能手表"\\n方式2：CSV导入（功能规划中）\\n方式3：API直连（功能规划中）');
  };
  window.openWeatherPanel = function() {
    alert('天气功能开发中\\n后续将接入天气API，提供实时天气与生活指数');
  };
  window.runWealthDiagnosis = function() {
    if (window.DiagnosisEngine && typeof window.DiagnosisEngine.runFull === 'function') {
      window.DiagnosisEngine.runFull();
    } else {
      alert('财富诊断功能加载中，请稍后再试');
    }
  };
'''

# 在 initV50 函数前注入（找到 "function initV50"）
init_pos = content.find('function initV50() {')
if init_pos != -1:
    content = content[:init_pos] + js_functions + '\n  ' + content[init_pos:]
    print("v52 JS函数已注入")
else:
    print("未找到initV50函数")

# ============ 5. 修改 initV50 添加 v52 初始化 ============
old_init = '''  function initV50() {
    // 预加载记忆系统
    if (window.MemoryManager) {
      window.MemoryManager.preloadForSync().catch(function(){});
    }
    // 渲染对话页概览和快捷指令
    if (window.ChatEngine) {
      ChatEngine.renderTodayOverview('todayOverviewBar');
      ChatEngine.renderQuickCommands('quickCommandsContainer');
    }
    // 渲染对话历史
    renderChatHistory();
    // 初始化看板数据（延迟执行，等外部脚本加载完）
    setTimeout(function() {
      updateFinanceDashboard();
      updateHealthDashboard();
      updateWorkDashboard();
    }, 200);
  }'''

new_init = '''  function initV50() {
    // 预加载记忆系统
    if (window.MemoryManager) {
      window.MemoryManager.preloadForSync().catch(function(){});
    }
    // v52: 渲染今日概览3项
    updateTodayOverview();
    // v52: 渲染对话消息列表（从ChatEngine加载）
    if (window.ChatEngine && typeof ChatEngine.renderMessageList === 'function') {
      ChatEngine.renderMessageList('chatMessageList');
    }
    // 渲染对话历史
    renderChatHistory();
    // 初始化看板数据（延迟执行，等外部脚本加载完）
    setTimeout(function() {
      updateFinanceDashboard();
      updateHealthDashboard();
      updateWorkDashboard();
      // v52: 刷新概览数据
      updateTodayOverview();
      updateAgentPanel();
      // v52: 节气banner
      updateSolarTermBanner();
    }, 200);
  }

  // v52: 节气养生banner更新
  function updateSolarTermBanner() {
    try {
      if (!window.solarGetCurrentTermData) return;
      var td = window.solarGetCurrentTermData();
      if (!td) return;
      var nameEl = document.getElementById('solarTermName');
      var tipEl = document.getElementById('solarTermTip');
      if (nameEl) nameEl.textContent = td.name;
      if (tipEl && td.foods && td.foods.length) {
        tipEl.textContent = '宜食：' + td.foods.slice(0, 3).join('、');
      }
      // 食材推荐
      var foodEl = document.getElementById('solarFoodRecommend');
      if (foodEl && td.foods) {
        var html = '';
        td.foods.forEach(function(f) {
          html += '· ' + f + '<br>';
        });
        html += '<br><span style="color:#94a3b8;font-size:12px">顺应时节，食养有道</span>';
        foodEl.innerHTML = html;
      }
    } catch(e) {}
  }'''

content = content.replace(old_init, new_init)
print("initV50已更新")

# ============ 6. 修复subTabTitles和moduleInitFlags（添加新增的sub-tab） ============
# 更新 subTabTitles
old_subtab_titles = '''  var subTabTitles = {
    'work-task': '任务',
    'work-decision': '决策',
    'work-insight': '洞察',
    'health-diet': '饮食',
    'health-exercise': '运动',
    'health-overview': '健康总览',
    'health-sleep': '睡眠',
    'health-mood': '情绪',
    'health-solar': '节气养生',
    'life-finance': '收支',
    'life-schedule': '日程',
    'life-shopping': '购物',
    'life-family': '家庭'
  };'''

new_subtab_titles = '''  var subTabTitles = {
    'work-schedule': '日程',
    'work-growth': '成长',
    'work-knowledge': '知识库',
    'health-diet': '饮食',
    'health-exercise': '运动',
    'health-overview': '健康总览',
    'health-sleep': '睡眠',
    'health-mood': '情绪',
    'health-solar': '节气养生',
    'life-finance': '收支',
    'life-investment': '投资',
    'life-insurance': '保障',
    'life-diagnosis': '诊断',
    'edu-overview': '教育总览',
    'edu-learning': '学习',
    'edu-growth': '成长',
    'edu-fund': '教育金',
    'edu-activity': '亲子'
  };'''

content = content.replace(old_subtab_titles, new_subtab_titles)
print("subTabTitles已更新")

# 更新 moduleInitFlags
old_init_flags = '''  var moduleInitFlags = {
    work_task: false,
    work_decision: false,
    work_insight: false,
    health_diet: false,
    health_exercise: false,
    health_overview: false,
    health_sleep: false,
    health_mood: false,
    health_solar: false,
    life_finance: false,
    life_schedule: false,
    life_shopping: false,
    life_family: false
  };'''

new_init_flags = '''  var moduleInitFlags = {
    work_schedule: false,
    work_growth: false,
    work_knowledge: false,
    health_diet: false,
    health_exercise: false,
    health_overview: false,
    health_sleep: false,
    health_mood: false,
    health_solar: false,
    life_finance: false,
    life_investment: false,
    life_insurance: false,
    life_diagnosis: false,
    edu_overview: false,
    edu_learning: false,
    edu_growth: false,
    edu_fund: false,
    edu_activity: false
  };'''

content = content.replace(old_init_flags, new_init_flags)
print("moduleInitFlags已更新")

# 更新 currentSubTab
old_current_sub = "var currentSubTab = { work: 'task', health: 'overview',  // 默认总览在第一位 life: 'finance' };"
new_current_sub = "var currentSubTab = { work: 'schedule', health: 'overview', life: 'finance', edu: 'overview' }; // v52 默认子tab"

content = content.replace(old_current_sub, new_current_sub)
print("currentSubTab已更新")

# ============ 写回 ============
with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Part 4 完成，当前行数: {len(content.splitlines())}")
