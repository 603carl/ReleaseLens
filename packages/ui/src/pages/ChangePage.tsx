import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';
import { getChanges, getDiff } from '../api/client.ts';
import {
  PageHeader,
  EmptyState,
  ErrorState,
  Spinner,
  LoadingCard,
  MetricCard,
} from '../components/shared/index.tsx';
import type { Change, ChangeType } from '../types/domain.ts';

const CHANGE_TYPE_CONFIG: Record<ChangeType, { label: string; cls: string; icon: string }> = {
  ADDED:    { label: 'Added',    cls: 'badge-passed', icon: '+' },
  MODIFIED: { label: 'Modified', cls: 'badge-info',   icon: '~' },
  DELETED:  { label: 'Deleted',  cls: 'badge-failed', icon: '−' },
  RENAMED:  { label: 'Renamed',  cls: 'badge-running', icon: '→' },
};

function classifyFilePath(path: string): { dir: string; file: string } {
  const parts = path.split('/');
  const file = parts[parts.length - 1] ?? path;
  const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
  return { dir, file };
}

// ─── Unified Diff Viewer Component ────────────────────────────
function DiffViewer({ diffText, filePath }: { diffText: string; filePath: string }) {
  if (!diffText.trim()) {
    return (
      <div className="p-8 text-center text-xs font-mono text-fg-subtle">
        No unified diff content recorded for {filePath}.
      </div>
    );
  }

  const lines = diffText.split('\n');

  return (
    <div className="font-mono text-2xs overflow-x-auto scrollbar-thin select-text">
      {lines.map((line, idx) => {
        let lineClass = 'text-fg-muted';
        let bgClass = 'bg-transparent';

        if (line.startsWith('@@')) {
          lineClass = 'text-[#EA580C] font-bold';
          bgClass = 'bg-[#EA580C]/10 border-y border-[#EA580C]/20 py-0.5';
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          lineClass = 'text-[#56d364]';
          bgClass = 'bg-[#0f3322]/60 border-l-2 border-[#3fb950]';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          lineClass = 'text-[#f85149]';
          bgClass = 'bg-[#3d0c0c]/40 border-l-2 border-[#f85149]';
        } else if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
          lineClass = 'text-[#6e7681]';
          bgClass = 'bg-[#0d1117]/50';
        }

        return (
          <div
            key={idx}
            className={`flex items-center px-3 py-0.5 hover:bg-surface-raised/40 font-mono ${bgClass}`}
          >
            <span className="w-10 text-right pr-3 select-none text-fg-subtle text-[10px] opacity-40 font-mono">
              {idx + 1}
            </span>
            <span className={`whitespace-pre font-mono leading-relaxed ${lineClass}`}>{line}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ChangePage() {
  const { repository, releaseCandidate } = useAppContext();
  const navigate = useNavigate();
  const [changes, setChanges] = useState<Change[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<string>('');
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (releaseCandidate) loadChanges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseCandidate?.id]);

  useEffect(() => {
    if (releaseCandidate && selectedFile) {
      loadDiffForFile(selectedFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile, releaseCandidate?.id]);

  async function loadChanges() {
    if (!releaseCandidate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getChanges(releaseCandidate.id);
      if ('error' in result) { setError(result.error.message); return; }
      setChanges(result.data);
      if (result.data.length > 0 && !selectedFile) {
        setSelectedFile(result.data[0].path);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDiffForFile(path: string) {
    if (!releaseCandidate) return;
    setLoadingDiff(true);
    try {
      const result = await getDiff(releaseCandidate.id, path);
      if ('data' in result) {
        setFileDiff(result.data.diff);
      } else {
        setFileDiff('');
      }
    } catch {
      setFileDiff('');
    } finally {
      setLoadingDiff(false);
    }
  }

  const totalAdded = changes.reduce((sum, c) => sum + c.linesAdded, 0);
  const totalRemoved = changes.reduce((sum, c) => sum + c.linesRemoved, 0);
  const totalDelta = totalAdded - totalRemoved;

  const filteredChanges = changes.filter((c) =>
    c.path.toLowerCase().includes(searchFilter.toLowerCase().trim()),
  );

  const activeChange = changes.find((c) => c.path === selectedFile);

  return (
    <div className="workbench-container">
      <PageHeader
        title="Change Inventory"
        description={
          repository && releaseCandidate
            ? `${repository.name} :: ${releaseCandidate.baseRef} → ${releaseCandidate.targetRef}`
            : 'Git diff change set and line mutation statistics.'
        }
        actions={
          <div className="flex items-center gap-2.5">
            {releaseCandidate && (
              <button onClick={loadChanges} disabled={loading} className="btn btn-secondary text-xs">
                {loading ? <Spinner size="sm" /> : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
                  </svg>
                )}
                Refresh Diff
              </button>
            )}
            {changes.length > 0 && (
              <button onClick={() => navigate('/impact')} className="btn btn-primary text-xs">
                <span>Proceed to Impact Scope</span>
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
          action={
            <button onClick={() => navigate('/overview')} className="btn btn-secondary">
              Go to Overview
            </button>
          }
        />
      )}

      {error && <ErrorState message={error} retry={loadChanges} />}
      {loading && !changes.length && <LoadingCard message="Computing Git diff and hunk statistics…" />}

      {changes.length > 0 && (
        <>
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Files Changed" value={String(changes.length)} sub="Distinct file paths" />
            <MetricCard label="Lines Added" value={`+${totalAdded}`} valueClass="text-emerald-400" sub="Additions (+)" />
            <MetricCard label="Lines Removed" value={`-${totalRemoved}`} valueClass="text-red-400" sub="Deletions (−)" />
            <MetricCard
              label="Net Line Delta"
              value={`${totalDelta >= 0 ? '+' : ''}${totalDelta}`}
              valueClass={totalDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}
              sub="Codebase net shift"
            />
          </div>

          {/* Two-Pane Interactive Diff Workbench */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Pane: File Selector Tree */}
            <div className="lg:col-span-4 workbench-card overflow-hidden">
              <div className="p-3 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between">
                <span className="text-2xs font-mono font-semibold uppercase tracking-wider text-[#8b949e]">
                  Changed Files ({filteredChanges.length})
                </span>
                <span className="text-2xs font-mono text-[#EA580C]">
                    {releaseCandidate?.baseRef}
                  </span>
              </div>

              {/* Filter */}
              <div className="p-2 border-b border-[#30363d] bg-[#0d1117]">
                <input
                  type="text"
                  placeholder="Filter changed files…"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="input py-1 text-2xs"
                />
              </div>

              {/* File list */}
              <div className="divide-y divide-border/60 min-h-[580px] max-h-[760px] overflow-y-auto scrollbar-thin">
                {filteredChanges.map((change) => {
                  const { dir, file } = classifyFilePath(change.path);
                  const isSelected = selectedFile === change.path;
                  const cfg = CHANGE_TYPE_CONFIG[change.changeType];

                  return (
                    <button
                      key={change.id}
                      onClick={() => setSelectedFile(change.path)}
                      className={`w-full flex items-center justify-between p-3 text-left transition-colors font-mono ${
                          isSelected
                            ? 'bg-[#2d1a00] border-l-2 border-[#EA580C]'
                            : 'hover:bg-[#1c2128]'
                        }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-2xs text-[#6e7681] truncate">{dir ? `${dir}/` : ''}</div>
                        <div className={`text-xs font-semibold truncate ${isSelected ? 'text-[#EA580C]' : 'text-[#e6edf3]'}`}>
                          {file}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-2xs">
                        <span className={`badge ${cfg.cls}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="text-emerald-400 font-bold">+{change.linesAdded}</span>
                        <span className="text-red-400 font-bold">−{change.linesRemoved}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Interactive Unified Git Diff Preview */}
            <div className="lg:col-span-8 workbench-card overflow-hidden">
              <div className="workbench-card-header flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-[#6e7681]">PATCH VIEW:</span>
                  <span className="font-semibold text-[#EA580C]">{selectedFile || 'Select a file'}</span>
                </div>
                {activeChange && (
                  <div className="flex items-center gap-2 text-2xs font-mono">
                    <span className="text-emerald-400 font-bold">+{activeChange.linesAdded}</span>
                    <span className="text-red-400 font-bold">−{activeChange.linesRemoved}</span>
                  </div>
                )}
              </div>

              {/* Patch container — dark background for code diff readability */}
              <div className="bg-[#0a0d12] border-t border-border min-h-[580px] max-h-[760px] overflow-auto scrollbar-thin">
                {loadingDiff ? (
                  <div className="flex items-center justify-center p-16">
                    <Spinner size="lg" />
                    <span className="ml-3 text-xs font-mono text-fg-muted">Extracting unified git diff patch…</span>
                  </div>
                ) : fileDiff ? (
                  <DiffViewer diffText={fileDiff} filePath={selectedFile ?? ''} />
                ) : (
                  <div className="p-12 text-center text-xs font-mono text-fg-subtle">
                    Select a modified file from the left to inspect its exact Git hunk changes.
                  </div>
                )}
              </div>

              <div className="p-2.5 border-t border-[#30363d] bg-[#0d1117] text-2xs font-mono text-[#6e7681] flex justify-between">
                <span>Git Patch Mode: Unified 3-line context</span>
                <span>Deterministic Evidence Reference</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
