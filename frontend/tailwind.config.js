/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable dark mode based on class
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom App Palette
        'app-dark-teal': '#264653',
        'app-medium-teal': '#2A9D8F',
        'app-golden-yellow': '#E9C46A',
        'app-orange': '#F4A261',
        'app-red-orange': '#E76F51',

        // Light mode colors (default)
        'light-background': '#FFFFFF',
        'light-foreground': '#1C1C1E',
        'light-card': '#F2F2F7',
        'light-primary': '#007AFF', // iOS Blue
        'light-secondary': '#8E8E93', // iOS Gray
        'light-accent': '#34C759', // iOS Green
        'light-border': '#C6C6C8',
        'light-input': '#E5E5EA',

        // Dark mode colors
        'dark-background': '#000000',
        'dark-foreground': '#FFFFFF',
        'dark-card': '#1C1C1E',
        'dark-primary': '#0A84FF', // iOS Dark Blue
        'dark-secondary': '#98989D', // iOS Dark Gray
        'dark-accent': '#30D158', // iOS Dark Green
        'dark-border': '#38383A',
        'dark-input': '#2C2C2E',

        // Semantic colors (used in components)
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        card: 'var(--color-card)',
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        border: 'var(--color-border)',
        input: 'var(--color-input)',
      },
      borderRadius: {
        'xl': '12px', // For larger elements like cards
        'lg': '10px',  // For buttons and inputs
        'md': '8px',
        'sm': '6px',
      },
      fontFamily: {
        sans: [
          'SF Pro Display',
          'SF Pro Text',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}