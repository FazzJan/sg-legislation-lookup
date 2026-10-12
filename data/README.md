# Data

- `c0.txt` \u2026 `c22.txt` \u2014 Penal Code offences from the **Criminal Procedure Code 2010 First Schedule** (470 First Schedule rows after decode on 21 Sep 2026, gzip+base64 split; `c22.txt` is a padding stub so `js/app.js` can keep fetching 23 chunks). Self-hosted so the app does not depend on third-party repos at runtime.
- `extra.json` \u2014 empty stub (`[]`). Live non-PC rows are in `extra-part1.json` \u2026 `extra-part9.json` (POHA, MOA, GCA, GEWCA, CESOWA, LCA, Vandalism, DPA, Moneylenders, Computer Misuse, Road Traffic, Public Order Act, Misuse of Drugs Act, Immigration Act, Maintenance of Racial Harmony Act, Women's Charter 1961).
- `pc.json` / `pc-a.json` / `pc.gz.b64` / `pc1.b64` \u2014 leftover placeholders; the live loader uses `c0`\u2013`c22` plus extra-part files.

CPC First Schedule updates already encoded in the chunks:

- S 818/2025 (in force 30 Dec 2025): s.420 split into 420(1) and 420(2).
  https://sso.agc.gov.sg/SL-Supp/S818-2025/Published/20251219?DocDate=20251219
- S 42/2026 (in force 30 Jan 2026): third-column \u201cnot\u201d deleted (now arrestable) for listed sections including 167, 177 (2nd item), 181, 182, 189, 193, 196\u2013200, 203, 204A, 204B, 205, 218\u2013220, 355, 376B(2), 376C(2) 2nd item, 404.
  https://sso.agc.gov.sg/SL-Supp/S42-2026/Published/20260129?DocDate=20260129
- Act 21 of 2025 s.24 (in force 17 Aug 2026): First Schedule punishment / item changes for PC 195 (first item), 292(1A)/(1B), 292B(1)/(2), 304B, 304C, 376E(4), 376EA(4), 377BD(6)/(7), 401.
  Commencement: https://sso.agc.gov.sg/SL/S555-2026
  Gazette: https://assets.egazette.gov.sg/2025/Legislative%20Supplements/Acts%20Supplement/22.pdf

SSO check on 21 Sep 2026, re-confirmed 24 Sep 2026, 1 Oct 2026, 5 Oct 2026, 8 Oct 2026 and **12 Oct 2026**: still no later *Criminal Procedure Code 2010 (Amendment of First Schedule)* **Order** after S 42/2026. CPC current version as at 12 Oct 2026 confirms no further s.427 Order. Chunks `c0`\u2013`c22` unchanged.

`extra` audit / expansion **12 Oct 2026**:
- LCA entries (extra-part3) re-confirmed: all arrestable per LCSCA s.30 (any provision, in officer\u2019s view). Distinct 14(1) (fine \u2264$1,000 or \u22641 month) and 14(2) (fine \u2264$1,000 or \u22646 months) kept. No CPC-default-only rows.
- Expanded Women's Charter 1961 (extra-part9): added Part 11 offences s.140, s.141, s.142, s.145, s.146, s.146A. Arrestable via WC s.174(1) (Director-General / authorised officers may arrest person reasonably believed liable to prosecution for listed sections \u2014 not limited to in-view; overrides CPC term defaults). Punishments taken from SSO (e.g. s.140/141/146: 7 years + $100k fine; repeat 10 years + $150k). Prefer accurate incomplete over invented.
- Spot-checks: PC 302/332/379 match First Schedule (arrestable, warrant, not bailable). Deep-link fallback in app.js intact. No hatsuzuki dependency.

Remaining gaps: full MRHA regulations, additional WC Part 11 subsections (e.g. exact 142/146A penalties), other under-indexed Acts (e.g. more RTA, GEWCA). Always verify on SSO.

Always verify against [sso.agc.gov.sg](https://sso.agc.gov.sg).
