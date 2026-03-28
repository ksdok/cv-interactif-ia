import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surface layers (background hierarchy)
        surface: '#f9f9f9',
        'surface-bright': '#f9f9f9',
        'surface-dim': '#dadada',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f3f4',
        'surface-container': '#eeeeee',
        'surface-container-high': '#e8e8e8',
        'surface-container-highest': '#e2e2e2',
        'surface-variant': '#e2e2e2',
        'surface-tint': '#5f5e5e',

        // On surface text colors
        'on-surface': '#1a1c1c',
        'on-surface-variant': '#474747',

        // Primary (buttons, actions)
        primary: '#000000',
        'primary-container': '#3c3b3b',
        'on-primary': '#e5e2e1',
        'on-primary-fixed': '#ffffff',
        'on-primary-fixed-variant': '#e5e2e1',
        'on-primary-container': '#ffffff',
        'primary-fixed': '#5f5e5e',
        'primary-fixed-dim': '#474746',

        // Secondary (metadata, labels)
        secondary: '#5f5e5e',
        'secondary-container': '#d6d4d3',
        'secondary-fixed': '#c8c6c6',
        'secondary-fixed-dim': '#acabab',
        'on-secondary': '#ffffff',
        'on-secondary-fixed': '#1b1c1c',
        'on-secondary-fixed-variant': '#3b3b3b',
        'on-secondary-container': '#1b1c1c',

        // Tertiary
        tertiary: '#3b3b3c',
        'tertiary-container': '#747474',
        'tertiary-fixed': '#5e5e5e',
        'tertiary-fixed-dim': '#464747',
        'on-tertiary': '#e3e2e2',
        'on-tertiary-fixed': '#ffffff',
        'on-tertiary-fixed-variant': '#e3e2e2',
        'on-tertiary-container': '#ffffff',

        // Outline (borders, dividers)
        outline: '#777777',
        'outline-variant': '#c6c6c6',

        // Error (validation messages)
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#410002',

        // Inverse (for dark surfaces on light backgrounds)
        'inverse-surface': '#2f3131',
        'inverse-on-surface': '#f0f1f1',
        'inverse-primary': '#c8c6c5',

        // Background
        background: '#f9f9f9',
        'on-background': '#1a1c1c',
      },
      borderRadius: {
        DEFAULT: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
      fontFamily: {
        headline: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 10px 40px rgba(26, 28, 28, 0.06)',
        md: '0 15px 50px rgba(26, 28, 28, 0.08)',
        lg: '0 20px 60px rgba(26, 28, 28, 0.1)',
      },
      spacing: {
        8: '2rem',
        12: '3rem',
        16: '4rem',
        20: '5rem',
        24: '6rem',
      },
    },
  },
  plugins: [],
}
export default config
