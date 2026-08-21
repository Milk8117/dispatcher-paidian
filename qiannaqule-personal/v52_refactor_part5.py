#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MiRun AI v52 架构终版重构脚本 - Part 5: 应用管理+服务管理+系统设置落地
"""
import re

FILE_PATH = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/index.html'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ============ 1. 工作Tab-成长分段：增加效率分析模块 ============
# 找到 work-growth sub-tab-content，替换内容
pattern_growth = r'<div id="work-growth" class="sub-tab-content">.*?</div>\s*(?=\n\s*<!--|</div>\n\s*<div id="work-knowledge")'
new_growth = '''<div id="work-growth" class="sub-tab-content">
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

        <!-- 效率分析卡片 -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <div class="dashboard-card-title">效率分析</div>
              <div class="dashboard-card-subtitle">屏幕时间 · APP使用 · 专注追踪</div>
            </div>
          </div>
          <div class="efficiency-grid">
            <div class="efficiency-item">
              <div class="efficiency-icon" style="background:#f5f3ff;color:#8b5cf6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              </div>
              <div class="efficiency-info">
                <div class="efficiency-value" id="screenTimeToday">--</div>
                <div class="efficiency-label">今日屏幕时间</div>
              </div>
            </div>
            <div class="efficiency-item">
              <div class="efficiency-icon" style="background:#ecfdf5;color:#10b981">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div class="efficiency-info">
                <div class="efficiency-value" id="focusTimeToday">--</div>
                <div class="efficiency-label">专注时长</div>
              </div>
            </div>
            <div class="efficiency-item">
              <div class="efficiency-icon" style="background:#fef3c7;color:#d97706">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
              </div>
              <div class="efficiency-info">
                <div class="efficiency-value" id="appCountUsed">--</div>
                <div class="efficiency-label">使用APP数</div>
              </div>
            </div>
            <div class="efficiency-item">
              <div class="efficiency-icon" style="background:#fee2e2;color:#ef4444">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 2l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
              </div>
              <div class="efficiency-info">
                <div class="efficiency-value" id="focusScore">-</div>
                <div class="efficiency-label">专注评分</div>
              </div>
            </div>
          </div>
          <div class="dashboard-conclusion" style="margin-top:12px">
            应用使用数据接入后，自动分析你的数字健康状态。<br>
            <span style="color:#94a3b8;font-size:12px">数据来源：手机使用统计 · 智能设备同步</span>
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
    </div>'''

content = re.sub(pattern_growth, new_growth, content, flags=re.DOTALL)
print("工作Tab-成长分段效率分析已添加")

# ============ 2. 效率分析CSS ============
efficiency_css = '''
/* v52 效率分析卡片 */
.efficiency-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin: 12px 0;
}
.efficiency-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
}
.efficiency-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.efficiency-info { flex: 1; min-width: 0; }
.efficiency-value {
  font-size: 16px; font-weight: 700; color: #0f172a;
  line-height: 1.2;
}
.efficiency-label {
  font-size: 11px; color: #94a3b8;
  margin-top: 2px;
}
'''

# 在 device-tip CSS后插入
pp = content.rfind('.device-tip svg { flex-shrink: 0; color: #0ea5e9; }')
if pp != -1:
    brace_end = content.find('}', pp + 50)
    content = content[:brace_end+1] + '\n' + efficiency_css + content[brace_end+1:]
    print("效率分析CSS已添加")

# ============ 3. 我的Tab - 服务管理（profileSection7） ============
service_section = '''    <div class="profile-section" id="profileSection7" onclick="toggleProfileSection(7)">
      <div class="profile-section-header">
        <div class="profile-section-title">
          <div class="profile-section-icon" style="background:#fef3c7;color:#d97706"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/><line x1="12" y1="22" x2="12.01" y2="22"/></svg></div>
          <div>
            <div class="profile-section-name">服务管理</div>
            <div class="profile-section-summary" id="profileServiceSummary">0 项服务</div>
          </div>
        </div>
        <span class="profile-section-toggle"><svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg></span>
      </div>
      <div class="profile-section-body">
        <!-- 已接入服务列表 -->
        <div class="service-group">
          <div class="service-group-title">已接入服务</div>
          <div class="service-list" id="serviceConnectedList">
            <div class="service-item" onclick="event.stopPropagation();openServiceDetail('weather')">
              <div class="service-icon" style="background:#eff6ff;color:#2563eb">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/></svg>
              </div>
              <div class="service-info">
                <div class="service-name">天气服务</div>
                <div class="service-desc">实时天气 · 生活指数</div>
              </div>
              <div class="service-status status-connected">已接入</div>
            </div>
            <div class="service-item" onclick="event.stopPropagation();openServiceDetail('stock')">
              <div class="service-icon" style="background:#ecfdf5;color:#10b981">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div class="service-info">
                <div class="service-name">行情数据</div>
                <div class="service-desc">A股/港股/美股行情</div>
              </div>
              <div class="service-status status-connected">已接入</div>
            </div>
          </div>
        </div>
        <!-- 待接入服务 -->
        <div class="service-group">
          <div class="service-group-title">待接入服务</div>
          <div class="service-list" id="servicePendingList">
            <div class="service-item" onclick="event.stopPropagation();openServiceDetail('health')">
              <div class="service-icon" style="background:#fee2e2;color:#ef4444">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
              <div class="service-info">
                <div class="service-name">健康数据平台</div>
                <div class="service-desc">运动/体征数据同步</div>
              </div>
              <div class="service-status status-disconnected">未接入</div>
            </div>
            <div class="service-item" onclick="event.stopPropagation();openServiceDetail('calendar')">
              <div class="service-icon" style="background:#f5f3ff;color:#8b5cf6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div class="service-info">
                <div class="service-name">日历同步</div>
                <div class="service-desc">系统日历双向同步</div>
              </div>
              <div class="service-status status-disconnected">未接入</div>
            </div>
          </div>
        </div>
        <!-- 扩展应用 -->
        <div class="service-group">
          <div class="service-group-title">扩展应用</div>
          <div class="service-list">
            <div class="service-item" onclick="event.stopPropagation();openServiceMarket()">
              <div class="service-icon" style="background:#f0f9ff;color:#0ea5e9">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <div class="service-info">
                <div class="service-name">服务市场</div>
                <div class="service-desc">发现更多第三方服务</div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
        </div>
        <button class="profile-edit-btn" onclick="event.stopPropagation();addService()">+ 添加服务</button>
        <div class="device-tip" style="background:#fef9c3;color:#854d0e">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          所有服务均在本地运行，数据不会上传到第三方服务器
        </div>
      </div>
    </div>

'''

# 在智能设备（profileSection6）后面、"数据与设置"前面插入
insert_pos = content.find('<!-- 数据与设置 -->')
if insert_pos != -1:
    content = content[:insert_pos] + service_section + content[insert_pos:]
    print("服务管理模块已添加到我的Tab")
else:
    print("未找到插入位置")

# ============ 4. 服务管理CSS ============
service_css = '''
/* v52 服务管理模块 */
.service-group { margin-bottom: 16px; }
.service-group:first-child { margin-top: 8px; }
.service-group-title {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding: 0 4px;
  text-transform: uppercase;
}
.service-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.service-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.service-item:active { background: #f1f5f9; transform: scale(0.98); }
.service-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.service-info { flex: 1; min-width: 0; }
.service-name {
  font-size: 14px; font-weight: 600; color: #0f172a;
  margin-bottom: 2px;
}
.service-desc {
  font-size: 12px; color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.service-status {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;
  flex-shrink: 0;
}
.service-status.status-connected {
  background: #dcfce7;
  color: #15803d;
}
.service-status.status-disconnected {
  background: #f1f5f9;
  color: #94a3b8;
}
'''

# 在 efficiency-label 后插入
pp = content.rfind('.efficiency-label {')
if pp != -1:
    # 找到这个规则的 } 结束
    brace_start = content.find('{', pp)
    brace_end = content.find('}', brace_start)
    content = content[:brace_end+1] + '\n' + service_css + content[brace_end+1:]
    print("服务管理CSS已添加")

# ============ 5. 我的Tab底部系统设置区 ============
# 替换原来的"数据与设置"+"关于"两个section
old_settings_section = '''    <!-- 数据与设置 -->
    <div class="me-section-card" style="background:#fff;border-radius:16px;margin-bottom:16px;border:1px solid #f1f5f9;overflow:hidden;margin-top:20px">
      <div class="me-section-title" style="padding:14px 16px 8px;font-size:13px;font-weight:600;color:#64748b;letter-spacing:0.3px">数据与设置</div>
      <div class="me-list-item" onclick="showDataStats()" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;border-top:1px solid #f8fafc">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:10px;background:#f0f9ff;display:flex;align-items:center;justify-content:center;color:#0ea5e9">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>
          </div>
          <span style="font-size:14px;color:#1e293b">数据容量</span>
        </div>
        <span id="dataStorageSize" style="font-size:13px;color:#94a3b8">计算中...</span>
      </div>
      <div class="me-list-item" onclick="openAiSettings()" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;border-top:1px solid #f8fafc">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:10px;background:#f5f3ff;display:flex;align-items:center;justify-content:center;color:#8b5cf6">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 0-4 4v2a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z"/><path d="M6 12a6 6 0 0 0 12 0"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>
          </div>
          <span style="font-size:14px;color:#1e293b">AI 设置</span>
        </div>
        <span style="font-size:13px;color:#94a3b8">→</span>
      </div>
      <div class="me-list-item" onclick="confirmClearAllData()" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;border-top:1px solid #f8fafc">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:10px;background:#fef2f2;display:flex;align-items:center;justify-content:center;color:#ef4444">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
          </div>
          <span style="font-size:14px;color:#1e293b">清空所有数据</span>
        </div>
        <span style="font-size:13px;color:#94a3b8">→</span>
      </div>
    </div>

    <!-- 关于 -->
    <div class="me-section-card" style="background:#fff;border-radius:16px;margin-bottom:16px;border:1px solid #f1f5f9;overflow:hidden">
      <div class="me-section-title" style="padding:14px 16px 8px;font-size:13px;font-weight:600;color:#64748b;letter-spacing:0.3px">关于</div>
      <div class="me-list-item" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-top:1px solid #f8fafc">
        <span style="font-size:14px;color:#1e293b">版本</span>
        <span style="font-size:13px;color:#94a3b8">v52</span>
      </div>
      <div class="me-list-item" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-top:1px solid #f8fafc">
        <span style="font-size:14px;color:#1e293b">出品</span>
        <span style="font-size:13px;color:#94a3b8">米儿客</span>
      </div>
      <div class="me-list-item" onclick="showPrivacyNotice()" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;border-top:1px solid #f8fafc">
        <span style="font-size:14px;color:#1e293b">隐私声明</span>
        <span style="font-size:13px;color:#94a3b8">→</span>
      </div>
    </div>

    <div style="text-align:center;padding:20px 0 10px;font-size:12px;color:#cbd5e1">
      MiRun AI v52 · 越用越懂你的数字分身
    </div>
  </div>'''

new_settings_section = '''    <!-- 系统设置区（底部） -->
    <div class="system-settings-section">
      <div class="system-settings-divider">系统设置</div>

      <!-- 通知设置 -->
      <div class="me-section-card">
        <div class="me-list-item" onclick="openNotificationSettings()" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:10px;background:#fef3c7;display:flex;align-items:center;justify-content:center;color:#d97706">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <span style="font-size:14px;color:#1e293b">通知设置</span>
          </div>
          <span style="font-size:13px;color:#94a3b8">→</span>
        </div>
        <div class="me-list-item" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-top:1px solid #f8fafc">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:10px;background:#f5f3ff;display:flex;align-items:center;justify-content:center;color:#8b5cf6">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 0-4 4v2a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z"/><path d="M6 12a6 6 0 0 0 12 0"/><path d="M12 18v4"/><path d="M8 22h8"/></svg>
            </div>
            <span style="font-size:14px;color:#1e293b">AI 设置</span>
          </div>
          <span style="font-size:13px;color:#94a3b8">→</span>
        </div>
      </div>

      <!-- 数据管理 -->
      <div class="me-section-card">
        <div class="me-list-item" onclick="showDataStats()" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:10px;background:#f0f9ff;display:flex;align-items:center;justify-content:center;color:#0ea5e9">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></svg>
            </div>
            <span style="font-size:14px;color:#1e293b">数据容量</span>
          </div>
          <span id="dataStorageSize" style="font-size:13px;color:#94a3b8">计算中...</span>
        </div>
        <div class="me-list-item" onclick="exportData()" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;border-top:1px solid #f8fafc">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:10px;background:#ecfdf5;display:flex;align-items:center;justify-content:center;color:#10b981">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <span style="font-size:14px;color:#1e293b">导出数据</span>
          </div>
          <span style="font-size:13px;color:#94a3b8">→</span>
        </div>
        <div class="me-list-item" onclick="confirmClearAllData()" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;border-top:1px solid #f8fafc">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:10px;background:#fef2f2;display:flex;align-items:center;justify-content:center;color:#ef4444">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <span style="font-size:14px;color:#1e293b">清空所有数据</span>
          </div>
          <span style="font-size:13px;color:#94a3b8">→</span>
        </div>
      </div>

      <!-- 隐私与安全 -->
      <div class="me-section-card">
        <div class="me-list-item" onclick="showPrivacyNotice()" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:10px;background:#fef3c7;display:flex;align-items:center;justify-content:center;color:#d97706">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <span style="font-size:14px;color:#1e293b">隐私与安全</span>
          </div>
          <span style="font-size:13px;color:#94a3b8">→</span>
        </div>
        <div class="me-list-item" onclick="showUserAgreement()" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;border-top:1px solid #f8fafc">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:10px;background:#f5f3ff;display:flex;align-items:center;justify-content:center;color:#8b5cf6">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <span style="font-size:14px;color:#1e293b">用户协议</span>
          </div>
          <span style="font-size:13px;color:#94a3b8">→</span>
        </div>
      </div>

      <!-- 关于MiRun -->
      <div class="me-section-card">
        <div class="me-list-item" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#64748b">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </div>
            <span style="font-size:14px;color:#1e293b">关于 MiRun</span>
          </div>
          <span style="font-size:13px;color:#94a3b8">v52</span>
        </div>
      </div>
    </div>

    <div class="me-version-footer">
      <div class="me-brand-row">
        <img src="./assets/mierke-logo.png" alt="米儿客" style="height:14px;opacity:0.5;vertical-align:middle">
      </div>
      <div class="me-version-text">MiRun AI v52 · 越用越懂你的数字分身</div>
      <div class="me-copyright">米儿客出品 · 数据仅存本地</div>
    </div>
  </div>'''

content = content.replace(old_settings_section, new_settings_section)
print("系统设置区已重构")

# ============ 6. 系统设置CSS ============
system_css = '''
/* v52 系统设置区 */
.system-settings-section {
  margin-top: 24px;
}
.system-settings-divider {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 0 4px 10px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 12px;
}
.me-section-card {
  background: #fff;
  border-radius: 16px;
  margin-bottom: 12px;
  border: 1px solid #f1f5f9;
  overflow: hidden;
}
.me-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s;
}
.me-list-item:active { background: #f8fafc; }
.me-version-footer {
  text-align: center;
  padding: 20px 0 20px;
}
.me-brand-row {
  margin-bottom: 8px;
  opacity: 0.6;
}
.me-version-text {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
  font-weight: 500;
}
.me-copyright {
  font-size: 10px;
  color: #cbd5e1;
}
'''

# 在 service-status.status-disconnected 后插入
pp = content.rfind('.service-status.status-disconnected {')
if pp != -1:
    brace_end = content.find('}', pp + 30)
    content = content[:brace_end+1] + '\n' + system_css + content[brace_end+1:]
    print("系统设置CSS已添加")

# ============ 7. 新增JS函数：服务相关 ============
service_js = '''
  // ==================== v52 新增：服务管理 ====================
  window.openServiceDetail = function(serviceId) {
    alert('服务详情\\n\\n服务ID: ' + serviceId + '\\n\\n在此可配置：\\n· 接入状态\\n· 数据权限\\n· 同步频率\\n\\nMVP阶段正在完善中');
  };
  window.addService = function() {
    alert('添加服务\\n\\n方式1：通过对话告诉我"接入天气服务"\\n方式2：在服务市场浏览安装\\n方式3：手动配置API密钥');
  };
  window.openServiceMarket = function() {
    alert('服务市场\\n\\n开放平台正在建设中\\n未来将支持更多第三方服务接入');
  };

  // ==================== v52 新增：系统设置 ====================
  window.openNotificationSettings = function() {
    alert('通知设置\\n\\n· 推送开关：开启/关闭\\n· 免打扰时段：22:00 - 07:00\\n· 通知类型：日程提醒/健康提醒/消息通知\\n\\n详细设置功能开发中');
  };
  window.exportData = function() {
    alert('数据导出\\n\\n支持导出格式：JSON / CSV\\n导出范围：全部数据 / 指定模块\\n\\n功能开发中');
  };
  window.showUserAgreement = function() {
    alert('用户协议\\n\\nMiRun AI 是本地化运行的个人智能助手。\\n所有数据仅存储在您的设备本地，不会上传到任何服务器。\\n\\n完整版协议请查看隐私声明。');
  };
'''

# 在 runWealthDiagnosis 函数后插入
pp = content.find('window.runWealthDiagnosis = function()')
if pp != -1:
    # 找到这个函数结束的 }
    func_end = content.find('};', pp)
    content = content[:func_end+2] + '\n' + service_js + content[func_end+2:]
    print("服务管理JS函数已添加")

# ============ 写回 ============
with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Part 5 完成，当前行数: {len(content.splitlines())}")
