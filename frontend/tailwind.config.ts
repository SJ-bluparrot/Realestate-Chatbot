import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F7F4EF',
          50: '#FDFCFA',
          100: '#FAF8F4',
          200: '#F7F4EF',
          300: '#F0EBE2',
          400: '#E5DDD0',
          500: '#D6CBBA',
        },
        charcoal: {
          DEFAULT: '#1C1915',
          light: '#2D2926',
          muted: '#3D3834',
        },
        gold: {
          DEFAULT: '#B8965A',
          light: '#C9A96E',
          pale: '#E8D5B0',
          dim: '#8A6F3E',
        },
        warmGray: {
          DEFAULT: '#6B6560',
          light: '#918B84',
          pale: '#C4BEB7',
        },
      },
      fontFamily: {
        cormorant: ['var(--font-cormorant)', 'Georgia', 'serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      letterSpacing: {
        widest: '0.25em',
        superwide: '0.35em',
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'luxury': '0 2px 40px rgba(28, 25, 21, 0.08)',
        'luxury-md': '0 4px 60px rgba(28, 25, 21, 0.12)',
        'gold-glow': '0 0 0 2px rgba(184, 150, 90, 0.3)',
        'input-focus': '0 0 0 2px rgba(184, 150, 90, 0.25), 0 2px 20px rgba(184, 150, 90, 0.1)',
      },
    },
  },
  plugins: [],
}

export default config
