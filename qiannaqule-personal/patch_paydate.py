# -*- coding: utf-8 -*-
data = open('app.html', encoding='utf-8').read()

# ---- 1) HTML：date input -> 三下拉（文件为字面 \u003c 转义）----
old1 = r'''\u003cdiv style="flex:1"\u003e\u003cdiv style="font-size:13px;color:#64748b;margin-bottom:4px"\u003e下次缴费日\u003c/div\u003e\u003cinput type="date" id="we-paydate" style="font-size:16px;width:100%;padding:9px;border:1px solid #e2e8f0;border-radius:10px"\u003e\u003c/div\u003e'''
new1 = r'''\u003cdiv style="flex:1"\u003e\u003cdiv style="font-size:13px;color:#64748b;margin-bottom:4px"\u003e下次缴费日\u003c/div\u003e\' + _wePaydateHtml() + \'\u003c/div\u003e'''
c1 = data.count(old1)
print("1) html count:", c1)
if c1 == 1:
    data = data.replace(old1, new1)
else:
    print("   FAIL1")

# ---- 2) loadWealthEntryValues 回填 ----
old2 = "      var paydate = document.getElementById('we-paydate');\n"
new2 = ""
c2 = data.count(old2)
print("2) var paydate remove:", c2)
if c2 == 1:
    data = data.replace(old2, new2)

old3 = "      setWeVal('we-paid', it.paid); if (paydate) paydate.value = it.payDate || '';"
new3 = "      setWeVal('we-paid', it.paid); _wePaydateSet(it.payDate);"
c3 = data.count(old3)
print("3) load set:", c3)
if c3 == 1:
    data = data.replace(old3, new3)

# ---- 3) saveWealthEntry 保存 ----
old4 = "      var payDate = getWeEl('we-paydate') || '';"
new4 = "      var payDate = _wePaydateGet();"
c4 = data.count(old4)
print("4) save payDate:", c4)
if c4 == 1:
    data = data.replace(old4, new4)

open('app.html', 'w', encoding='utf-8').write(data)
print("DONE")