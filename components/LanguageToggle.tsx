'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/LanguageContext'

/**
 * Language toggle button component
 * Switches between French and English
 * Displays "FR"/"US" text labels
 */
export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'en' : 'fr')
  }

  return (
    <button
      onClick={toggleLanguage}
      className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
      aria-label={isMounted && language === 'fr' ? 'Switch to English' : isMounted ? 'Basculer vers le français' : 'Toggle language'}
      title={isMounted && language === 'fr' ? 'Switch to English' : isMounted ? 'Basculer vers le français' : 'Toggle language'}
    >
      <span className="inline-block text-sm font-bold text-slate-900 dark:text-slate-100">
        {isMounted ? (language === 'fr' ? 'FR' : 'US') : 'FR'}
      </span>
    </button>
  )
}
