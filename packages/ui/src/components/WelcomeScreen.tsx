import { useState, useEffect } from 'react';

interface CodeCheckLine {
  id: number;
  text: string;
  status: 'typing' | 'checking' | 'passed' | 'failed' | 'gated';
  annotation?: string;
  type?: 'diff-del' | 'diff-add' | 'command' | 'test' | 'provenance';
}

const ANIMATED_STEPS: CodeCheckLine[] = [
  {
    id: 1,
    text: '$ git diff --name-status HEAD~1...HEAD',
    status: 'passed',
    annotation: '2 modified files detected',
    type: 'command',
  },
  {
    id: 2,
    text: '  M src/orders/pricing.ts',
    status: 'checking',
    annotation: 'AST Dependency Trace :: CONFIRMED',
    type: 'diff-add',
  },
  {
    id: 3,
    text: '- return basePrice * (1 - discountPercent / 100);',
    status: 'checking',
    annotation: 'Original logic deleted (-3 lines)',
    type: 'diff-del',
  },
  {
    id: 4,
    text: '+ return basePrice * (1 - discountPercent); // BUG: missing / 100',
    status: 'checking',
    annotation: 'Regression introduced (+8 lines)',
    type: 'diff-add',
  },
  {
    id: 5,
    text: 'RUN  tests/contracts/orders.test.ts > contract discount calculation',
    status: 'typing',
    annotation: 'Executing contract suite...',
    type: 'test',
  },
  {
    id: 6,
    text: 'FAIL tests/contracts/orders.test.ts: expected 90, received -900',
    status: 'failed',
    annotation: 'CRITICAL FAILURE DETECTED',
    type: 'test',
  },
  {
    id: 7,
    text: 'RULE: Contract test fail -> CRITICAL SEVERITY GATE [BLOCKED]',
    status: 'gated',
    annotation: 'Zero invention · Provenance locked',
    type: 'provenance',
  },
];

export function WelcomeScreen({
  onLaunchDemo,
  demoLoading,
}: {
  onLaunchDemo: () => void;
  demoLoading: boolean;
}) {
  const [visibleLines, setVisibleLines] = useState<number>(1);
  const [scanning, setScanning] = useState<boolean>(true);

  // Animated line-by-line typing and verification sequence
  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= ANIMATED_STEPS.length) {
          // Loop animation after brief pause
          setTimeout(() => setVisibleLines(1), 2400);
          return prev;
        }
        return prev + 1;
      });
    }, 750);

    return () => clearInterval(interval);
  }, [scanning]);

  return (
    <div className="workbench-card p-6 border-border bg-[#0e131b] overflow-hidden relative">
      {/* Decorative scanning sweep line */}
      <div className="absolute inset-x-0 h-[2px] bg-[#EA580C]/30 pointer-events-none" style={{ animation: 'codeScanSweep 3.5s ease-in-out infinite' }} />

      <div className="grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Mission & Demo Action */}
        <div className="lg:col-span-5 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-2xs font-mono text-accent">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>REAL-TIME VERIFICATION ENGINE</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-fg leading-tight">
            Evidence-Backed Release Verification Workbench
          </h2>

          <p className="text-xs text-fg-muted leading-relaxed">
            Compress manual release verification into an empirical, deterministic 9-stage pipeline.
            Zero assertions without proof. Every failure traceable to repository artifacts.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onLaunchDemo}
              disabled={demoLoading}
              className="btn btn-primary px-5 py-2.5 text-xs font-mono"
            >
              {demoLoading ? (
                <span>Mounting Demo Repository…</span>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  <span>Launch Interactive Demo</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setVisibleLines(1);
                setScanning(true);
              }}
              className="btn btn-secondary px-3.5 py-2 text-2xs font-mono"
              title="Replay Code Check Animation"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
              <span>Replay Scanner</span>
            </button>
          </div>

          <div className="pt-2 text-2xs font-mono text-fg-subtle flex items-center gap-3">
            <span>• No cloud dependencies</span>
            <span>• Local SQLite store</span>
            <span>• Allowlisted executor</span>
          </div>
        </div>

        {/* Right Column: Animated Code Verification Terminal */}
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-border bg-[#06090e] shadow-2xl overflow-hidden font-mono">
            {/* Terminal Header */}
            <div className="px-4 py-2.5 bg-surface border-b border-border flex items-center justify-between text-2xs text-fg-muted">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f85149]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#d29922]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#3fb950]" />
                <span className="ml-2 text-fg-subtle">code-verification-scanner.ts</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-accent font-semibold">● LIVE PROOF SCANNER</span>
                <span className="text-fg-subtle">
                  [{Math.min(visibleLines, ANIMATED_STEPS.length)}/{ANIMATED_STEPS.length}]
                </span>
              </div>
            </div>

            {/* Code Lines Container */}
            <div className="p-4 space-y-2 text-2xs min-h-[260px] max-h-[300px] overflow-y-auto scrollbar-thin select-none">
              {ANIMATED_STEPS.slice(0, visibleLines).map((step) => {
                let badgeCls = 'text-fg-muted bg-surface border-border';
                let symbol = '✓';

                if (step.status === 'failed') {
                  badgeCls = 'text-red-400 bg-red-950/40 border-red-800';
                  symbol = '✕';
                } else if (step.status === 'gated') {
                  badgeCls = 'text-[#EA580C] bg-orange-950/40 border-orange-800 font-bold';
                  symbol = '🛡';
                } else if (step.status === 'checking') {
                  badgeCls = 'text-amber-400 bg-amber-950/40 border-amber-800';
                  symbol = '🔍';
                }

                let lineTextColor = 'text-fg-muted';
                if (step.type === 'diff-del') lineTextColor = 'text-red-300 bg-red-950/20 px-1 py-0.5 rounded';
                if (step.type === 'diff-add') lineTextColor = 'text-emerald-300 bg-emerald-950/20 px-1 py-0.5 rounded';
                if (step.type === 'test') lineTextColor = step.status === 'failed' ? 'text-red-400 font-bold' : 'text-fg';
                if (step.type === 'provenance') lineTextColor = 'text-accent font-bold';

                return (
                  <div
                    key={step.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 transition-all duration-200 animate-fadeIn"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-4 text-right text-fg-subtle text-[10px]">
                        {step.id}
                      </span>
                      <span className={`truncate ${lineTextColor}`}>
                        {step.text}
                      </span>
                    </div>

                    {step.annotation && (
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded border ${badgeCls}`}>
                        {symbol} {step.annotation}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Typing cursor */}
              <div className="flex items-center gap-2 pt-1 text-fg-subtle text-[10px]">
                <span className="w-4 text-right">#</span>
                <span className="text-accent animate-cursor-blink">▋</span>
                <span className="italic">analyzing AST contract interfaces...</span>
              </div>
            </div>

            {/* Terminal Status Bar */}
            <div className="px-4 py-1.5 bg-[#0a0d12] border-t border-border flex items-center justify-between text-[11px] text-fg-subtle">
              <span>Deterministic Rule Engine: v1.0.0</span>
              <span className="text-emerald-400">Zero Invention Guarantee</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
