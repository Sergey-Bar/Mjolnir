import os, re, glob

# Find all .js imports in test files and check if .ts version exists
for f in glob.glob('tests/**/*.ts', recursive=True):
    with open(f, 'r', encoding='utf-8', errors='replace') as fh:
        content = fh.read()
    matches = re.findall(r'from ["\']([^"\']*\.(?:js|mjs))["\']', content)
    if matches:
        for m in matches:
            ts_path = m.replace('.js', '.ts').replace('.mjs', '.mts')
            # Resolve relative to the test file's directory
            abs_ts = os.path.join(os.path.dirname(f), ts_path)
            if os.path.exists(abs_ts):
                print(f'EXISTS: {m} -> {ts_path}')
            else:
                print(f'MISSING: {m} -> {ts_path}')
