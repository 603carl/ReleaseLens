/**
 * Check Runner + Verification Planner Unit Tests
 */
import { describe, it, expect } from 'vitest';
import {
  isAllowedCommand,
  validateCommand,
  COMMAND_ALLOWLIST,
} from './check.runner.js';
import { generateVerificationPlan } from './verification.planner.js';
import type { ImpactItem } from '../types/domain.js';

// ─── Allowlist Tests ─────────────────────────────────────────

describe('check.runner — allowlist', () => {
  it('accepts all commands in the allowlist', () => {
    for (const cmd of COMMAND_ALLOWLIST) {
      expect(isAllowedCommand(cmd)).toBe(true);
    }
  });

  it('rejects commands not in the allowlist', () => {
    expect(isAllowedCommand('rm -rf /')).toBe(false);
    expect(isAllowedCommand('cat /etc/passwd')).toBe(false);
    expect(isAllowedCommand('curl http://evil.com')).toBe(false);
    expect(isAllowedCommand('git push --force')).toBe(false);
    expect(isAllowedCommand('')).toBe(false);
    expect(isAllowedCommand('npm install --save evil')).toBe(false);
  });

  it('rejects empty and whitespace commands', () => {
    expect(isAllowedCommand('')).toBe(false);
    expect(isAllowedCommand('   ')).toBe(false);
  });
});

describe('check.runner — validateCommand', () => {
  it('returns valid for allowlisted commands', () => {
    expect(validateCommand('npm test').valid).toBe(true);
    expect(validateCommand('npm run lint').valid).toBe(true);
    expect(validateCommand('npm run typecheck').valid).toBe(true);
  });

  it('rejects shell injection patterns regardless of allowlist', () => {
    // These patterns should never reach execution
    expect(validateCommand('npm test; rm -rf /').valid).toBe(false);
    expect(validateCommand('npm test && cat /etc/passwd').valid).toBe(false);
    expect(validateCommand('npm test | tee /tmp/out').valid).toBe(false);
    expect(validateCommand('npm test > /tmp/out').valid).toBe(false);
    expect(validateCommand('$(evil)').valid).toBe(false);
    expect(validateCommand('`evil`').valid).toBe(false);
  });

  it('rejects non-allowlisted commands', () => {
    const result = validateCommand('npm run deploy');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not in allowlist');
  });

  it('returns reason for rejection', () => {
    const result = validateCommand('evil command');
    expect(result.valid).toBe(false);
    expect(result.reason).toBeTruthy();
  });
});

// ─── Verification Planner Tests ──────────────────────────────

function makeImpactItem(overrides: Partial<ImpactItem> = {}): ImpactItem {
  return {
    id: 'test-id',
    releaseCandidateId: 'rc-001',
    changeId: 'change-001',
    path: 'src/orders/pricing.ts',
    type: 'MODULE',
    reason: 'Direct change',
    confidence: 'CONFIRMED',
    evidenceRefs: [],
    ...overrides,
  };
}

describe('verification.planner', () => {
  it('always includes typecheck and lint', () => {
    const plan = generateVerificationPlan([]);
    const commands = plan.map((p) => p.command);
    expect(commands).toContain('npm run typecheck');
    expect(commands).toContain('npm run lint');
  });

  it('adds unit tests when MODULE is impacted', () => {
    const items = [makeImpactItem({ type: 'MODULE' })];
    const plan = generateVerificationPlan(items);
    const commands = plan.map((p) => p.command);
    expect(commands).toContain('npm test');
  });

  it('adds contract tests when CONTRACT_TEST is impacted', () => {
    const items = [makeImpactItem({ type: 'CONTRACT_TEST', path: 'tests/contracts/orders.test.ts' })];
    const plan = generateVerificationPlan(items);
    const commands = plan.map((p) => p.command);
    expect(commands).toContain('npm test -- --reporter=verbose');
  });

  it('does not run the full test suite twice for module and contract impacts', () => {
    const items = [
      makeImpactItem({ type: 'MODULE' }),
      makeImpactItem({ type: 'CONTRACT_TEST', path: 'tests/contracts/orders.test.ts' }),
    ];
    const commands = generateVerificationPlan(items).map((p) => p.command);
    expect(commands).toContain('npm test -- --reporter=verbose');
    expect(commands).not.toContain('npm test');
  });

  it('adds build when CONFIG is impacted', () => {
    const items = [makeImpactItem({ type: 'CONFIG', path: 'tsconfig.json' })];
    const plan = generateVerificationPlan(items);
    const commands = plan.map((p) => p.command);
    expect(commands).toContain('npm run build');
  });

  it('all generated commands are in the allowlist', () => {
    const items = [
      makeImpactItem({ type: 'MODULE' }),
      makeImpactItem({ type: 'CONTRACT_TEST', path: 'tests/contracts/orders.test.ts' }),
      makeImpactItem({ type: 'CONFIG', path: 'tsconfig.json' }),
      makeImpactItem({ type: 'UNKNOWN', confidence: 'UNKNOWN' }),
    ];
    const plan = generateVerificationPlan(items);
    for (const item of plan) {
      const validation = validateCommand(item.command);
      expect(validation.valid).toBe(true);
    }
  });

  it('does not produce duplicate commands', () => {
    const items = [
      makeImpactItem({ type: 'MODULE' }),
      makeImpactItem({ type: 'TEST' }),
      makeImpactItem({ type: 'MODULE', path: 'src/payments/invoice.ts' }),
    ];
    const plan = generateVerificationPlan(items);
    const commands = plan.map((p) => p.command);
    const unique = new Set(commands);
    expect(commands.length).toBe(unique.size);
  });

  it('every plan item has a reason', () => {
    const items = [makeImpactItem({ type: 'MODULE' })];
    const plan = generateVerificationPlan(items);
    for (const item of plan) {
      expect(item.reason).toBeTruthy();
    }
  });
});
