# Data

- `c0.txt` … `c22.txt` — Penal Code offences from the **Criminal Procedure Code 2010 First Schedule** (472 entries, gzip+base64 split). Self-hosted so the app does not depend on third-party repos at runtime.
- `extra.json` — Curated key sections from other Singapore Acts (POHA, MOA, GCA, GEWCA, CESOWA, LCA, Vandalism, DPA, Moneylenders, Computer Misuse).
- `pc.json` / `pc-a.json` / `pc.gz.b64` / `pc1.b64` — leftover placeholders; the live loader uses `c0`–`c22` only.

CPC First Schedule updates already encoded in the chunks:
- S 818/2025 (in force 30 Dec 2025): s.420 split into 420(1) and 420(2).
- S 42/2026 (in force 30 Jan 2026): third-column “not” deleted (now arrestable) for listed sections including 167, 177 (2nd item), 181, 182, 189, 193, 196–200, 203, 204A, 204B, 205, 218–220, 355, 376B(2), 376C(2) 2nd item, 404.

Always verify against [sso.agc.gov.sg](https://sso.agc.gov.sg).
