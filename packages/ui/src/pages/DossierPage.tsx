import { useState, useEffect } from 'react';
import { marked } from 'marked';
import { useAppContext } from '../context/AppContext.tsx';
import { getDossier, generateDossier } from '../api/client.ts';
import {
  PageHeader,
  EmptyState,
  ErrorState,
  Spinner,
  LoadingCard,
  StatusBadge,
  InlineAlert,
} from '../components/shared/index.tsx';
import type { Dossier } from '../types/domain.ts';

const DOSSIER_SECTIONS = [
  { id: '1-release-candidate-identification', label: '1. Identification' },
  { id: '2-verification-status-summary', label: '2. Status Summary' },
  { id: '3-change-inventory-summary', label: '3. Change Inventory' },
  { id: '4-impact-analysis-scope', label: '4. Impact Scope' },
  { id: '5-verification-plan', label: '5. Verification Plan' },
  { id: '6-check-execution-results', label: '6. Check Results' },
  { id: '7-findings-triage', label: '7. Findings Triage' },
  { id: '8-evidence-index', label: '8. Evidence Index' },
  { id: '9-known-unknowns-coverage-gaps', label: '9. Known Unknowns' },
  { id: '10-release-decision-gate', label: '10. Decision Gate' },
  { id: '11-verification-provenance', label: '11. Provenance' },
];

export function DossierPage() {
  const { releaseCandidate } = useAppContext();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (releaseCandidate) loadDossier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseCandidate?.id]);

  async function loadDossier() {
    if (!releaseCandidate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getDossier(releaseCandidate.id);
      if ('error' in result) {
        if (result.error.code !== 'NOT_FOUND') setError(result.error.message);
        return;
      }
      setDossier(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!releaseCandidate) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateDossier(releaseCandidate.id);
      if ('error' in result) { setError(result.error.message); return; }
      setDossier(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopyMarkdown() {
    if (!dossier) return;
    try {
      await navigator.clipboard.writeText(dossier.markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = dossier.markdownContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDownloadMarkdown() {
    if (!dossier) return;
    const blob = new Blob([dossier.markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `release-dossier-${releaseCandidate?.label || 'verification'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const htmlContent = dossier ? (marked.parse(dossier.markdownContent) as string) : '';

  return (
    <div className="workbench-container">
      <PageHeader
        title="Release Verification Dossier"
        description="Audit-ready 11-section verification dossier compiling all evidence, checks, findings, and provenance."
        actions={
          <div className="flex items-center gap-2.5 no-print">
            {releaseCandidate && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn btn-primary text-xs font-mono py-2"
              >
                {generating ? <Spinner size="sm" /> : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                )}
                {dossier ? 'Regenerate Dossier' : 'Generate Dossier'}
              </button>
            )}

            {dossier && (
              <>
                <button
                  onClick={handleCopyMarkdown}
                  className="btn btn-secondary text-xs font-mono"
                  title="Copy full markdown source"
                >
                  {copied ? (
                    <span className="text-emerald-400 font-bold">✓ Copied</span>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      <span>Copy Markdown</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadMarkdown}
                  className="btn btn-secondary text-xs font-mono"
                  title="Download raw .md file"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span>Download .md</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="btn btn-secondary text-xs font-mono"
                  title="Print or export as PDF"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  <span>Print Dossier</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {!releaseCandidate && (
        <EmptyState
          title="No release candidate selected"
          description="Load a repository and complete verification before compiling the dossier."
          action={<button onClick={() => { window.location.href = '/overview'; }} className="btn btn-secondary">Go to Overview</button>}
        />
      )}

      {error && <ErrorState message={error} retry={loadDossier} />}
      {loading && <LoadingCard message="Compiling markdown verification dossier and indexing evidence…" />}

      {!loading && releaseCandidate && !dossier && !error && (
        <EmptyState
          title="No verification dossier compiled yet"
          description="Complete the verification checks and click 'Generate Dossier' to assemble the release verification artifact."
          action={
            <button onClick={handleGenerate} disabled={generating} className="btn btn-primary font-mono text-xs py-2">
              {generating ? <Spinner size="sm" /> : null}
              Generate Verification Dossier
            </button>
          }
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          }
        />
      )}

      {dossier && (
        <>
          {/* Metadata Banner */}
          <div className="workbench-card p-4 no-print flex items-center justify-between flex-wrap gap-4 font-mono text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[#8b949e]">VERIFICATION STATUS:</span>
                <StatusBadge status={dossier.verificationStatus} />
              </div>
              <div className="text-[#8b949e] hidden sm:inline">|</div>
              <div className="text-[#8b949e]">
                Generated: {new Date(dossier.generatedAt).toLocaleString()}
              </div>
            </div>
            <div className="text-[#EA580C] font-semibold text-2xs uppercase">
              Release Decision Gate: Requires Engineering Review
            </div>
          </div>

          {/* Status Alerts */}
          {dossier.verificationStatus === 'FAILED' && (
            <InlineAlert variant="critical" title="Release Verification Status: FAILED">
              One or more deterministic checks failed (e.g. Contract Tests, Lint violations). Under ReleaseLens rules, releases must not be deployed until critical issues are resolved or officially waived.
            </InlineAlert>
          )}

          {dossier.verificationStatus === 'PASSED' && (
            <InlineAlert variant="success" title="Release Verification Status: PASSED (Automated Checks)">
              All deterministic automated checks completed with exit code 0. Note: automated checks do not guarantee an absence of defects; final release sign-off remains human responsibility.
            </InlineAlert>
          )}

          {/* Two-Column Dossier Layout */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Table of Contents */}
            <div className="hidden lg:block lg:col-span-3 workbench-card p-4 sticky top-28 space-y-3 font-mono text-xs no-print">
              <span className="text-2xs font-semibold uppercase tracking-wider text-[#8b949e] block pb-2 border-b border-[#30363d]">
                Dossier Sections
              </span>
              <nav className="space-y-1">
                {DOSSIER_SECTIONS.map((sec) => (
                  <div
                    key={sec.id}
                    className="p-1.5 text-2xs text-[#8b949e] hover:text-[#EA580C] hover:bg-[#1c2128]/40 rounded transition-colors block truncate"
                  >
                    {sec.label}
                  </div>
                ))}
              </nav>

              <div className="pt-3 border-t border-[#30363d] text-[11px] text-[#6e7681] leading-relaxed">
                Deterministic provenance: compiled directly from SQLite store with SHA-256 integrity links.
              </div>
            </div>

            {/* Right Column: Markdown Rendered Dossier */}
            <div className="lg:col-span-9 workbench-card p-8 overflow-hidden">
              <article
                className="prose prose-sm max-w-none font-sans leading-relaxed selection:bg-[#EA580C] selection:text-white prose-invert"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          </div>

          <div className="p-4 rounded border border-[#30363d] bg-[#161b22] text-2xs font-mono text-[#6e7681] text-center no-print">
            ReleaseLens Principle #5: Never claim a release is safe solely because automated checks passed. Every release is an empirical decision.
          </div>
        </>
      )}
    </div>
  );
}
