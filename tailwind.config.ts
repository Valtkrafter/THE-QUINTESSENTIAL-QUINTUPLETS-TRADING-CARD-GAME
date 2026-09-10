import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ichika: {
          light: '#FDE68A',
          DEFAULT: '#F59E0B',
          dark: '#B45309',
        },
        nino: {
          light: '#FBCFE8',
          DEFAULT: '#EC4899',
          dark: '#BE185D',
        },
        miku: {
          light: '#A5F3FC',
          DEFAULT: '#06B6D4',
          dark: '#0E7490',
        },
        yotsuba: {
          light: '#A7F3D0',
          DEFAULT: '#10B981',
          dark: '#047857',
        },
        itsuki: {
          light: '#FECACA',
          DEFAULT: '#EF4444',
          dark: '#B91C1C',
        },
        fuutarou: {
          light: '#CBD5E1',
          DEFAULT: '#64748B',
          dark: '#334155',
        },
        raiha: {
          light: '#FEF08A',
          DEFAULT: '#FBBF24',
          dark: '#D97706',
        },
      },
      aspectRatio: {
        'card': '63 / 88',
      },
      zIndex: {
        '15': '15',
        '25': '25',
        '35': '35',
      },
      boxShadow: {
        'slab': '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15)',
        'slab-black': '0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 15px rgba(212, 175, 55, 0.35)',
        'foil': '0 10px 30px -5px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.3)',
      },
      animation: {
        'sparkle-pulse': 'sparklePulse 2.5s ease-in-out infinite',
        'rainbow-shift': 'rainbowShift 6s linear infinite',
        'shimmer': 'shimmer 2.2s linear infinite',
      },
      keyframes: {
        sparklePulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.95)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' },
        },
        rainbowShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
