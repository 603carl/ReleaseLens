import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface CodeCheckLine {
  id: number;
  text: string;
  status: 'typing' | 'checking' | 'passed' | 'failed' | 'gated';
  annotation?: string;
  type?: 'diff-del' | 'diff-add' | 'command' | 'test' | 'provenance';
}

const ANIMATED_STEPS: CodeCheckLine[] = [
  { id: 1, text: '$ git diff --name-status HEAD~1...HEAD', status: 'passed', annotation: '2 modified files detected', type: 'command' },
  { id: 2, text: '  M src/orders/pricing.ts', status: 'checking', annotation: 'AST Dependency Trace :: CONFIRMED', type: 'diff-add' },
  { id: 3, text: '- return basePrice * (1 - discountPercent / 100);', status: 'checking', annotation: 'Original logic deleted (-3 lines)', type: 'diff-del' },
  { id: 4, text: '+ return basePrice * (1 - discountPercent); // BUG: missing / 100', status: 'checking', annotation: 'Regression introduced (+8 lines)', type: 'diff-add' },
  { id: 5, text: 'RUN  tests/contracts/orders.test.ts > contract discount calculation', status: 'typing', annotation: 'Executing contract suite...', type: 'test' },
  { id: 6, text: 'FAIL tests/contracts/orders.test.ts: expected 90, received -900', status: 'failed', annotation: 'CRITICAL FAILURE DETECTED', type: 'test' },
  { id: 7, text: 'RULE: Contract test fail -> CRITICAL SEVERITY GATE [BLOCKED]', status: 'gated', annotation: 'Zero invention · Provenance locked', type: 'provenance' },
];

export function WelcomePage() {
  const navigate = useNavigate();
  const [visibleLines, setVisibleLines] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= ANIMATED_STEPS.length) {
          setTimeout(() => setVisibleLines(1), 2400);
          return prev;
        }
        return prev + 1;
      });
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#EA580C 1px, transparent 1px), linear-gradient(90deg, #EA580C 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Scanning sweep line */}
      <div
        className="absolute inset-x-0 h-[1px] bg-[#EA580C]/20 pointer-events-none"
        style={{ animation: 'codeScanSweep 4s ease-in-out infinite' }}
      />

      <div className="relative z-10 w-full max-w-5xl">
        {/* Top brand bar */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 3"/>
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-white">ReleaseLens</span>
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#FACC15] text-[#0d1117] tracking-widest uppercase">
            WORKBENCH
          </span>
        </div>

        {/* Main two-column layout */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">

          {/* Left: Hero copy + CTA */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#EA580C]">
              <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
              REAL-TIME VERIFICATION ENGINE
            </div>

            <h1 className="text-4xl font-black tracking-tight text-[#e6edf3] leading-tight">
              Evidence-Backed<br />
              <span className="text-[#EA580C]">Release Verification</span><br />
              Workbench
            </h1>

            <p className="text-base text-[#8b949e] leading-relaxed">
              Compress manual release verification into a deterministic 9-stage pipeline.
              Zero assertions without proof. Every failure traceable to repository artifacts.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-sm text-[#6e7681] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
                No cloud dependencies
              </div>
              <div className="flex items-center gap-2 text-sm text-[#6e7681] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
                Local SQLite store
              </div>
              <div className="flex items-center gap-2 text-sm text-[#6e7681] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
                Allowlisted executor
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate('/overview')}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#EA580C] text-white font-black text-base hover:bg-[#C2410C] active:bg-[#9A3412] transition-all shadow-lg shadow-[#EA580C]/20"
              >
                <span>Get Started</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Right: Live verification terminal */}
          <div className="rounded-xl border border-[#30363d] bg-[#06090e] shadow-2xl overflow-hidden font-mono">
            {/* Terminal chrome */}
            <div className="px-4 py-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f85149]" />
                <span className="w-3 h-3 rounded-full bg-[#d29922]" />
                <span className="w-3 h-3 rounded-full bg-[#3fb950]" />
                <span className="ml-2 text-xs text-[#6e7681]">code-verification-scanner.ts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#EA580C] font-semibold">● LIVE</span>
                <span className="text-xs text-[#6e7681]">
                  [{Math.min(visibleLines, ANIMATED_STEPS.length)}/{ANIMATED_STEPS.length}]
                </span>
              </div>
            </div>

            {/* Code lines */}
            <div className="p-4 space-y-2.5 text-sm min-h-[280px] select-none">
              {ANIMATED_STEPS.slice(0, visibleLines).map((step) => {
                let badgeCls = 'text-[#8b949e] bg-[#161b22] border-[#30363d]';
                let symbol = '✓';
                if (step.status === 'failed') { badgeCls = 'text-[#f85149] bg-[#3d0c0c] border-[#6e1414]'; symbol = '✕'; }
                else if (step.status === 'gated') { badgeCls = 'text-[#EA580C] bg-[#2d1a00] border-[#5a3400] font-bold'; symbol = '🛡'; }
                else if (step.status === 'checking') { badgeCls = 'text-[#d29922] bg-[#2d2000] border-[#5a3e00]'; symbol = '🔍'; }

                let lineColor = 'text-[#8b949e]';
                if (step.type === 'diff-del') lineColor = 'text-[#f85149] bg-[#3d0c0c]/30 px-1 rounded';
                if (step.type === 'diff-add') lineColor = 'text-[#56d364] bg-[#0f3322]/40 px-1 rounded';
                if (step.type === 'test') lineColor = step.status === 'failed' ? 'text-[#f85149] font-bold' : 'text-[#e6edf3]';
                if (step.type === 'provenance') lineColor = 'text-[#EA580C] font-bold';

                return (
                  <div key={step.id} className="flex items-center justify-between gap-2 animate-fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-right text-[#484f58] text-xs shrink-0">{step.id}</span>
                      <span className={`text-xs truncate font-mono ${lineColor}`}>{step.text}</span>
                    </div>
                    {step.annotation && (
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded border ${badgeCls}`}>
                        {symbol} {step.annotation}
                      </span>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center gap-2 pt-1">
                <span className="w-5 text-right text-[#484f58] text-xs">#</span>
                <span className="text-[#EA580C] animate-cursor-blink text-sm">▋</span>
                <span className="text-xs text-[#484f58] italic">analyzing AST contract interfaces...</span>
              </div>
            </div>

            {/* Status bar */}
            <div className="px-4 py-2 bg-[#0a0d12] border-t border-[#30363d] flex items-center justify-between text-xs text-[#6e7681]">
              <span>Deterministic Rule Engine: v1.0.0</span>
              <span className="text-[#3fb950]">Zero Invention Guarantee</span>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-center text-sm text-[#484f58] font-mono mt-12">
          Principle #1: Evidence over assertion — never claim something is true without a source.
        </p>
      </div>
    </div>
  );
}
