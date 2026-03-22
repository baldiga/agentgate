import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#1a1a1a',
        surface: '#242424',
        border: '#2e2e2e',
        accent: '#c45d3e',
        'accent-hover': '#d4714f',
        muted: '#888888',
        'text-primary': '#e8e8e8',
        'text-secondary': '#aaaaaa',
        online: '#3ecf8e',
        danger: '#e05252',
      },
      fontFamily: {
        sans: ['var(--font-sora)', 'sans-serif'],
        display: ['var(--font-league-spartan)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
