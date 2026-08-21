#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
v52.1 健康Tab增加「医疗」分段
- health sub-tab bar 增加第5项：医疗
- 新增 health-medical sub-tab-content
- 4个数据卡 + 4个细分模块列表
- 三层辐射支持
- 更新subTabTitles和moduleInitFlags
- 健康总览六大维度描述更新
"""

filepath = '/app/data/所有对话/主对话/mijieai_dev/qiannaqule-personal/index.html'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# =====================================================
# 1. sub-tab-bar 增加医疗按钮
# =====================================================
old_bar_end = '''    <button class="sub-tab-item" data-sub="mood" onclick="switchSubTab('health', 'mood')">
      <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></span>
      <span class="sub-tab-text">情绪</span>
    </button>
  </div>'''

new_bar_end = '''    <button class="sub-tab-item" data-sub="mood" onclick="switchSubTab('health', 'mood')">
      <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></span>
      <span class="sub-tab-text">情绪</span>
    </button>
    <button class="sub-tab-item" data-sub="medical" onclick="switchSubTab('health', 'medical')">
      <span class="sub-tab-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></span>
      <span class="sub-tab-text">医疗</span>
    </button>
  </div>'''

assert old_bar_end in content, "未找到健康sub-tab-bar末尾"
content = content.replace(old_bar_end, new_bar_end)
print("✅ 1. 健康sub-tab增加医疗按钮")

# =====================================================
# 2. 在 health-mood 之后插入 health-medical 内容
# =====================================================
old_mood_end = '''  <div id="health-mood" class="sub-tab-content">
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

  <div class="app-brand-footer">'''

medical_html = '''  <div id="health-mood" class="sub-tab-content">
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

  <!-- 医疗健康 -->
  <div id="health-medical" class="sub-tab-content">
    <div class="dashboard-section">
      <!-- 层级切换：个人/家庭/社会 -->
      <div class="layer-switcher">
        <div class="layer-switcher-item active" onclick="switchMedicalLayer('personal')">个人</div>
        <div class="layer-switcher-item" onclick="switchMedicalLayer('family')">家庭</div>
        <div class="layer-switcher-item" onclick="switchMedicalLayer('society')">社会</div>
      </div>

      <!-- 个人层 -->
      <div id="medicalPersonal">
        <!-- 4个数据卡 -->
        <div class="dashboard-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#eff6ff;color:#2563eb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </div>
            <div class="ddc-title">就诊次数</div>
            <div class="ddc-value" id="medicalVisitCount">0</div>
            <div class="ddc-desc">本年 / 本月 0</div>
          </div>
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#fef3c7;color:#d97706">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="ddc-title">在服药物</div>
            <div class="ddc-value" id="medicalMedsCount">0</div>
            <div class="ddc-desc">种</div>
          </div>
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#f0fdf4;color:#16a34a">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div class="ddc-title">体检报告</div>
            <div class="ddc-value" id="medicalExamCount">0</div>
            <div class="ddc-desc">份</div>
          </div>
          <div class="dashboard-detail-card">
            <div class="ddc-icon" style="background:#f5f3ff;color:#8b5cf6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="ddc-title">医疗支出</div>
            <div class="ddc-value" id="medicalExpense">-</div>
            <div class="ddc-desc">元/本年</div>
          </div>
        </div>

        <!-- 就诊记录 -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <div class="dashboard-card-title">就诊记录</div>
              <div class="dashboard-card-subtitle">医院·科室·诊断·医嘱</div>
            </div>
            <button class="mini-add-btn" onclick="addMedicalVisit()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加
            </button>
          </div>
          <div id="medicalVisitList" class="medical-record-list">
            <div class="mrl-empty">暂无就诊记录<br><span class="mrl-hint">对AI说：「今天去医院了，诊断是...」</span></div>
          </div>
        </div>

        <!-- 用药记录 -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <div class="dashboard-card-title">用药记录</div>
              <div class="dashboard-card-subtitle">用法用量·服药提醒</div>
            </div>
            <button class="mini-add-btn" onclick="addMedication()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加
            </button>
          </div>
          <div id="medicalMedList" class="medical-record-list">
            <div class="mrl-empty">暂无用药记录<br><span class="mrl-hint">对AI说：「开始吃阿莫西林，每天3次」</span></div>
          </div>
        </div>

        <!-- 体检报告 -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <div class="dashboard-card-title">体检报告</div>
              <div class="dashboard-card-subtitle">历年对比·关键指标</div>
            </div>
            <button class="mini-add-btn" onclick="addMedicalExam()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加
            </button>
          </div>
          <div id="medicalExamList" class="medical-record-list">
            <div class="mrl-empty">暂无体检报告<br><span class="mrl-hint">支持图片识别录入体检报告</span></div>
          </div>
        </div>

        <!-- 疫苗接种 -->
        <div class="dashboard-card">
          <div class="dashboard-card-header">
            <div>
              <div class="dashboard-card-title">疫苗接种</div>
              <div class="dashboard-card-subtitle">接种记录·下次提醒</div>
            </div>
            <button class="mini-add-btn" onclick="addVaccine()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              添加
            </button>
          </div>
          <div id="medicalVaccineList" class="medical-record-list">
            <div class="mrl-empty">暂无疫苗记录<br><span class="mrl-hint">对AI说：「今天打了新冠疫苗第三针」</span></div>
          </div>
        </div>
      </div>

      <!-- 家庭层占位 -->
      <div id="medicalFamily" class="placeholder-card" style="display:none">
        <div class="placeholder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="placeholder-title">家庭医疗档案</div>
        <div class="placeholder-desc">家庭成员健康档案 · 老人慢病管理<br>儿童疫苗计划 · 家庭版功能规划中</div>
      </div>

      <!-- 社会层占位 -->
      <div id="medicalSociety" class="placeholder-card" style="display:none">
        <div class="placeholder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-3 3"/></svg>
        </div>
        <div class="placeholder-title">医疗资源参考</div>
        <div class="placeholder-desc">附近医院推荐 · 医保政策解读<br>就医指南 · 社会层功能规划中</div>
      </div>

      <!-- AI建议 -->
      <div class="dashboard-ai-section">
        <div class="dashboard-ai-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 2l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>
          AI 医疗健康建议
        </div>
        <div class="ai-suggestion-card">
          <div class="ai-sug-icon" style="background:#fef3c7;color:#d97706">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <div class="ai-sug-content">
            <div class="ai-sug-title">用药提醒</div>
            <div class="ai-sug-text">按时服药是康复的关键。可以设置服药提醒，避免漏服。</div>
            <span class="ai-sug-detail">设置提醒 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
          </div>
        </div>
        <div class="ai-suggestion-card">
          <div class="ai-sug-icon" style="background:#f0fdf4;color:#16a34a">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="ai-sug-content">
            <div class="ai-sug-title">定期体检</div>
            <div class="ai-sug-text">建议每年做一次全面体检，及时发现潜在健康问题。</div>
            <span class="ai-sug-detail">查看体检套餐 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="app-brand-footer">'''

assert old_mood_end in content, "未找到 health-mood 结尾"
content = content.replace(old_mood_end, medical_html)
print("✅ 2. 医疗分段内容已添加")

# =====================================================
# 3. 更新 subTabTitles 和 moduleInitFlags
# =====================================================
content = content.replace(
    "    'health-mood': '情绪',",
    "    'health-mood': '情绪',\n    'health-medical': '医疗',"
)

content = content.replace(
    "    health_mood: false,",
    "    health_mood: false,\n    health_medical: false,"
)
print("✅ 3. subTabTitles & moduleInitFlags 已更新")

# =====================================================
# 4. 健康总览更新：五大维度→六大维度描述
# =====================================================
content = content.replace(
    "        综合饮食·睡眠·运动·情绪·体重五大维度<br>\n        开始记录，生成你的专属健康画像。",
    "        综合饮食·睡眠·运动·情绪·医疗六大维度<br>\n        开始记录，生成你的专属健康画像。"
)

# 总览明细卡片增加医疗维度（6个卡片，改为3列布局）
old_diet_card = '''          <div class="ddc-title">情绪状态</div>
          <div class="ddc-value" id="healthMood">--</div>
          <div class="ddc-desc">当前心情</div>
        </div>
      </div>
    </div>'''

new_six_cards = '''          <div class="ddc-title">情绪状态</div>
          <div class="ddc-value" id="healthMood">--</div>
          <div class="ddc-desc">当前心情</div>
        </div>
        <div class="dashboard-detail-card" onclick="switchSubTab('health', 'medical')">
          <div class="ddc-icon" style="background:#f0f9ff;color:#0ea5e9">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </div>
          <div class="ddc-source-tag" title="手动录入">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            手动
          </div>
          <div class="ddc-title">医疗健康</div>
          <div class="ddc-value" id="healthMedicalCount">0</div>
          <div class="ddc-desc">条记录</div>
        </div>
      </div>
    </div>'''

assert old_diet_card in content, "未找到情绪明细卡片结束标记"
content = content.replace(old_diet_card, new_six_cards)
print("✅ 4. 健康总览增加医疗维度卡片")

# =====================================================
# 5. CSS: 医疗记录列表样式 + mini-add-btn
# =====================================================
medical_css = '''
/* 医疗记录列表 */
.medical-record-list {
  margin-top: 12px;
}
.mrl-empty {
  text-align: center;
  padding: 24px 16px;
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
}
.mrl-hint {
  font-size: 11px;
  color: #cbd5e1;
}
.mrl-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.mrl-item:last-child { border-bottom: none; }
.mrl-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  background: #eff6ff; color: #2563eb;
}
.mrl-body { flex: 1; min-width: 0; }
.mrl-title {
  font-size: 13px; font-weight: 600; color: #1e293b;
  margin-bottom: 4px;
}
.mrl-desc {
  font-size: 12px; color: #64748b; line-height: 1.5;
}
.mrl-meta {
  font-size: 11px; color: #94a3b8; margin-top: 4px;
  display: flex; gap: 8px;
}
.mini-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.mini-add-btn:hover {
  background: #dcfce7;
}
'''

css_end = '/* ========== v52.1 样式 END ========== */'
assert css_end in content
content = content.replace(css_end, medical_css + css_end)
print("✅ 5. 医疗CSS样式已添加")

# =====================================================
# 6. JS: 切换函数 + 添加记录函数 + 数据加载
# =====================================================
medical_js = '''
  // ========== 医疗健康模块 ==========
  var MEDICAL_STORAGE_KEY = 'mirun_medical_records';

  function getMedicalData() {
    try {
      var raw = localStorage.getItem(MEDICAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : { visits: [], medications: [], exams: [], vaccines: [] };
    } catch(e) {
      return { visits: [], medications: [], exams: [], vaccines: [] };
    }
  }

  function saveMedicalData(data) {
    try { localStorage.setItem(MEDICAL_STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
  }

  window.switchMedicalLayer = function(layer) {
    var detail = document.getElementById('medicalPersonal');
    var fam = document.getElementById('medicalFamily');
    var soc = document.getElementById('medicalSociety');
    // 切换按钮
    var switcher = document.querySelector('#health-medical .layer-switcher');
    if (switcher) {
      switcher.querySelectorAll('.layer-switcher-item').forEach(function(item, idx) {
        var map = ['personal','family','society'];
        item.classList.toggle('active', map[idx] === layer);
      });
    }
    if (detail) detail.style.display = layer === 'personal' ? '' : 'none';
    if (fam) fam.style.display = layer === 'family' ? '' : 'none';
    if (soc) soc.style.display = layer === 'society' ? '' : 'none';
  };

  // 就诊记录相关
  window.addMedicalVisit = function() {
    var date = prompt('就诊日期（YYYY-MM-DD）：', new Date().toISOString().slice(0,10));
    if (!date) return;
    var hospital = prompt('医院：', '');
    if (hospital === null) return;
    var dept = prompt('科室：', '');
    if (dept === null) return;
    var diagnosis = prompt('诊断结果：', '');
    if (diagnosis === null) return;
    var advice = prompt('医嘱摘要：', '');
    if (advice === null) return;

    var data = getMedicalData();
    data.visits.unshift({
      id: 'v_' + Date.now(),
      date: date,
      hospital: hospital || '未填写',
      department: dept || '未填写',
      diagnosis: diagnosis || '未填写',
      advice: advice || '未填写'
    });
    saveMedicalData(data);
    renderMedicalVisits();
    updateMedicalStats();
  };

  function renderMedicalVisits() {
    var list = document.getElementById('medicalVisitList');
    if (!list) return;
    var data = getMedicalData();
    if (data.visits.length === 0) {
      list.innerHTML = '<div class="mrl-empty">暂无就诊记录<br><span class="mrl-hint">对AI说：「今天去医院了，诊断是...」</span></div>';
      return;
    }
    var html = '';
    data.visits.slice(0,5).forEach(function(v) {
      html += '<div class="mrl-item">';
      html += '<div class="mrl-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>';
      html += '<div class="mrl-body">';
      html += '<div class="mrl-title">' + escapeHtml(v.hospital) + ' · ' + escapeHtml(v.department) + '</div>';
      html += '<div class="mrl-desc">诊断：' + escapeHtml(v.diagnosis) + '</div>';
      if (v.advice) html += '<div class="mrl-desc" style="color:#94a3b8">医嘱：' + escapeHtml(v.advice) + '</div>';
      html += '<div class="mrl-meta"><span>' + v.date + '</span></div>';
      html += '</div></div>';
    });
    list.innerHTML = html;
  }

  // 用药记录相关
  window.addMedication = function() {
    var name = prompt('药品名称：', '');
    if (!name) return;
    var dosage = prompt('用法用量：', '每日3次，每次1片');
    if (dosage === null) return;
    var startDate = prompt('开始日期：', new Date().toISOString().slice(0,10));
    if (startDate === null) return;
    var data = getMedicalData();
    data.medications.unshift({
      id: 'm_' + Date.now(),
      name: name,
      dosage: dosage || '',
      startDate: startDate,
      status: 'active'
    });
    saveMedicalData(data);
    renderMedications();
    updateMedicalStats();
  };

  function renderMedications() {
    var list = document.getElementById('medicalMedList');
    if (!list) return;
    var data = getMedicalData();
    if (data.medications.length === 0) {
      list.innerHTML = '<div class="mrl-empty">暂无用药记录<br><span class="mrl-hint">对AI说：「开始吃阿莫西林，每天3次」</span></div>';
      return;
    }
    var html = '';
    data.medications.slice(0,5).forEach(function(m) {
      html += '<div class="mrl-item">';
      html += '<div class="mrl-icon" style="background:#fef3c7;color:#d97706"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg></div>';
      html += '<div class="mrl-body">';
      html += '<div class="mrl-title">' + escapeHtml(m.name) + '</div>';
      html += '<div class="mrl-desc">' + escapeHtml(m.dosage || '') + '</div>';
      html += '<div class="mrl-meta"><span>开始：' + m.startDate + '</span><span>' + (m.status === 'active' ? '服用中' : '已停药') + '</span></div>';
      html += '</div></div>';
    });
    list.innerHTML = html;
  }

  // 体检报告相关
  window.addMedicalExam = function() {
    var date = prompt('体检日期：', new Date().toISOString().slice(0,10));
    if (!date) return;
    var org = prompt('体检机构：', '');
    if (org === null) return;
    var summary = prompt('关键指标摘要：', '');
    if (summary === null) return;
    var data = getMedicalData();
    data.exams.unshift({
      id: 'e_' + Date.now(),
      date: date,
      organization: org || '未填写',
      summary: summary || '未填写'
    });
    saveMedicalData(data);
    renderExams();
    updateMedicalStats();
  };

  function renderExams() {
    var list = document.getElementById('medicalExamList');
    if (!list) return;
    var data = getMedicalData();
    if (data.exams.length === 0) {
      list.innerHTML = '<div class="mrl-empty">暂无体检报告<br><span class="mrl-hint">支持图片识别录入体检报告</span></div>';
      return;
    }
    var html = '';
    data.exams.slice(0,5).forEach(function(e) {
      html += '<div class="mrl-item">';
      html += '<div class="mrl-icon" style="background:#f0fdf4;color:#16a34a"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg></div>';
      html += '<div class="mrl-body">';
      html += '<div class="mrl-title">' + escapeHtml(e.organization) + '</div>';
      html += '<div class="mrl-desc">' + escapeHtml(e.summary || '') + '</div>';
      html += '<div class="mrl-meta"><span>' + e.date + '</span></div>';
      html += '</div></div>';
    });
    list.innerHTML = html;
  }

  // 疫苗接种相关
  window.addVaccine = function() {
    var name = prompt('疫苗名称：', '');
    if (!name) return;
    var date = prompt('接种日期：', new Date().toISOString().slice(0,10));
    if (date === null) return;
    var dose = prompt('剂次：', '第1针');
    if (dose === null) return;
    var data = getMedicalData();
    data.vaccines.unshift({
      id: 'vac_' + Date.now(),
      name: name,
      date: date,
      dose: dose || ''
    });
    saveMedicalData(data);
    renderVaccines();
    updateMedicalStats();
  };

  function renderVaccines() {
    var list = document.getElementById('medicalVaccineList');
    if (!list) return;
    var data = getMedicalData();
    if (data.vaccines.length === 0) {
      list.innerHTML = '<div class="mrl-empty">暂无疫苗记录<br><span class="mrl-hint">对AI说：「今天打了新冠疫苗第三针」</span></div>';
      return;
    }
    var html = '';
    data.vaccines.slice(0,5).forEach(function(v) {
      html += '<div class="mrl-item">';
      html += '<div class="mrl-icon" style="background:#f5f3ff;color:#8b5cf6"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="m18 13 1.5-1.5a4.95 4.95 0 1 0-7-7L11 6"/><path d="m9 11-1.5 1.5a4.95 4.95 0 1 0 7 7L18 13"/><path d="m15 9-6 6"/></svg></div>';
      html += '<div class="mrl-body">';
      html += '<div class="mrl-title">' + escapeHtml(v.name) + '</div>';
      html += '<div class="mrl-meta"><span>' + v.date + '</span><span>' + escapeHtml(v.dose || '') + '</span></div>';
      html += '</div></div>';
    });
    list.innerHTML = html;
  }

  // 更新统计数据
  function updateMedicalStats() {
    var data = getMedicalData();
    // 就诊次数
    var visitEl = document.getElementById('medicalVisitCount');
    if (visitEl) {
      var thisYear = new Date().getFullYear();
      var thisMonth = new Date().getMonth();
      var yearCount = data.visits.filter(function(v) { return v.date && v.date.startsWith(String(thisYear)); }).length;
      var monthCount = data.visits.filter(function(v) {
        if (!v.date) return false;
        var d = new Date(v.date);
        return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
      }).length;
      visitEl.textContent = yearCount;
      var descEl = visitEl.parentElement.querySelector('.ddc-desc');
      if (descEl) descEl.textContent = '本年 / 本月 ' + monthCount;
    }
    // 在服药物
    var medsEl = document.getElementById('medicalMedsCount');
    if (medsEl) {
      var active = data.medications.filter(function(m) { return m.status === 'active'; }).length;
      medsEl.textContent = active;
    }
    // 体检报告
    var examEl = document.getElementById('medicalExamCount');
    if (examEl) examEl.textContent = data.exams.length;

    // 健康总览计数
    var totalCount = data.visits.length + data.medications.length + data.exams.length + data.vaccines.length;
    var mcEl = document.getElementById('healthMedicalCount');
    if (mcEl) mcEl.textContent = totalCount;
  }

  // 初始化医疗模块
  function initMedicalModule() {
    renderMedicalVisits();
    renderMedications();
    renderExams();
    renderVaccines();
    updateMedicalStats();
    // 医疗支出从daily-tx取数
    if (typeof getDailyTxSummary === 'function') {
      try {
        var s = getDailyTxSummary();
        var expEl = document.getElementById('medicalExpense');
        if (expEl && s && s.medicalExpense !== undefined) {
          expEl.textContent = s.medicalExpense;
        }
      } catch(e) {}
    }
  }

  // 暴露
  window.initMedicalModule = initMedicalModule;
  window.getMedicalData = getMedicalData;
  window.saveMedicalData = saveMedicalData;

  '''

js_anchor = "  // ========== 分身名称管理 =========="
assert js_anchor in content
content = content.replace(js_anchor, medical_js + js_anchor)
print("✅ 6. 医疗模块JS已注入")

# =====================================================
# 7. 在switchSubTab中加入医疗模块初始化
# =====================================================
# 找到 health_mood 的初始化代码位置，在其后面加 medical
old_mood_init = "          if (window.sleepStatsInit && !moduleInitFlags.health_sleep) {"
# 换个位置：在switchSubTab函数里找到健康相关初始化
# 简单点：在模块初始化标记后直接加init调用到health切换逻辑

# 找 switchSubTab 中 health 相关的初始化
switch_health_marker = "if (sub === 'mood') {"
if switch_health_marker in content:
    # 在 mood 的处理后面加 medical
    content = content.replace(
        switch_health_marker,
        "        if (sub === 'medical') {\n          if (typeof initMedicalModule === 'function' && !moduleInitFlags.health_medical) {\n            moduleInitFlags.health_medical = true;\n            initMedicalModule();\n          }\n        }\n        " + switch_health_marker
    )
    print("✅ 7. switchSubTab增加医疗模块初始化")

# =====================================================
# 写回
# =====================================================
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ 医疗分段添加完成，文件大小: {len(content)} 字符")
