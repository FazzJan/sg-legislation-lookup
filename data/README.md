# Data

- `c0.txt` … `c22.txt` — Penal Code offences from the **Criminal Procedure Code 2010 First Schedule** (472 entries, gzip+base64 split). Self-hosted so the app does not depend on third-party repos at runtime.
- `extra.json` — Curated key sections from other Singapore Acts (POHA, MOA, GCA, GEWCA, CESOWA, LCA, Vandalism, DPA, Moneylenders, Computer Misuse).
- `pc.json` / `pc-a.json` / `pc.gz.b64` / `pc1.b64` — leftover placeholders; the live loader uses `c0`–`c22` only.

CPC First Schedule updates already encoded in the chunks:
- S 818/2025 (in force 30 Dec 2025): s.420 split into 420(1) and 420(2).
  https://sso.agc.gov.sg/SL-Supp/S818-2025/Published/20251219?DocDate=20251219
- S 42/2026 (in force 30 Jan 2026): third-column “not” deleted (now arrestable) for listed sections including 167, 177 (2nd item), 181, 182, 189, 193, 196–200, 203, 204A, 204B, 205, 218–220, 355, 376B(2), 376C(2) 2nd item, 404.
  https://sso.agc.gov.sg/SL-Supp/S42-2026/Published/20260129?DocDate=20260129

SSO check on 31 Aug 2026: no later *Criminal Procedure Code 2010 (Amendment of First Schedule)* Order after S 42/2026. CPC later timeline items (e.g. Act 5 of 2024 / Act 21 of 2025) are not First Schedule amendment orders.

`extra.json` audit 31 Aug 2026:
- Act-specific arrest powers override CPC term defaults (LCA s.30, CMA s.19, POHA s.18, MOA s.40, VA s.6, MA s.86).
- All Liquor Control Act entries are arrestable under LCSCA s.30 (in officer’s view, any provision). Distinct 14(1) / 14(2) / 14(4) punishments kept.
- Moneylenders unlicensed-lending entry corrected from obsolete “5 / 14” to current s.19; arrest/bail via MA s.86 (s.19 and s.47 only).
- DPA s.16 / s.17 arrest narrowed to the actual s.18 condition; punishments taken from current SSO text.

Always verify against [sso.agc.gov.sg](https://sso.agc.gov.sg).
