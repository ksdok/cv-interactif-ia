'use client'

import ThemeToggle from './ThemeToggle'
import LanguageToggle from './LanguageToggle'
import { useLanguage } from '@/lib/LanguageContext'
import { getTranslation } from '@/lib/translations'

export default function Header() {
  const { language } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center gap-4">
        <div className="flex-1 min-w-0">
          {/* Mobile version */}
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100">
            <span className="block sm:hidden">{t('header.titleMobile')}</span>
            <span className="hidden sm:block lg:hidden">{t('header.titleTablet')}</span>
            <span className="hidden lg:block">{t('header.titleDesktop')}</span>
          </h1>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
