/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          red: '#C00000',
          gold: '#F5B400',
          navy: '#0A1A2F',
          blue:  '#1E6FFF',
          cyan:  '#00D4FF',
          purple:'#7C3AED',
          pink:  '#E040FB',
        },
        brand: {
          coke: '#F40009',
          sprite: '#00D664',
          fanta: '#FF8300',
          thumbsup: '#0066CC',
          limca: '#00CC44',
          kinley: '#0099FF',
        },
        dark: {
          900: '#07091A',
          800: '#0C1130',
          700: '#111840',
          600: '#172050',
          500: '#1E2A60',
        }
      },
      backgroundImage: {
        'glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
        'sidebar-grad': 'linear-gradient(180deg, #0C1130 0%, #07091A 100%)',
        'card-grad': 'linear-gradient(135deg, rgba(30,111,255,0.12), rgba(0,212,255,0.06))',
        'active-grad': 'linear-gradient(90deg, #1E6FFF, #00D4FF)',
        'header-grad': 'linear-gradient(90deg, #1E6FFF 0%, #7C3AED 50%, #E040FB 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundColor: {
        'white/3': 'rgba(255,255,255,0.03)',
        'white/4': 'rgba(255,255,255,0.04)',
        'white/8': 'rgba(255,255,255,0.08)',
      }
    },
  },
  plugins: [],
}
