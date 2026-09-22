import json
import subprocess
import sys

def run_gh(args):
    result = subprocess.run(["gh"] + args, capture_output=True, text=True)
    return result.stdout.strip()

def get_pr_details(pr_number):
    """Get detailed PR info including files, checks, and merge status"""
    json_str = run_gh(["pr", "view", str(pr_number), "--repo", "Sergey-Bar/Mjolnir", "--json", "number,title,headRefName,mergeable,state,createdAt,author,baseRefName,maintainerCanModify,files,checks,reviewDecision"])
    try:
        return json.loads(json_str)
    except:
        return None

def get_pr_files(pr_number):
    """Get files changed in PR"""
    json_str = run_gh(["pr", "view", str(pr_number), "--repo", "Sergey-Bar/Mjolnir", "--json", "files"])
    try:
        data = json.loads(json_str)
        return [f["path"] for f in data.get("files", [])]
    except:
        return []

def get_pr_checks(pr_number):
    """Get check status for PR"""
    json_str = run_gh(["pr", "view", str(pr_number), "--repo", "Sergey-Bar/Mjolnir", "--json", "checks"])
    try:
        data = json.loads(json_str)
        checks = data.get("checks", [])
        return [{"name": c.get("name",""), "status": c.get("status",""), "conclusion": c.get("conclusion","")} for c in checks]
    except:
        return []

# Load PRs from the saved JSON
with open("pr_mjolnir_full.json", encoding="utf-8-sig") as f:
    prs = json.load(f)

# Also get QA-Doctor PRs
with open("pr_qadoctor_full.json", encoding="utf-8-sig") as f:
    qa_prs = json.load(f)

# Combine and deduplicate by number
all_prs = {}
for p in prs + qa_prs:
    all_prs[p["number"]] = p

# Sort by number
sorted_prs = sorted(all_prs.values(), key=lambda x: x["number"])

print(f"Total unique PRs: {len(sorted_prs)}")
print()

# Categorize
batches = {
    "rebrand": [],
    "mvp_core": [],
    "milestone_specs": [],
    "small_fixes": [],
    "deferred": []
}

for p in sorted_prs:
    num = p["number"]
    title = p["title"]
    head = p["headRefName"]
    mergeable = p["mergeable"]
    
    if num == 195:
        batches["rebrand"].append(p)
    elif 458 <= num <= 476:
        batches["mvp_core"].append(p)
    elif 519 <= num <= 531:
        batches["milestone_specs"].append(p)
    elif num in [458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476]:
        batches["mvp_core"].append(p)
    else:
        batches["small_fixes"].append(p)

print("=== BATCH 1: REBRAND ===")
for p in batches["rebrand"]:
    print(f"  PR {p['number']}: {p['title']} | {p['mergeable']}")

print()
print("=== BATCH 2: MVP/CORE UX (458-476) ===")
for p in batches["mvp_core"]:
    print(f"  PR {p['number']}: {p['title']} | {p['mergeable']}")

print()
print("=== BATCH 3: MILESTONE SPECS (519-531) ===")
for p in batches["milestone_specs"]:
    print(f"  PR {p['number']}: {p['title']} | {p['mergeable']}")

print()
print("=== BATCH 4: OTHER PRs ===")
for p in batches["small_fixes"]:
    print(f"  PR {p['number']}: {p['title']} | {p['mergeable']}")
