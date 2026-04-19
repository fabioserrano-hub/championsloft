export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#4ade80',
          500: '#1ed98a',
          600: '#16a34a',
        },
        dark: {
          900: '#0a0f14',
          800: '#0f1923',
          700: '#141f2e',
          600: '#1a2840',
        },
        surface: {
          primary:   '#0f1923',
          secondary: '#141f2e',
          elevated:  '#1a2840',
          border:    '#1e3050',
          border2:   '#243860',
        }
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        display: ['Barlow Condensed', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.3s ease both',
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
      }
    }
  },
  plugins: []
}
