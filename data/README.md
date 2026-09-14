# Data

- `c0.txt` … `c22.txt` — Penal Code offences from the **Criminal Procedure Code 2010 First Schedule** (472 First Schedule rows after decode on 7 Sep 2026, gzip+base64 split). Self-hosted so the app does not depend on third-party repos at runtime.
- `extra.json` — empty stub (`[]`). Live non-PC rows are in `extra-part1.json` … `extra-part6.json` (POHA, MOA, GCA, GEWCA, CESOWA, LCA, Vandalism, DPA, Moneylenders, Computer Misuse, Road Traffic, Public Order Act, Misuse of Drugs Act).
- `pc.json` / `pc-a.json` / `pc.gz.b64` / `pc1.b64` — leftover placeholders; the live loader uses `c0`–`c22` plus extra-part files.

CPC First Schedule updates already encoded in the chunks:

- S 818/2025 (in force 30 Dec 2025): s.420 split into 420(1) and 420(2).
  https://sso.agc.gov.sg/SL-Supp/S818-2025/Published/20251219?DocDate=20251219
- S 42/2026 (in force 30 Jan 2026): third-column “not” deleted (now arrestable) for listed sections including 167, 177 (2nd item), 181, 182, 189, 193, 196–200, 203, 204A, 204B, 205, 218–220, 355, 376B(2), 376C(2) 2nd item, 404.
  https://sso.agc.gov.sg/SL-Supp/S42-2026/Published/20260129?DocDate=20260129
- Act 21 of 2025 s.24 (in force 17 Aug 2026): First Schedule punishment / item changes for PC 195 (first item), 292(1A)/(1B), 292B(1)/(2), 304B, 304C, 376E(4), 376EA(4), 377BD(6)/(7), 401.
  Commencement: https://sso.agc.gov.sg/SL/S555-2026
  Gazette: https://assets.egazette.gov.sg/2025/Legislative%20Supplements/Acts%20Supplement/22.pdf

SSO check on 14 Sep 2026: still no later *Criminal Procedure Code 2010 (Amendment of First Schedule)* Order after S 42/2026. CPC timeline on SSO shows S 42/2026 (30 Jan 2026) then Act 21 of 2025 (17 Aug 2026). Act 5 of 2024 CPC amendments are procedure / FME / disclosure, not First Schedule rows. Act 21 of 2025 s.24 *does* amend the First Schedule; encoded rows that can be quoted from the current Penal Code / Gazette text are kept. No new First Schedule Order found between 7 Sep 2026 and 14 Sep 2026. Earlier 7 Sep 2026 check reached the same conclusion.

Remaining First Schedule gap after Act 21/2025 s.24(b): additional 292 rows (e.g. “any other case” / “2 or more occasions” variants) and 292B / 377BD(6)/(7) labels may exist in the replacement table beyond the encoded 292(1), 292(1A) and 377BD(2)/(3) items. Prefer incomplete accurate rows over invented subsection labels. Decoded chunk count is **472 rows** (not 477).

Spot-check 14 Sep 2026 (CPC First Schedule values in `c0`–`c22`; same as 7 Sep 2026):

- PC 302 Murder — arrestable, warrant, not bailable, death.
- PC 332 VCH to deter public servant — arrestable, warrant, not bailable, 7 years or fine or caning.
- PC 379 Theft — arrestable, warrant, not bailable, 3 years or fine or both.
- PC 420(1)/420(2) present after S 818/2025.
- PC 167 / 182 / 355 arrestable after S 42/2026.

`extra` audit 7 Sep 2026 / 14 Sep 2026:

- Act-specific arrest powers override CPC term defaults (LCA s.30, CMA s.19, POHA s.18, MOA s.40, VA s.6, MA s.86, RTA s.64(13) / s.65(12) / s.67(3) / qualified s.127, **POA s.40**, **MDA s.25**).
- All Liquor Control Act entries remain arrestable under LCSCA s.30 (in officer’s view, any provision). Distinct 14(1) / 14(2) / 14(4) punishments kept and re-checked against the Act text (s.14(2) first: fine ≤ $1,000 or imprisonment ≤ 6 months or both).
- Moneylenders: s.19 and s.47 only are expressly arrestable and non-bailable under MA s.86. s.48 left as “check Act”.
- DPA s.16 / s.17 arrest remains narrowed to the actual s.18 condition.
- POHA s.10 added. s.18(1) is in-view for any provision; s.18(2) also allows arrest without warrant of a person reasonably suspected of s.10(1) in prescribed circumstances.
- `extra-part5.json` Public Order Act 2009: original 15(1), 15(2), 16(1), 16(2), 16(4), 18, 24(4), 25(3), 37, 39 plus 14 Sep 2026 add of special-event ss.26, 27, 28, 31, 32(1), 32(2), 32A. Arrest marked per POA s.40 (in officer’s view, any provision). Remaining organiser-direction / s.21A declaration machinery not indexed (not all are offences).
- New `extra-part6.json` (14 Sep 2026): Misuse of Drugs Act 1973 ss.5, 6, 7, 8(a), 8(b), 8A, 9, 10, 11, 11A, 11B, 30. Arrest marked per MDA s.25 (committed or reasonably suspected — no in-view limit). Trafficking / manufacture / import punishments left as “see Second Schedule” rather than inventing quantity bands. Consumption uses the quoted s.33(3A) scale; s.33A LT bands pointed to SSO.
- MOA s.21 punishment filled from the live Act (fine ≤ $1,000 for s.21(1)).
- RTA 64/65 hurt-tier headings should be confirmed on the live SSO section because Act 2 of 2025 rewrote the section structure.
- No hatsuzuki (or other third-party) runtime dependency. Deep-link fallback in `js/app.js` `showEmpty()` still builds `https://sso.agc.gov.sg/Act/{code}?ProvIds=pr{section}-`.

Always verify against [sso.agc.gov.sg](https://sso.agc.gov.sg).
