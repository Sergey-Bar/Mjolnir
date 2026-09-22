import subprocess, os

# Get all files in scripts/ from git
result = subprocess.run(['git', 'ls-tree', '-r', '--name-only', 'HEAD:scripts/'], capture_output=True, text=True)
files = result.stdout.strip().split('\n')

for f in files:
    if not f:
        continue
    dir_path = os.path.dirname(f)
    if dir_path and not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)
    result = subprocess.run(['git', 'show', f'HEAD:{f}'], capture_output=True)
    with open(f, 'wb') as out:
        out.write(result.stdout)
    print(f'Extracted: {f}')

print(f'Done. Extracted {len(files)} files.')
