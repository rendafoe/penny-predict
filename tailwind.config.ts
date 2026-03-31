import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds — deep navy, inspired by Polymarket/Kalshi dark mode
        'bg-base':     '#06090F',
        'bg-surface':  '#0C1220',
        'bg-elevated': '#121B2E',
        'bg-hover':    '#19243A',

        // Borders
        'border-subtle':  '#1C2A40',
        'border-default': '#243350',
        'border-strong':  '#2E4168',

        // Brand accent — amber/copper ("penny" motif, distinct from Polymarket purple)
        'accent':       '#F5A623',
        'accent-dim':   '#C47D0D',
        'accent-muted': 'rgba(245,166,35,0.12)',

        // Trading colors
        'yes':       '#10B981',
        'yes-dim':   '#065F46',
        'yes-muted': 'rgba(16,185,129,0.12)',
        'no':        '#F04F5E',
        'no-dim':    '#991B2A',
        'no-muted':  'rgba(240,79,94,0.12)',

        // Text
        'text-primary':   '#E4EEFF',
        'text-secondary': '#7B92BD',
        'text-muted':     '#445A80',
        'text-disabled':  '#2B3D5E',

        // Status
        'warning': '#FBBF24',
        'info':    '#38BDF8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(28,42,64,0.8)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(36,51,80,0.9)',
        'modal': '0 20px 60px rgba(0,0,0,0.8)',
        'accent-glow': '0 0 20px rgba(245,166,35,0.15)',
        'yes-glow': '0 0 20px rgba(16,185,129,0.15)',
        'no-glow': '0 0 20px rgba(240,79,94,0.15)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
