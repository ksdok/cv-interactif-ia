'use client'

import { useLanguage } from '@/lib/LanguageContext'
import { getTranslation } from '@/lib/translations'

interface SideMenuProps {
  onMatchJobClick: () => void
}

export default function SideMenu({ onMatchJobClick }: SideMenuProps) {
  const { language } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  return (
    <div className="hidden md:flex md:w-64 bg-slate-900 border-r border-slate-700 flex-col p-4 h-screen">
      {/* Match Job Button - Minimalist style like Perplexity */}
      <button
        onClick={onMatchJobClick}
        className="w-full px-4 py-2 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-all text-sm flex items-center justify-center gap-2 bg-transparent hover:bg-slate-800/50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        {t('about.matchJobButton')}
      </button>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 text-center">
          {language === 'fr'
            ? 'Menu'
            : 'Menu'}
        </p>
      </div>
    </div>
  )
}
