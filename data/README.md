# Data

- `c0.txt` … `c22.txt` — Penal Code offences from the **Criminal Procedure Code 2010 First Schedule** (477 entries after 3 Sep 2026 update, gzip+base64 split). Self-hosted so the app does not depend on third-party repos at runtime.
- `extra.json` — empty stub (`[]`). Live non-PC rows are in `extra-part1.json` … `extra-part4.json` (POHA, MOA, GCA, GEWCA, CESOWA, LCA, Vandalism, DPA, Moneylenders, Computer Misuse, Road Traffic).
- `pc.json` / `pc-a.json` / `pc.gz.b64` / `pc1.b64` — leftover placeholders; the live loader uses `c0`–`c22` plus extra-part files.

CPC First Schedule updates already encoded in the chunks:

- S 818/2025 (in force 30 Dec 2025): s.420 split into 420(1) and 420(2).
  https://sso.agc.gov.sg/SL-Supp/S818-2025/Published/20251219?DocDate=20251219
- S 42/2026 (in force 30 Jan 2026): third-column “not” deleted (now arrestable) for listed sections including 167, 177 (2nd item), 181, 182, 189, 193, 196–200, 203, 204A, 204B, 205, 218–220, 355, 376B(2), 376C(2) 2nd item, 404.
  https://sso.agc.gov.sg/SL-Supp/S42-2026/Published/20260129?DocDate=20260129
- Act 21 of 2025 s.24 (in force 17 Aug 2026): First Schedule punishment / item changes for PC 195 (first item), 292(1A)/(1B), 292B(1)/(2), 304B, 304C, 376E(4), 376EA(4), 377BD(6)/(7), 401.
  Commencement: https://sso.agc.gov.sg/SL/S555-2026
  Gazette: https://assets.egazette.gov.sg/2025/Legislative%20Supplements/Acts%20Supplement/22.pdf

SSO check on 3 Sep 2026: no later *Criminal Procedure Code 2010 (Amendment of First Schedule)* Order after S 42/2026. Act 5 of 2024 CPC amendments are procedure / FME / disclosure, not First Schedule rows. Act 21 of 2025 s.24 *does* amend the First Schedule and is encoded for the rows that could be quoted from the Gazette / current Penal Code text.

Remaining First Schedule gap after Act 21/2025 s.24(b): additional 292 rows (e.g. “any other case” / “2 or more occasions” variants) may exist in the replacement table beyond 292(1A) and 292(1B). Prefer incomplete accurate rows over invented subsection labels.

`extra` audit 3 Sep 2026:

- Act-specific arrest powers override CPC term defaults (LCA s.30, CMA s.19, POHA s.18, MOA s.40, VA s.6, MA s.86, RTA s.64(13) / s.65(12) / s.67(3) / qualified s.127).
- All Liquor Control Act entries remain arrestable under LCSCA s.30 (in officer’s view, any provision). Distinct 14(1) / 14(2) / 14(4) punishments kept and re-checked against the Act text.
- Moneylenders: s.19 and s.47 only are expressly arrestable and non-bailable under MA s.86. s.48 left as “check Act”.
- DPA s.16 / s.17 arrest remains narrowed to the actual s.18 condition.
- New `extra-part4.json`: Road Traffic Act 1961 ss.64(5), 64(2), 64(3), 65(5), 65(2), 65B, 67, 68, 84, 127. RTA 64/65 hurt-tier headings should be confirmed on the live SSO section because Act 2 of 2025 rewrote the section structure.

Always verify against [sso.agc.gov.sg](https://sso.agc.gov.sg).
