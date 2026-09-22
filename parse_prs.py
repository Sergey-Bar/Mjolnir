import json

with open("pr_mjolnir_full.json") as f:
    data = json.load(f)

for p in data:
    files = [f["path"] for f in p.get("files", [])]
    print(f"{p['number']}: {p['title']}")
    print(f"  Head: {p['headRefName']} | Mergeable: {p['mergeable']}")
    print(f"  Files: {', '.join(files[:10])}{'...' if len(files) > 10 else ''}")
    print()
