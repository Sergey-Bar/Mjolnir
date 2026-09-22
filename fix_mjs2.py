import os, re, glob

# Fix .mts imports to .mjs where the .mjs file exists
for f in glob.glob('tests/**/*.ts', recursive=True):
    with open(f, 'r', encoding='utf-8', errors='replace') as fh:
        content = fh.read()
    original = content
    # Replace .mts with .mjs for specific files
    content = content.replace("../../scripts/brand-doctor.mts", "../../scripts/brand-doctor.mjs")
    content = content.replace("../scripts/compute-release.mts", "../scripts/compute-release.mjs")
    content = content.replace("../scripts/release-changelog.mts", "../scripts/release-changelog.mjs")
    if content != original:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(content)
        print(f'Fixed: {f}')
