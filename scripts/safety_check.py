#!/usr/bin/env python3
"""Guard rails before an automated change is merged without review.

Compares the data at BASE (e.g. origin/main) with the working tree and fails if:
- any file under data/, Sources/, js/, css/ or index.html was deleted;
- any data/acts/*.json lost more than 5% of its rows, or any statute disappeared;
- the number of charge templates or NPC boundary features went down;
- any data file is empty or contains shell placeholders like $(cat ...).

    python3 scripts/safety_check.py origin/main
"""
import json, subprocess, sys, pathlib

base = sys.argv[1] if len(sys.argv) > 1 else "origin/main"
root = pathlib.Path(__file__).resolve().parent.parent
fail = []

def at_base(path):
    try:
        return subprocess.check_output(["git", "show", f"{base}:{path}"], cwd=root, stderr=subprocess.DEVNULL).decode()
    except subprocess.CalledProcessError:
        return None

diff = subprocess.check_output(["git", "diff", "--name-status", base, "--"], cwd=root).decode().splitlines()
for line in diff:
    status, *paths = line.split("\t")
    if status.startswith("D") and paths and paths[0].startswith(("data/", "Sources/", "js/", "css/", "index.html")):
        fail.append(f"deleted: {paths[0]}")

old_acts = json.loads(at_base("data/acts.json") or "[]")
new_acts = json.loads((root / "data/acts.json").read_text())
new_ids = {a["id"] for a in new_acts}
for a in old_acts:
    if a["id"] not in new_ids:
        fail.append(f"statute removed from acts.json: {a['id']}")
        continue
    old = json.loads(at_base(f"data/acts/{a['id']}.json") or "[]")
    new = json.loads((root / f"data/acts/{a['id']}.json").read_text())
    if len(new) < len(old) * 0.95:
        fail.append(f"{a['id']}: rows dropped from {len(old)} to {len(new)}")

def count(path, key):
    txt = at_base(path)
    old = len(json.loads(txt)[key]) if txt else 0
    new = len(json.loads((root / path).read_text())[key])
    if new < old:
        fail.append(f"{path}: {key} dropped from {old} to {new}")

count("data/guides/charges.json", "templates")
count("data/geo/npc.json", "features")

for f in (root / "data").rglob("*.json"):
    t = f.read_text()
    if not t.strip():
        fail.append(f"empty file: {f.relative_to(root)}")
    if "$(" in t or "PLACEHOLDER" in t:
        fail.append(f"shell placeholder text in {f.relative_to(root)}")

for m in fail:
    print("BLOCKED:", m)
print("safety check:", "FAILED" if fail else "passed")
sys.exit(1 if fail else 0)
