import clsx from 'clsx';
import type { Status, Severity, Confidence } from '../../types/domain.ts';

// ─── Status Badge ─────────────────────────────────────────────

const STATUS_LABELS: Record<Status, string> = {
  PENDING:      'PENDING',
  RUNNING:      'RUNNING',
  PASSED:       'PASSED',
  FAILED:       'FAILED',
  BLOCKED:      'BLOCKED',
  UNKNOWN:      'UNKNOWN',
  NOT_VERIFIED: 'NOT VERIFIED',
};

const STATUS_CLASSES: Record<Status, string> = {
  PENDING:      'badge badge-pending',
  RUNNING:      'badge badge-running',
  PASSED:       'badge badge-passed',
  FAILED:       'badge badge-failed',
  BLOCKED:      'badge badge-blocked',
  UNKNOWN:      'badge badge-unknown',
  NOT_VERIFIED: 'badge badge-not-verified',
};

const STATUS_DOT_COLORS: Record<Status, string> = {
  PENDING:      'bg-[#8b949e]',
  RUNNING:      'bg-[#d29922] animate-pulse',
  PASSED:       'bg-[#3fb950]',
  FAILED:       'bg-[#f85149]',
  BLOCKED:      'bg-[#f85149]',
  UNKNOWN:      'bg-[#8b949e]',
  NOT_VERIFIED: 'bg-[#8b949e]',
};

export function StatusBadge({ status, showDot = true }: { status: Status; showDot?: boolean }) {
  return (
    <span className={STATUS_CLASSES[status]} aria-label={`Status: ${STATUS_LABELS[status]}`}>
      {showDot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full inline-block shrink-0', STATUS_DOT_COLORS[status])} />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Severity Badge ───────────────────────────────────────────

const SEVERITY_CLASSES: Record<Severity, string> = {
  CRITICAL: 'badge badge-critical',
  HIGH:     'badge badge-high',
  MEDIUM:   'badge badge-medium',
  LOW:      'badge badge-low',
  INFO:     'badge badge-info',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={SEVERITY_CLASSES[severity]} aria-label={`Severity: ${severity}`}>
      {severity}
    </span>
  );
}

// ─── Confidence Badge ─────────────────────────────────────────

const CONFIDENCE_CLASSES: Record<Confidence, string> = {
  CONFIRMED: 'badge badge-confirmed',
  SUPPORTED: 'badge badge-supported',
  UNKNOWN:   'badge badge-unknown',
};

const CONFIDENCE_ICONS: Record<Confidence, string> = {
  CONFIRMED: '✓',
  SUPPORTED: '◑',
  UNKNOWN:   '?',
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span className={CONFIDENCE_CLASSES[confidence]}>
      <span className="font-bold">{CONFIDENCE_ICONS[confidence]}</span>
      {confidence}
    </span>
  );
}

// ─── Spinner ──────────────────────────────────────────────────

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 13, md: 16, lg: 22 }[size];
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      style={{ color: '#EA580C' }}
      aria-label="Loading"
      role="img"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Metric Card ──────────────────────────────────────────────

type MetricVariant = 'default' | 'amber' | 'orange' | 'green' | 'red' | 'dark';

const METRIC_VARIANT_STYLES: Record<MetricVariant, { card: string; label: string; value: string; sub: string }> = {
  default: {
    card:  'bg-[#161b22] border border-[#30363d]',
    label: 'text-[#8b949e]',
    value: 'text-[#e6edf3]',
    sub:   'text-[#6e7681]',
  },
  amber: {
    card:  'bg-[#2d2000] border border-[#5a3e00]',
    label: 'text-[#d29922]',
    value: 'text-[#e6c84a]',
    sub:   'text-[#b08a00]',
  },
  orange: {
    card:  'bg-[#2d1a00] border border-[#5a3400]',
    label: 'text-[#EA580C]',
    value: 'text-[#f97316]',
    sub:   'text-[#c2410c]',
  },
  green: {
    card:  'bg-[#0f3322] border border-[#196c2e]',
    label: 'text-[#3fb950]',
    value: 'text-[#56d364]',
    sub:   'text-[#196c2e]',
  },
  red: {
    card:  'bg-[#3d0c0c] border border-[#6e1414]',
    label: 'text-[#f85149]',
    value: 'text-[#ff6b6b]',
    sub:   'text-[#b91c1c]',
  },
  dark: {
    card:  'bg-[#0d1117] border border-[#21262d]',
    label: 'text-[#8b949e]',
    value: 'text-[#f0f6fc]',
    sub:   'text-[#6e7681]',
  },
};

export function MetricCard({
  label,
  value,
  sub,
  valueClass,
  icon,
  variant = 'default',
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  icon?: React.ReactNode;
  variant?: MetricVariant;
  accent?: React.ReactNode;
}) {
  const s = METRIC_VARIANT_STYLES[variant];
  return (
    <div className={`rounded-2xl shadow-card p-5 flex flex-col justify-between min-h-[100px] transition-all ${s.card}`}>
      <div className={`text-2xs font-black uppercase tracking-widest mb-3 flex items-center gap-2 ${s.label}`}>
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className={clsx('text-3xl font-black tracking-tight leading-none', valueClass ?? s.value)}>
          {value}
        </div>
        {accent && <div className="shrink-0">{accent}</div>}
      </div>
      {sub && <div className={`text-2xs font-medium truncate mt-2 ${s.sub}`}>{sub}</div>}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="workbench-card p-14 text-center flex flex-col items-center justify-center gap-4">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#1c2128] border border-[#30363d] flex items-center justify-center text-[#8b949e] mb-2 shadow-card">
          {icon}
        </div>
      )}
      <div>
        <p className="text-base font-bold text-[#e6edf3] tracking-tight">{title}</p>
        {description && (
          <p className="text-xs text-[#8b949e] mt-1.5 max-w-md mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="alert alert-critical">
      <div className="w-7 h-7 rounded-xl bg-[#3d0c0c] border border-[#6e1414] flex items-center justify-center shrink-0 text-[#f85149] font-black text-sm">
        !
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#f85149] uppercase tracking-wide">Execution Error</p>
        <p className="text-xs text-[#8b949e] mt-0.5 font-mono break-words">{message}</p>
        {retry && (
          <button
            onClick={retry}
            className="mt-2 text-2xs text-[#EA580C] hover:underline font-semibold"
          >
            Retry operation →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page Header ──────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#30363d]">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#e6edf3] leading-tight">{title}</h1>
        {description && (
          <p className="text-xs text-[#8b949e] mt-1.5 font-mono leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}

// ─── Code Block ───────────────────────────────────────────────

export function CodeBlock({
  content,
  maxLines = 28,
  title,
}: {
  content: string;
  maxLines?: number;
  title?: string;
}) {
  const lines = content.split('\n');
  const truncated = lines.length > maxLines;
  const display = truncated ? lines.slice(0, maxLines).join('\n') + '\n…' : content;

  return (
    <div className="rounded-xl border border-[#30363d] bg-[#0a0d12] overflow-hidden">
      {title && (
        <div className="px-3 py-1.5 border-b border-[#21262d] bg-[#0d1117] text-2xs font-mono text-[#8b949e] flex items-center justify-between">
          <span>{title}</span>
          <span className="text-2xs text-[#6e7681]">{lines.length} lines</span>
        </div>
      )}
      <pre className="p-4 text-2xs font-mono text-[#c9d1d9] overflow-auto leading-relaxed max-h-72 scrollbar-thin">
        {display}
      </pre>
      {truncated && (
        <div className="px-3 py-1 bg-[#0d1117] border-t border-[#21262d] text-2xs font-mono text-[#6e7681]">
          +{lines.length - maxLines} lines truncated
        </div>
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────

export function SectionCard({
  title,
  badge,
  actions,
  children,
  noPadding = false,
}: {
  title: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
}) {
  return (
    <div className="workbench-card overflow-hidden">
      <div className="workbench-card-header">
        <span className="text-2xs font-black uppercase tracking-widest text-[#8b949e]">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {badge}
          {actions}
        </div>
      </div>
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
}

// ─── Inline Alert ─────────────────────────────────────────────

export function InlineAlert({
  variant,
  title,
  children,
}: {
  variant: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  children?: React.ReactNode;
}) {
  const cfg = {
    critical: {
      cls:    'alert alert-critical',
      icon:   '✕',
      iconBg: 'bg-[#3d0c0c] border-[#6e1414] text-[#f85149]',
      title:  'text-[#f85149]',
    },
    warning: {
      cls:    'alert alert-warning',
      icon:   '⚠',
      iconBg: 'bg-[#2d2000] border-[#5a3e00] text-[#d29922]',
      title:  'text-[#d29922]',
    },
    info: {
      cls:    'alert alert-info',
      icon:   'ℹ',
      iconBg: 'bg-[#2d1a00] border-[#5a3400] text-[#EA580C]',
      title:  'text-[#EA580C]',
    },
    success: {
      cls:    'alert alert-success',
      icon:   '✓',
      iconBg: 'bg-[#0f3322] border-[#196c2e] text-[#3fb950]',
      title:  'text-[#3fb950]',
    },
  }[variant];

  return (
    <div className={cfg.cls}>
      <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 text-xs font-black ${cfg.iconBg}`}>
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold tracking-wide ${cfg.title}`}>{title}</p>
        {children && <div className="text-xs text-[#8b949e] mt-1 leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

// ─── Loading Card ─────────────────────────────────────────────

export function LoadingCard({ message = 'Executing analysis…' }: { message?: string }) {
  return (
    <div className="workbench-card flex items-center gap-3 p-6">
      <Spinner size="md" />
      <span className="text-xs font-mono text-[#8b949e]">{message}</span>
    </div>
  );
}
