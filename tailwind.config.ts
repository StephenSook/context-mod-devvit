import type { Config } from 'tailwindcss';
import { SIGNAL } from './src/client/lib/design-tokens';

export default {
  content: ['./src/client/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
        serif: ['"Instrument Serif"', 'ui-serif', 'serif'],
      },
      colors: {
        ink: {
          950: '#0A0A0B',
          900: '#131316',
          800: '#1B1B20',
          700: '#26262C',
        },
        bone: {
          50: '#F5F5F4',
          100: '#E7E5E4',
          200: '#A8A29E',
          300: '#71717A',
        },
        // Imported from src/client/lib/design-tokens.ts so EventRow's
        // inline-style usage + Tailwind utility class generation
        // (text-signal-ok / bg-signal-ok / etc) share one source of truth.
        signal: SIGNAL,
        line: 'rgba(255,255,255,0.06)',
        lineStrong: 'rgba(255,255,255,0.12)',
      },
      borderRadius: {
        none: '0',
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '22px',
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.025em',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(0.85)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'shimmer': 'shimmer 8s linear infinite',
      },
    },
  },
} satisfies Config;
