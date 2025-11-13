'use client'

import { useLanguage } from '@/lib/LanguageContext'

/**
 * Language toggle button component
 * Switches between French and English
 * Displays "FR"/"US" text labels
 */
export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'en' : 'fr')
  }

  return (
    <button
      onClick={toggleLanguage}
      className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
      aria-label={language === 'fr' ? 'Switch to English' : 'Basculer vers le français'}
      title={language === 'fr' ? 'Switch to English' : 'Basculer vers le français'}
    >
      <span className="inline-block text-sm font-bold text-slate-900 dark:text-slate-100">
        {language === 'fr' ? 'FR' : 'US'}
      </span>
    </button>
  )
}
