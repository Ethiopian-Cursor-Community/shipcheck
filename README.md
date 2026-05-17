# ShipCheck

**ShipCheck** checks if a GitHub repo is ready for production.

1. User pastes a GitHub URL in the dashboard  
2. Backend validates the URL and clones the repo  
3. Cursor Agent SDK scans the code  
4. App shows a report: score, critical issues, quick wins, fix plan  

**Full working app:** `main` now includes SDK + backend + UI (merged from `integration`).  
For extra team instructions, see [docs/INTEGRATION.md](docs/INTEGRATION.md).

---

## Repo structure

```
shipcheck/
├── apps/web/                 # Frontend (React + Vite + Tailwind)
├── apps/api/                 # Backend (Express)
│   └── src/
│       ├── routes/audit.ts   # POST /api/audit
│       └── lib/cursor-audit.ts   # Cursor Agent SDK audit logic
├── packages/shared/          # Shared types (AuditReport, etc.)
├── .env.example
└── package.json              # npm workspaces
```

**Do not edit the same files on different branches without talking first.**  
Shared types live in `packages/shared` — agree before changing them.

---

## Everyone: first-time setup

```bash
# 1. Clone (after base is on main)
git clone https://github.com/Ethiopian-Cursor-Community/shipcheck.git
cd shipcheck

# 2. Install dependencies
npm install

# 3. Run the app (web + API together)
npm run dev
```

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:5173 |
| API health | http://localhost:4000/health |

**Port 4000 already in use?**

```bash
fuser -k 4000/tcp
npm run dev
```

**TypeScript errors in the editor?**  
Command Palette → **TypeScript: Select TypeScript Version** → **Use Workspace Version**.

---

## Hackathon team owners

| Name | Branch | Role |
|------|--------|------|
| **Behailu** | `frontend-ui` | UI dashboard, report presentation |
| **Nahom** | `backend-api` | Repo clone + `POST /api/audit` |
| **Natenael** | `cursor-agent-sdk` | Cursor SDK audit prompt + parsing |

---

## Git workflow (important)

1. Base project is on **`main`** — do not push your feature work directly to `main`.  
2. Create **your** branch from latest `main`.  
3. Work only on your area.  
4. Open a **Pull Request** when done.  
5. Merge to `main` after review.

```bash
git checkout main
git pull origin main
git checkout -b YOUR-BRANCH-NAME    # see table below
# ... work, commit, push ...
git push -u origin YOUR-BRANCH-NAME
# Open PR on GitHub → merge to main
```

---

## Team roles — pick ONE branch

| You are | Branch name | Owner | Main folders |
|---------|-------------|-------|--------------|
| **Frontend** | `frontend-ui` | Behailu | `apps/web/src/` |
| **Backend** | `backend-api` | Nahom | `apps/api/src/routes/`, clone logic |
| **AI / Cursor SDK** | `cursor-agent-sdk` | Natenael | `apps/api/src/lib/cursor-audit.ts` |

```bash
# Example for frontend person:
git checkout -b frontend-ui
```

---

## Frontend teammate (`frontend-ui`)

**Goal:** Polish the ShipCheck dashboard.

**You own:** `apps/web/src/` (especially `App.tsx`)

**Build:**

- Repo URL input + validation feedback  
- Loading steps while scan runs (validating → cloning → analyzing)  
- Score card (0–100)  
- Lists: critical issues, quick wins  
- Fix plan section  
- Good mobile layout + Tailwind styling  

**API:** Frontend calls `POST /api/audit` via Vite proxy (`/api` → port 4000).  
Types: import from `@shipcheck/shared` (`AuditReport`).

**Run only frontend:**

```bash
npm run dev:web
```

**Done when:** UI looks complete, works with real API responses from `main`.

---

## Backend teammate (`backend-api`)

**Goal:** Make `/api/audit` clone a real repo and return a proper report shape.

**You own:**

- `apps/api/src/routes/audit.ts`  
- New files e.g. `apps/api/src/lib/clone-repo.ts`  

**Build:**

1. Validate GitHub URL (already started with Zod).  
2. Clone repo to a temp folder (`simple-git`).  
3. Clean up temp folder after scan (or on error).  
4. Call `runCursorAudit(repoPath, repoUrl)` from `cursor-audit.ts` when AI branch is merged — until then, you can keep placeholder or mock.  
5. Return JSON matching `AuditReport` in `packages/shared/src/index.ts`.

**Env:** copy `.env.example` → `apps/api/.env` (PORT optional).

**Run only API:**

```bash
npm run dev:api
```

**Test:**

```bash
curl -X POST http://localhost:4000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"https://github.com/octocat/Hello-World"}'
```

**Done when:** Real clone works + API returns valid `AuditReport` JSON.

---

## AI / Cursor SDK teammate (`cursor-agent-sdk`)

**Goal:** Run Cursor Agent on the cloned repo and fill the report.

**You own:** `apps/api/src/lib/cursor-audit.ts` (+ prompt helpers if needed)

**Setup:**

```bash
npm install @cursor/sdk --workspace apps/api
cp .env.example apps/api/.env
# Add CURSOR_API_KEY=... to apps/api/.env
```

**Build:**

1. Implement `runCursorAudit(repoPath, repoUrl)` using `@cursor/sdk`.  
2. Write a clear audit prompt (production readiness: security, tests, env, deps, etc.).  
3. Parse agent output into `AuditReport` (score, issues, quick wins, fix plan).  
4. Wire into `audit.ts` route (replace placeholder).

**Docs:** https://cursor.com/docs/api/sdk/typescript  

**Example pattern:**

```typescript
import { Agent } from "@cursor/sdk";

const result = await Agent.prompt("...", {
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: repoPath },
});
```

**Done when:** Scanning a real repo returns a meaningful score and issues (not placeholder text).

---

## Shared contract (`packages/shared`)

Everyone must return this shape from the API:

```typescript
// packages/shared/src/index.ts
AuditReport {
  repoUrl: string
  score: number          // 0–100
  verdict: "ready" | "needs-work" | "not-ready"
  summary: string
  repo: {
    whatItDoes: string
    projectType: string
    primaryLanguage: string
    frameworks: string[]
    keyFiles: string[]
  }
  criticalIssues: AuditIssue[]
  quickWins: AuditIssue[]
  fixPlan: FixPlanStep[]
  scannedAt: string      // ISO date
}
```

If you need new fields, **talk to the team** and update `packages/shared` in one PR first.

---

## API reference

**Health**

```
GET /health
→ { "ok": true, "service": "shipcheck-api" }
```

**Audit**

```
POST /api/audit
Content-Type: application/json

{ "repoUrl": "https://github.com/owner/repo" }

→ AuditReport (JSON)
```

---

## Environment variables

| Variable | Where | Who needs it |
|----------|--------|----------------|
| `CURSOR_API_KEY` | `apps/api/.env` | AI teammate |
| `PORT` | `apps/api/.env` | Optional (default `4000`) |

---

## Commands cheat sheet

| Command | What it does |
|---------|----------------|
| `npm install` | Install all workspaces |
| `npm run dev` | Web + API together |
| `npm run dev:web` | Frontend only |
| `npm run dev:api` | Backend only |
| `npm run build` | Build all apps |

---

## Merge workflow (now)

Core work is already merged to `main`. For new work:

1. Branch from latest `main`
2. Implement in your owned area
3. Open PR to `main`

If branches conflict, rebase on `main`:

```bash
git checkout your-branch
git pull origin main
# fix conflicts if any
git push
```

---

## Questions?

- Repo: https://github.com/Ethiopian-Cursor-Community/shipcheck  
- Do not commit `.env` (only `.env.example`)  
- Do not push secrets to GitHub  

Good luck — ship it.
