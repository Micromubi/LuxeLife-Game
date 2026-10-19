/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: '#1A1A1A',
        onyx: '#111111',
        velvet: '#232120',
        gold: { DEFAULT: '#D4AF37', light: '#E8CF77', dark: '#9C7F22' },
        cream: { DEFAULT: '#F5F1E8', dim: '#BDB6A6' },
        ruby: '#C2413B',
        jade: '#4E9F78',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseRed: {
          '0%,100%': { boxShadow: 'inset 0 0 0 2px rgba(194,65,59,0.25)' },
          '50%': { boxShadow: 'inset 0 0 0 6px rgba(194,65,59,0.85)' },
        },
        rise: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        flash: { '0%': { opacity: 0 }, '20%': { opacity: 1 }, '100%': { opacity: 0 } },
        cashpop: {
          '0%': { opacity: 0, transform: 'translateY(-6px) scale(1.15)' },
          '12%': { opacity: 1, transform: 'translateY(0) scale(1)' },
          '75%': { opacity: 1 },
          '100%': { opacity: 0, transform: 'translateY(10px)' },
        },
        banner: {
          '0%': { opacity: 0, letterSpacing: '0.2em' },
          '15%': { opacity: 1, letterSpacing: '0.02em' },
          '80%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s linear infinite',
        pulseRed: 'pulseRed 1.2s ease-in-out infinite',
        rise: 'rise .3s ease-out',
        flash: 'flash .9s ease-out forwards',
        cashpop: 'cashpop 2.4s ease-out forwards',
        banner: 'banner 3.2s ease-out forwards',
      },
    },
  },
  plugins: [],
};
