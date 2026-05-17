# ShipCheck — `integration` branch (full app)

Use this branch to run **everything together** before merging to `main`.

**Branch:** `integration`  
**Repo:** https://github.com/Ethiopian-Cursor-Community/shipcheck

## What is on `integration`

| Part | Status |
|------|--------|
| Cursor SDK audit (`runCursorAudit`) | Done |
| Backend clone + `POST /api/audit` | Done |
| Frontend dashboard (Tailwind, loading, report UI) | Done |
| Repo overview + verdict on report | Done |

`main` already has SDK + backend (PR #2, #3 merged).  
`integration` = `main` + latest `frontend-ui` + polish + `docs/`.

## Setup (everyone)

```bash
git fetch origin
git checkout integration
git pull origin integration
npm install
cp .env.example apps/api/.env   # add CURSOR_API_KEY (ask team lead — never commit)
npm run dev
```

- **Web:** http://localhost:5173  
- **API:** http://localhost:4000/health  

**Important:** Run `npm run dev` (both web + API). If you only start the web app, scans fail with **502**.

## Env (API only)

Create `apps/api/.env` (not committed):

```env
CURSOR_API_KEY=your_key_here
CURSOR_MODEL=composer-2
PORT=4000
```

## Test a scan

Use a **public** repo, e.g.:

- `https://github.com/octocat/Hello-World`
- `https://github.com/sindresorhus/slugify`

Large repos take longer (clone + AI audit).

## Merge to `main` (when ready)

1. Open PR: `integration` → `main` on GitHub  
2. Or locally after review:

```bash
git checkout main
git pull origin main
git merge integration
git push origin main
```

3. Tell everyone to rebase their branches on new `main`:

```bash
git checkout your-branch
git pull origin main
```

## PRs already on GitHub

| PR | Branch | Notes |
|----|--------|--------|
| #1 | `frontend-ui` | UI polish — much of this is already in `integration` |
| #2 | `cursor-agent-sdk` | Merged to `main` |
| #3 | `backend-api` | Merged to `main` |

After `integration` merges to `main`, close or update PR #1 if duplicate.

## Troubleshooting

| Error | Fix |
|-------|-----|
| `502 Bad Gateway` on scan | Start API: `npm run dev` or `npm run dev:api` |
| `403` on git push | Accept org invite; team needs repo access |
| Port 4000 in use | `fuser -k 4000/tcp` then `npm run dev` |
| Missing API key | `apps/api/.env` with `CURSOR_API_KEY` |

See also: [TEAM-WORK.md](./TEAM-WORK.md) for per-role tasks.
