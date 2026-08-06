---
name: Vercel deploy source
description: What the published Vercel site actually runs, so production fixes go to the right codebase
---

The published Vercel app (`gera-nota`) is built from the original imported project under
`.migration-backup/`, **not** from the live Replit artifacts (`artifacts/gera-nota`,
`artifacts/api-server`). Its `vercel.json` lives at `.migration-backup/vercel.json`
(framework create-react-app, rewrites `/api/*` -> `/api/index`).

**Why:** The Replit port lives in the pnpm workspace artifacts, but the external Vercel
deployment history/infra was carried over from the old project, so it serves the old backend
and frontend under `.migration-backup`.

**How to apply:** When the user reports a bug on the published Vercel site, verify the fix in
the Replit artifacts first (that is the development source of truth), then apply/push the
corresponding change under `.migration-backup/` if that is what production deploys. Auth was
removed from `artifacts/` (no login); `.migration-backup` originally had none either — a
"github commit push to origin triggers redeploy."
