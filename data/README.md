# Data

- `c0.txt` … `c22.txt` — Penal Code offences from the **Criminal Procedure Code 2010 First Schedule** (470 First Schedule rows after decode on 21 Sep 2026, gzip+base64 split; `c22.txt` is a padding stub so `js/app.js` can keep fetching 23 chunks). Self-hosted so the app does not depend on third-party repos at runtime.
- `extra.json` — empty stub (`[]`). Live non-PC rows are in `extra-part1.json` … `extra-part8.json` (POHA, MOA, GCA, GEWCA, CESOWA, LCA, Vandalism, DPA, Moneylenders, Computer Misuse, Road Traffic, Public Order Act, Misuse of Drugs Act, Immigration Act, Maintenance of Racial Harmony Act).
- `pc.json` / `pc-a.json` / `pc.gz.b64` / `pc1.b64` — leftover placeholders; the live loader uses `c0`–`c22` plus extra-part files.

CPC First Schedule updates already encoded in the chunks:

- S 818/2025 (in force 30 Dec 2025): s.420 split into 420(1) and 420(2).
  https://sso.agc.gov.sg/SL-Supp/S818-2025/Published/20251219?DocDate=20251219
- S 42/2026 (in force 30 Jan 2026): third-column “not” deleted (now arrestable) for listed sections including 167, 177 (2nd item), 181, 182, 189, 193, 196–200, 203, 204A, 204B, 205, 218–220, 355, 376B(2), 376C(2) 2nd item, 404.
  https://sso.agc.gov.sg/SL-Supp/S42-2026/Published/20260129?DocDate=20260129
- Act 21 of 2025 s.24 (in force 17 Aug 2026): First Schedule punishment / item changes for PC 195 (first item), 292(1A)/(1B), 292B(1)/(2), 304B, 304C, 376E(4), 376EA(4), 377BD(6)/(7), 401.
  Commencement: https://sso.agc.gov.sg/SL/S555-2026
  Gazette: https://assets.egazette.gov.sg/2025/Legislative%20Supplements/Acts%20Supplement/22.pdf

SSO check on 21 Sep 2026, re-confirmed 24 Sep 2026, 1 Oct 2026 and **5 Oct 2026**: still no later *Criminal Procedure Code 2010 (Amendment of First Schedule)* **Order** after S 42/2026. CPC SL list on SSO (current version as at 28 Sep 2026) shows no new s.427 Order. Do not confuse Registration of Criminals Act First Schedule Orders (S 43/2026, S 259/2026, S 562/2026, etc.) or Online Criminal Harms Act instruments with CPC First Schedule changes. CPC subsidiary-legislation list on SSO, current version as at 5 Oct 2026 (32 results, 2 pages), still has no Criminal Procedure Code 2010 (Amendment of First Schedule) Order after S 42/2026. S 711/2026 is an Infectious Diseases Act schedules notification, not a CPC s.427 Order. Act 10 of 2025 (MRHA) s.48(1)(b), in force 15 Sep 2026, is **not** an s.427 Order but it does amend the CPC First Schedule: it deletes the Chapter 15 heading and the items relating to Penal Code ss.298 and 298A. Those two rows were removed from `c0`–`c22` on 21 Sep 2026 (470 rows). Savings: Act 10 of 2025 s.48(2) keeps the old First Schedule items for offences committed under PC 298 / 298A before 15 Sep 2026.

Remaining First Schedule gap after Act 21/2025 s.24(b): additional 292 rows (e.g. “any other case” / “2 or more occasions” variants) and 292B / 377BD(6)/(7) labels may exist in the replacement table beyond the encoded 292(1), 292(1A) and 377BD(2)/(3) items. Prefer incomplete accurate rows over invented subsection labels. Decoded chunk count is **470 rows** (was 472 before the 298 / 298A deletion).

Spot-check 1 Oct 2026 (CPC First Schedule values in `c0`–`c22` unchanged since 24 Sep 2026 pass):

- PC 302 Murder — arrestable, warrant, not bailable, death.
- PC 332 VCH to deter public servant — arrestable, warrant, not bailable, 7 years or fine or caning.
- PC 379 Theft — arrestable, warrant, not bailable, 3 years or fine or both.
- PC 420(1)/420(2) present after S 818/2025.
- PC 167 / 182 / 355 arrestable after S 42/2026.

`extra` audit 7 Sep 2026 / 14 Sep 2026 / 17 Sep 2026 / 21 Sep 2026 / 24 Sep 2026 / 1 Oct 2026 / **5 Oct 2026**:

- Act-specific arrest powers override CPC term defaults (LCA s.30, CMA s.19, POHA s.18, MOA s.40, VA s.6, MA s.86, RTA s.64(13) / s.65(12) / s.67(3) / qualified s.127, **POA s.40**, **MDA s.25**, **IA s.51(3)**).
- All Liquor Control Act entries remain arrestable under LCSCA s.30 (in officer’s view, any provision). Distinct 14(1) / 14(2) / 14(4) punishments kept. s.14(2) first: fine ≤ $1,000 or imprisonment ≤ 6 months or both.
- No hatsuzuki (or other third-party) runtime dependency. Deep-link fallback in `js/app.js` `showEmpty()` still builds `https://sso.agc.gov.sg/Act/{code}?ProvIds=pr{section}-`.
- `extra-part8.json` (21 Sep 2026 + 1 Oct 2026 + 5 Oct 2026): MRHA ss.39 and 40 plus **s.7(1)(a), s.7(1)(b)–(d), s.7(1)(e)–(f), s.10, s.21, s.26, s.29, s.30**, and S 600/2026 **r.26, r.27, r.28, r.29 and Schedule para 13(2)**. No Act-wide police arrest-without-warrant clause found; arrest/bail marked on CPC term defaults. s.39/s.40 require PP consent (s.44). S 600/2026 r.26–r.29 are prescribed for s.22 (fine only). Schedule para 13(2) is compoundable (S 602/2026 reg 2(c)). Remaining unindexed MRHA machinery includes S 599/2026 restraining-order regulations and other S 600/2026 machinery that is not itself an offence.

Always verify against [sso.agc.gov.sg](https://sso.agc.gov.sg).
