// ============================================================
// ReleaseLens UI — Domain Types (mirrors packages/api/src/types/domain.ts)
// ============================================================

export type Status =
  | 'PENDING'
  | 'RUNNING'
  | 'PASSED'
  | 'FAILED'
  | 'BLOCKED'
  | 'UNKNOWN'
  | 'NOT_VERIFIED';

export type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Confidence = 'CONFIRMED' | 'SUPPORTED' | 'UNKNOWN';
export type ChangeType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED';
export type ImpactType = 'MODULE' | 'TEST' | 'CONTRACT_TEST' | 'CONFIG' | 'SHARED' | 'UNKNOWN';
export type EvidenceType = 'COMMAND_OUTPUT' | 'FILE_REFERENCE' | 'GIT_DIFF' | 'IMPORT_TRACE' | 'PATH_MATCH';
export type FindingCategory =
  | 'TEST_FAILURE'
  | 'CONTRACT_FAILURE'
  | 'TYPE_ERROR'
  | 'LINT_VIOLATION'
  | 'BUILD_FAILURE'
  | 'COVERAGE_GAP'
  | 'UNKNOWN_IMPACT';

export interface Repository {
  id: string;
  name: string;
  path: string;
  branch: string;
  commitHash: string;
  detectedStack: string;
  createdAt: string;
}

export interface ReleaseCandidate {
  id: string;
  repositoryId: string;
  baseRef: string;
  targetRef: string;
  label: string;
  status: Status;
  createdAt: string;
}

export interface Change {
  id: string;
  releaseCandidateId: string;
  path: string;
  changeType: ChangeType;
  linesAdded: number;
  linesRemoved: number;
}

export interface ImpactItem {
  id: string;
  releaseCandidateId: string;
  changeId: string;
  path: string;
  type: ImpactType;
  reason: string;
  confidence: Confidence;
  evidenceRefs: string[];
}

export interface VerificationItem {
  id: string;
  planId: string;
  name: string;
  reason: string;
  command: string;
  expectedOutcome: string;
  status: Status;
}

export interface VerificationPlan {
  id: string;
  releaseCandidateId: string;
  createdAt: string;
  items: VerificationItem[];
}

export interface CheckRun {
  id: string;
  verificationItemId: string;
  status: Status;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  startedAt: string;
  completedAt: string | null;
}

export interface Evidence {
  id: string;
  findingId: string;
  type: EvidenceType;
  source: string;
  excerpt: string;
  createdAt: string;
}

export interface Finding {
  id: string;
  releaseCandidateId: string;
  category: FindingCategory;
  severity: Severity;
  status: Status;
  title: string;
  summary: string;
  sourceCheckId: string;
  affectedAreas: string[];
  evidence: Evidence[];
  createdAt: string;
}

export interface Dossier {
  id: string;
  releaseCandidateId: string;
  generatedAt: string;
  markdownContent: string;
  verificationStatus: Status;
}
