import os, re, glob

for f in glob.glob('*.ts'):
    with open(f, 'r', encoding='utf-8', errors='replace') as fh:
        content = fh.read()
    js_matches = re.findall(r'from ["\']([^"\']*\.js)["\']', content)
    if js_matches:
        print(f'{f}: {js_matches}')
