import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';
import { getFindings, generateDossier } from '../api/client.ts';
import {
  PageHeader,
  EmptyState,
  ErrorState,
  Spinner,
  LoadingCard,
  SeverityBadge,
  StatusBadge,
  CodeBlock,
  MetricCard,
  InlineAlert,
} from '../components/shared/index.tsx';
import type { Finding } from '../types/domain.ts';

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };

export function FindingsPage() {
  const { releaseCandidate } = useAppContext();
  const navigate = useNavigate();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (releaseCandidate) loadFindings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseCandidate?.id]);

  async function loadFindings() {
    if (!releaseCandidate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getFindings(releaseCandidate.id);
      if ('error' in result) { setError(result.error.message); return; }
      const sorted = [...result.data].sort((a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99)
      );
      setFindings(sorted);
      if (sorted.length > 0) {
        // Expand the first finding by default for instant visibility
        setExpanded(new Set([sorted[0].id]));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateDossier() {
    if (!releaseCandidate) return;
    setGenerating(true);
    try {
      const result = await generateDossier(releaseCandidate.id);
      if ('error' in result) { setError(result.error.message); return; }
      navigate('/dossier');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount     = findings.filter((f) => f.severity === 'HIGH').length;
  const mediumCount   = findings.filter((f) => f.severity === 'MEDIUM' || f.severity === 'LOW').length;

  return (
    <div className="workbench-container">
      <PageHeader
        title="Findings & Deterministic Triage"
        description="Failures, static violations, and evidence mapped to affected repository areas."
        actions={
          <div className="flex items-center gap-2.5">
            {releaseCandidate && (
              <button onClick={loadFindings} disabled={loading} className="btn btn-secondary text-xs font-mono">
                {loading ? <Spinner size="sm" /> : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
                  </svg>
                )}
                Refresh Triage
              </button>
            )}
            {releaseCandidate && (
              <button
                onClick={handleGenerateDossier}
                disabled={generating}
                className="btn btn-primary text-xs font-mono py-2"
              >
                {generating ? (
                  <>
                    <Spinner size="sm" />
                    <span>Compiling Dossier…</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <span>Generate Release Dossier</span>
                  </>
                )}
              </button>
            )}
          </div>
        }
      />

      {!releaseCandidate && (
        <EmptyState
          title="No release candidate selected"
          description="Load a repository and execute the verification suite first."
          action={<button onClick={() => navigate('/overview')} className="btn btn-secondary">Go to Overview</button>}
        />
      )}

      {error && <ErrorState message={error} retry={loadFindings} />}
      {loading && !findings.length && <LoadingCard message="Triaging check outputs and linking evidence artifacts…" />}

      {!loading && releaseCandidate && findings.length === 0 && !error && (
        <EmptyState
          title="No verification findings recorded"
          description="Either all verification checks passed cleanly, or checks have not yet been executed."
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          }
        />
      )}

      {findings.length > 0 && (
        <>
          {/* Severity Counters */}
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              label="Critical Findings"
              value={String(criticalCount)}
              valueClass="text-red-400"
              sub="Contract test failures (hard release gate)"
            />
            <MetricCard
              label="High Severity"
              value={String(highCount)}
              valueClass={highCount > 0 ? 'text-orange-400' : 'text-slate-400'}
              sub="Unit test, typecheck, build failures"
            />
            <MetricCard
              label="Medium / Low Severity"
              value={String(mediumCount)}
              valueClass={mediumCount > 0 ? 'text-amber-400' : 'text-slate-400'}
              sub="Linter & style rule violations"
            />
          </div>

          {/* CRITICAL Gate Banner */}
          {criticalCount > 0 && (
            <InlineAlert
              variant="critical"
              title={`CRITICAL Release Gate Triggered: ${criticalCount} Contract Violation(s)`}
            >
              Non-negotiable rule: Release candidate cannot proceed to production until CRITICAL findings are addressed or explicitly accepted with formal engineering justification.
            </InlineAlert>
          )}

          {/* Findings List */}
          <div className="space-y-4">
            {findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                expanded={expanded.has(finding.id)}
                onToggle={() => toggleExpand(finding.id)}
              />
            ))}
          </div>

          <div className="p-4 rounded border border-[#30363d] bg-[#161b22] text-2xs font-mono text-[#6e7681] text-center">
            Non-negotiable principle: Deterministic checks over invented conclusions. Every finding above is traceable to automated check outputs or repository artifacts.
          </div>
        </>
      )}
    </div>
  );
}

// ─── Finding Card Component ────────────────────────────────────

function FindingCard({
  finding,
  expanded,
  onToggle,
}: {
  finding: Finding;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isCritical = finding.severity === 'CRITICAL';
  const isHigh = finding.severity === 'HIGH';

  let borderHighlight = 'border-[#30363d]';
  if (isCritical) borderHighlight = 'border-[#6e1414] shadow-[0_0_20px_rgba(248,81,73,0.15)]';
  else if (isHigh) borderHighlight = 'border-[#5a3400]';

  return (
    <div className={`workbench-card overflow-hidden transition-all ${borderHighlight}`}>
      <button
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-surface-raised transition-colors font-mono"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="mt-0.5 shrink-0">
          <SeverityBadge severity={finding.severity} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`text-sm font-bold ${isCritical ? 'text-[#f85149]' : 'text-[#e6edf3]'}`}>
              {finding.title}
            </span>
            <StatusBadge status={finding.status} />
            <span className="text-2xs px-2 py-0.5 rounded bg-[#1c2128] border border-[#30363d] text-[#8b949e] uppercase">
              {finding.category.replace(/_/g, ' ')}
            </span>
          </div>

          {finding.affectedAreas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {finding.affectedAreas.map((area) => (
                <span
                  key={area}
                  className="font-mono text-2xs px-2 py-0.5 rounded-full bg-[#2d1a00] border border-[#5a3400] text-[#EA580C] font-semibold"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-fg-subtle text-xs mt-1">
          {expanded ? '▲' : '▼'}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#30363d] p-5 bg-[#1c2128] space-y-4 font-mono text-xs">
          {/* Summary description */}
          <div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-[#8b949e] block mb-1">
              Deterministic Finding Summary
            </span>
            <div className="p-3 bg-[#161b22] rounded-xl border border-[#30363d] text-[#8b949e] leading-relaxed">
              {finding.summary}
            </div>
          </div>

          {/* Evidence items */}
          {finding.evidence.length > 0 && (
            <div>
              <span className="text-2xs font-semibold uppercase tracking-wider text-[#8b949e] block mb-2">
                Traceable Evidence Artifacts ({finding.evidence.length})
              </span>
              <div className="space-y-3">
                {finding.evidence.map((ev) => (
                  <div key={ev.id} className="p-3.5 bg-[#161b22] rounded-xl border border-[#30363d] space-y-2">
                    <div className="flex items-center gap-2 flex-wrap text-2xs">
                      <span className="badge badge-info">{ev.type.replace(/_/g, ' ')}</span>
                      <code className="text-[#EA580C] font-semibold">{ev.source}</code>
                      <span className="text-[#6e7681] ml-auto">
                        Captured: {new Date(ev.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {ev.excerpt && (
                      <div className="mt-2">
                        <CodeBlock content={ev.excerpt} maxLines={18} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Provenance Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[#30363d]/60 text-2xs text-[#6e7681]">
            <span>Source Check: {finding.sourceCheckId}</span>
            <span>Recorded at: {new Date(finding.createdAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
