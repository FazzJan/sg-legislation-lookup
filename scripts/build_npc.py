#!/usr/bin/env python3
"""Build data/geo/npc.json from Sources/SingaporePoliceForceNPCBoundary.geojson.

Simplifies each ring (Douglas-Peucker, ~1 m tolerance) and rounds to 6 decimals
so the app stays small. Run again whenever the source file is replaced.
"""
import json, math, pathlib, datetime
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "Sources" / "SingaporePoliceForceNPCBoundary.geojson"
OUT = ROOT / "data" / "geo" / "npc.json"
TOL = 0.00001  # degrees, about 1.1 m

def dp(pts, tol):
    if len(pts) < 5:
        return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        L = dx * dx + dy * dy
        best, idx = 0.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if L == 0:
                d = math.hypot(px - x1, py - y1)
            else:
                t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / L))
                d = math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
            if d > best:
                best, idx = d, i
        if best > tol and idx > 0:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]

src = json.loads(SRC.read_text())
feats, before, after = [], 0, 0
for f in src["features"]:
    g = f["geometry"]
    polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    out = []
    for poly in polys:
        rings = []
        for ring in poly:
            before += len(ring)
            r = [[round(x, 6), round(y, 6)] for x, y in dp([tuple(p[:2]) for p in ring], TOL)]
            if len(r) >= 4:
                rings.append(r); after += len(r)
        if rings:
            out.append(rings)
    p = f["properties"]
    feats.append({"npc": p.get("NPC_NAME"), "division": p.get("DIVISION"), "div": p.get("DIV"), "polys": out})
upd = max((f["properties"].get("FMEL_UPD_D") or "") for f in src["features"])
meta = {"source": "data.gov.sg — Singapore Police Force NPC Boundary (d_89b44df21fccc4f51390eaff16aa1fe8)",
        "sourceUpdated": f"{upd[6:8]}/{upd[4:6]}/{upd[0:4]}" if len(upd) >= 8 else "",
        "built": datetime.date.today().strftime("%d/%m/%Y"), "features": feats}
OUT.write_text(json.dumps(meta, separators=(",", ":")))
print(f"{len(feats)} features, {before} -> {after} points, {OUT.stat().st_size/1e6:.2f} MB, source updated {meta['sourceUpdated']}")
