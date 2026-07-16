/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
      colors: {
        white: 'var(--color-white)',
        slate: {
          50: 'var(--slate-50)',
          100: 'var(--slate-100)',
          200: 'var(--slate-200)',
          300: 'var(--slate-300)',
          400: 'var(--slate-400)',
          500: 'var(--slate-500)',
          600: 'var(--slate-600)',
          700: 'var(--slate-700)',
          800: 'var(--slate-800)',
          900: 'var(--slate-900)',
          950: 'var(--slate-950)',
        },
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          900: '#164e63',
        },
        accent: {
          500: '#f97316',
          600: '#ea580c',
        },
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
      },
      backgroundImage: {
        mesh: 'var(--bg-mesh)',
      },
      keyframes: {
        'interviewer-idle': {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.02) translateY(-2px)' }, // Breathing effect
        },
        'interviewer-speak': {
          '0%, 100%': { transform: 'scale(1.02) translateY(-2px)' },
          '25%': { transform: 'scale(1.03) translateY(-3px) rotate(1deg)' },
          '75%': { transform: 'scale(1.02) translateY(-1px) rotate(-1deg)' },
        },
        'interviewer-listen': {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.01) translateY(-1px) rotate(0.5deg)' }, // Attentive nodding
        }
      },
      animation: {
        'interviewer-idle': 'interviewer-idle 4s ease-in-out infinite',
        'interviewer-speak': 'interviewer-speak 2s ease-in-out infinite',
        'interviewer-listen': 'interviewer-listen 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
};
