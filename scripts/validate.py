#!/usr/bin/env python3
"""Validate the offence data and flag rows that look inconsistent with the CPC 2010 rules.

Errors (exit 1): broken JSON, missing fields, bad enum values, unknown files.
Warnings: rows whose arrest/bail status disagrees with the CPC First Schedule
"offences against other laws" default and no Act-specific power explains it.

    python3 scripts/validate.py          # errors + warnings
    python3 scripts/validate.py --quiet  # errors only
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / "data"
ARREST = {"yes", "no", "conditional", "depends", "check"}
BAIL = {"yes", "no", "depends", "check"}
REQUIRED = ("section", "offence", "arrest", "bail", "punishment")
errors, warnings = [], []


def max_years(text):
    """Largest imprisonment term (years) for a first offence, or None if unclear.

    Repeat-offender tiers are ignored: the CPC default is read off the punishment
    the offence carries, and repeat tiers are flagged separately in the data.
    """
    t = text.lower()
    t = re.split(r"repeat|subsequent|second or", t)[0]
    if re.search(r"(^|punish\w* with |sentence\w* to |liable to |: )death|imprisonment for life|life imprisonment", t):
        return 99
    best = None
    for n, unit in re.findall(r"(\d+(?:\.\d+)?)\s*(year|month|week|day)", t):
        v = float(n) / {"year": 1, "month": 12, "week": 52, "day": 365}[unit]
        best = v if best is None else max(best, v)
    if best is None and "fine" in t and "imprison" not in t:
        return 0
    return best


acts = json.loads((ROOT / "acts.json").read_text())
ids = set()
for act in acts:
    for key in ("id", "code", "name", "short", "arrestPower"):
        if key not in act:
            errors.append(f"acts.json: {act.get('id')} missing {key}")
    ids.add(act["id"])
    path = ROOT / "acts" / f"{act['id']}.json"
    if not path.exists():
        errors.append(f"{path.name}: listed in acts.json but missing")
        continue
    try:
        rows = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        errors.append(f"{path.name}: invalid JSON ({e})")
        continue
    if not isinstance(rows, list) or not rows:
        errors.append(f"{path.name}: must be a non-empty array")
        continue
    seen = set()
    for i, r in enumerate(rows):
        where = f"{act['id']} s.{r.get('section', '?')}"
        for k in REQUIRED:
            if not str(r.get(k, "")).strip():
                errors.append(f"{where}: empty '{k}' (row {i})")
        if r.get("arrest") not in ARREST:
            errors.append(f"{where}: arrest must be one of {sorted(ARREST)}")
        if r.get("bail") not in BAIL:
            errors.append(f"{where}: bail must be one of {sorted(BAIL)}")
        if "$(" in json.dumps(r) or "PLACEHOLDER" in json.dumps(r):
            errors.append(f"{where}: contains unexpanded shell text / placeholder")
        key = (r.get("section"), r.get("offence"))
        if key in seen:
            errors.append(f"{where}: duplicate row")
        seen.add(key)

        # CPC default consistency (not for the Penal Code, which has its own schedule rows)
        if act["id"] == "PC1871":
            continue
        yrs = max_years(r.get("punishment", ""))
        if yrs is None:
            continue
        default_arrest = "yes" if yrs >= 3 else "no"
        default_bail = "no" if yrs >= 3 else "yes"
        power = act["arrestPower"]["type"]
        if power == "none" and r["arrest"] in ("yes", "no") and r["arrest"] != default_arrest:
            warnings.append(f"{where}: arrest={r['arrest']} but CPC default for max {yrs:g}y is {default_arrest} and the Act has no arrest override")
        if r["bail"] in ("yes", "no") and r["bail"] != default_bail and power != "all" and not r.get("bailBasis"):
            warnings.append(f"{where}: bail={r['bail']} but CPC default for max {yrs:g}y is {default_bail} — confirm an Act-specific bail rule")

for f in (ROOT / "acts").glob("*.json"):
    if f.stem not in ids:
        errors.append(f"{f.name}: not listed in acts.json")

for e in errors:
    print("ERROR  ", e)
if "--quiet" not in sys.argv:
    for w in warnings:
        print("WARN   ", w)
total = sum(len(json.loads((ROOT / "acts" / f"{a['id']}.json").read_text())) for a in acts if (ROOT / "acts" / f"{a['id']}.json").exists())
print(f"\n{len(acts)} statutes, {total} rows, {len(errors)} errors, {len(warnings)} warnings")
sys.exit(1 if errors else 0)
