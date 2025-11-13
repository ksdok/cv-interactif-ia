'use client'

import { useLanguage } from '@/lib/LanguageContext'

/**
 * Language toggle button component
 * Switches between French (FR flag) and English (EN flag)
 * Displays current language and allows switching
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
      <span className="inline-block w-5 h-5 flex items-center justify-center text-sm font-bold">
        {language === 'fr' ? '🇫🇷' : '🇬🇧'}
      </span>
    </button>
  )
}
