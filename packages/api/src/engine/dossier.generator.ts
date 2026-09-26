/**
 * Dossier Generator
 * Generates a structured Markdown release-verification dossier.
 * 
 * Structure (11 sections per spec 02_PRODUCT_REQUIREMENTS.md):
 * 1. Executive verification summary
 * 2. Release candidate
 * 3. Change inventory
 * 4. Impact map
 * 5. Verification plan
 * 6. Checks executed
 * 7. Findings
 * 8. Unresolved items
 * 9. Evidence index
 * 10. Reproduction commands
 * 11. Engineering sign-off placeholder
 * 
 * CRITICAL: Never auto-declare a release safe.
 */
import type {
  Repository,
  ReleaseCandidate,
  Change,
  ImpactItem,
  VerificationPlan,
  CheckRun,
  Finding,
} from '../types/domain.js';

export interface DossierInput {
  repository: Repository;
  releaseCandidate: ReleaseCandidate;
  changes: Change[];
  impactItems: ImpactItem[];
  plan: VerificationPlan | null;
  checkRuns: CheckRun[];
  findings: Finding[];
}

/**
 * Compute the overall verification status for the dossier.
 * 
 * Rules:
 * - Any CRITICAL finding → NOT_VERIFIED (must not be declared safe)
 * - Any FAILED check → NOT_VERIFIED
 * - Zero checks run → NOT_VERIFIED
 * - All checks PASSED + zero findings → PASSED (but engineering judgment still required)
 * 
 * NEVER returns "safe" — this is a core product principle.
 */
export function computeVerificationStatus(
  findings: Finding[],
  checkRuns: CheckRun[],
): 'PASSED' | 'FAILED' | 'NOT_VERIFIED' {
  if (checkRuns.length === 0) return 'NOT_VERIFIED';

  const hasCritical = findings.some((f) => f.severity === 'CRITICAL');
  const hasFailed = checkRuns.some((r) => r.status === 'FAILED');
  const allPassed = checkRuns.every((r) => r.status === 'PASSED');

  if (hasCritical || hasFailed) return 'FAILED';
  if (allPassed && findings.length === 0) return 'PASSED';
  return 'NOT_VERIFIED';
}

export function generateDossierMarkdown(input: DossierInput): string {
  const {
    repository,
    releaseCandidate,
    changes,
    impactItems,
    plan,
    checkRuns,
    findings,
  } = input;

  const generatedAt = new Date().toISOString();
  const verificationStatus = computeVerificationStatus(findings, checkRuns);
  const statusLabel =
    verificationStatus === 'PASSED'
      ? '✅ CHECKS PASSED — ENGINEERING JUDGMENT REQUIRED'
      : verificationStatus === 'FAILED'
      ? '❌ VERIFICATION FAILED — DO NOT RELEASE WITHOUT REVIEW'
      : '⚠️ NOT VERIFIED — RELEASE REQUIRES MANUAL VERIFICATION';

  const lines: string[] = [];

  // ─── Header ─────────────────────────────────────────────────

  lines.push(`# Release Verification Dossier`);
  lines.push(`\n**Generated:** ${generatedAt}`);
  lines.push(`**Repository:** ${repository.name}`);
  lines.push(`**Release Candidate:** ${releaseCandidate.label}`);
  lines.push(`\n---`);

  // ─── 1. Executive Verification Summary ──────────────────────

  lines.push(`\n## 1. Executive Verification Summary`);
  lines.push(`\n> **${statusLabel}**`);
  lines.push(`\n| Metric | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Files Changed | ${changes.length} |`);
  lines.push(`| Impact Areas | ${impactItems.length} |`);
  lines.push(`| Checks Executed | ${checkRuns.length} |`);
  lines.push(`| Checks Passed | ${checkRuns.filter((r) => r.status === 'PASSED').length} |`);
  lines.push(`| Checks Failed | ${checkRuns.filter((r) => r.status === 'FAILED').length} |`);
  lines.push(`| Findings | ${findings.length} |`);
  lines.push(`| Critical Findings | ${findings.filter((f) => f.severity === 'CRITICAL').length} |`);
  lines.push(`| UNKNOWN Impact Areas | ${impactItems.filter((i) => i.confidence === 'UNKNOWN').length} |`);

  lines.push(`\n⚠️ _ReleaseLens does not replace engineering judgment. This dossier presents evidence. The release decision belongs to the engineering team._`);

  // ─── 2. Release Candidate ────────────────────────────────────

  lines.push(`\n---\n\n## 2. Release Candidate`);
  lines.push(`\n| Field | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Label | ${releaseCandidate.label} |`);
  lines.push(`| Base Ref | \`${releaseCandidate.baseRef}\` |`);
  lines.push(`| Target Ref | \`${releaseCandidate.targetRef}\` |`);
  lines.push(`| Repository | ${repository.name} |`);
  lines.push(`| Branch | \`${repository.branch}\` |`);
  lines.push(`| Commit | \`${repository.commitHash}\` |`);
  lines.push(`| Stack | ${repository.detectedStack} |`);

  // ─── 3. Change Inventory ─────────────────────────────────────

  lines.push(`\n---\n\n## 3. Change Inventory`);
  lines.push(`\n${changes.length} file(s) changed.\n`);

  if (changes.length > 0) {
    lines.push(`| File | Type | +Lines | −Lines |`);
    lines.push(`|---|---|---|---|`);
    for (const change of changes) {
      lines.push(`| \`${change.path}\` | ${change.changeType} | ${change.linesAdded} | ${change.linesRemoved} |`);
    }
  } else {
    lines.push(`_No changes detected._`);
  }

  // ─── 4. Impact Map ───────────────────────────────────────────

  lines.push(`\n---\n\n## 4. Impact Map`);
  lines.push(`\n${impactItems.length} area(s) affected.\n`);

  if (impactItems.length > 0) {
    lines.push(`| Area | Type | Confidence | Reason |`);
    lines.push(`|---|---|---|---|`);
    for (const item of impactItems) {
      lines.push(`| \`${item.path}\` | ${item.type} | **${item.confidence}** | ${item.reason} |`);
    }

    const unknownCount = impactItems.filter((i) => i.confidence === 'UNKNOWN').length;
    if (unknownCount > 0) {
      lines.push(`\n> ⚠️ **${unknownCount} UNKNOWN area(s)** — these cannot be automatically verified. Manual inspection required.`);
    }
  } else {
    lines.push(`_Impact analysis not run._`);
  }

  // ─── 5. Verification Plan ────────────────────────────────────

  lines.push(`\n---\n\n## 5. Verification Plan`);

  if (plan && plan.items.length > 0) {
    lines.push(`\n| Check | Command | Expected | Status |`);
    lines.push(`|---|---|---|---|`);
    for (const item of plan.items) {
      lines.push(`| ${item.name} | \`${item.command}\` | ${item.expectedOutcome} | **${item.status}** |`);
    }
  } else {
    lines.push(`\n_Verification plan not generated._`);
  }

  // ─── 6. Checks Executed ──────────────────────────────────────

  lines.push(`\n---\n\n## 6. Checks Executed`);

  if (checkRuns.length > 0) {
    for (const run of checkRuns) {
      const statusIcon = run.status === 'PASSED' ? '✅' : run.status === 'FAILED' ? '❌' : '⏳';
      lines.push(`\n### ${statusIcon} Check Run \`${run.id.slice(0, 8)}\``);
      lines.push(`\n- **Status:** ${run.status}`);
      lines.push(`- **Exit Code:** ${run.exitCode ?? 'N/A'}`);
      lines.push(`- **Started:** ${run.startedAt}`);
      lines.push(`- **Completed:** ${run.completedAt ?? 'N/A'}`);

      if (run.stdout) {
        lines.push(`\n**Output:**`);
        lines.push('```');
        lines.push(run.stdout.slice(0, 1000));
        if (run.stdout.length > 1000) lines.push('... (truncated)');
        lines.push('```');
      }
      if (run.stderr && run.stderr.trim()) {
        lines.push(`\n**Stderr:**`);
        lines.push('```');
        lines.push(run.stderr.slice(0, 500));
        lines.push('```');
      }
    }
  } else {
    lines.push(`\n_No checks executed._`);
  }

  // ─── 7. Findings ─────────────────────────────────────────────

  lines.push(`\n---\n\n## 7. Findings`);

  if (findings.length > 0) {
    for (const finding of findings) {
      const severityIcon =
        finding.severity === 'CRITICAL' ? '🔴' :
        finding.severity === 'HIGH' ? '🟠' :
        finding.severity === 'MEDIUM' ? '🟡' :
        '🔵';

      lines.push(`\n### ${severityIcon} ${finding.severity} — ${finding.title}`);
      lines.push(`\n- **Category:** ${finding.category}`);
      lines.push(`- **Status:** ${finding.status}`);
      lines.push(`- **Source Check:** \`${finding.sourceCheckId}\``);

      if (finding.affectedAreas.length > 0) {
        lines.push(`- **Affected Areas:** ${finding.affectedAreas.map((a) => `\`${a}\``).join(', ')}`);
      }

      lines.push(`\n**Summary:** ${finding.summary}`);

      if (finding.evidence.length > 0) {
        lines.push(`\n**Evidence:**`);
        for (const ev of finding.evidence) {
          lines.push(`- [${ev.type}] \`${ev.source}\`: ${ev.excerpt}`);
        }
      }
    }
  } else {
    lines.push(`\n_No findings recorded._`);
  }

  // ─── 8. Unresolved Items ─────────────────────────────────────

  lines.push(`\n---\n\n## 8. Unresolved Items`);

  const unresolvedFindings = findings.filter((f) => f.status !== 'PASSED');
  const unknownAreas = impactItems.filter((i) => i.confidence === 'UNKNOWN');

  if (unresolvedFindings.length === 0 && unknownAreas.length === 0) {
    lines.push(`\n_No unresolved items._`);
  } else {
    if (unresolvedFindings.length > 0) {
      lines.push(`\n### Unresolved Findings (${unresolvedFindings.length})`);
      for (const f of unresolvedFindings) {
        lines.push(`- **${f.severity}** ${f.title}`);
      }
    }
    if (unknownAreas.length > 0) {
      lines.push(`\n### UNKNOWN Impact Areas (${unknownAreas.length})`);
      for (const item of unknownAreas) {
        lines.push(`- \`${item.path}\` — ${item.reason}`);
      }
    }
  }

  // ─── 9. Evidence Index ───────────────────────────────────────

  lines.push(`\n---\n\n## 9. Evidence Index`);
  lines.push(`\n| ID | Finding | Type | Source |`);
  lines.push(`|---|---|---|---|`);

  for (const finding of findings) {
    for (const ev of finding.evidence) {
      lines.push(`| \`${ev.id.slice(0, 8)}\` | ${finding.title} | ${ev.type} | \`${ev.source}\` |`);
    }
  }

  if (findings.every((f) => f.evidence.length === 0)) {
    lines.push(`\n_No evidence records._`);
  }

  // ─── 10. Reproduction Commands ───────────────────────────────

  lines.push(`\n---\n\n## 10. Reproduction Commands`);
  lines.push(`\nTo reproduce this verification run:\n`);
  lines.push('```bash');
  lines.push(`# 1. Ensure you are on the correct branch/commit`);
  lines.push(`git checkout ${repository.branch}`);
  lines.push(`# Commit: ${repository.commitHash}`);
  lines.push(``);
  lines.push(`# 2. Run checks`);
  if (plan && plan.items.length > 0) {
    for (const item of plan.items) {
      lines.push(`${item.command}  # ${item.name}`);
    }
  } else {
    lines.push(`npm test`);
    lines.push(`npm run typecheck`);
    lines.push(`npm run lint`);
  }
  lines.push('```');

  // ─── 11. Engineering Sign-off Placeholder ────────────────────

  lines.push(`\n---\n\n## 11. Engineering Sign-off`);
  lines.push(`\n_This dossier was generated automatically by ReleaseLens and requires human review._`);
  lines.push(`\n| | |`);
  lines.push(`|---|---|`);
  lines.push(`| **Reviewer** | _________________________ |`);
  lines.push(`| **Date** | _________________________ |`);
  lines.push(`| **Decision** | ☐ Approved for release  ☐ Changes required  ☐ Rejected |`);
  lines.push(`| **Notes** | _________________________ |`);
  lines.push(`\n---`);
  lines.push(`\n_Generated by ReleaseLens. ReleaseLens does not declare releases safe._`);

  return lines.join('\n');
}
