# ReleaseLens

**A developer workflow workbench that turns a code change into an evidence-backed release verification process.**

Built for the IBM Bob 2.0 Hackathon. Demonstrates how IBM Bob IDE was used throughout — architecture planning, core implementation, parallel investigation, debugging and documentation.

---

## What it does

ReleaseLens takes a local Git repository and a proposed release candidate and produces a structured verification workflow:

1. **Change inventory** — inspect the diff, changed files, additions/deletions
2. **Impact analysis** — map changed files to affected modules, tests, contracts
3. **Verification plan** — generate a checklist of what must be verified
4. **Check execution** — run allowlisted commands (lint, typecheck, tests)
5. **Failure triage** — classify failures by severity, link to evidence
6. **Evidence capture** — every finding traces to a source command and output
7. **Release dossier** — generate a Markdown report with full evidence index

ReleaseLens does not replace engineering judgment. It makes verification evidence faster to assemble and easier to inspect.

---

## Quick start

### Prerequisites

- Node.js 18+
- Git

### Install

```bash
npm install
```

### Start local workbench

```bash
npm run dev
```

This starts the API on port 3001 and the UI on port 5173. The first run prepares the demo repository's local Git history. Open http://localhost:5173.

To analyze one of your repositories, choose **Add Repository** and enter its absolute path, such as `C:\code\my-app`. The API must run on the same computer that can access that folder. A Vercel deployment cannot read repositories from your computer; use this local mode for repository analysis.

### Run demo

1. Open http://localhost:5173
2. Click **Get Started**, then **Load Demo** on the Overview page
3. Wait for the launch progress to finish. ReleaseLens mounts the controlled repository and prepares changes, impact, checks, findings, and the dossier.
4. The app opens on Change. Use the workflow navigation to inspect each populated stage through Dossier.
5. The contract test intentionally fails and is recorded as a CRITICAL finding; the generated dossier records a FAILED verification status for engineering review.

### Reset demo

Click **"Reset Demo"** on the Overview page (or call `POST /api/demo/reset`).

---

## Demo repository

`demo-repository/` is a controlled TypeScript order-management API with:

- **Intentional defect**: `calculateDiscount` in `src/orders/pricing.ts` treats `discountPercent` as a fractional multiplier instead of a percentage (missing `/ 100`)
- **Contract test failure**: `tests/contracts/orders.test.ts` expects `10% of 100 = 90`, gets `-900`
- **Lint warning**: `unusedHelper` variable in `src/shared/validators.ts`

Git history:
- Commit 1: correct implementation
- Commit 2: introduces the defect (this is the release candidate)

---

## Architecture

```
packages/
  api/     Express + TypeScript API (port 3001)
           ├── store/        sql.js SQLite persistence (10 tables)
           ├── adapters/     Git adapter (simple-git)
           ├── engine/       Analysis, verification planner, check runner, findings, dossier
           └── routes/       REST API endpoints

  ui/      React 18 + Vite + Tailwind (port 5173)
           ├── pages/        Overview, Change, Impact, Verification, Findings, Dossier
           ├── components/   Shared component library
           ├── api/          Typed fetch client
           └── context/      Global repository + release candidate state

demo-repository/
           TypeScript order-management API with intentional defect
```

**Security**: Check runner uses a hard allowlist — never executes arbitrary user-supplied commands.

**Persistence**: `sql.js` (pure WASM SQLite) — no native binary compilation required.

---

## Tests

```bash
npm test              # Run all tests (104 total)
npm run typecheck     # TypeScript typecheck both packages
npm run build         # Production build
```

API: 100 tests (store, git adapter, analysis engine, findings engine, check runner)  
UI: 4 tests (component render)

---

## IBM Bob evidence

See `hackathon/bob-evidence/` for Bob IDE task-session screenshots:

| ID | Task | Mode |
|----|------|------|
| E01 | Project initialization | Agent |
| E02 | Architecture planning | Plan |
| E03 | Repository analysis | Ask |
| E04 | Core implementation | Agent |
| E05 | Parallel subagent investigation | Agent |
| E06 | Test debugging | Agent |
| E07 | Implementation review | Ask |
| E08 | Documentation update | Agent |

---

## Limitations

- Local prototype only — not for production use
- Single repository/release candidate at a time
- Demo repository uses a controlled synthetic scenario
- No CI/CD integration
- No authentication
- No claims of production-grade security
