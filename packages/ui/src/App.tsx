import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { WelcomePage } from './pages/WelcomePage.tsx';
import { OverviewPage } from './pages/OverviewPage.tsx';
import { ChangePage } from './pages/ChangePage.tsx';
import { ImpactPage } from './pages/ImpactPage.tsx';
import { VerificationPage } from './pages/VerificationPage.tsx';
import { FindingsPage } from './pages/FindingsPage.tsx';
import { DossierPage } from './pages/DossierPage.tsx';
import { AppProvider, useAppContext } from './context/AppContext.tsx';

// ─── Verification Workflow Pipeline ───────────────────────────
const NAV_ITEMS = [
  { to: '/overview',     label: 'Overview',     num: '01' },
  { to: '/change',       label: 'Change',        num: '02' },
  { to: '/impact',       label: 'Impact',        num: '03' },
  { to: '/verification', label: 'Verification',  num: '04' },
  { to: '/findings',     label: 'Findings',      num: '05' },
  { to: '/dossier',      label: 'Dossier',       num: '06' },
] as const;

// ─── API Health Engine ────────────────────────────────────────
function ApiHealth() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/health');
        if (!cancelled) setStatus(res.ok ? 'ok' : 'error');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    check();
    const interval = setInterval(check, 12_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#161b22] border border-[#30363d] text-xs font-mono"
      title={status === 'ok' ? 'Express 5 API server active on :3001' : 'API offline or unreachable'}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${
        status === 'ok' ? 'bg-[#FACC15] shadow-[0_0_8px_rgba(250,204,21,0.5)]'
        : status === 'error' ? 'bg-[#f85149] animate-pulse'
        : 'bg-[#d29922] animate-pulse'
      }`} />
      <span className={status === 'ok' ? 'text-[#FACC15] font-bold' : 'text-[#f85149] font-semibold'}>
        {status === 'ok' ? 'ENGINE ACTIVE' : status === 'error' ? 'OFFLINE' : 'POLLING…'}
      </span>
    </div>
  );
}

// ─── Top Workspace Bar ────────────────────────────────────────
function WorkspaceHeader() {
  const { repository, releaseCandidate } = useAppContext();

  return (
    <header className="border-b border-[#21262d] bg-[#0d1117] sticky top-0 z-50 shadow-header">
      <div className="flex items-center justify-between h-[56px] w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 gap-4">

        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 3"/>
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-tight text-white">ReleaseLens</span>
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#FACC15] text-[#0d1117] tracking-widest uppercase hidden sm:inline">
              WORKBENCH
            </span>
          </div>
        </div>

        {/* Center: Navigation */}
        <nav
          className="flex items-center p-1 rounded-full bg-[#161b22] border border-[#30363d] overflow-x-auto scrollbar-thin gap-0.5"
          aria-label="Primary navigation"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1 px-3 py-1.5 text-sm font-bold rounded-full transition-all duration-150 whitespace-nowrap select-none ${
                  isActive
                    ? 'bg-[#FACC15] text-[#0d1117] shadow-pill'
                    : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
                }`
              }
            >
              <span className="text-[10px] font-mono opacity-60">{item.num}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: Context + health */}
        <div className="flex items-center gap-3 shrink-0">
          {repository && releaseCandidate && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#161b22] border border-[#30363d] text-xs font-mono">
              <span className="text-[#f0f6fc] font-bold">{repository.name}</span>
              <span className="text-[#484f58]">::</span>
              <span className="text-[#FACC15] font-semibold">{releaseCandidate.baseRef}</span>
              <span className="text-[#484f58]">→</span>
              <span className="text-[#EA580C] font-bold">{releaseCandidate.targetRef}</span>
              <span className={`ml-1 w-1.5 h-1.5 rounded-full ${
                releaseCandidate.status === 'PASSED' ? 'bg-[#3fb950]' :
                releaseCandidate.status === 'FAILED' ? 'bg-[#f85149] animate-pulse' :
                'bg-[#FACC15]'
              }`} />
              <span className={`font-semibold uppercase text-[10px] tracking-widest ${
                releaseCandidate.status === 'PASSED' ? 'text-[#3fb950]' :
                releaseCandidate.status === 'FAILED' ? 'text-[#f85149]' :
                'text-[#FACC15]'
              }`}>{releaseCandidate.status}</span>
            </div>
          )}
          <ApiHealth />
        </div>
      </div>
    </header>
  );
}

// ─── App Shell (with nav/header/footer) ──────────────────────
function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#e6edf3]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1 focus:bg-[#EA580C] focus:text-white font-bold rounded">
        Skip to main content
      </a>
      <WorkspaceHeader />
      <main id="main-content" className="flex-1 flex flex-col">
        <Routes>
          <Route path="/overview"     element={<OverviewPage />} />
          <Route path="/change"       element={<ChangePage />} />
          <Route path="/impact"       element={<ImpactPage />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/findings"     element={<FindingsPage />} />
          <Route path="/dossier"      element={<DossierPage />} />
        </Routes>
      </main>
      <footer className="border-t border-[#21262d] bg-[#0d1117] py-2.5">
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between text-xs font-mono gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[#8b949e]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15]" />
              ReleaseLens v0.1.0
            </span>
            <span className="hidden sm:inline text-[#30363d]">|</span>
            <span className="hidden sm:inline text-[#6e7681]">Local SQLite · Allowlisted Execution</span>
          </div>
          <span className="text-[#EA580C] font-semibold">Deterministic Verification Rules Active</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Root Router — Welcome is standalone, everything else uses AppShell ──
function RootRouter() {
  const location = useLocation();
  const isWelcome = location.pathname === '/' || location.pathname === '/welcome';

  if (isWelcome) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/welcome" replace />} />
        <Route path="/welcome" element={<WelcomePage />} />
      </Routes>
    );
  }

  return <AppShell />;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProvider>
        <RootRouter />
      </AppProvider>
    </BrowserRouter>
  );
}
