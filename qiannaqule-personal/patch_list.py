# -*- coding: utf-8 -*-
data = open('app.html', encoding='utf-8').read()

# 真实字节匹配（字面 \u003c/\u003e 转义，内部引号为单字符）
old = r"wlc-item-value\">¥' + (Math.round(parseFloat(i.premium)||0)).toLocaleString('zh-CN') + '\u003c/div\u003e\u003cdiv class=\"wlc-item-change\"\u003e年缴"
new = r"wlc-item-value\">' + (_insPaidUp(i) ? '已缴完' : '¥' + (Math.round(parseFloat(i.premium)||0)).toLocaleString('zh-CN')) + '\u003c/div\u003e\u003cdiv class=\"wlc-item-change\"\u003e' + (_insPaidUp(i) ? '缴费完成' : '年缴') + '"
c = data.count(old)
print("count:", c)
if c == 1:
    data = data.replace(old, new)
    open('app.html', 'w', encoding='utf-8').write(data)
    print("REPLACED")
else:
    # fallback raw 反斜杠真正表示
    old2 = r"wlc-item-value\u003e¥' + (Math.round(parseFloat(i.premium)||0)).toLocaleString('zh-CN') + '\u003c/div\u003e\u003cdiv class=\"wlc-item-change\"\u003e年缴"
    c2 = data.count(old2)
    print("alt count:", c2)
    print("probe:", repr(data[data.find('wlc-item-value')-30:data.find('wlc-item-value')+200]))