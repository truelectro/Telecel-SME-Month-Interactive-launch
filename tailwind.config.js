/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        voltage: {
          bg: '#080304',
          panel: 'rgba(24, 7, 10, 0.85)',
          panelBorder: '#4a151e',
          panelBorderBright: '#8c2333',
          red: '#ff1f43',
          redDark: '#a30c24',
          redGlow: '#ff3d5e',
          whiteHot: '#fff2f4',
          accent: '#ff6680',
          muted: '#803844',
          darkGray: '#151316',
        }
      },
      boxShadow: {
        'neon-red': '0 0 15px rgba(255, 31, 67, 0.5), 0 0 30px rgba(255, 31, 67, 0.25)',
        'neon-red-lg': '0 0 25px rgba(255, 31, 67, 0.7), 0 0 50px rgba(255, 31, 67, 0.4), inset 0 0 15px rgba(255, 31, 67, 0.3)',
        'panel-inset': 'inset 0 0 20px rgba(0, 0, 0, 0.8), inset 0 0 5px rgba(255, 31, 67, 0.2)',
        'reactor-glow': '0 0 40px rgba(255, 31, 67, 0.6), 0 0 80px rgba(255, 0, 50, 0.3)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 0.15s infinite alternate',
        'lightning-pulse': 'lightning 2s infinite ease-in-out',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        flicker: {
          '0%': { opacity: '0.85' },
          '100%': { opacity: '1' },
        },
        lightning: {
          '0%, 100%': { opacity: '0.7', filter: 'drop-shadow(0 0 8px rgba(255,31,67,0.8))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 16px rgba(255,100,120,1))' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      },
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        orbitron: ['Orbitron', 'sans-serif'],
        russo: ['"Russo One"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
