# -*- coding: utf-8 -*-
data = open('app.html', encoding='utf-8').read()
cnt = 0

def rep(old, new, label):
    global data, cnt
    c = data.count(old)
    print("%s count=%d" % (label, c))
    if c == 1:
        data = data.replace(old, new)
        cnt += 1
    elif c > 1:
        print("  !! 多处命中，跳过")
    else:
        print("  !! 未命中")

# 1) renderInsuranceSummary 年缴保费汇总：不计入已缴清
rep("(ins || []).forEach(function(i){ cov += parseFloat(i.amount)||0; prem += parseFloat(i.premium)||0; });",
    "(ins || []).forEach(function(i){ cov += parseFloat(i.amount)||0; if(!_insPaidUp(i)) prem += parseFloat(i.premium)||0; });",
    "1-renderInsuranceSummary")

# 2) 资产全景 prem 汇总
rep("(WealthCT.loadInsurance() || []).forEach(function(i){ cov += parseFloat(i.amount)||0; prem += parseFloat(i.premium)||0; });",
    "(WealthCT.loadInsurance() || []).forEach(function(i){ cov += parseFloat(i.amount)||0; if(!_insPaidUp(i)) prem += parseFloat(i.premium)||0; });",
    "2-资产全景prem")

# 3) buildWealthConclusion premiumSum
rep("        ins.forEach(function(i){ premiumSum += Number(i.premium) || 0; });",
    "        ins.forEach(function(i){ if(!_insPaidUp(i)) premiumSum += Number(i.premium) || 0; });",
    "3-buildWealthConclusion")

open('app.html', 'w', encoding='utf-8').write(data)
print("DONE cnt=%d" % cnt)