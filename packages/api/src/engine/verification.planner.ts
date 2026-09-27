/**
 * Verification Planner
 * Deterministically generates a verification plan from impact items.
 * Every plan item has a concrete reason traceable to a change or impact item.
 */
import type { ImpactItem } from '../types/domain.js';

export interface PlanItem {
  name: string;
  reason: string;
  command: string;
  expectedOutcome: string;
}

// Commands must come from the allowlist defined in check.runner.ts
// These are the only commands the planner may emit.

const ALWAYS_RUN: PlanItem[] = [
  {
    name: 'TypeScript type check',
    reason: 'Always verify type correctness before release',
    command: 'npm run typecheck',
    expectedOutcome: 'Exit 0 — no type errors',
  },
  {
    name: 'Lint',
    reason: 'Always check code quality and style',
    command: 'npm run lint',
    expectedOutcome: 'Exit 0 — no lint errors',
  },
];

/**
 * Generate a verification plan from a set of impact items.
 * Rules:
 * - Always run typecheck and lint
 * - If any MODULE or SHARED file is impacted → run unit tests
 * - If any TEST file is impacted → run unit tests
 * - If any CONTRACT_TEST file is impacted → run the full suite with verbose output
 * - If any CONFIG is impacted → run build
 */
export function generateVerificationPlan(impactItems: ImpactItem[]): PlanItem[] {
  const items: PlanItem[] = [...ALWAYS_RUN];
  const added = new Set<string>();

  const hasModule = impactItems.some((i) => i.type === 'MODULE' || i.type === 'SHARED');
  const hasTest = impactItems.some((i) => i.type === 'TEST');
  const hasContractTest = impactItems.some((i) => i.type === 'CONTRACT_TEST');
  const hasConfig = impactItems.some((i) => i.type === 'CONFIG');
  const hasUnknown = impactItems.some((i) => i.confidence === 'UNKNOWN');

  function addOnce(item: PlanItem) {
    if (!added.has(item.command)) {
      added.add(item.command);
      items.push(item);
    }
  }

  if (hasContractTest) {
    addOnce({
      name: 'Contract tests',
      reason: 'Contract test files are in the impact scope — must verify API contracts',
      command: 'npm test -- --reporter=verbose',
      expectedOutcome: 'All contract tests pass — exit 0',
    });
  }

  // The verbose contract command runs the entire test suite, so don't repeat it.
  if ((hasModule || hasTest) && !hasContractTest) {
    addOnce({
      name: 'Unit tests',
      reason: hasModule
        ? 'Source module files were changed — run all unit tests'
        : 'Test files are in the impact scope',
      command: 'npm test',
      expectedOutcome: 'All unit tests pass — exit 0',
    });
  }

  if (hasConfig) {
    addOnce({
      name: 'Production build',
      reason: 'Configuration files were changed — verify build still succeeds',
      command: 'npm run build',
      expectedOutcome: 'Build succeeds — exit 0',
    });
  }

  if (hasUnknown) {
    // Add a note item — no automated check can cover UNKNOWN areas
    addOnce({
      name: 'Manual review required',
      reason: 'UNKNOWN impact areas detected — these cannot be verified automatically',
      command: 'npm test',
      expectedOutcome: 'Review UNKNOWN areas manually before release',
    });
  }

  // Deduplicate by command (in case hasModule and hasContractTest both want npm test)
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.command;
    if (seen.has(key) && key === 'npm test') return false;
    seen.add(key);
    return true;
  });
}
