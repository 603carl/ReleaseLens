# ReleaseLens — AGENTS.md

## Project

ReleaseLens is a local developer workflow workbench for evidence-backed release verification.

It takes a Git repository and a release candidate reference and produces a structured
9-stage verification pipeline ending in a human-readable Release Verification Dossier.

## Primary objective

Compress the manual workflow required to verify a software change before release.
Every output must be traceable to a deterministic check or repository artefact.

## Non-negotiable principles

1. **Evidence over assertion** — never claim something is true without a source.
2. **Deterministic checks over invented conclusions** — analysis must be rule-based.
3. **Preserve uncertainty** — UNKNOWN confidence must never silently become CONFIRMED.
4. **Never fabricate repository relationships** — if a link cannot be proven, mark it UNKNOWN.
5. **Never claim a release is safe** solely because automated checks passed.
6. **Do not remove or weaken tests** simply to obtain a green build.
7. **Keep the application maintainable** and easy to demonstrate.
8. **Avoid unnecessary infrastructure** — local-first, SQLite, no cloud dependency.
9. **Demo data must be synthetic** — no personal information, no client data.
10. **Follow the documented architecture** — changes require explicit approval.

## Architecture

```
packages/api/   — Express 5 + TypeScript API server (port 3001)
packages/ui/    — React 18 + Vite + TypeScript + Tailwind CSS (port 5173)
demo-repository/ — Controlled TypeScript order-management API (demo scenario)
docs/           — All product and engineering documentation
hackathon/      — Bob evidence, submission assets
```

### Core API components

- `adapters/git.adapter.ts`     — Git CLI wrapper (simple-git), never executes user-supplied commands
- `engine/analysis.engine.ts`   — Deterministic impact/change classification rules
- `engine/check.runner.ts`      — Allowlisted command executor (child_process.spawn)
- `engine/dossier.generator.ts` — Markdown dossier generator (11 sections)
- `store/db.ts`                 — SQLite connection + schema + migrations
- `store/evidence.store.ts`     — Evidence linking layer
- `types/domain.ts`             — Canonical domain entity types (shared)

### Status model

PENDING | RUNNING | PASSED | FAILED | BLOCKED | UNKNOWN | NOT_VERIFIED

Do NOT use "safe" as a status.

### Severity model (deterministic rules only)

- contract test fail  → CRITICAL
- unit test fail      → HIGH
- typecheck fail      → HIGH
- build fail          → HIGH
- lint fail           → MEDIUM

### Confidence model

- direct import traceable → CONFIRMED
- same module path prefix → SUPPORTED
- no evidence             → UNKNOWN  ← never silently upgrade

## Coding conventions

- TypeScript strict mode.
- Small, single-responsibility modules.
- Explicit domain types — never use `any` on domain objects.
- Validate all external input at API boundary.
- Handle command failures — never swallow errors silently.
- Tests accompany all engine and adapter logic.
- Command runner must reject anything outside the configured allowlist.

## UI conventions

- Professional engineering tool aesthetic (not AI-dashboard).
- No neon gradients, robot graphics, decorative AI motifs, meaningless animated metrics.
- Dense but readable information, strong hierarchy, restrained colour.
- Accessible: semantic HTML, keyboard navigation, visible focus rings, sufficient contrast.
- All loading/empty/error states must be implemented.

## Testing requirements

Before marking any phase complete:
- unit tests pass
- integration tests pass (where applicable)
- type check passes (`tsc --noEmit`)
- lint passes
- production build passes

## Bob workflow rules

- Use **Plan mode** before substantial new architecture decisions.
- Use **Agent mode** for implementation.
- Use **Ask mode** for repository explanation and analysis.
- Use **subagents** only for focused, self-contained investigations.
- Never spawn a subagent for a trivial file read.

## Source of truth

The `/docs` directory contains the product and engineering requirements.
When requirements conflict, stop and report the conflict — do not guess.

## Demo scenario

The controlled demo repository (`demo-repository/`) contains a TypeScript order-management
API on branch `feature/discount-logic`. The change modifies:
- `src/orders/pricing.ts` (CONFIRMED impact on orders module)
- `src/payments/invoice.ts` (SUPPORTED impact via import)
- `src/shared/validators.ts` (UNKNOWN — no test mapping)

Intentional defects:
- `tests/contracts/orders.test.ts` fails (→ CRITICAL finding)
- lint warning in `invoice.ts` (→ MEDIUM finding)

The scenario must be fully reproducible and resettable.
