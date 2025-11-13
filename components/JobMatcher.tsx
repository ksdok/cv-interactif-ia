'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/LanguageContext'
import { getTranslation } from '@/lib/translations'

interface JobMatchResult {
  overallMatch: number
  skillsMatch: number
  experienceMatch: number
  analysis: string
  strengths: string[]
  improvements: string[]
}

interface JobMatcherProps {
  isOpen: boolean
  onClose: () => void
}

export default function JobMatcher({ isOpen, onClose }: JobMatcherProps) {
  const { language } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<JobMatchResult | null>(null)
  const [error, setError] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)


  // Detect dark mode
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setIsDarkMode(isDark)

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      setIsDarkMode(isDark)
    })

    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

  // Detect language of job description (simple heuristic)
  const detectJobDescriptionLanguage = (text: string): 'en' | 'fr' => {
    // Count French-specific words
    const frenchWords = ['le ', 'la ', 'les ', 'de ', 'du ', 'et ', 'ou ', 'que ', 'qui ', 'pour ', 'avec ', 'par ', 'sur ', 'dans ', 'à ']
    const englishWords = ['the ', 'a ', 'and ', 'or ', 'but ', 'in ', 'on ', 'at ', 'to ', 'for ', 'with ', 'by ', 'from ', 'is ', 'are ']

    const lowerText = text.toLowerCase()

    const frenchCount = frenchWords.filter(word => lowerText.includes(word)).length
    const englishCount = englishWords.filter(word => lowerText.includes(word)).length

    // If significantly more English words, return 'en', otherwise default to 'fr'
    return englishCount > frenchCount * 1.5 ? 'en' : 'fr'
  }

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError(t('jobMatcher.errorEmptyDescription'))
      return
    }

    if (jobDescription.length > 10000) {
      setError(t('jobMatcher.errorTooLong'))
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // SECURITY: Extract CSRF token from meta tag for request
      const csrfTokenElement = document.querySelector('meta[name="csrf-token"]')
      const csrfToken = csrfTokenElement ? csrfTokenElement.getAttribute('content') : null

      if (!csrfToken) {
        setError('Security error: CSRF token not found. Please refresh the page.')
        setIsLoading(false)
        return
      }

      // Detect job description language
      const jobDescriptionLanguage = detectJobDescriptionLanguage(jobDescription)

      const response = await fetch('/api/job-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ jobDescription, language: jobDescriptionLanguage }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('jobMatcher.errorMessage'))
      }

      setResult(data)
      setJobDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('jobMatcher.errorMessage'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setJobDescription('')
    setResult(null)
    setError('')
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking on the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-2xl"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 opacity-100">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('jobMatcher.title')}</h2>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!result ? (
            // Input form
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {t('jobMatcher.jobDescriptionLabel')}
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder={t('jobMatcher.jobDescriptionPlaceholder')}
                  className="w-full h-32 sm:h-40 lg:h-48 px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isLoading}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {jobDescription.length}/10 000 {t('jobMatcher.characterCount')}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isLoading || !jobDescription.trim()}
                style={{
                  backgroundColor: isDarkMode ? '#334155' : '#0f172a',
                  color: '#ffffff'
                }}
                className="w-full font-semibold px-4 py-3 rounded-lg transition-all duration-300 disabled:cursor-not-allowed cursor-pointer disabled:opacity-50 active:scale-95 active:opacity-75 sm:hover:scale-105"
                onMouseEnter={(e) => {
                  if (!isLoading && jobDescription.trim()) {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#1a1f3a'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#0f172a'
                }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 spinner" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t('jobMatcher.analyzing')}</span>
                  </div>
                ) : (
                  t('jobMatcher.analyzeButton')
                )}
              </button>
            </div>
          ) : (
            // Results view
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-semibold mb-1">{t('jobMatcher.overallMatch')}</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{result.overallMatch}%</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-semibold mb-1">{t('jobMatcher.skillsMatch')}</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{result.skillsMatch}%</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-semibold mb-1">{t('jobMatcher.experienceMatch')}</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{result.experienceMatch}%</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('jobMatcher.analysis')}</h3>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{result.analysis}</p>
              </div>

              {result.strengths.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <span className="text-green-600 dark:text-green-400">✓</span> {t('jobMatcher.strengths')}
                  </h3>
                  <ul className="space-y-1">
                    {result.strengths.map((strength, idx) => (
                      <li key={idx} className="text-slate-700 dark:text-slate-300 text-sm flex gap-2">
                        <span className="text-green-600 dark:text-green-400 font-bold">-</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.improvements.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400">→</span> {t('jobMatcher.improvements')}
                  </h3>
                  <ul className="space-y-1">
                    {result.improvements.map((improvement, idx) => (
                      <li key={idx} className="text-slate-700 dark:text-slate-300 text-sm flex gap-2">
                        <span className="text-amber-600 dark:text-amber-400 font-bold">-</span>
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleReset}
                  style={{
                    backgroundColor: isDarkMode ? '#334155' : '#0f172a',
                    color: '#ffffff'
                  }}
                  className="flex-1 font-semibold px-4 py-2 rounded-lg transition-all active:scale-95 active:opacity-75 sm:hover:scale-105 cursor-pointer"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#1a1f3a'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#0f172a'
                  }}
                >
                  {t('jobMatcher.analyzeAnother')}
                </button>
                <a
                  href={`mailto:dokkimsan@gmail.com?subject=${encodeURIComponent(t('jobMatcher.contactSubject'))}&body=${encodeURIComponent(
                    language === 'fr'
                      ? `Bonjour Kim-san,\n\nJ'ai analysé le profil avec la description de poste et j'aimerais discuter des résultats:\n\nCorrespondance Globale: ${result.overallMatch}%\nCorrespondance Compétences: ${result.skillsMatch}%\nCorrespondance Expérience: ${result.experienceMatch}%\n\nAnalyse:\n${result.analysis}\n\nPoints Forts:\n${result.strengths.join('\n')}\n\nDomaines à Développer:\n${result.improvements.join('\n')}\n\nJ'attends votre retour.`
                      : `Hello Kim-san,\n\nI have analyzed the profile with the job description and would like to discuss the results:\n\nOverall Match: ${result.overallMatch}%\nSkills Match: ${result.skillsMatch}%\nExperience Match: ${result.experienceMatch}%\n\nAnalysis:\n${result.analysis}\n\nStrengths:\n${result.strengths.join('\n')}\n\nAreas for Improvement:\n${result.improvements.join('\n')}\n\nI look forward to hearing from you.`
                  )}`}
                  style={{
                    backgroundColor: isDarkMode ? '#334155' : '#0f172a',
                    color: '#ffffff'
                  }}
                  className="flex-1 flex items-center justify-center font-semibold px-4 py-2 rounded-lg transition-all active:scale-95 active:opacity-75 sm:hover:scale-105 cursor-pointer"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#1a1f3a'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#0f172a'
                  }}
                >
                  {t('jobMatcher.contactButton')}
                </a>
                <button
                  onClick={handleClose}
                  style={{
                    backgroundColor: isDarkMode ? '#334155' : '#0f172a',
                    color: '#ffffff'
                  }}
                  className="flex-1 font-semibold px-4 py-2 rounded-lg transition-all active:scale-95 active:opacity-75 sm:hover:scale-105 cursor-pointer"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#1a1f3a'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#0f172a'
                  }}
                >
                  {t('jobMatcher.closeButton')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
