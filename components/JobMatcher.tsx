'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ApiErrorCode, Dictionary } from '@/lib/i18n/types'
import type { Lang } from '@/lib/i18n/config'

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
  dictionary: Dictionary
  locale: Lang
}

export default function JobMatcher({ isOpen, onClose, dictionary, locale }: JobMatcherProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<JobMatchResult | null>(null)
  const [error, setError] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const handleReset = useCallback(() => {
    setJobDescription('')
    setResult(null)
    setError('')
  }, [])

  const handleClose = useCallback(() => {
    handleReset()
    onClose()
  }, [handleReset, onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.addEventListener('keydown', handleKeyDown)
      
      // Small timeout to ensure modal is rendered
      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector('textarea, button, input') as HTMLElement
        if (firstInput) firstInput.focus()
      }, 50)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleClose])

  // Return focus on close
  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [isOpen])

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError(dictionary.jobMatcher.errors.empty)
      return
    }

    if (jobDescription.length > 10000) {
      setError(dictionary.jobMatcher.errors.tooLong)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const csrfTokenElement = document.querySelector('meta[name="csrf-token"]')
      const csrfToken = csrfTokenElement ? csrfTokenElement.getAttribute('content') : null

      if (!csrfToken) {
        setError(dictionary.jobMatcher.errors.csrfMissing)
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/job-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        // GEO-08b : la locale de l'UI est transmise à l'API (au lieu du 'en' en
        // dur). NB : la route ignore encore ce champ — l'analyse EN reste
        // assumée jusqu'à la localisation de l'analyse IA (GEO-08g adjacent).
        body: JSON.stringify({ jobDescription, language: locale }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Review M4 : mapping errorCode -> message localisé, fallback message API.
        const mapped = typeof data.errorCode === 'string'
          ? dictionary.apiErrors[data.errorCode as ApiErrorCode]
          : undefined
        throw new Error(mapped ?? data.error ?? dictionary.jobMatcher.errors.apiFallback)
      }

      setResult(data)
      setJobDescription('')
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : dictionary.jobMatcher.errors.unexpected)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-xl"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-matcher-title"
      ref={modalRef}
    >
      <div className="bg-surface-container-lowest rounded-lg shadow-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto" tabIndex={-1}>
        {/* Header */}
        <div className="sticky top-0 bg-surface-container-lowest p-6 flex items-center justify-between">
          <div>
            <span className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold">{dictionary.jobMatcher.aiLabel}</span>
            <h2 id="job-matcher-title" className="text-2xl font-bold text-on-surface mt-1">{dictionary.jobMatcher.title}</h2>
          </div>
          <button
            onClick={handleClose}
            aria-label={dictionary.jobMatcher.closeAria}
            className="text-secondary hover:text-on-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-8">
          {!result ? (
            // Input form
            <div className="space-y-6">
              <div>
                <label htmlFor="job-desc" className="block text-[0.7rem] uppercase tracking-widest text-secondary font-semibold mb-3">
                  {dictionary.jobMatcher.descLabel}
                </label>
                <textarea
                  id="job-desc"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value.slice(0, 5000))}
                  placeholder={dictionary.jobMatcher.descPlaceholder}
                  className="w-full h-40 sm:h-48 px-6 py-4 bg-surface-container-low text-on-surface placeholder:text-[#5f5e5e] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none text-[max(16px,1rem)] leading-relaxed"
                  disabled={isLoading}
                  maxLength={5000}
                />
                <p className="text-xs text-secondary mt-2">
                  {jobDescription.length}{dictionary.jobMatcher.charsCount}
                </p>
              </div>

              {error && (
                <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isLoading || !jobDescription.trim()}
                className="w-full bg-primary text-on-primary font-semibold px-6 py-4 rounded-full transition-all disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{dictionary.jobMatcher.analyzing}</span>
                  </div>
                ) : (
                  dictionary.jobMatcher.analyzeCta
                )}
              </button>
            </div>
          ) : (
            // Results view
            <div className="space-y-8">
              {/* Score cards — no borders, surface color shift */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container rounded-lg p-5">
                  <p className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold mb-2">{dictionary.jobMatcher.overall}</p>
                  <p className="text-4xl font-bold text-on-surface">{result.overallMatch}%</p>
                </div>
                <div className="bg-surface-container rounded-lg p-5">
                  <p className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold mb-2">{dictionary.jobMatcher.skills}</p>
                  <p className="text-4xl font-bold text-on-surface">{result.skillsMatch}%</p>
                </div>
                <div className="bg-surface-container rounded-lg p-5">
                  <p className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold mb-2">{dictionary.jobMatcher.experience}</p>
                  <p className="text-4xl font-bold text-on-surface">{result.experienceMatch}%</p>
                </div>
              </div>

              <div>
                <p className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold mb-3">{dictionary.jobMatcher.analysis}</p>
                <p className="text-on-surface leading-relaxed text-sm">{result.analysis}</p>
              </div>

              {result.strengths.length > 0 && (
                <div>
                  <p className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold mb-3">{dictionary.jobMatcher.strengths}</p>
                  <ul className="space-y-2">
                    {result.strengths.map((strength, idx) => (
                      <li key={idx} className="text-on-surface text-sm flex gap-3">
                        <span className="text-secondary shrink-0">—</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.improvements.length > 0 && (
                <div>
                  <p className="text-[0.7rem] uppercase tracking-widest text-secondary font-semibold mb-3">{dictionary.jobMatcher.improvements}</p>
                  <ul className="space-y-2">
                    {result.improvements.map((improvement, idx) => (
                      <li key={idx} className="text-on-surface text-sm flex gap-3">
                        <span className="text-secondary shrink-0">—</span>
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleReset}
                  className="flex-1 bg-primary text-on-primary font-semibold px-6 py-3 rounded-full transition-all active:scale-95 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                >
                  {dictionary.jobMatcher.anotherCta}
                </button>
                <a
                  href={`mailto:dokkimsan@gmail.com?subject=Job%20Match%20Analysis%20Results&body=Hello%20Kim-san,%0A%0AI%20have%20analyzed%20the%20profile%20with%20the%20job%20description%20and%20would%20like%20to%20discuss%20the%20results:%0A%0AOverall%20Match:%20${result.overallMatch}%25%0ASkills%20Match:%20${result.skillsMatch}%25%0AExperience%20Match:%20${result.experienceMatch}%25%0A%0AAnalysis:%0A${encodeURIComponent(result.analysis)}%0A%0AStrengths:%0A${result.strengths.join('%0A')}%0A%0AAreas%20for%20Improvement:%0A${result.improvements.join('%0A')}%0A%0AI%20look%20forward%20to%20hearing%20from%20you.`}
                  className="flex-1 flex items-center justify-center bg-primary text-on-primary font-semibold px-6 py-3 rounded-full transition-all active:scale-95 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                >
                  {dictionary.jobMatcher.contactCta}
                </a>
                <button
                  onClick={handleClose}
                  className="flex-1 bg-surface-container text-on-surface font-semibold px-6 py-3 rounded-full transition-all active:scale-95 hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                >
                  {dictionary.jobMatcher.closeCta}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
