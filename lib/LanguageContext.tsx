'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'fr' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Get language preference from localStorage or browser
    const savedLanguage = localStorage.getItem('language') as Language | null

    if (savedLanguage) {
      // User has previously selected a language
      setLanguageState(savedLanguage)
    } else {
      // Auto-detect from browser language
      const browserLang = navigator.language.toLowerCase()
      // If browser language starts with 'fr', use French; otherwise use English
      const detectedLanguage: Language = browserLang.startsWith('fr') ? 'fr' : 'en'
      setLanguageState(detectedLanguage)
      localStorage.setItem('language', detectedLanguage)
    }

    setMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    // Return default value during SSR/hydration to prevent errors
    return {
      language: 'fr' as Language,
      setLanguage: () => {},
    }
  }
  return context
}
