import os, re, glob

for f in glob.glob('tests/**/*.ts', recursive=True):
    try:
        with open(f, 'r', encoding='utf-8', errors='replace') as fh:
            content = fh.read()
    except:
        continue
    matches = re.findall(r'from ["\']([^"\']*\.mts)["\']', content)
    if matches:
        for m in matches:
            print(f'{f}: {m}')
