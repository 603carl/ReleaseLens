/**
 * ReleaseLens API Client
 * Typed fetch wrapper for all API endpoints.
 */
import type {
  Repository,
  ReleaseCandidate,
  Status,
  Change,
  ImpactItem,
  VerificationPlan,
  CheckRun,
  Finding,
  Dossier,
} from '../types/domain.ts';

const API_ENDPOINT = '/api/health';
const DEMO_CACHE_KEY = 'releaselens:vercelDemoWorkflow';

interface DemoWorkflow {
  changes: Change[];
  diff: { diff: string };
  impactItems: ImpactItem[];
  plan: VerificationPlan;
  checks: {
    planId: string;
    releaseCandidateId: string;
    results: Array<{
      itemId: string;
      runId?: string;
      command: string;
      status: Status;
      exitCode?: number;
      durationMs?: number;
    }>;
    overallStatus: Status;
  };
  findings: Finding[];
  dossier: Dossier;
}

interface DemoWorkflowCache {
  responses: Record<string, unknown>;
}

function getCachedResponse<T>(method: string, route: string): { data: T } | null {
  try {
    const cache = JSON.parse(localStorage.getItem(DEMO_CACHE_KEY) ?? 'null') as DemoWorkflowCache | null;
    const key = `${method}:${route}`;
    if (cache && Object.prototype.hasOwnProperty.call(cache.responses, key)) {
      return { data: cache.responses[key] as T };
    }
  } catch {
    localStorage.removeItem(DEMO_CACHE_KEY);
  }
  return null;
}

async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<{ data: T } | { error: { code: string; message: string } }> {
  const [route, query = ''] = url.split('?');
  const method = (options?.method ?? 'GET').toUpperCase();
  const cached = getCachedResponse<T>(method, route.replace(/^\/+/, ''));
  if (cached) return cached;

  const params = new URLSearchParams(query);
  params.set('__api_route', route.replace(/^\/+/, ''));
  const res = await fetch(`${API_ENDPOINT}?${params.toString()}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    return {
      error: {
        code: 'INVALID_API_RESPONSE',
        message: `API returned HTTP ${res.status} with ${contentType || 'an unknown content type'} instead of JSON.`,
      },
    };
  }
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
  return apiFetch<{
    planId: string;
    releaseCandidateId: string;
    results: Array<{
      itemId: string;
      runId?: string;
      command: string;
      status: Status;
      exitCode?: number;
      durationMs?: number;
    }>;
    overallStatus: Status;
  }>('/checks/run', {
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

export async function launchDemo() {
  localStorage.removeItem(DEMO_CACHE_KEY);
  const result = await apiFetch<{
    repository: Repository;
    releaseCandidate: ReleaseCandidate;
    workflow?: DemoWorkflow;
  }>('/demo/launch', {
    method: 'POST',
  });
  if ('data' in result && result.data.workflow) {
    const { repository, releaseCandidate, workflow } = result.data;
    const responses: Record<string, unknown> = {
      'GET:repositories': [repository],
      [`GET:repositories/${repository.id}/release-candidates`]: [releaseCandidate],
      [`GET:release-candidates/${releaseCandidate.id}/changes`]: workflow.changes,
      [`GET:release-candidates/${releaseCandidate.id}/diff`]: workflow.diff,
      [`GET:release-candidates/${releaseCandidate.id}/impact`]: workflow.impactItems,
      [`GET:release-candidates/${releaseCandidate.id}/plan`]: workflow.plan,
      'POST:checks/run': workflow.checks,
      [`GET:findings/${releaseCandidate.id}`]: workflow.findings,
      [`GET:dossier/${releaseCandidate.id}`]: workflow.dossier,
      [`POST:dossier/${releaseCandidate.id}`]: workflow.dossier,
    };
    localStorage.setItem(DEMO_CACHE_KEY, JSON.stringify({ responses } satisfies DemoWorkflowCache));
  }
  return result;
}

export async function resetDemo() {
  localStorage.removeItem(DEMO_CACHE_KEY);
  return apiFetch<{ message: string; timestamp: string }>('/demo/reset', { method: 'POST' });
}
