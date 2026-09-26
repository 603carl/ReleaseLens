import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';
import { getImpact } from '../api/client.ts';
import {
  PageHeader,
  EmptyState,
  ErrorState,
  Spinner,
  LoadingCard,
  MetricCard,
  ConfidenceBadge,
  InlineAlert,
} from '../components/shared/index.tsx';
import type { ImpactItem, ImpactType } from '../types/domain.ts';

const TYPE_CONFIG: Record<ImpactType, { label: string; badgeCls: string }> = {
  MODULE:        { label: 'Module',   badgeCls: 'badge-info' },
  TEST:          { label: 'Unit Test', badgeCls: 'badge-passed' },
  CONTRACT_TEST: { label: 'Contract Test', badgeCls: 'badge-critical' },
  CONFIG:        { label: 'Config',   badgeCls: 'badge-medium' },
  SHARED:        { label: 'Shared',   badgeCls: 'badge-info' },
  UNKNOWN:       { label: 'Unknown',  badgeCls: 'badge-unknown' },
};

const CONFIDENCE_ORDER: Record<string, number> = { CONFIRMED: 0, SUPPORTED: 1, UNKNOWN: 2 };

export function ImpactPage() {
  const { releaseCandidate } = useAppContext();
  const navigate = useNavigate();
  const [items, setItems] = useState<ImpactItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ImpactItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterConfidence, setFilterConfidence] = useState<string>('ALL');

  useEffect(() => {
    if (releaseCandidate) loadImpact();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseCandidate?.id]);

  async function loadImpact() {
    if (!releaseCandidate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getImpact(releaseCandidate.id);
      if ('error' in result) { setError(result.error.message); return; }
      const sorted = [...result.data].sort((a, b) => {
        const confDiff = (CONFIDENCE_ORDER[a.confidence] ?? 3) - (CONFIDENCE_ORDER[b.confidence] ?? 3);
        if (confDiff !== 0) return confDiff;
        return a.path.localeCompare(b.path);
      });
      setItems(sorted);
      if (sorted.length > 0 && !selectedItem) {
        setSelectedItem(sorted[0]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const confirmed = items.filter((i) => i.confidence === 'CONFIRMED').length;
  const supported = items.filter((i) => i.confidence === 'SUPPORTED').length;
  const unknown = items.filter((i) => i.confidence === 'UNKNOWN').length;
  const contractImpacted = items.some((i) => i.type === 'CONTRACT_TEST');

  const filteredItems = items.filter((item) => {
    if (filterConfidence === 'ALL') return true;
    return item.confidence === filterConfidence;
  });

  return (
    <div className="workbench-container">
      <PageHeader
        title="Impact Scope & Traceability"
        description="Deterministic reachability analysis mapping changed files to affected modules, tests, and API contracts."
        actions={
          <div className="flex items-center gap-2.5">
            {releaseCandidate && (
              <button onClick={loadImpact} disabled={loading} className="btn btn-secondary text-xs font-mono">
                {loading ? <Spinner size="sm" /> : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
                  </svg>
                )}
                Re-analyse Scope
              </button>
            )}
            {items.length > 0 && (
              <button onClick={() => navigate('/verification')} className="btn btn-primary text-xs font-mono">
                <span>Proceed to Verification Suite</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            )}
          </div>
        }
      />

      {!releaseCandidate && (
        <EmptyState
          title="No release candidate selected"
          description="Load a repository and initialize a release candidate from the Overview page."
          action={<button onClick={() => navigate('/overview')} className="btn btn-secondary">Go to Overview</button>}
        />
      )}

      {error && <ErrorState message={error} retry={loadImpact} />}
      {loading && !items.length && <LoadingCard message="Tracing module imports, contract tests and impact scope…" />}

      {items.length > 0 && (
        <>
          {/* Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total Impacted Areas" value={String(items.length)} sub="Nodes in scope" />
            <MetricCard label="Confirmed Reach" value={String(confirmed)} valueClass="text-accent" sub="Direct import trace" />
            <MetricCard label="Supported Path" value={String(supported)} valueClass="text-slate-300" sub="Module prefix match" />
            <MetricCard
              label="Unknown Coverage"
              value={String(unknown)}
              valueClass={unknown > 0 ? 'text-amber-400' : 'text-slate-500'}
              sub={unknown > 0 ? 'Requires manual verification' : 'Fully mapped'}
            />
          </div>

          {/* Scope Alerts */}
          {contractImpacted && (
            <InlineAlert variant="critical" title="Contract Tests in Impact Scope">
              Modified files have direct dependency linkages to API contracts. Under ReleaseLens deterministic rules, contract test failures are classified as CRITICAL release gates.
            </InlineAlert>
          )}

          {unknown > 0 && (
            <InlineAlert variant="warning" title={`${unknown} Impacted Area(s) with UNKNOWN Confidence`}>
              Changes detected in paths without explicit test mappings. UNKNOWN confidence is strictly preserved and never silently upgraded.
            </InlineAlert>
          )}

          {/* Two-Pane Impact Workbench */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Pane: Filterable List */}
            <div className="lg:col-span-6 workbench-card overflow-hidden">
              <div className="p-3 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between">
                <span className="text-2xs font-mono font-semibold uppercase tracking-wider text-[#8b949e]">
                  Affected Areas ({filteredItems.length})
                </span>

                {/* Confidence Filter Tabs */}
                <div className="flex gap-1">
                  {(['ALL', 'CONFIRMED', 'SUPPORTED', 'UNKNOWN'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setFilterConfidence(lvl)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold transition-colors ${
                        filterConfidence === lvl
                          ? 'bg-[#EA580C] text-white font-bold'
                          : 'bg-[#1c2128] text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-border/60 max-h-[560px] overflow-y-auto scrollbar-thin">
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const cfg = TYPE_CONFIG[item.type];

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`w-full flex items-start justify-between p-3.5 text-left font-mono transition-colors ${
                          isSelected
                            ? 'bg-[#2d1a00] border-l-2 border-[#EA580C]'
                            : 'hover:bg-[#1c2128]'
                        }`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`badge ${cfg.badgeCls}`}>{cfg.label}</span>
                          <ConfidenceBadge confidence={item.confidence} />
                        </div>
                        <div className={`text-xs font-semibold break-all ${isSelected ? 'text-[#EA580C]' : 'text-[#e6edf3]'}`}>
                          {item.path}
                        </div>
                        <div className="text-2xs text-[#8b949e] mt-1 truncate">
                          {item.reason}
                        </div>
                      </div>
                      <span className="text-fg-subtle text-xs">→</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Traceability & Provenance Inspector */}
            <div className="lg:col-span-6 workbench-card overflow-hidden">
              <div className="workbench-card-header">
                <span className="text-2xs font-mono font-semibold uppercase tracking-wider text-[#8b949e]">
                  Evidence & Traceability Inspector
                </span>
                <span className="text-2xs font-mono text-[#EA580C] font-semibold">Provenance Proof</span>
              </div>

              {selectedItem ? (
                <div className="p-5 space-y-5">
                  {/* Target Node */}
                  <div>
                    <span className="label">Target Path</span>
                    <div className="p-3 bg-[#2d1a00] rounded-xl border border-[#5a3400] font-mono text-xs text-[#EA580C] font-semibold break-all">
                      {selectedItem.path}
                    </div>
                  </div>

                  {/* Classification Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="label">Impact Classification</span>
                      <div className="p-2.5 bg-[#1c2128] rounded-xl border border-[#30363d] font-mono text-xs flex items-center gap-2">
                        <span className={`badge ${TYPE_CONFIG[selectedItem.type].badgeCls}`}>
                          {TYPE_CONFIG[selectedItem.type].label}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="label">Confidence Level</span>
                      <div className="p-2.5 bg-[#1c2128] rounded-xl border border-[#30363d] font-mono text-xs flex items-center gap-2">
                        <ConfidenceBadge confidence={selectedItem.confidence} />
                      </div>
                    </div>
                  </div>

                  {/* Deterministic Reason */}
                  <div>
                    <span className="label">Classification Rule & Rationale</span>
                    <div className="p-3 bg-[#1c2128] rounded-xl border border-[#30363d] text-xs text-[#8b949e] leading-relaxed font-mono">
                      {selectedItem.reason}
                    </div>
                  </div>

                  {/* Evidence References */}
                  <div>
                    <span className="label">Evidence Trace References</span>
                    <div className="space-y-2">
                      {selectedItem.evidenceRefs.length > 0 ? (
                        selectedItem.evidenceRefs.map((ref, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-[#0f3322] rounded-xl border border-[#196c2e] font-mono text-2xs text-[#3fb950] flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] shrink-0" />
                            <span className="break-all">{ref}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 bg-[#1c2128] rounded-xl border border-[#30363d] text-2xs font-mono text-[#8b949e] italic">
                          No direct import trace detected — confidence locked to UNKNOWN.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-xs font-mono text-fg-subtle">
                  Select an affected area to inspect its deterministic chain of evidence.
                </div>
              )}

              <div className="p-3 border-t border-[#30363d] bg-[#0d1117] text-2xs font-mono text-[#6e7681] flex justify-between">
                <span>Deterministic Check: AST Imports + Path Rules</span>
                <span>Principle #4: Never Fabricate Links</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
