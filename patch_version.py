# -*- coding: utf-8 -*-
import io, sys

repo = '/Coze/Drive/榫扣/所有对话/主对话/codeact/repo/qiannaqule-personal/'
files = [repo + 'app.html', repo + 'index.html']

# 功能版本标识升级 (每处必须唯一)
edits = [
    ("    var CURRENT_VERSION = '52.8.3';", "    var CURRENT_VERSION = '52.8.4';"),
    ("      MiRun AI v52.8.3 \u00b7 \u8d8a\u7528\u8d8a\u61c2\u4f60\u7684\u6570\u5b57\u5206\u8eab", "      MiRun AI v52.8.4 \u00b7 \u8d8a\u7528\u8d8a\u61c2\u4f60\u7684\u6570\u5b57\u5206\u8eab"),
    ("    var PAGE_VERSION = '52.8.3';", "    var PAGE_VERSION = '52.8.4';"),
    ("      appVersion: 'v52.8.3',", "      appVersion: 'v52.8.4',"),
    ("        version: 'v52.8.3',", "        version: 'v52.8.4',"),
    # SW 引用 4 处
    ("if (ctrlURL.indexOf('sw-v52.8.3.js') === -1", "if (ctrlURL.indexOf('sw-v52.8.4.js') === -1"),
    ("scriptURL.indexOf('sw-v52.8.3.js') !== -1 || existingController.scriptURL.indexOf('service-worker.js')", "scriptURL.indexOf('sw-v52.8.4.js') !== -1 || existingController.scriptURL.indexOf('service-worker.js')"),
    ("register('./sw-v52.8.3.js'", "register('./sw-v52.8.4.js'"),
    ("(reg.active.scriptURL.indexOf('sw-v52.8.3.js') !== -1", "(reg.active.scriptURL.indexOf('sw-v52.8.4.js') !== -1"),
    # versionBadge
    ("pointer-events:none\"\u003ev52.8.3\u003c/div\u003e", "pointer-events:none\"\u003ev52.8.4\u003c/div\u003e"),
]

for f in files:
    with io.open(f, 'r', encoding='utf-8') as fh:
        data = fh.read()
    for old, new in edits:
        cnt = data.count(old)
        print('%s | %d | %s' % (f.split('/')[-1], cnt, old[:50]))
        if cnt != 1:
            print('  !! expected 1, got %d' % cnt)
            sys.exit(1)
        data = data.replace(old, new)
    with io.open(f, 'w', encoding='utf-8') as fh:
        fh.write(data)
print('VERSION UPGRADE OK')