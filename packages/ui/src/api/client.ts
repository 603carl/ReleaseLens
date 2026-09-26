/**
 * ReleaseLens API Client
 * Typed fetch wrapper for all API endpoints.
 */
import type {
  Repository,
  ReleaseCandidate,
  Change,
  ImpactItem,
  VerificationPlan,
  CheckRun,
  Finding,
  Dossier,
} from '../types/domain.ts';

const BASE_URL = '/api';

async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<{ data: T } | { error: { code: string; message: string } }> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  return res.json() as Promise<{ data: T } | { error: { code: string; message: string } }>;
}

// ─── Repository ──────────────────────────────────────────────

export async function getRepositories() {
  return apiFetch<Repository[]>('/repositories');
}

export async function getRepository(id: string) {
  return apiFetch<Repository & { releaseCandidates: ReleaseCandidate[] }>(`/repositories/${id}`);
}

export async function createRepository(data: { path: string; name?: string }) {
  return apiFetch<Repository>('/repositories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteRepository(id: string) {
  return apiFetch<{ success: boolean; message: string }>(`/repositories/${id}`, {
    method: 'DELETE',
  });
}

export async function syncRepository(id: string) {
  return apiFetch<Repository>(`/repositories/${id}/sync`, {
    method: 'POST',
  });
}

// ─── Release Candidates ──────────────────────────────────────

export async function createReleaseCandidate(
  repositoryId: string,
  data: { baseRef: string; targetRef?: string; label?: string },
) {
  return apiFetch<ReleaseCandidate>(`/repositories/${repositoryId}/release-candidates`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getReleaseCandidates(repositoryId: string) {
  return apiFetch<ReleaseCandidate[]>(`/repositories/${repositoryId}/release-candidates`);
}

// ─── Changes ─────────────────────────────────────────────────

export async function getChanges(releaseCandidateId: string) {
  return apiFetch<Change[]>(`/release-candidates/${releaseCandidateId}/changes`);
}

export async function getDiff(releaseCandidateId: string, filePath?: string) {
  const query = filePath ? `?path=${encodeURIComponent(filePath)}` : '';
  return apiFetch<{ diff: string }>(`/release-candidates/${releaseCandidateId}/diff${query}`);
}

// ─── Impact ──────────────────────────────────────────────────

export async function getImpact(releaseCandidateId: string) {
  return apiFetch<ImpactItem[]>(`/release-candidates/${releaseCandidateId}/impact`);
}

// ─── Verification ────────────────────────────────────────────

export async function getVerificationPlan(releaseCandidateId: string) {
  return apiFetch<VerificationPlan>(`/release-candidates/${releaseCandidateId}/plan`);
}

export async function runChecks(releaseCandidateId: string) {
  return apiFetch<{ started: boolean; planId: string }>('/checks/run', {
    method: 'POST',
    body: JSON.stringify({ releaseCandidateId }),
  });
}

export async function getCheckRun(id: string) {
  return apiFetch<CheckRun>(`/checks/${id}`);
}

// ─── Findings ────────────────────────────────────────────────

export async function getFindings(releaseCandidateId: string) {
  return apiFetch<Finding[]>(`/findings/${releaseCandidateId}`);
}

// ─── Dossier ─────────────────────────────────────────────────

export async function generateDossier(releaseCandidateId: string) {
  return apiFetch<Dossier>(`/dossier/${releaseCandidateId}`, { method: 'POST' });
}

export async function getDossier(releaseCandidateId: string) {
  return apiFetch<Dossier>(`/dossier/${releaseCandidateId}`);
}

// ─── Demo ────────────────────────────────────────────────────

export async function resetDemo() {
  return apiFetch<{ message: string; timestamp: string }>('/demo/reset', { method: 'POST' });
}
