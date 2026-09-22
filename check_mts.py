import os, re, glob

for f in glob.glob('tests/**/*.ts', recursive=True):
    with open(f, 'r', encoding='utf-8', errors='replace') as fh:
        content = fh.read()
    matches = re.findall(r'from ["\']([^"\']*\.mts)["\']', content)
    if matches:
        for m in matches:
            mjs_path = m.replace('.mts', '.mjs')
            abs_path = os.path.join(os.path.dirname(f), mjs_path)
            if os.path.exists(abs_path):
                print(f'FIX: {m} -> {mjs_path} (in {f})')
            else:
                print(f'KEEP: {m} (in {f})')
