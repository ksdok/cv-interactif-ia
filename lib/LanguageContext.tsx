'use client'

import React, { createContext, useContext, useState } from 'react'

export type Language = 'fr' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  isTransitioning: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Initialize language from localStorage or browser preference
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = typeof window !== 'undefined'
      ? (localStorage.getItem('language') as Language | null)
      : null

    if (savedLanguage) {
      return savedLanguage
    }

    // Auto-detect from browser language
    if (typeof window !== 'undefined') {
      const browserLang = navigator.language.toLowerCase()
      const detectedLanguage: Language = browserLang.startsWith('fr') ? 'fr' : 'en'
      localStorage.setItem('language', detectedLanguage)
      return detectedLanguage
    }

    return 'fr' // Default fallback
  })

  const [isTransitioning, setIsTransitioning] = useState(false)

  const setLanguage = (lang: Language) => {
    // Start fade-out transition
    setIsTransitioning(true)

    // Change language and fade back in after 150ms
    setTimeout(() => {
      setLanguageState(lang)
      localStorage.setItem('language', lang)
      setIsTransitioning(false)
    }, 150)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isTransitioning }}>
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
      isTransitioning: false,
    }
  }
  return context
}
