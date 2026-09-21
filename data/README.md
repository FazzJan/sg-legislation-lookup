# Data

- `c0.txt` \u2026 `c22.txt` \u2014 Penal Code offences from the **Criminal Procedure Code 2010 First Schedule** (470 First Schedule rows after decode on 21 Sep 2026, gzip+base64 split; `c22.txt` is a padding stub so `js/app.js` can keep fetching 23 chunks). Self-hosted so the app does not depend on third-party repos at runtime.
- `extra.json` \u2014 empty stub (`[]`). Live non-PC rows are in `extra-part1.json` \u2026 `extra-part8.json` (POHA, MOA, GCA, GEWCA, CESOWA, LCA, Vandalism, DPA, Moneylenders, Computer Misuse, Road Traffic, Public Order Act, Misuse of Drugs Act, Immigration Act, Maintenance of Racial Harmony Act).
- `pc.json` / `pc-a.json` / `pc.gz.b64` / `pc1.b64` \u2014 leftover placeholders; the live loader uses `c0`\u2013`c22` plus extra-part files.

CPC First Schedule updates already encoded in the chunks:

- S 818/2025 (in force 30 Dec 2025): s.420 split into 420(1) and 420(2).
  https://sso.agc.gov.sg/SL-Supp/S818-2025/Published/20251219?DocDate=20251219
- S 42/2026 (in force 30 Jan 2026): third-column \u201cnot\u201d deleted (now arrestable) for listed sections including 167, 177 (2nd item), 181, 182, 189, 193, 196\u2013200, 203, 204A, 204B, 205, 218\u2013220, 355, 376B(2), 376C(2) 2nd item, 404.
  https://sso.agc.gov.sg/SL-Supp/S42-2026/Published/20260129?DocDate=20260129
- Act 21 of 2025 s.24 (in force 17 Aug 2026): First Schedule punishment / item changes for PC 195 (first item), 292(1A)/(1B), 292B(1)/(2), 304B, 304C, 376E(4), 376EA(4), 377BD(6)/(7), 401.
  Commencement: https://sso.agc.gov.sg/SL/S555-2026
  Gazette: https://assets.egazette.gov.sg/2025/Legislative%20Supplements/Acts%20Supplement/22.pdf

SSO check on 21 Sep 2026: still no later *Criminal Procedure Code 2010 (Amendment of First Schedule)* **Order** after S 42/2026. CPC timeline on SSO shows S 818/2025 (30 Dec 2025), S 42/2026 (30 Jan 2026), Act 21 of 2025 (17 Aug 2026), then Act 10 of 2025 (15 Sep 2026). Act 5 of 2024 CPC amendments remain procedure / FME / disclosure, not First Schedule rows. Act 21 of 2025 s.24 *does* amend the First Schedule; encoded rows that can be quoted from the current Penal Code / Gazette text are kept.

Act 10 of 2025 (Maintenance of Racial Harmony Act 2025) s.48(1)(b), in force 15 Sep 2026, is **not** an s.427 Order but it does amend the CPC First Schedule: it deletes the Chapter 15 heading and the items relating to Penal Code ss.298 and 298A. Those two rows were removed from `c0`\u2013`c22` on 21 Sep 2026 (470 rows). Savings: Act 10 of 2025 s.48(2) keeps the old First Schedule items for offences committed under PC 298 / 298A before 15 Sep 2026 \u2014 use the live SSO historical view / Act text for those legacy charges. Replacing offences are MRHA ss.39 and 40 (see `extra-part8.json`).

Do not confuse other 2026 \u201cAmendment of First Schedule\u201d instruments (e.g. Registration of Criminals Act S 43/2026, S 259/2026, S 423/2026, S 562/2026, S 608/2026; Online Criminal Harms Act S 257/2026) with CPC First Schedule changes.

Remaining First Schedule gap after Act 21/2025 s.24(b): additional 292 rows (e.g. \u201cany other case\u201d / \u201c2 or more occasions\u201d variants) and 292B / 377BD(6)/(7) labels may exist in the replacement table beyond the encoded 292(1), 292(1A) and 377BD(2)/(3) items. Prefer incomplete accurate rows over invented subsection labels. Decoded chunk count is **470 rows** (was 472 before the 298 / 298A deletion).

Spot-check 21 Sep 2026 (CPC First Schedule values in `c0`\u2013`c22`):

- PC 302 Murder \u2014 arrestable, warrant, not bailable, death.
- PC 332 VCH to deter public servant \u2014 arrestable, warrant, not bailable, 7 years or fine or caning.
- PC 379 Theft \u2014 arrestable, warrant, not bailable, 3 years or fine or both.
- PC 420(1)/420(2) present after S 818/2025.
- PC 167 / 182 / 355 arrestable after S 42/2026.

`extra` audit 7 Sep 2026 / 14 Sep 2026 / 17 Sep 2026 / 21 Sep 2026:

- Act-specific arrest powers override CPC term defaults (LCA s.30, CMA s.19, POHA s.18, MOA s.40, VA s.6, MA s.86, RTA s.64(13) / s.65(12) / s.67(3) / qualified s.127, **POA s.40**, **MDA s.25**, **IA s.51(3)**).
- All Liquor Control Act entries remain arrestable under LCSCA s.30 (in officer\u2019s view, any provision). Distinct 14(1) / 14(2) / 14(4) punishments kept and re-checked against the Act text (s.14(2) first: fine \u2264 $1,000 or imprisonment \u2264 6 months or both).
- `extra-part7.json`: Immigration Act 1959 ss.5, 6(1), 6(2), 9(5), 15(3)(a), 15(3)(b), 36, 57(1)(a), 57(1)(aa), 57(1)(b), 57(1)(c), 57(1)(d)(i)/(ii), 57(1)(d)(iii), 57(1)(e), 57(1)(f)\u2013(j), 57(1)(k), 57(1)(ka), 57(1)(l), 57(1)(m), 57(1)(n), 57A, 57B, 57C, 57D(1). Arrest marked per IA s.51(3) (reasonably believes \u2014 no in-view limit). 21 Sep 2026 pass added the remaining s.57(1) document / false-information / instrument limbs and s.57D(1). s.57D(2) and s.57D(4) manufacture/sale are noted on the s.57D(1) row rather than fully split. Remaining unindexed IA offence machinery includes some s.57 supporting subsections and regulation offences.
- MOA s.21 punishment filled from the live Act (fine \u2264 $1,000 for s.21(1)).
- Moneylenders: s.19 and s.47 only are expressly arrestable and non-bailable under MA s.86. s.48 left as \u201ccheck Act\u201d.
- DPA s.16 / s.17 arrest remains narrowed to the actual s.18 condition.
- POHA s.10 added. s.18(1) is in-view for any provision; s.18(2) also allows arrest without warrant of a person reasonably suspected of s.10(1) in prescribed circumstances.
- `extra-part5.json` Public Order Act 2009: original 15(1), 15(2), 16(1), 16(2), 16(4), 18, 24(4), 25(3), 37, 39 plus 14 Sep 2026 add of special-event ss.26, 27, 28, 31, 32(1), 32(2), 32A. Arrest marked per POA s.40 (in officer\u2019s view, any provision). Remaining organiser-direction / s.21A declaration machinery not indexed (not all are offences).
- New `extra-part6.json` (14 Sep 2026): Misuse of Drugs Act 1973 ss.5, 6, 7, 8(a), 8(b), 8A, 9, 10, 11, 11A, 11B, 30. Arrest marked per MDA s.25 (committed or reasonably suspected \u2014 no in-view limit). Trafficking / manufacture / import punishments left as \u201csee Second Schedule\u201d rather than inventing quantity bands. Consumption uses the quoted s.33(3A) scale; s.33A LT bands pointed to SSO.
- RTA 64/65 hurt-tier headings should be confirmed on the live SSO section because Act 2 of 2025 rewrote the section structure.
- No hatsuzuki (or other third-party) runtime dependency. Deep-link fallback in `js/app.js` `showEmpty()` still builds `https://sso.agc.gov.sg/Act/{code}?ProvIds=pr{section}-`.
- New `extra-part8.json` (21 Sep 2026): Maintenance of Racial Harmony Act 2025 ss.39 and 40 (in force 15 Sep 2026). No Act-wide police arrest-without-warrant clause found in the Act text reviewed; arrest/bail marked on CPC term defaults (s.39 max 10 years; s.40 max 5 years). Both require Public Prosecutor\u2019s consent (s.44). s.40(2) is compoundable under the new CPC Fourth Schedule Part 3A item 56A. MRHA s.7 information offences and restraining-order contraventions not indexed in this pass.

Always verify against [sso.agc.gov.sg](https://sso.agc.gov.sg).
