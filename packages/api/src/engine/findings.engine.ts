/**
 * Findings Engine
 * Deterministically classifies check run failures into findings with severity.
 * Rules are explicit — severity is never invented by the interface.
 * 
 * Severity rules (deterministic):
 *   contract test fail  → CRITICAL
 *   unit test fail      → HIGH
 *   typecheck fail      → HIGH
 *   build fail          → HIGH
 *   lint fail           → MEDIUM
 */
import type {
  CheckRun,
  Finding,
  FindingCategory,
  Severity,
  ImpactItem,
} from '../types/domain.js';
import {
  createFinding,
  createEvidence,
  getFindingsByReleaseCandidate,
} from '../store/evidence.store.js';
import { getCheckRunsByPlan } from '../store/verification.store.js';
import { getVerificationPlanByReleaseCandidate } from '../store/verification.store.js';
import { getImpactItemsByReleaseCandidate } from '../store/impact.store.js';
import { getVerificationItemById } from '../store/verification.store.js';

// ─── Severity Classification ─────────────────────────────────

export function classifySeverity(command: string): Severity {
  const cmd = command.toLowerCase().trim();

  if (cmd.includes('npm test') && (cmd.includes('contract') || cmd.includes('--reporter'))) {
    return 'CRITICAL';
  }
  if (cmd === 'npm test' || cmd.startsWith('npm test ')) {
    return 'HIGH';
  }
  if (cmd === 'npm run typecheck') {
    return 'HIGH';
  }
  if (cmd === 'npm run build') {
    return 'HIGH';
  }
  if (cmd === 'npm run lint') {
    return 'MEDIUM';
  }
  return 'MEDIUM'; // default
}

export function classifyCategory(command: string): FindingCategory {
  const cmd = command.toLowerCase().trim();

  if (cmd.includes('npm test') && (cmd.includes('contract') || cmd.includes('--reporter'))) {
    return 'CONTRACT_FAILURE';
  }
  if (cmd.includes('npm test')) {
    return 'TEST_FAILURE';
  }
  if (cmd.includes('typecheck')) {
    return 'TYPE_ERROR';
  }
  if (cmd.includes('build')) {
    return 'BUILD_FAILURE';
  }
  if (cmd.includes('lint')) {
    return 'LINT_VIOLATION';
  }
  return 'UNKNOWN_IMPACT';
}

export function buildFindingTitle(command: string, exitCode: number): string {
  const cmd = command.toLowerCase().trim();

  if (cmd.includes('npm test') && cmd.includes('--reporter')) {
    return `Contract tests failed (exit ${exitCode})`;
  }
  if (cmd.includes('npm test')) {
    return `Unit tests failed (exit ${exitCode})`;
  }
  if (cmd.includes('typecheck')) {
    return `TypeScript type errors detected (exit ${exitCode})`;
  }
  if (cmd.includes('build')) {
    return `Build failed (exit ${exitCode})`;
  }
  if (cmd.includes('lint')) {
    return `Lint violations detected (exit ${exitCode})`;
  }
  return `Check failed: ${command} (exit ${exitCode})`;
}

// ─── Affected Areas ──────────────────────────────────────────

/**
 * Determine which impact areas are related to a failing check.
 * Uses the check's command category to filter relevant impact items.
 */
export function findAffectedAreas(
  command: string,
  impactItems: ImpactItem[],
): string[] {
  const cmd = command.toLowerCase();
  const areas: string[] = [];

  for (const item of impactItems) {
    if (cmd.includes('npm test') || cmd.includes('typecheck')) {
      // Test and typecheck failures relate to module and test areas
      if (item.type === 'MODULE' || item.type === 'TEST' || item.type === 'CONTRACT_TEST') {
        if (!areas.includes(item.path)) areas.push(item.path);
      }
    } else if (cmd.includes('lint')) {
      // Lint failures could be anywhere in the changed files
      if (item.confidence === 'CONFIRMED') {
        if (!areas.includes(item.path)) areas.push(item.path);
      }
    }
  }

  return areas.slice(0, 10); // cap at 10 areas
}

// ─── Main Triage Entry Point ─────────────────────────────────

/**
 * Triage all failed check runs for a release candidate.
 * Creates Finding and Evidence records for each failure.
 * Returns the list of all findings (including pre-existing ones).
 */
export async function triageFailures(releaseCandidateId: string): Promise<Finding[]> {
  // Return cached findings if already computed
  const existing = getFindingsByReleaseCandidate(releaseCandidateId);
  if (existing.length > 0) {
    return existing;
  }

  const plan = getVerificationPlanByReleaseCandidate(releaseCandidateId);
  if (!plan) return [];

  const checkRuns = getCheckRunsByPlan(plan.id);
  const impactItems = getImpactItemsByReleaseCandidate(releaseCandidateId);

  const failedRuns = checkRuns.filter((run) => run.status === 'FAILED');

  for (const run of failedRuns) {
    const item = getVerificationItemById(run.verificationItemId);
    if (!item) continue;

    const command = item.command;
    const severity = classifySeverity(command);
    const category = classifyCategory(command);
    const title = buildFindingTitle(command, run.exitCode ?? 1);
    const affectedAreas = findAffectedAreas(command, impactItems);

    // Build a concise summary from the output
    const summary = buildSummary(run, command);

    const finding = createFinding({
      releaseCandidateId,
      category,
      severity,
      status: 'FAILED',
      title,
      summary,
      sourceCheckId: run.id,
      affectedAreas,
    });

    // Create evidence record linking to the check run output
    createEvidence({
      findingId: finding.id,
      type: 'COMMAND_OUTPUT',
      source: command,
      excerpt: truncateOutput(run.stdout || run.stderr, 500),
    });

    // Create file reference evidence for confirmed impact areas
    for (const area of affectedAreas.slice(0, 3)) {
      createEvidence({
        findingId: finding.id,
        type: 'FILE_REFERENCE',
        source: area,
        excerpt: `Impacted area: ${area}`,
      });
    }
  }

  return getFindingsByReleaseCandidate(releaseCandidateId);
}

// ─── Private Helpers ─────────────────────────────────────────

function buildSummary(run: CheckRun, command: string): string {
  const output = (run.stdout || run.stderr || '').trim();
  const excerpt = truncateOutput(output, 200);
  return `Command "${command}" exited with code ${run.exitCode ?? '?'}. ${excerpt ? `Output: ${excerpt}` : 'No output captured.'}`;
}

function truncateOutput(output: string, maxChars: number): string {
  if (!output) return '';
  const trimmed = output.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, maxChars) + '…';
}
