# ShipCheck — Team work split

Repo: https://github.com/Ethiopian-Cursor-Community/shipcheck

Everyone: `git pull origin main` before starting each day. Work on your branch. Open PR to `main`.

---

## How the app fits together

```
[Frontend]  POST /api/audit { repoUrl }
      ↓
[Backend]   validate URL → clone repo → call runCursorAudit()
      ↓
[Cursor SDK] scan repo → return AuditReport JSON
      ↓
[Frontend]  show score, issues, quick wins, fix plan
```

Shared types: `packages/shared/src/index.ts` (`AuditReport`)

---

## Frontend team — branch `frontend-ui`

**Folder:** `apps/web/src/`  
**Run:** `npm run dev:web` → http://localhost:5173

### Your job

Build the **demo-ready dashboard**. Backend will return real JSON; you render it.

### Must have (MVP)

| # | Feature | Notes |
|---|---------|--------|
| 1 | GitHub URL input | Placeholder: `https://github.com/owner/repo` |
| 2 | Scan button | Disabled while loading |
| 3 | Loading steps | Show: Validating → Cloning → Analyzing (can be UI-only steps while waiting) |
| 4 | Score card | Big number `score` / 100 + `summary` |
| 5 | Critical issues | List from `report.criticalIssues` |
| 6 | Quick wins | List from `report.quickWins` |
| 7 | Fix plan | Ordered list from `report.fixPlan` |
| 8 | Errors | Show API errors (400 invalid URL, 500 server error) |
| 9 | Empty states | “No issues” when arrays are empty |
| 10 | Mobile-friendly | Tailwind, readable on phone for demo |

### API you call (do not change)

```http
POST /api/audit
Content-Type: application/json

{ "repoUrl": "https://github.com/owner/repo" }
```

Vite proxies `/api` → `http://localhost:4000` (already configured).

### TypeScript

```ts
import type { AuditReport } from "@shipcheck/shared";
```

### Do not

- Change `packages/shared` without telling backend + SDK owner
- Change `apps/api/` (backend folder)
- Push to `main` directly

### Test while backend is still WIP

Use placeholder response from API (score `0` + message) — UI should still layout correctly. When backend merges, same UI should show real data.

### Done when

- Looks good for hackathon demo
- Works with `npm run dev` (web + api together)
- PR opened: `frontend-ui` → `main`

---

## Backend team — branch `backend-api`

**Folder:** `apps/api/src/`  
**Run:** `npm run dev:api` → http://localhost:4000

### Your job

Make **`POST /api/audit`** do real work: clone repo, run audit, return JSON.

### Must have (MVP)

| # | Task | File / tool |
|---|------|-------------|
| 1 | Keep URL validation | `apps/api/src/routes/audit.ts` (Zod already there) |
| 2 | Clone public GitHub repo | `simple-git` → temp folder e.g. `tmp/repos/<id>/` |
| 3 | Handle clone errors | 400/502 with clear `{ error: "..." }` |
| 4 | Delete temp folder after scan | `finally` block — always cleanup |
| 5 | Call Cursor audit | `import { runCursorAudit } from "../lib/cursor-audit.js"` |
| 6 | Return `AuditReport` | Shape from `@shipcheck/shared` |
| 7 | Timeouts | Optional: max clone time / audit time for demo |

### Example flow in `audit.ts`

```ts
// 1. validate repoUrl (done)
// 2. repoPath = await cloneRepo(repoUrl)
// 3. try {
//      const report = await runCursorAudit(repoPath, repoUrl);
//      return res.json(report);
//    } catch (e) {
//      return res.status(500).json({ error: "Audit failed", message: ... });
//    } finally {
//      await cleanup(repoPath);
//    }
```

### Cursor SDK (already on branch `cursor-agent-sdk`)

Function ready to use:

```ts
// apps/api/src/lib/cursor-audit.ts
runCursorAudit(repoPath: string, repoUrl: string): Promise<AuditReport>
```

Requires `apps/api/.env`:

```env
CURSOR_API_KEY=...
CURSOR_MODEL=composer-2
PORT=4000
```

**Do not commit `.env`** — copy from `.env.example`.

Merge `cursor-agent-sdk` into your branch or wait for it on `main` before calling `runCursorAudit`.

### Test

```bash
curl -X POST http://localhost:4000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"https://github.com/octocat/Hello-World"}'
```

### Do not

- Redesign the frontend
- Change `AuditReport` shape without team agreement

### Done when

- Real public repo clones and returns audit JSON (not placeholder)
- PR opened: `backend-api` → `main`

---

## Cursor SDK owner — branch `cursor-agent-sdk`

**Folder:** `apps/api/src/lib/cursor-audit.ts`  
**Status:** Implemented — merge to `main` so backend can call it.

Backend only needs:

```ts
const report = await runCursorAudit(repoPath, repoUrl);
```

---

## Suggested merge order

1. `cursor-agent-sdk` → `main` (audit function)
2. `backend-api` → `main` (clone + wire `runCursorAudit`)
3. `frontend-ui` → `main` (polish UI on real API)

After each merge, others run:

```bash
git checkout your-branch
git pull origin main
```

---

## Commands cheat sheet

```bash
npm install
npm run dev              # web + api
npm run dev:web
npm run dev:api
npm run build
npm run test --workspace apps/api
```

---

## Contact / blockers

| Problem | Who fixes |
|---------|-----------|
| 403 push denied | Org admin — team repo access |
| Port 4000 in use | `fuser -k 4000/tcp` |
| Missing API key | SDK owner — `apps/api/.env` |
| UI/API shape mismatch | Agree in `packages/shared` first |
