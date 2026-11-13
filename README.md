# Hambalang Search Guide

Singapore offence lookup: arrestable, bailable, process and maximum punishment, with direct links to Singapore Statutes Online.

- **Penal Code:** the CPC 2010 First Schedule.
- **Other Acts:** the Act's own arrest power where one exists, otherwise the CPC First Schedule default for offences against other laws (≥3 years → arrestable, not bailable).
- **Quick arrest check:** for offences not yet indexed, pick the Act and maximum punishment.

Static site with no build step and no runtime dependencies. Open `index.html` through any static server (`python3 -m http.server`).

Data format and sources: [`data/README.md`](data/README.md). Validate with `python3 scripts/validate.py`.

Reference only, not legal advice.

## Private (password-protected) site

The published site is encrypted. `.github/workflows/deploy.yml` builds `dist/` with `scripts/build-encrypted.mjs`, which packs all data into one AES-256-GCM file (`data/vault.json`, key derived with PBKDF2-SHA256 over 600,000 iterations). The page asks for the password and decrypts the data in the browser. The password lives only in the GitHub secret `SITE_PASSWORD`.

One-time setup:
1. **Settings → Secrets and variables → Actions → New repository secret.** Name: `SITE_PASSWORD`, value: a passphrase of 12+ characters.
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
3. Merge to `main`. The workflow deploys the encrypted site.

What this protects: the deployed website. What it does not protect: this repository's source and its git history. Make the repository private if those must be hidden too (Pages from a private repo requires a paid GitHub plan).

## Automatic updates

A scheduled Claude review runs every Monday and Thursday (2:37pm SGT) and pushes its changes to a `claude/data-review-<date>` branch. `.github/workflows/auto-merge.yml` then merges that branch into `main` and redeploys the site, but only if every check passes:

1. `scripts/validate.py`: data is well-formed.
2. `scripts/safety_check.py`: nothing deleted, no statute removed, no Act losing more than 5% of its rows, no drop in charge templates or NPC boundaries, no placeholder text.
3. The encrypted build succeeds.

If any check fails, the branch is left unmerged and the failed run shows in the Actions tab. To stop auto-merging, delete `.github/workflows/auto-merge.yml` or disable it under Actions.
