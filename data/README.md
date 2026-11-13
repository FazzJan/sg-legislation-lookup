# Data

All data is plain, human-readable JSON so every change shows up clearly in a diff.

| File | What it holds |
| --- | --- |
| `acts.json` | One entry per statute: SSO code, names, and the Act's **arrest power** (`arrestPower.type` = `schedule`, `all`, `conditional`, `listed` or `none`). |
| `acts/<ID>.json` | The offence rows for that statute. `PC1871.json` is the Penal Code part of the CPC 2010 First Schedule (470 rows). |

## Row fields

| Field | Meaning |
| --- | --- |
| `section` | Section as written (e.g. `379`, `14(2)`, `57(1)(c)`). |
| `offence` | Short description. |
| `arrest` | `yes` · `no` · `conditional` (e.g. only in an officer's view) · `depends` (e.g. on the offence abetted / repeat conviction) · `check` (not settled — verify). |
| `arrestText` | Full wording / reasoning, citing the provision relied on. |
| `process` | `Warrant`, `Summons`, or explanatory text. |
| `bail` / `bailText` | `yes` · `no` · `depends` · `check`, plus wording. |
| `punishment` | Maximum punishment as stated in the Act / First Schedule. |
| `link` | Optional — only when the auto-built SSO link is wrong (e.g. subsidiary legislation). |
| `note` | Optional caveat shown in amber in the UI. |

## How arrest/bail status is determined

1. **Penal Code:** the CPC 2010 First Schedule entry (columns 3–5).
2. **Act-specific power** (e.g. LCSCA s.30, GEWCA s.40, VA s.6, WC s.63D): overrides the CPC term default for *arrest*. Bail still follows the term unless the Act says otherwise.
3. **CPC 2010 First Schedule — offences against other laws:** death or imprisonment of 3 years and upwards → may arrest without warrant, warrant, not bailable. Under 3 years or fine only → shall not arrest without warrant, summons, bailable.

## CPC First Schedule amendments already reflected

- S 818/2025 (in force 30 Dec 2025): s.420 split into 420(1) and 420(2).
- S 42/2026 (in force 30 Jan 2026): third-column "not" deleted (now arrestable) for listed sections including 167, 177 (2nd item), 181, 182, 189, 193, 196–200, 203, 204A, 204B, 205, 218–220, 355, 376B(2), 376C(2) 2nd item, 404.
- Act 21 of 2025 s.24 (in force 17 Aug 2026): changes for PC 195 (first item), 292(1A)/(1B), 292B(1)/(2), 304B, 304C, 376E(4), 376EA(4), 377BD(6)/(7), 401.
- Act 10 of 2025 s.48(1)(b) (from 15 Sep 2026): PC 298 / 298A rows deleted (savings for pre-commencement offences); see MRHA 2025 ss.39–40.

## Validation

Run `python3 scripts/validate.py` before committing. CI runs it on every push. It fails on broken JSON, missing fields or bad values, including unexpanded `$(...)` shell text (the bug that wiped files in Oct–Nov 2026). It also warns where a row's arrest or bail status disagrees with the CPC term default and no Act override explains it.

## Change log

- **13 Nov 2026** — Converted the gzip/base64 chunks and `extra-part*.json` files to per-Act JSON. Restored rows lost by earlier automated commits: GCA 2022 ss.18–36 (8 rows), GEWCA ss.13–16, 18, 19, 30, 36, 37, and RTA ss.35(1), 35(2), 43(4). Restored rows carry a `note` asking for re-verification. Dropped GEWCA ss.17 and 20 as standalone rows; they are penalty sections, not offences.

Always verify against [sso.agc.gov.sg](https://sso.agc.gov.sg).
