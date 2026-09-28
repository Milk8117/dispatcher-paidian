# -*- coding: utf-8 -*-
import io, sys

repo = '/Coze/Drive/榫扣/所有对话/主对话/codeact/repo/qiannaqule-personal/'
files = [repo + 'app.html', repo + 'index.html']

# ---- 1. HTML: 三select -> input[type=date] id=familyBirthdayDate ----
html_old = """        <div class="profile-date-row" id="familyEditBirthdayRow">
          <select class="profile-date-select" data-date-part="year" id="familyEditYear"></select>
          <select class="profile-date-select" data-date-part="month" id="familyEditMonth"></select>
          <select class="profile-date-select" data-date-part="day" id="familyEditDay"></select>
        </div>"""
html_new = """        <input type="date" class="profile-edit-input" id="familyBirthdayDate" />"""

# ---- 2. _initFamilyBirthdaySelects ----
init_old = """  function _initFamilyBirthdaySelects() {
    var ySel = document.getElementById('familyEditYear');
    var mSel = document.getElementById('familyEditMonth');
    var dSel = document.getElementById('familyEditDay');
    if (!ySel || ySel.options.length > 0) return; // 已初始化
    var now = new Date();
    var curY = now.getFullYear();
    for (var yi = curY; yi >= 1900; yi--) {
      var opt = document.createElement('option');
      opt.value = yi;
      opt.textContent = yi + '年';
      ySel.appendChild(opt);
    }
    for (var mi = 1; mi <= 12; mi++) {
      var opt = document.createElement('option');
      var ms = mi < 10 ? '0' + mi : String(mi);
      opt.value = ms;
      opt.textContent = mi + '月';
      mSel.appendChild(opt);
    }
    for (var di = 1; di <= 31; di++) {
      var opt = document.createElement('option');
      var ds = di < 10 ? '0' + di : String(di);
      opt.value = ds;
      opt.textContent = di + '日';
      dSel.appendChild(opt);
    }
  }"""
init_new = """  function _initFamilyBirthdaySelects() {
    // v52.8.4: 家庭成员出生日期改用原生 input[type=date]，无需单列初始化
    var el = document.getElementById('familyBirthdayDate');
    if (el) el.value = el.value || '';
  }"""

# ---- 3. _setFamilyBirthday ----
set_old = """  function _setFamilyBirthday(val) {
    _initFamilyBirthdaySelects();
    var ySel = document.getElementById('familyEditYear');
    var mSel = document.getElementById('familyEditMonth');
    var dSel = document.getElementById('familyEditDay');
    if (!val) {
      var now = new Date();
      if (ySel) ySel.value = now.getFullYear();
      if (mSel) mSel.value = '01';
      if (dSel) dSel.value = '01';
      return;
    }
    var parts = val.split('-');
    if (parts.length >= 3) {
      if (ySel) ySel.value = parts[0];
      if (mSel) mSel.value = parts[1];
      if (dSel) dSel.value = parts[2];
    }
  }"""
set_new = """  function _setFamilyBirthday(val) {
    var el = document.getElementById('familyBirthdayDate');
    if (!el) return;
    el.value = val || '';
  }"""

# ---- 4. _getFamilyBirthday ----
get_old = """  function _getFamilyBirthday() {
    var ySel = document.getElementById('familyEditYear');
    var mSel = document.getElementById('familyEditMonth');
    var dSel = document.getElementById('familyEditDay');
    if (!ySel || !mSel || !dSel) return '';
    return ySel.value + '-' + mSel.value + '-' + dSel.value;
  }"""
get_new = """  function _getFamilyBirthday() {
    var el = document.getElementById('familyBirthdayDate');
    if (!el || !el.value) return '';
    return el.value; // v52.8.4: 原生 date input 值即 YYYY-MM-DD
  }"""

edits = [
    (html_old, html_new),
    (init_old, init_new),
    (set_old, set_new),
    (get_old, get_new),
]

for f in files:
    with io.open(f, 'r', encoding='utf-8') as fh:
        data = fh.read()
    for old, new in edits:
        cnt = data.count(old)
        print('%s | %d occurrences | %s...' % (f.split('/')[-1], cnt, old[:40].replace('\n', '\\n')))
        if cnt != 1:
            print('  !! EXPECT 1 occurrence, got %d' % cnt)
            sys.exit(1)
        data = data.replace(old, new)
    with io.open(f, 'w', encoding='utf-8') as fh:
        fh.write(data)
print('ALL REPLACED OK')