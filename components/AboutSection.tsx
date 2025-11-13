'use client'

import { useState, useEffect } from 'react'
import JobMatcher from './JobMatcher'
import { useLanguage } from '@/lib/LanguageContext'
import { getTranslation } from '@/lib/translations'

interface AboutSectionProps {
  onQuestionClick: (question: string) => void // Callback to notify parent when a question is clicked
}

/**
 * "About" section with personal information and suggested questions
 * Suggested questions are clickable and automatically fill the chat input field
 */
export default function AboutSection({ onQuestionClick }: AboutSectionProps) {
  const { language } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  const [showJobMatcher, setShowJobMatcher] = useState(false)
  // Initialize dark mode by checking document at render time
  const [isDarkMode, setIsDarkMode] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  )

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showJobMatcher) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showJobMatcher])

  // Detect dark mode changes via MutationObserver
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      setIsDarkMode(isDark)
    })

    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">{t('about.title')}</h2>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">

          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            KSD
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('about.name')}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('about.subtitle')}</p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {t('about.description')}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{t('about.keySkills')}</h4>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full">
              Prompting
            </span>
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs rounded-full">
              Agentic Coding
            </span>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs rounded-full">
              RAG
            </span>
            <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs rounded-full">
              Agent AI
            </span>
            <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-xs rounded-full">
              n8n
            </span>
            <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-xs rounded-full">
              Embedding
            </span>
          </div>
        </div>

        {/* Clickable suggested questions */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-2">{t('about.suggestedQuestions')}</h4>
          <div className="space-y-2 text-xs">
            {/* Each question calls onQuestionClick to fill the chat input field */}
            <p
              onClick={() => onQuestionClick(t('about.suggestedQ1'))}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
            >
              {t('about.suggestedQ1')}
            </p>
            <p
              onClick={() => onQuestionClick(t('about.suggestedQ2'))}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
            >
              {t('about.suggestedQ2')}
            </p>
            <p
              onClick={() => onQuestionClick(t('about.suggestedQ3'))}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
            >
              {t('about.suggestedQ3')}
            </p>
            <p
              onClick={() => onQuestionClick(t('about.suggestedQ4'))}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
            >
              {t('about.suggestedQ4')}
            </p>
          </div>
        </div>

        {/* Job Matcher Button */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <button
            onClick={() => setShowJobMatcher(true)}
            style={{ backgroundColor: isDarkMode ? '#334155' : '#1e293b' }}
            className="group w-full flex items-center justify-center gap-2 text-white font-semibold px-4 py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#0f172a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#1e293b'}
          >
            <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-semibold" style={{ color: '#ffffff' }}>{t('about.matchJobButton')}</span>
          </button>
          <p className="text-xs text-slate-600 dark:text-slate-400 text-center mt-2">
            {t('about.matchJobDescription')}
          </p>
        </div>

        {/* Email contact button - Placed at the bottom of the section */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <a
            href={`mailto:dokkimsan@gmail.com?subject=${encodeURIComponent(t('about.contactSubject'))}&body=${encodeURIComponent(t('about.contactBody'))}`}
            style={{ backgroundColor: isDarkMode ? '#334155' : '#1e293b' }}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold px-4 py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#0f172a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#1e293b'}
          >
            <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span style={{ color: '#ffffff' }}>{t('about.contactButton')}</span>
          </a>
        </div>
      </div>

      {/* Job Matcher Modal */}
      <JobMatcher isOpen={showJobMatcher} onClose={() => setShowJobMatcher(false)} />
    </div>
  )
}