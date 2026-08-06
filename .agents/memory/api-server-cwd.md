---
name: API server runtime cwd
description: process.cwd() in the api-server artifact resolves to the artifact directory, not the workspace root
---

When the api-server workflow runs (`pnpm --filter @workspace/api-server run dev`), the Node process's working directory is `artifacts/api-server/`, NOT the workspace root `/home/runner/workspace/`.

**Why:** pnpm changes directory into the filtered package before running the script.

**How to apply:**
- Data files in `artifacts/api-server/data/` → use `path.resolve(process.cwd(), "data")` (NOT `"artifacts/api-server/data"`)
- Output dirs → `path.resolve(process.cwd(), "arquivos")` etc.
- Any path relative to the artifact → use just the local path, not the full monorepo path
