import subprocess, os

# Get all files in scripts/ from git
result = subprocess.run(['git', 'ls-tree', '-r', '--name-only', 'HEAD:scripts/'], capture_output=True, text=True)
files = [f for f in result.stdout.strip().split('\n') if f]

for f in files:
    dir_path = os.path.dirname(f)
    if dir_path and not os.path.exists(dir_path):
        os.makedirs(dir_path, exist_ok=True)
    
    result = subprocess.run(['git', 'show', f'HEAD:{f}'], capture_output=True)
    if result.returncode == 0:
        with open(f, 'wb') as out:
            out.write(result.stdout)
    else:
        print(f'FAILED: {f}')

print(f'Done. {len(files)} files processed.')
print(f'Files in scripts/: {len(os.listdir("scripts/"))}')
