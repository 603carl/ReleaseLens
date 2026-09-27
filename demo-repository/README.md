# demo-repository

A controlled demo scenario for the **ReleaseLens** hackathon project.

## What this is

This repository simulates a TypeScript order-management service library used to demonstrate ReleaseLens's evidence-backed verification workflow.

The codebase contains three intentional issues that ReleaseLens is designed to detect and report:

| Observed issue | Evidence | ReleaseLens result |
|---------------|----------|--------------------|
| Contract test expects 90 but receives -900 | `tests/contracts/orders.test.ts` | CRITICAL finding from the failed verbose test check |
| `calculateDiscount` omits `/ 100` for percentage input | `src/orders/pricing.ts` | Exposed by the failing contract assertion |
| Unused variable `unusedHelper` | `src/shared/validators.ts` | Lint emits a warning and exits successfully, so it is not classified as a failed-check finding |

## Running checks

```bash
npm install

# Run all tests (contract test will FAIL intentionally)
npm test

# Lint (will warn about unusedHelper)
npm run lint

# Type-check (should pass)
npm run typecheck
```

## Structure

```
src/
  shared/validators.ts    – UUID and amount validation helpers
  orders/pricing.ts       – Discount and total calculation logic (contains bug)
  payments/invoice.ts     – Invoice generation using pricing module
tests/
  orders/pricing.test.ts  – Unit tests (all pass, testing buggy behaviour)
  contracts/orders.test.ts – Contract test (FAILS – exposes the pricing bug)
```

## Purpose

This repository is **not** a production service. It exists solely as a controlled input for ReleaseLens demo sessions, providing a reproducible set of findings across test failures, logic bugs, and lint warnings.
