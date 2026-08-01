# ZANA Production Finalization

This document records the production finalization gate for the ZANA platform.

A production release is complete only when the GitHub Actions pipeline confirms all of the following:

- code validation, TypeScript checks, tests, architecture checks, security checks, and RTL checks pass;
- the Cloudflare Worker deploys successfully;
- the live Worker revision matches the current Git commit;
- unauthenticated provider preflight access is rejected;
- authenticated provider preflight succeeds;
- production exposure checks and smoke tests pass;
- the release metadata job completes.

Production architecture remains:

- frontend: `https://zana.krd` on Cloudflare Static Assets;
- backend: Cloudflare Worker;
- Firebase: Authentication and Firestore only;
- no Firebase Hosting or Firebase Functions production deployment;
- no localhost or emulator production routing.
