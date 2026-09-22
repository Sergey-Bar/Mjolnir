import os, re, glob

for f in glob.glob('scripts/**/*.mjs', recursive=True):
    with open(f, 'r', encoding='utf-8', errors='replace') as fh:
        content = fh.read()
    original = content
    content = re.sub(r'from\s+(["\'])([^"\']*\.js)\1', lambda m: f'from {m.group(1)}{m.group(2).replace(".js", ".mts")}{m.group(1)}', content)
    if content != original:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(content)
        print(f'Fixed: {f}')
