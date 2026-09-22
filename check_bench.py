import re

with open('scripts/bench-scan.ts', 'r') as f:
    content = f.read()

js_matches = re.findall(r'from ["\']([^"\']*\.js)["\']', content)
ts_matches = re.findall(r'from ["\']([^"\']*\.ts)["\']', content)
print(f'.js imports: {js_matches}')
print(f'.ts imports: {ts_matches[:5]}')
