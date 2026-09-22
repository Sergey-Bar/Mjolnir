import json, subprocess, sys, os

JSON_PATH = r"C:\VS-Code-Projects\Github\QA-Doctor\pr_mjolnir_full.json"

def gh_pr_view(num):
    result = subprocess.run(
        ["gh", "pr", "view", str(num), "--repo", "Sergey-Bar/Mjolnir",
         "--json", "number,title,headRefName,mergeable,files,checks"],
        capture_output=True, text=True
    )
    try:
        return json.loads(result.stdout.strip())
    except:
        return None

def get_pr_files(pr_data):
    if not pr_data: return []
    return [f["path"] for f in pr_data.get("files", [])]

def get_pr_checks(pr_data):
    if not pr_data: return []
    checks = pr_data.get("checks", [])
    return [{"name": c.get("name",""), "status": c.get("status",""), "conclusion": c.get("conclusion","")} for c in checks]

# Load PR list
with open(JSON_PATH, encoding="utf-8-sig") as f:
    prs = json.load(f)

# Categorize
rebrand = [p for p in prs if p["number"] == 195]
mvp_core = [p for p in prs if 458 <= p["number"] <= 476]
milestone = [p for p in prs if 519 <= p["number"] <= 531]

all_prs = rebrand + mvp_core + milestone

print(f"Total PRs to process: {len(all_prs)}")
print()

for p in all_prs:
    num = p["number"]
    details = gh_pr_view(num)
    files = get_pr_files(details) if details else []
    checks = get_pr_checks(details) if details else []
    failed_checks = [c for c in checks if c.get("conclusion") == "FAILURE" or c.get("status") == "FAILED"]
    
    print(f"PR {num}: {p['title']}")
    print(f"  Head: {p['headRefName']} | Mergeable: {p['mergeable']}")
    print(f"  Files ({len(files)}): {', '.join(files[:8])}{'...' if len(files) > 8 else ''}")
    if failed_checks:
        print(f"  FAILED CHECKS: {[c['name'] for c in failed_checks]}")
    if not failed_checks and checks:
        print(f"  Checks: {len(checks)} total, all passing")
    print()
