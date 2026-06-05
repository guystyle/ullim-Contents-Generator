import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        background: '#0a0a0a',
        surface: '#111111',
        border: '#1f1f1f',
        muted: '#2a2a2a',
        accent: '#e0e0e0',
      },
    },
  },
  plugins: [],
}

export default config
