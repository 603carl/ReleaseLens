import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext.tsx';
import {
  getRepositories,
  createRepository,
  deleteRepository,
  syncRepository,
  createReleaseCandidate,
  getReleaseCandidates,
  resetDemo,
} from '../api/client.ts';
import {
  StatusBadge,
  Spinner,
  ErrorState,
  PageHeader,
} from '../components/shared/index.tsx';
import type { Repository, ReleaseCandidate } from '../types/domain.ts';

const DEMO_PATH = '../../demo-repository';
const DEMO_BASE_REF = 'HEAD~1';
const DEMO_LABEL = 'RC-pricing-discount-v1.0.1';

export function OverviewPage() {
  const { repository, releaseCandidate, setRepository, setReleaseCandidate } = useAppContext();
  const navigate = useNavigate();

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [repoPath, setRepoPath] = useState('');
  const [repoName, setRepoName] = useState('');
  const [baseRef, setBaseRef] = useState('HEAD~1');
  const [rcLabel, setRcLabel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const repositoryRef = React.useRef(repository);
  repositoryRef.current = repository;

  const loadAllRepos = useCallback(async () => {
    setLoadingRepos(true);
    try {
      const res = await getRepositories();
      if ('data' in res) {
        setRepositories(res.data);
        if (!repositoryRef.current && res.data.length > 0) {
          const first = res.data[0];
          setRepository(first);
          const rcs = await getReleaseCandidates(first.id);
          if ('data' in rcs && rcs.data.length > 0) {
            setReleaseCandidate(rcs.data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load repositories from DB', err);
    } finally {
      setLoadingRepos(false);
    }
  }, [setRepository, setReleaseCandidate]);

  useEffect(() => {
    loadAllRepos();
    const pollInterval = setInterval(() => loadAllRepos(), 15000);
    return () => clearInterval(pollInterval);
  }, [loadAllRepos]);

  async function handleSelectRepo(targetRepo: Repository) {
    setRepository(targetRepo);
    try {
      const rcs = await getReleaseCandidates(targetRepo.id);
      if ('data' in rcs && rcs.data.length > 0) {
        setReleaseCandidate(rcs.data[0]);
      } else {
        setReleaseCandidate(null);
      }
      showNotification(`Active repository: "${targetRepo.name}"`);
    } catch {
      setReleaseCandidate(null);
    }
  }

  async function handleSyncRepo(targetRepo: Repository, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setSyncingId(targetRepo.id);
    try {
      const res = await syncRepository(targetRepo.id);
      if ('data' in res) {
        showNotification(`Synced ${targetRepo.name}: ${res.data.branch} (${res.data.commitHash.slice(0, 7)})`);
        await loadAllRepos();
        if (repository?.id === targetRepo.id) setRepository(res.data);
      } else {
        setError(res.error.message);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDeleteRepo(targetRepo: Repository, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Remove "${targetRepo.name}" from ReleaseLens?`)) return;
    setDeletingId(targetRepo.id);
    try {
      const res = await deleteRepository(targetRepo.id);
      if ('data' in res) {
        showNotification(`"${targetRepo.name}" deleted.`);
        if (repository?.id === targetRepo.id) {
          setRepository(null);
          setReleaseCandidate(null);
        }
        await loadAllRepos();
      } else {
        setError(res.error.message);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddRepo(e: React.FormEvent) {
    e.preventDefault();
    if (!repoPath.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await createRepository({ path: repoPath.trim(), name: repoName.trim() || undefined });
      if ('error' in res) { setError(res.error.message); return; }
      const newRepo = res.data as Repository;
      showNotification(`Added "${newRepo.name}"`);
      setRepoPath('');
      setRepoName('');
      setShowAddForm(false);
      await loadAllRepos();
      await handleSelectRepo(newRepo);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadDemo() {
    setDemoLoading(true);
    setError(null);
    try {
      const repoResult = await createRepository({ path: DEMO_PATH, name: 'demo-repository' });
      if ('error' in repoResult) { setError(repoResult.error.message); return; }
      const repo = repoResult.data as Repository;
      setRepository(repo);
      const rcResult = await createReleaseCandidate(repo.id, { baseRef: DEMO_BASE_REF, label: DEMO_LABEL });
      if ('error' in rcResult) { setError(rcResult.error.message); return; }
      setReleaseCandidate(rcResult.data as ReleaseCandidate);
      await loadAllRepos();
      showNotification('Demo repository mounted.');
      navigate('/change');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDemoLoading(false);
    }
  }

  async function handleCreateRC(e: React.FormEvent) {
    e.preventDefault();
    if (!repository) return;
    setError(null);
    setLoading(true);
    try {
      const result = await createReleaseCandidate(repository.id, {
        baseRef: baseRef.trim() || 'HEAD~1',
        label: rcLabel.trim() || `RC-${new Date().toISOString().slice(0, 10)}`,
      });
      if ('error' in result) { setError(result.error.message); return; }
      setReleaseCandidate(result.data as ReleaseCandidate);
      showNotification('Release candidate initialized.');
      navigate('/change');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!confirm('Clear all stored repositories and evaluation runs?')) return;
    try {
      await resetDemo();
      setRepository(null);
      setReleaseCandidate(null);
      setRepositories([]);
      showNotification('All repositories reset.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const activeRepo = repository;

  return (
    <div className="workbench-container">
      {/* Page Header */}
      <PageHeader
        title="Overview"
        description="Manage repositories, configure release candidates, and launch verification."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddForm((p) => !p)} className="btn btn-primary text-sm">
              + Add Repository
            </button>
            <button onClick={handleLoadDemo} disabled={demoLoading} className="btn btn-secondary text-sm">
              {demoLoading ? <Spinner size="sm" /> : null}
              Load Demo
            </button>
            <button onClick={handleReset} className="btn btn-danger text-sm font-mono" title="Reset all database records">
              Reset
            </button>
          </div>
        }
      />

      {/* Notifications */}
      {statusMsg && (
        <div className="p-3 bg-[#0f3322] border border-[#196c2e] text-[#3fb950] text-sm font-semibold rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-[#3fb950] hover:text-[#56d364] font-bold ml-4">✕</button>
        </div>
      )}
      {error && <ErrorState message={error} retry={() => setError(null)} />}

      {/* Add Repository Form */}
      {showAddForm && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
            <h3 className="text-sm font-bold text-[#e6edf3] uppercase tracking-wide">Add Repository</h3>
            <button onClick={() => setShowAddForm(false)} className="text-[#8b949e] hover:text-[#e6edf3] font-bold text-lg leading-none">✕</button>
          </div>
          <form onSubmit={handleAddRepo} className="grid sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-6">
              <label htmlFor="input-repo-path" className="label">Filesystem Path</label>
              <input
                id="input-repo-path"
                type="text"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="e.g. C:/Users/Admin/Desktop/my-project"
                required
                className="input"
              />
            </div>
            <div className="sm:col-span-4">
              <label htmlFor="input-repo-name" className="label">Display Name (optional)</label>
              <input
                id="input-repo-name"
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="e.g. order-service"
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={loading || !repoPath.trim()} className="btn btn-primary w-full text-sm">
                {loading ? <Spinner size="sm" /> : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main two-pane layout */}
      <div className="grid lg:grid-cols-12 gap-5 items-start">

        {/* Left: Repository list */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-sm font-bold uppercase tracking-wider text-[#8b949e]">
            <span>Repositories ({repositories.length})</span>
            {loadingRepos && <Spinner size="sm" />}
          </div>

          {repositories.length === 0 && !loadingRepos ? (
            <div className="p-6 text-center rounded-xl bg-[#0d1117] border border-[#30363d]">
              <p className="text-sm font-semibold text-[#e6edf3]">No repositories loaded</p>
              <p className="text-sm text-[#8b949e] mt-1">Add a repository above or load the demo scenario.</p>
              <button
                onClick={handleLoadDemo}
                disabled={demoLoading}
                className="mt-4 px-5 py-2 rounded-full bg-[#EA580C] text-white font-semibold text-sm hover:bg-[#C2410C] transition-colors"
              >
                {demoLoading ? 'Mounting…' : 'Load Demo'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {repositories.map((repo) => {
                const isActive = activeRepo?.id === repo.id;
                const isSyncing = syncingId === repo.id;
                const isDeleting = deletingId === repo.id;
                return (
                  <div
                    key={repo.id}
                    onClick={() => handleSelectRepo(repo)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all border flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-[#0d1117] border-[#EA580C]'
                        : 'bg-[#161b22] border-[#30363d] hover:border-[#484f58] hover:bg-[#1c2128]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#e6edf3] truncate">{repo.name}</span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-[#EA580C] text-white text-xs font-bold shrink-0">ACTIVE</span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-[#8b949e] mt-0.5 truncate">
                        {repo.branch} · <span className="text-[#6e7681]">{repo.commitHash.slice(0, 7)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleSyncRepo(repo, e)}
                        disabled={isSyncing}
                        className="p-1.5 rounded-lg bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] transition-colors"
                        title="Sync"
                      >
                        {isSyncing ? <Spinner size="sm" /> : <span className="text-sm">↻</span>}
                      </button>
                      <button
                        onClick={(e) => handleDeleteRepo(repo, e)}
                        disabled={isDeleting}
                        className="p-1.5 rounded-lg bg-[#21262d] text-[#f85149] hover:bg-[#3d0c0c] transition-colors"
                        title="Delete"
                      >
                        <span className="text-sm">✕</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Demo shortcut when no demo loaded */}
          {repositories.length > 0 && !repositories.some((r) => r.name === 'demo-repository') && (
            <button
              onClick={handleLoadDemo}
              disabled={demoLoading}
              className="w-full py-2.5 rounded-xl border border-dashed border-[#30363d] text-[#8b949e] hover:border-[#EA580C] hover:text-[#EA580C] font-mono text-sm transition-all"
            >
              + Mount Demo Scenario
            </button>
          )}
        </div>

        {/* Right: Active repo details + RC configuration */}
        <div className="lg:col-span-8 bg-[#161b22] rounded-xl border border-[#30363d] overflow-hidden">
          {activeRepo ? (
            <>
              {/* Repo header */}
              <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-[#8b949e] uppercase tracking-wider">Active Workspace</span>
                    <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
                  </div>
                  <h2 className="text-lg font-bold text-[#e6edf3] truncate">{activeRepo.name}</h2>
                  <p className="text-xs text-[#6e7681] font-mono truncate mt-0.5">{activeRepo.path}</p>
                </div>
                <button
                  onClick={() => handleSyncRepo(activeRepo)}
                  disabled={syncingId === activeRepo.id}
                  className="btn btn-secondary text-sm shrink-0"
                >
                  {syncingId === activeRepo.id ? <Spinner size="sm" /> : '⚡ Sync'}
                </button>
              </div>

              {/* Metadata row */}
              <div className="px-5 py-3 grid grid-cols-3 gap-3 border-b border-[#30363d] font-mono">
                <div className="bg-[#0d1117] rounded-lg p-3">
                  <div className="text-xs text-[#8b949e] uppercase mb-1">Branch</div>
                  <div className="text-sm font-bold text-[#EA580C] truncate">{activeRepo.branch}</div>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3">
                  <div className="text-xs text-[#8b949e] uppercase mb-1">HEAD</div>
                  <div className="text-sm font-bold text-[#e6edf3]">{activeRepo.commitHash.slice(0, 8)}</div>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3">
                  <div className="text-xs text-[#8b949e] uppercase mb-1">Stack</div>
                  <div className="text-sm font-bold text-[#e6edf3] truncate">{activeRepo.detectedStack || 'Node.js'}</div>
                </div>
              </div>

              {/* RC section */}
              <div className="p-5">
                {releaseCandidate ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-mono text-[#8b949e] uppercase tracking-wider mb-1">Release Candidate</div>
                        <div className="text-base font-bold text-[#e6edf3]">{releaseCandidate.label}</div>
                      </div>
                      <StatusBadge status={releaseCandidate.status} />
                    </div>
                    <div className="bg-[#0d1117] rounded-lg p-3 font-mono text-sm flex items-center justify-between border border-[#30363d]">
                      <span className="text-[#8b949e]">Base: <span className="text-[#d29922] font-bold">{releaseCandidate.baseRef}</span></span>
                      <span className="text-[#8b949e]">Target: <span className="text-[#3fb950] font-bold">{releaseCandidate.targetRef}</span></span>
                    </div>
                    <button
                      onClick={() => navigate('/change')}
                      className="w-full py-3 rounded-full bg-[#EA580C] text-white font-bold text-sm hover:bg-[#C2410C] transition-all flex items-center justify-center gap-2"
                    >
                      <span>Inspect Change Inventory & Diff</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-xs font-mono text-[#8b949e] uppercase tracking-wider">Configure Release Candidate</div>
                    <form onSubmit={handleCreateRC} className="space-y-3">
                      <div>
                        <label htmlFor="input-base-ref" className="label">Base Reference</label>
                        <input
                          id="input-base-ref"
                          type="text"
                          value={baseRef}
                          onChange={(e) => setBaseRef(e.target.value)}
                          placeholder="HEAD~1, main, or v1.0.0"
                          required
                          className="input"
                        />
                      </div>
                      <div>
                        <label htmlFor="input-rc-label" className="label">Release Label (optional)</label>
                        <input
                          id="input-rc-label"
                          type="text"
                          value={rcLabel}
                          onChange={(e) => setRcLabel(e.target.value)}
                          placeholder="v1.0.1-rc1"
                          className="input"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading || !baseRef.trim()}
                        className="w-full py-3 rounded-full bg-[#EA580C] text-white font-bold text-sm hover:bg-[#C2410C] transition-all"
                      >
                        {loading ? <Spinner size="sm" /> : 'Initialize Release Candidate'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm font-mono text-[#6e7681]">
              Select a repository from the list to configure release verification.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
