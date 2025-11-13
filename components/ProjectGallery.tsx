'use client'

import { useLanguage } from '@/lib/LanguageContext'
import { getTranslation } from '@/lib/translations'

export default function ProjectGallery() {
  const { language } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
        {t('techStack.title')}
      </h2>

      <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {t('techStack.frontend')}
          </h3>
          <p className="text-xs">
            {t('techStack.frontendDesc')}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {t('techStack.ai')}
          </h3>
          <p className="text-xs">
            {t('techStack.aiDesc')}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {t('techStack.rag')}
          </h3>
          <p className="text-xs">
            {t('techStack.ragDesc')}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {t('techStack.ragEnrichment')}
          </h3>
          <p className="text-xs">
            {t('techStack.ragEnrichmentDesc')}
          </p>
        </div>
      </div>
    </div>
  )
}