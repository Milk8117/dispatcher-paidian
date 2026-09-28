#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import io

path = 'app.html'
d = io.open(path, encoding='utf-8').read()

# ---------- 1: bump all 52.8.0 -> 52.8.1 ----------
n = d.count('52.8.0')
d = d.replace('52.8.0', '52.8.1')

# ---------- 2: add 体质辨证 row in profileSection2 (before edit button) ----------
anchor2 = '        <button class="profile-edit-btn" onclick="event.stopPropagation();editProfileSection(\'health\')">编辑健康档案</button>'
row2 = ('        <div class="profile-field-row">\n'
        '          <span class="profile-field-label">体质辨证</span>\n'
        '          <span class="profile-field-value" id="profileConstitution">未设置</span>\n'
        '        </div>\n')
# only replace first occurrence (the profileSection2 one)
idx = d.index(anchor2)
d = d[:idx] + row2 + d[idx:]

# ---------- 3: loadProfileData add constitution read + summary ----------
old3 = ("    var disease = window.MemoryManager.getSync('user', 'disease', '未设置');\n"
        "    var allergy = window.MemoryManager.getSync('user', 'allergy', '未设置');\n"
        "    var medication = window.MemoryManager.getSync('user', 'medication', '未设置');\n"
        "    setVal('profileDisease', disease);\n"
        "    setVal('profileAllergy', allergy);\n"
        "    setVal('profileMedication', medication);\n"
        "    if (disease !== '未设置' || allergy !== '未设置') {\n"
        "      var hs = document.getElementById('profileHealthSummary');\n"
        "      if (hs) hs.textContent = (allergy !== '未设置' ? '过敏: ' + allergy : '已设置');\n"
        "    }\n")
new3 = ("    var disease = window.MemoryManager.getSync('user', 'disease', '未设置');\n"
        "    var allergy = window.MemoryManager.getSync('user', 'allergy', '未设置');\n"
        "    var medication = window.MemoryManager.getSync('user', 'medication', '未设置');\n"
        "    var constitution = window.MemoryManager.getSync('user', 'constitution', '未设置');\n"
        "    setVal('profileDisease', disease);\n"
        "    setVal('profileAllergy', allergy);\n"
        "    setVal('profileMedication', medication);\n"
        "    setVal('profileConstitution', constitution);\n"
        "    if (disease !== '未设置' || allergy !== '未设置' || constitution !== '未设置') {\n"
        "      var hs = document.getElementById('profileHealthSummary');\n"
        "      if (hs) {\n"
        "        var hp = [];\n"
        "        if (constitution !== '未设置') hp.push('体质: ' + constitution);\n"
        "        if (allergy !== '未设置') hp.push('过敏: ' + allergy);\n"
        "        hs.textContent = hp.length ? hp.join(' · ') : '已设置';\n"
        "      }\n"
        "    }\n")
assert old3 in d, 'old3 not found'
d = d.replace(old3, new3)

# ---------- 4: PROFILE_FIELD_MAP.health.fields add constitution multiselect ----------
anchor4 = "        { key: 'medication', label: '长期用药', type: 'textarea', layer: 'user', placeholder: '正在服用的药物名称和剂量' },\n"
field4 = "        { key: 'constitution', label: '体质辨证(可多选)', type: 'multiselect', layer: 'user', options: ['寒湿', '平和', '湿热', '气虚', '血瘀', '阳虚', '阴虚', '气郁'] },\n"
assert anchor4 in d, 'anchor4 not found'
d = d.replace(anchor4, anchor4 + field4)

# ---------- 5: multiselect render branch (insert before number branch) ----------
anchor5 = "      } else if (field.type === 'number') {"
branch5 = ("      } else if (field.type === 'multiselect') {\n"
           "        var _mOpts = field.options || [];\n"
           "        var _mCur = val ? String(val).split(/[、,，\\/]+/) : [];\n"
           "        html += '<div class=\"profile-multi-list\" data-field=\"' + field.key + '\" data-layer=\"' + field.layer + '\">';\n"
           "        _mOpts.forEach(function(opt) {\n"
           "          var _mA = _mCur.indexOf(opt) >= 0;\n"
           "          html += '<div class=\"profile-multi-chip' + (_mA ? ' selected' : '') + '\" data-val=\"' + opt + '\"><svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 6 9 17l-5-5\"/></svg><span>' + opt + '</span></div>';\n"
           "        });\n"
           "        html += '<input type=\"hidden\" data-field=\"' + field.key + '\" data-layer=\"' + field.layer + '\" value=\"' + escapeHtml(_mCur.join('、')) + '\" />';\n"
           "      } else if (field.type === 'number') {")
assert anchor5 in d, 'anchor5 not found'
d = d.replace(anchor5, branch5, 1)

# ---------- 6: chip toggle events after body.innerHTML ----------
anchor6 = "    body.innerHTML = html;\n    document.getElementById('profileEditOverlay').classList.add('active');"
events6 = ("    body.innerHTML = html;\n"
           "    // 多选字段（体质辨证）：勾选切换并同步到隐藏input\n"
           "    body.querySelectorAll('.profile-multi-chip').forEach(function(chip) {\n"
           "      chip.addEventListener('click', function() {\n"
           "        var list = this.closest('.profile-multi-list');\n"
           "        if (!list) return;\n"
           "        this.classList.toggle('selected');\n"
           "        var ar = [];\n"
           "        list.querySelectorAll('.profile-multi-chip.selected').forEach(function(c) { ar.push(c.getAttribute('data-val')); });\n"
           "        var h = list.querySelector('input[type=\"hidden\"]');\n"
           "        if (h) h.value = ar.join('、');\n"
           "      });\n"
           "    });\n"
           "    document.getElementById('profileEditOverlay').classList.add('active');")
assert anchor6 in d, 'anchor6 not found'
d = d.replace(anchor6, events6, 1)

# ---------- 7: CSS for multiselect ----------
anchor7 = ".profile-edit-save:hover { opacity: 0.9; }"
css7 = (".profile-edit-save:hover { opacity: 0.9; }\n"
        ".profile-multi-list { display: flex; flex-wrap: wrap; gap: 8px; }\n"
        ".profile-multi-chip { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 16px; border: 1px solid #e2e8f0; font-size: 13px; color: #475569; background: #f8fafc; cursor: pointer; transition: all .2s; user-select: none; -webkit-user-select: none; }\n"
        ".profile-multi-chip svg { width: 12px; height: 12px; opacity: 0; transition: opacity .2s; display: inline-block; }\n"
        ".profile-multi-chip.selected { background: #8b5cf6; border-color: #8b5cf6; color: #fff; }\n"
        ".profile-multi-chip.selected svg { opacity: 1; }")
assert anchor7 in d, 'anchor7 not found'
d = d.replace(anchor7, css7, 1)

io.open(path, 'w', encoding='utf-8').write(d)
print('version replacements:', n)
print('app.html patched stage1')