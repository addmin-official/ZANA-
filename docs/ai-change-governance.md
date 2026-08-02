# ZANA AI Change Governance

This policy protects the finalized ZANA production baseline from unreviewed AI-generated commits.

## Mandatory workflow

1. AI tools must work only on a feature branch.
2. Every change must be submitted through a pull request targeting `main`.
3. Direct pushes and force pushes to `main` are prohibited.
4. Critical finalized files require the `finalization-approved` label and CODEOWNER approval.
5. Required status checks must pass before merge.
6. Production deployment occurs only from verified `main`.

## Protected production baseline

- Frontend: Cloudflare Static Assets at `https://zana.krd`.
- Backend: Cloudflare Worker.
- Firebase: Authentication and Firestore only.
- No Firebase Hosting or Firebase Functions production deployment.
- No localhost, emulator, `.web.app`, or `firebaseapp.com` production routing.
- Canonical Gemini model and provider request format must remain consistent.
- Valid AI routes must return HTTP 200.
- Missing payload, oversized image, unsupported image type, and unauthorized CORS behavior must remain 400, 413, 415, and rejected respectively.
- The production vision smoke test must use a complete decodable image.

## Required GitHub ruleset for `main`

Enable a branch ruleset with:

- Require a pull request before merging.
- Require at least one approval.
- Require review from CODEOWNERS.
- Dismiss stale approvals when new commits are pushed.
- Require conversation resolution before merging.
- Require status checks to pass and require branches to be up to date.
- Required checks:
  - `Protect Finalized Production Contracts`
  - `Protect Finalized Critical Paths`
  - `ZANA/validate`
  - `ZANA/build`
  - `ZANA/security`
  - `ZANA/verify`
  - `ZANA/smoke`
  - `ZANA/release`
- Block force pushes.
- Block branch deletion.
- Do not allow bypass, including administrators and installed AI applications.

AI-generated output must never claim these repository settings are active unless GitHub reports them as enabled.
