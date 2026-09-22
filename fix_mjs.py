import os, re, glob

# Files in scripts/ that are .mjs (not .mts)
mjs_files = set()
for f in glob.glob('scripts/**/*', recursive=True):
    if f.endswith('.mjs'):
        mjs_files.add(os.path.basename(f))

print(f"MJS files in scripts/: {mjs_files}")

# Fix test files that import .mts but should import .mjs
for f in glob.glob('tests/**/*.ts', recursive=True):
    with open(f, 'r', encoding='utf-8', errors='replace') as fh:
        content = fh.read()
    original = content
    # Replace .mts imports with .mjs for files that are actually .mjs
    for mjs_name in mjs_files:
        content = content.replace(f"'{mjs_name.replace('.mjs', '.mts')}'", f"'{mjs_name}'")
        content = content.replace(f'"{mjs_name.replace(".mjs", ".mts")}"', f'"{mjs_name}"')
    if content != original:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(content)
        print(f'Fixed: {f}')
