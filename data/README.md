# Data

- `c0.txt` … `c22.txt` — Penal Code offences from the **Criminal Procedure Code 2010 First Schedule** (470 First Schedule rows after decode on 21 Sep 2026, gzip+base64 split; `c22.txt` is a padding stub so `js/app.js` can keep fetching 23 chunks). Self-hosted so the app does not depend on third-party repos at runtime.
- `extra.json` — empty stub (`[]`). Live non-PC rows are in `extra-part1.json` … `extra-part9.json` (POHA, MOA, GCA, GEWCA, CESOWA, LCA, Vandalism, DPA, Moneylenders, Computer Misuse, Road Traffic, Public Order Act, Misuse of Drugs Act, Immigration Act, Maintenance of Racial Harmony Act, Women's Charter 1961).
- `pc.json` / `pc-a.json` / `pc.gz.b64` / `pc1.b64` — leftover placeholders; the live loader uses `c0`–`c22` plus extra-part files.

CPC First Schedule updates already encoded in the chunks:

- S 818/2025 (in force 30 Dec 2025): s.420 split into 420(1) and 420(2).
  https://sso.agc.gov.sg/SL-Supp/S818-2025/Published/20251219?DocDate=20251219
- S 42/2026 (in force 30 Jan 2026): third-column “not” deleted (now arrestable) for listed sections including 167, 177 (2nd item), 181, 182, 189, 193, 196–200, 203, 204A, 204B, 205, 218–220, 355, 376B(2), 376C(2) 2nd item, 404.
  https://sso.agc.gov.sg/SL-Supp/S42-2026/Published/20260129?DocDate=20260129
- Act 21 of 2025 s.24 (in force 17 Aug 2026): First Schedule punishment / item changes for PC 195 (first item), 292(1A)/(1B), 292B(1)/(2), 304B, 304C, 376E(4), 376EA(4), 377BD(6)/(7), 401.
  Commencement: https://sso.agc.gov.sg/SL/S555-2026
  Gazette: https://assets.egazette.gov.sg/2025/Legislative%20Supplements/Acts%20Supplement/22.pdf

SSO check on 21 Sep 2026, re-confirmed 24 Sep 2026, 1 Oct 2026, 5 Oct 2026, 8 Oct 2026, 12 Oct 2026, 15 Oct 2026, 19 Oct 2026 and **22 Oct 2026**: still no later *Criminal Procedure Code 2010 (Amendment of First Schedule)* **Order** after S 42/2026. CPC current version as at 22 Oct 2026 confirms no further s.427 Order. Chunks `c0`–`c22` unchanged.

`extra` audit / expansion **22 Oct 2026**:
- LCA entries (extra-part3) re-confirmed: all arrestable per LCSCA s.30 (any provision, in officer’s view). Distinct 14(1) (fine ≤$1,000 or ≤1 month) and 14(2) (fine ≤$1,000 or ≤6 months) kept. No CPC-default-only rows.
- GEWCA expanded previously: ss.16, 18, 19, 20, 21, 30, 36, 37. All Part 2 offences marked arrestable per GEWCA s.40 (overrides term defaults).
- RTA expanded: added s.63(4) speeding and additional common variants. Arrest powers follow Act-specific (s.64(13), s.65(12), s.67(3)) or qualified s.127; CPC defaults applied only where no Act override.
- Spot-checks: PC 302/332/379 match First Schedule (arrestable, warrant, not bailable). Deep-link fallback in app.js intact. No hatsuzuki dependency.

Remaining gaps: full MRHA regulations, additional WC Part 11 subsections, more RTA sections (speed, mobile device already partial), fuller GEWCA Part 2 offences (further sections pending verified penalties from SSO), additional explosives/weapons trade sections. Always verify on SSO.

Always verify against [sso.agc.gov.sg](https://sso.agc.gov.sg).
