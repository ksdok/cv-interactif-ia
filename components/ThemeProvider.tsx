'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextType = {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize theme from localStorage or default to 'light'
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = typeof window !== 'undefined'
      ? (localStorage.getItem('theme') as Theme | null)
      : null
    return savedTheme || 'light'
  })

  useEffect(() => {
    // Apply theme to DOM whenever it changes
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = () => {
    console.log('Toggle theme called, current theme:', theme)
    const newTheme = theme === 'light' ? 'dark' : 'light'
    console.log('New theme:', newTheme)
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)

    // Force the class to apply immediately
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  return context
}
