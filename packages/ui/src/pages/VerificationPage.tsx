import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';
import { getVerificationPlan, runChecks } from '../api/client.ts';
import {
  PageHeader,
  EmptyState,
  ErrorState,
  Spinner,
  LoadingCard,
  StatusBadge,
  CodeBlock,
  MetricCard,
  InlineAlert,
} from '../components/shared/index.tsx';
import type { VerificationPlan, VerificationItem } from '../types/domain.ts';

const PIPELINE_STEPS = [
  { label: 'PLAN',       desc: 'Targeted plan from impact' },
  { label: 'EXECUTE',    desc: 'Spawn allowlisted checks' },
  { label: 'CONTRACTS',  desc: 'Verify API contracts' },
  { label: 'UNIT TESTS', desc: 'Unit & integration tests' },
  { label: 'TYPECHECK',  desc: 'TypeScript compiler' },
  { label: 'TRIAGE',     desc: 'Evidence collection' },
];

export function VerificationPage() {
  const { releaseCandidate } = useAppContext();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<VerificationPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const loadPlan = useCallback(async () => {
    if (!releaseCandidate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getVerificationPlan(releaseCandidate.id);
      if ('error' in result) {
        if (result.error.code !== 'NOT_FOUND') setError(result.error.message);
        return;
      }
      setPlan(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [releaseCandidate]);

  useEffect(() => {
    if (releaseCandidate) loadPlan();
  }, [loadPlan, releaseCandidate]);

  async function handleRunChecks() {
    if (!releaseCandidate) return;
    setRunning(true);
    setError(null);
    const startTime = Date.now();
    let elapsedInterval: ReturnType<typeof setInterval> | null = null;
    try {
      elapsedInterval = setInterval(() => setElapsedMs(Date.now() - startTime), 400);
      const result = await runChecks(releaseCandidate.id);
      if (elapsedInterval) clearInterval(elapsedInterval);
      setElapsedMs(Date.now() - startTime);
      if ('error' in result) { setError(result.error.message); return; }
      await loadPlan();
    } catch (err) {
      if (elapsedInterval) clearInterval(elapsedInterval);
      setError((err as Error).message);
    } finally {
      setRunning(false);
      if (elapsedInterval) clearInterval(elapsedInterval);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const passed  = plan?.items.filter((i) => i.status === 'PASSED').length ?? 0;
  const failed  = plan?.items.filter((i) => i.status === 'FAILED').length ?? 0;
  const pending = plan?.items.filter((i) => i.status === 'PENDING').length ?? 0;
  const hasResults = passed + failed > 0;
  const pipelineStep = !plan ? -1 : running ? 1 : hasResults ? (failed > 0 ? 3 : 5) : 0;

  return (
    <div className="workbench-container">
      <PageHeader
        title="Verification Execution Suite"
        description="Allowlisted child process test execution, contract assertion, and static verification."
        actions={
          releaseCandidate && (
            <div className="flex items-center gap-2.5">
              {hasResults && (
                <button onClick={() => navigate('/findings')} className="btn btn-secondary text-xs font-mono">
                  <span>Review Findings & Triage</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              )}
              <button
                onClick={handleRunChecks}
                disabled={running}
                className="btn btn-primary text-xs font-mono py-2"
              >
                {running ? (
                  <>
                    <Spinner size="sm" />
                    <span>Running… {elapsedMs !== null ? `${(elapsedMs / 1000).toFixed(1)}s` : ''}</span>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    <span>Execute Verification Suite</span>
                  </>
                )}
              </button>
            </div>
          )
        }
      />

      {!releaseCandidate && (
        <EmptyState
          title="No release candidate selected"
          description="Load a repository and initialize a release candidate from the Overview page."
          action={<button onClick={() => navigate('/overview')} className="btn btn-secondary">Go to Overview</button>}
        />
      )}

      {error && <ErrorState message={error} retry={loadPlan} />}

      {/* Pipeline Visual Stepper */}
      {releaseCandidate && (
        <div className="workbench-card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xs font-mono font-semibold uppercase tracking-wider text-fg-muted">
              Pipeline Stages
            </span>
            <span className="text-2xs font-mono text-fg-subtle">
              Allowlist Security: child_process.spawn only
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {PIPELINE_STEPS.map((step, idx) => {
              const isActive = idx === pipelineStep;
              const isDone   = idx < pipelineStep && pipelineStep >= 0;
              const isFailed = idx === 2 && failed > 0 && hasResults;

              let cardBg = 'bg-[#1c2128] border-[#30363d] text-[#8b949e]';
              if (isFailed) {
                cardBg = 'bg-[#3d0c0c] border-[#6e1414] text-[#f85149] font-bold';
              } else if (isDone) {
                cardBg = 'bg-[#0f3322] border-[#196c2e] text-[#3fb950]';
              } else if (isActive) {
                cardBg = 'bg-[#2d1a00] border-[#5a3400] text-[#EA580C] font-bold';
              }

              return (
                <div key={step.label} className={`p-2.5 rounded border font-mono text-2xs transition-all ${cardBg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">{step.label}</span>
                    <span>
                      {isDone && !isFailed ? '✓' : isFailed ? '!' : `${idx + 1}`}
                    </span>
                  </div>
                  <div className="text-[10px] opacity-75 truncate">{step.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Running Banner */}
      {running && (
        <div className="workbench-card p-5 border-[#5a3400] bg-[#1a0f00]">
          <div className="flex items-center gap-3 mb-2">
            <Spinner size="md" />
            <span className="text-sm font-bold font-mono text-[#EA580C]">
              EXECUTING ALLOWLISTED VERIFICATION CHECKS
            </span>
            {elapsedMs !== null && (
              <span className="text-xs font-mono text-fg-muted ml-auto">
                Elapsed: {(elapsedMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <p className="text-xs text-[#8b949e] font-mono mb-3">
            Spawning isolated subprocesses. Capturing exit codes, stdout, and stderr for deterministic triage.
          </p>
          <div className="progress-track">
            <div className="progress-fill-orange animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {loading && !plan && <LoadingCard message="Loading verification plan from store…" />}

      {!loading && !running && releaseCandidate && !plan && !error && (
        <EmptyState
          title="No verification plan generated"
          description="Click 'Execute Verification Suite' to synthesize an allowlisted plan and run all checks."
          action={
            <button onClick={handleRunChecks} className="btn btn-primary font-mono text-xs py-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Execute Verification Suite
            </button>
          }
        />
      )}

      {plan && (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total Checks" value={String(plan.items.length)} sub="In verification plan" />
            <MetricCard label="Passed" value={String(passed)} valueClass="text-emerald-400" sub="Exit code 0" />
            <MetricCard label="Failed" value={String(failed)} valueClass="text-red-400" sub={failed > 0 ? 'Requires triage' : 'None'} />
            <MetricCard label="Pending" value={String(pending)} valueClass="text-slate-400" sub="Awaiting run" />
          </div>

          {/* Failure Alert */}
          {failed > 0 && (
            <InlineAlert
              variant="critical"
              title={`${failed} Verification Check(s) FAILED — Release Blocked`}
            >
              Deterministic rule: release verification has detected critical contract or test failures. Releases must not proceed without engineering investigation and documented sign-off.{' '}
              <button onClick={() => navigate('/findings')} className="underline font-semibold text-red-300 ml-1">
                Inspect Findings →
              </button>
            </InlineAlert>
          )}

          {/* Verification Items List */}
          <div className="workbench-card overflow-hidden">
            <div className="workbench-card-header">
              <span className="text-2xs font-mono font-semibold uppercase tracking-wider text-fg-muted">
                Execution Results · {plan.items.length} Check(s)
              </span>
              <span className="text-2xs font-mono text-fg-subtle">
                Plan ID: {plan.id.slice(0, 12)}…
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {plan.items.map((item) => (
                <VerificationItemRow
                  key={item.id}
                  item={item}
                  expanded={expanded.has(item.id)}
                  onToggle={() => toggleExpand(item.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Item Row Component ────────────────────────────────────────

function VerificationItemRow({
  item,
  expanded,
  onToggle,
}: {
  item: VerificationItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isFailed = item.status === 'FAILED';
  const isPassed = item.status === 'PASSED';

  return (
    <div className={`transition-colors ${isFailed ? 'bg-[#1e0a0a]' : ''}`}>
      <button
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-surface-raised transition-colors font-mono"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="mt-0.5 shrink-0">
          <StatusBadge status={item.status} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold ${isFailed ? 'text-[#f85149]' : isPassed ? 'text-[#3fb950]' : 'text-[#e6edf3]'}`}>
              {item.name}
            </span>
            <span className="text-2xs px-1.5 py-0.5 rounded bg-[#1c2128] border border-[#30363d] text-[#8b949e]">
              {item.reason}
            </span>
          </div>

          <div className="mt-2 text-2xs text-fg-subtle">
              <code className="px-2 py-1 rounded-lg bg-[#2d1a00] border border-[#5a3400] text-[#EA580C] font-mono font-semibold">
                $ {item.command}
              </code>
            </div>
        </div>

        <div className="text-fg-subtle text-xs mt-1">
          {expanded ? '▲' : '▼'}
        </div>
      </button>

      {expanded && (
        <div className="p-4 bg-[#1c2128] border-t border-[#30363d] space-y-3 font-mono text-xs">
          <div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-[#8b949e]">Expected Outcome</span>
            <p className="text-2xs text-[#8b949e] mt-1 bg-[#161b22] p-2.5 rounded-xl border border-[#30363d]">
              {item.expectedOutcome}
            </p>
          </div>

          <div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-[#8b949e]">Allowlisted Execution Command</span>
            <div className="mt-1">
              <CodeBlock content={`$ ${item.command}`} maxLines={4} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
