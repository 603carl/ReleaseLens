# demo-repository

A controlled demo scenario for the **ReleaseLens** hackathon project.

## What this is

This repository simulates a realistic TypeScript order-management service library used to demonstrate ReleaseLens's ability to surface meaningful information from a feature branch before it merges.

The codebase contains three intentional issues that ReleaseLens is designed to detect and report:

| Finding | Severity | Location |
|---------|----------|----------|
| Contract test failure: `order total with 10% discount should equal 90` | HIGH | `tests/contracts/orders.test.ts` |
| Logic bug in `calculateDiscount` — missing `/ 100` turns a 10 % discount into a 900 % penalty | HIGH | `src/orders/pricing.ts` |
| Unused variable `unusedHelper` | MEDIUM | `src/shared/validators.ts` |

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
