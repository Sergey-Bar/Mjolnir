import os, re, glob

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as fh:
        content = fh.read()
    original = content
    content = re.sub(r'from\s+(["\'])([^"\']*\.js)\1', lambda m: f'from {m.group(1)}{m.group(2).replace(".js", ".ts")}{m.group(1)}', content)
    content = re.sub(r'from\s+(["\'])([^"\']*\.mjs)\1', lambda m: f'from {m.group(1)}{m.group(2).replace(".mjs", ".mts")}{m.group(1)}', content)
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as fh:
            fh.write(content)
        print(f'Fixed: {filepath}')

for f in glob.glob('*.ts', recursive=False):
    fix_file(f)
