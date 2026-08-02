## ZANA change summary

Describe the exact user-facing or operational change. Do not include secrets, prompts, images, tokens, or provider response bodies.

## Finalization safety checklist

- [ ] This change was made on a feature branch, not directly on `main`.
- [ ] No unrelated architecture was modified.
- [ ] Cloudflare Worker + Static Assets remains the production architecture.
- [ ] Firebase remains Auth and Firestore only; no Hosting or Functions deployment was added.
- [ ] No localhost, emulator, `.web.app`, or `firebaseapp.com` production routing was introduced.
- [ ] `https://zana.krd` remains an allowed production origin.
- [ ] Gemini model resolution and request format remain canonical.
- [ ] Valid AI routes still expect HTTP 200.
- [ ] Negative contracts remain 400 / 413 / 415 and unauthorized CORS remains rejected.
- [ ] The complete decodable PNG smoke fixture remains intact.
- [ ] Kurdish Sorani wording and mobile-first RTL behavior were reviewed.
- [ ] No secret, token, prompt, image, private data, source map, environment file, or raw provider body is exposed.

## Verification

- [ ] `npm ci`
- [ ] `npm run verify:finalization`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npx wrangler deploy --dry-run`

Critical production files require the `finalization-approved` label and CODEOWNER approval before merge.
