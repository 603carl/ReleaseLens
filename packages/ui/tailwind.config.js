/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"SFMono-Regular"', 'Consolas', '"Liberation Mono"', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
        xs:   ['12px', '18px'],
        sm:   ['13px', '19px'],
        base: ['14px', '21px'],
        md:   ['15px', '22px'],
        lg:   ['16px', '24px'],
        xl:   ['19px', '27px'],
        '2xl':['23px', '32px'],
        '3xl':['30px', '38px'],
      },
      colors: {
        // ── Page surfaces (dark) ─────────────────────────────
        canvas:          '#0d1117',   // page root background
        'canvas-body':   '#0d1117',
        surface:         '#161b22',   // card background
        'surface-raised':'#1c2128',   // slightly elevated within cards
        'surface-card':  '#161b22',
        'surface-subtle':'#0d1117',

        // ── Borders ─────────────────────────────────────────
        border:         '#30363d',
        'border-muted': '#21262d',
        'border-strong':'#484f58',

        // ── Text ────────────────────────────────────────────
        fg:          '#e6edf3',   // primary text
        'fg-muted':  '#8b949e',   // secondary
        'fg-subtle': '#6e7681',   // tertiary

        // ── Brand accent: Orange CTA ──────────────────────
        accent: {
          DEFAULT:   '#EA580C',
          hover:     '#C2410C',
          active:    '#9A3412',
          text:      '#FFFFFF',
          lime:      '#a3e635',
          'lime-text':'#0d1117',
        },

        cta: {
          DEFAULT: '#EA580C',
          hover:   '#C2410C',
          text:    '#FFFFFF',
        },

        // ── Chip colours (dark variants) ────────────────────
        chip: {
          yellow:        '#2d2000',
          'yellow-text': '#d29922',
          'yellow-border':'#5a3e00',
          purple:        '#1e1a35',
          'purple-text': '#a78bfa',
          'purple-border':'#3d2f6e',
          blue:          '#0d1f3c',
          'blue-text':   '#58a6ff',
          'blue-border': '#1f3d70',
          green:         '#0f3322',
          'green-text':  '#3fb950',
          'green-border':'#196c2e',
          red:           '#3d0c0c',
          'red-text':    '#f85149',
          'red-border':  '#6e1414',
          orange:        '#2d1a00',
          'orange-text': '#EA580C',
          'orange-border':'#5a3400',
        },

        // ── Status colours ───────────────────────────────────
        status: {
          passed:           '#3fb950',
          'passed-bg':      '#0f3322',
          'passed-border':  '#196c2e',
          failed:           '#f85149',
          'failed-bg':      '#3d0c0c',
          'failed-border':  '#6e1414',
          running:          '#d29922',
          'running-bg':     '#2d2000',
          'running-border': '#5a3e00',
          pending:          '#8b949e',
          'pending-bg':     '#1c2128',
          'pending-border': '#30363d',
          blocked:          '#f85149',
          unknown:          '#8b949e',
        },

        // ── Severity colours ────────────────────────────────
        severity: {
          critical:          '#f85149',
          'critical-bg':     '#3d0c0c',
          'critical-border': '#6e1414',
          high:              '#EA580C',
          'high-bg':         '#2d1a00',
          'high-border':     '#5a3400',
          medium:            '#d29922',
          'medium-bg':       '#2d2000',
          'medium-border':   '#5a3e00',
          low:               '#3fb950',
          'low-bg':          '#0f3322',
          'low-border':      '#196c2e',
          info:              '#c9d1d9',
          'info-bg':         '#1c2128',
          'info-border':     '#30363d',
        },

        // ── Tile variants ────────────────────────────────────
        tile: {
          amber:    '#2d2000',
          orange:   '#2d1a00',
          green:    '#0f3322',
          slate:    '#1c2128',
          red:      '#3d0c0c',
          purple:   '#1e1a35',
          dark:     '#0d1117',
          'dark-2': '#161b22',
        },
      },

      boxShadow: {
        card:      '0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.2)',
        'card-md': '0 4px 16px rgba(0,0,0,0.4)',
        'card-lg': '0 8px 32px rgba(0,0,0,0.5)',
        pill:      '0 2px 8px rgba(0,0,0,0.4)',
        header:    '0 1px 0 rgba(0,0,0,0.5)',
      },

      borderRadius: {
        xl:    '12px',
        '2xl': '16px',
        '3xl': '24px',
      },

      typography: {
        DEFAULT: {
          css: {
            color: '#c9d1d9',
            maxWidth: 'none',
            h1: { color: '#e6edf3', fontWeight: '800', borderBottom: '2px solid #30363d', paddingBottom: '0.6rem' },
            h2: { color: '#e6edf3', fontWeight: '700', marginTop: '2rem', borderBottom: '1px solid #30363d', paddingBottom: '0.4rem' },
            h3: { color: '#e6edf3', fontWeight: '600', marginTop: '1.5rem' },
            h4: { color: '#c9d1d9', fontWeight: '600' },
            strong: { color: '#e6edf3' },
            a: { color: '#EA580C' },
            code: {
              color: '#EA580C',
              backgroundColor: '#2d1a00',
              padding: '0.15rem 0.35rem',
              borderRadius: '4px',
              border: '1px solid #5a3400',
              fontWeight: '600',
            },
            'code::before': { content: '""' },
            'code::after':  { content: '""' },
            pre: {
              backgroundColor: '#0a0d12',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              borderRadius: '10px',
            },
            table: { color: '#c9d1d9', borderColor: '#30363d' },
            th: { color: '#e6edf3', backgroundColor: '#0d1117', borderColor: '#30363d' },
            td: { borderColor: '#21262d' },
            blockquote: {
              color: '#8b949e',
              borderLeftColor: '#EA580C',
              backgroundColor: '#1a0f00',
            },
            hr: { borderColor: '#30363d' },
            ul: { color: '#c9d1d9' },
            ol: { color: '#c9d1d9' },
            li: { color: '#c9d1d9' },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
