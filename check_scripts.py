#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, subprocess, sys

path = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
src = open(path, encoding='utf-8').read()

# find all <script ...>...</script>
pat = re.compile(r'<script[^>]*>(.*?)</script>', re.S)
blocks = pat.findall(src)
ok = True
count = 0
for i, b in enumerate(blocks):
    # skip scripts with src (no inline body)
    if not b.strip():
        continue
    count += 1
    p = subprocess.run(['node', '--check', '-'], input=b.encode('utf-8'),
                       capture_output=True)
    if p.returncode != 0:
        ok = False
        print('SCRIPT #%d FAILED:' % i)
        print(p.stderr.decode('utf-8', 'replace')[:2000])
    else:
        print('script #%d OK (%d bytes)' % (i, len(b)))
print('total inline scripts checked:', count)
sys.exit(0 if ok else 1)