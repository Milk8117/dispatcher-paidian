#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MiRun AI v52 架构终版重构脚本 - Part 6: 手机APP接管能力预埋设计
"""
import re

FILE_PATH = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/index.html'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ============ 预埋点1：服务管理 → 增加「系统接入」分组 ============
# 在"已接入服务"分组前面插入系统接入分组
system_access_group = '''        <!-- 系统接入 -->
        <div class="service-group">
          <div class="service-group-title">系统接入</div>
          <div class="service-list" id="serviceSystemList">
            <div class="service-item" onclick="event.stopPropagation();openSystemService('notification')">
              <div class="service-icon" style="background:#fef3c7;color:#d97706">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              </div>
              <div class="service-info">
                <div class="service-name">通知读取</div>
                <div class="service-desc">Android · 智能提醒识别</div>
              </div>
              <div class="service-status status-pending">即将开放</div>
            </div>
            <div class="service-item" onclick="event.stopPropagation();openSystemService('calendar')">
              <div class="service-icon" style="background:#f5f3ff;color:#8b5cf6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div class="service-info">
                <div class="service-name">日历同步</div>
                <div class="service-desc">系统日历双向同步</div>
              </div>
              <div class="service-status status-pending">即将开放</div>
            </div>
            <div class="service-item" onclick="event.stopPropagation();openSystemService('healthdata')">
              <div class="service-icon" style="background:#ecfdf5;color:#10b981">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
              <div class="service-info">
                <div class="service-name">健康数据同步</div>
                <div class="service-desc">运动/体征/睡眠数据</div>
              </div>
              <div class="service-status status-pending">即将开放</div>
            </div>
            <div class="service-item" onclick="event.stopPropagation();openSystemService('shortcut')">
              <div class="service-icon" style="background:#eff6ff;color:#2563eb">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <div class="service-info">
                <div class="service-name">快捷指令</div>
                <div class="service-desc">iOS Shortcuts 集成</div>
              </div>
              <div class="service-status status-pending">即将开放</div>
            </div>
            <div class="service-item" onclick="event.stopPropagation();openSystemService('share')">
              <div class="service-icon" style="background:#fee2e2;color:#ef4444">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </div>
              <div class="service-info">
                <div class="service-name">分享接入</div>
                <div class="service-desc">系统分享面板直达</div>
              </div>
              <div class="service-status status-pending">即将开放</div>
            </div>
          </div>
        </div>
'''

# 在"已接入服务"分组前面插入（找到 service-group-title: 已接入服务 之前）
insert_here = '<div class="service-group">\n          <div class="service-group-title">已接入服务</div>'
if insert_here in content:
    content = content.replace(insert_here, system_access_group + '        ' + insert_here.strip())
    print("系统接入分组已添加到服务管理")
else:
    print("未找到已接入服务分组位置")

# ============ 增加 status-pending 样式 ============
pending_css = '''
.service-status.status-pending {
  background: #fef9c3;
  color: #854d0e;
}
'''
pp = content.rfind('.service-status.status-disconnected {')
if pp != -1:
    # 找到这个规则结束
    brace_end = content.find('}', pp + 30)
    content = content[:brace_end+1] + '\n' + pending_css + content[brace_end+1:]
    print("status-pending样式已添加")

# ============ 预埋点2：智能分身状态面板 → 增加手机感知项 ============
# 在"记忆库条目数"后面插入
old_agent_memory = '''      <div class="agent-status-row">
        <span class="agent-status-label">记忆库条目</span>
        <span class="agent-status-val" id="agentMemoryCount">-- 条</span>
      </div>
      <div class="agent-dim-title">用户画像完整度</div>'''

new_agent_memory = '''      <div class="agent-status-row">
        <span class="agent-status-label">记忆库条目</span>
        <span class="agent-status-val" id="agentMemoryCount">-- 条</span>
      </div>
      <div class="agent-status-row">
        <span class="agent-status-label">手机感知</span>
        <span class="agent-status-val" id="agentPhoneStatus">
          <span class="dot-offline"></span>
          离线
        </span>
      </div>
      <div class="agent-status-row">
        <span class="agent-status-label">已接入服务</span>
        <span class="agent-status-val" id="agentServiceCount">0 项</span>
      </div>
      <div class="agent-status-row">
        <span class="agent-status-label">今日自动处理</span>
        <span class="agent-status-val" id="agentAutoProcess">-- 件</span>
      </div>
      <div class="agent-dim-title">用户画像完整度</div>'''

content = content.replace(old_agent_memory, new_agent_memory)
print("分身面板手机感知项已添加")

# 增加 dot-offline 样式
dot_offline_css = '''
.dot-offline {
  width: 6px; height: 6px; border-radius: 50%;
  background: #94a3b8;
  display: inline-block;
}
'''
pp2 = content.rfind('.dot-online {')
if pp2 != -1:
    brace_end = content.find('}', pp2 + 12)
    content = content[:brace_end+1] + '\n' + dot_offline_css + content[brace_end+1:]
    print("dot-offline样式已添加")

# ============ 预埋点3：各业务Tab数据卡片 → 数据来源标识 ============
# 在 ddc-desc 样式基础上，给明细卡片增加数据来源角标
# 首先添加CSS
data_source_css = '''
/* v52 数据来源标识 */
.ddc-source-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 9px;
  color: #94a3b8;
  background: rgba(255,255,255,0.8);
  padding: 2px 6px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
  opacity: 0.7;
  transition: opacity 0.2s;
}
.ddc-source-tag:hover { opacity: 1; }
.ddc-source-tag svg { width: 10px; height: 10px; }
.dashboard-detail-card { position: relative; }
'''

pp3 = content.rfind('.dashboard-detail-card ')
if pp3 != -1:
    # 找到第一个规则结束（如果有多个，取第一个）
    brace_start = content.find('{', pp3)
    brace_end = content.find('}', brace_start)
    # 先添加 data-source CSS
    content = content[:brace_end+1] + '\n' + data_source_css + content[brace_end+1:]
    print("数据来源标识CSS已添加")

# 给几个关键的明细卡片加数据来源标识
# 工作Tab - 今日待办卡片（手动录入）
old_work_todo = '''<div class="ddc-title">今日待办</div>
          <div class="ddc-value" id="workTodayTodo">-</div>
          <div class="ddc-desc">项待完成</div>
        </div>'''

new_work_todo = '''<div class="ddc-source-tag" title="对话录入">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            对话
          </div>
          <div class="ddc-title">今日待办</div>
          <div class="ddc-value" id="workTodayTodo">-</div>
          <div class="ddc-desc">项待完成</div>
        </div>'''

content = content.replace(old_work_todo, new_work_todo)
print("工作Tab待办卡片来源标识已添加")

# 健康Tab - 饮食记录（对话录入）
old_health_diet = '''<div class="ddc-title">饮食营养</div>
          <div class="ddc-value" id="healthDietCount">0</div>
          <div class="ddc-desc">条记录</div>
        </div>
        <div class="dashboard-detail-card" onclick="switchSubTab('health', 'sleep')">'''

new_health_diet = '''<div class="ddc-source-tag" title="对话录入">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            对话
          </div>
          <div class="ddc-title">饮食营养</div>
          <div class="ddc-value" id="healthDietCount">0</div>
          <div class="ddc-desc">条记录</div>
        </div>
        <div class="dashboard-detail-card" onclick="switchSubTab('health', 'sleep')">'''

content = content.replace(old_health_diet, new_health_diet)
print("健康Tab饮食卡片来源标识已添加")

# 健康Tab - 运动（设备同步占位）
old_health_exercise = '''<div class="ddc-title">运动时长</div>
          <div class="ddc-value" id="healthExerciseMin">0</div>
          <div class="ddc-desc">分钟今日</div>
        </div>
        <div class="dashboard-detail-card" onclick="switchSubTab('health', 'mood')">'''

new_health_exercise = '''<div class="ddc-source-tag" title="设备同步">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            设备
          </div>
          <div class="ddc-title">运动时长</div>
          <div class="ddc-value" id="healthExerciseMin">0</div>
          <div class="ddc-desc">分钟今日</div>
        </div>
        <div class="dashboard-detail-card" onclick="switchSubTab('health', 'mood')">'''

content = content.replace(old_health_exercise, new_health_exercise)
print("健康Tab运动卡片来源标识已添加")

# 生活Tab - 本月支出（对话+手动）
old_life_expense = '''<div class="ddc-title">本月支出</div>
          <div class="ddc-value" id="lifeExpense">-</div>
          <div class="ddc-desc">元</div>
        </div>
        <div class="dashboard-detail-card" onclick="showDailyTxDetail()">
          <div class="ddc-icon" style="background:#ecfdf5;color:#10b981">'''

new_life_expense = '''<div class="ddc-source-tag" title="手动录入">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            手动
          </div>
          <div class="ddc-title">本月支出</div>
          <div class="ddc-value" id="lifeExpense">-</div>
          <div class="ddc-desc">元</div>
        </div>
        <div class="dashboard-detail-card" onclick="showDailyTxDetail()">
          <div class="ddc-icon" style="background:#ecfdf5;color:#10b981">'''

content = content.replace(old_life_expense, new_life_expense)
print("生活Tab支出卡片来源标识已添加")

# ============ 预埋点4：对话能力扩展 → 系统操作意图识别说明 ============
# 在对话欢迎区域增加提示，说明对话可以做系统操作
old_chat_welcome_desc = '''      <div class="chat-welcome-desc">我可以帮你管理日程、记录收支、分析健康<br>有什么想聊的，直接告诉我</div>'''

new_chat_welcome_desc = '''      <div class="chat-welcome-desc">我可以帮你管理日程、记录收支、分析健康<br>试试说：「明天9点提醒我开会」「记一笔午餐35元」<br>有什么想聊的，直接告诉我</div>'''

content = content.replace(old_chat_welcome_desc, new_chat_welcome_desc)
print("对话欢迎语已更新（增加系统操作示例）")

# ============ 新增JS函数：openSystemService ============
# 在 openServiceDetail 函数后面添加
sys_service_js = '''
  // v52 预埋：系统服务接入（手机APP能力）
  window.openSystemService = function(serviceId) {
    var names = {
      notification: '通知读取',
      calendar: '日历同步',
      healthdata: '健康数据同步',
      shortcut: '快捷指令',
      share: '分享接入'
    };
    var name = names[serviceId] || serviceId;
    alert(name + '\\n\\n功能开发中，敬请期待\\n\\n手机APP接管后，将支持：\\n· 系统级数据自动同步\\n· 快捷指令一键调用\\n· 分享面板直达AI');
  };
'''

pp4 = content.find('window.openServiceDetail = function(')
if pp4 != -1:
    func_end = content.find('};', pp4)
    content = content[:func_end+2] + '\n' + sys_service_js + content[func_end+2:]
    print("系统服务JS函数已添加")

# ============ 更新分身面板的手机状态显示逻辑 ============
# 在 updateAgentPanel 函数中添加手机状态更新
old_update_agent = '''      var ttEl = document.getElementById('agentTodayTasks');
      if (ttEl) ttEl.textContent = todoCount + ' 件事';
    } catch(e) {}
  }'''

new_update_agent = '''      var ttEl = document.getElementById('agentTodayTasks');
      if (ttEl) ttEl.textContent = todoCount + ' 件事';
      // 已接入服务数
      var svcEl = document.getElementById('agentServiceCount');
      if (svcEl) svcEl.textContent = '2 项';
    } catch(e) {}
  }'''

content = content.replace(old_update_agent, new_update_agent)
print("分身面板数据更新逻辑已扩展")

# ============ 写回 ============
with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Part 6 完成，当前行数: {len(content.splitlines())}")
