'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { Dictionary } from '@/lib/i18n/types'
import type { Lang } from '@/lib/i18n/config'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import ChatPreview from '@/components/ChatPreview'
import ExperienceGrid from '@/components/ExperienceGrid'
import Footer from '@/components/Footer'

const JobMatcher = dynamic(() => import('@/components/JobMatcher'), { ssr: false })

interface HomeProps {
  dictionary: Dictionary
  locale: Lang
}

export default function Home({ dictionary, locale }: HomeProps) {
  const [csrfToken] = useState<string>(() => {
    if (typeof document === 'undefined') return ''
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  })
  const [jobMatcherOpen, setJobMatcherOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header dictionary={dictionary} lang={locale} />

      <div className="w-full pt-16">
        <Hero dictionary={dictionary} />
        <ChatPreview csrfToken={csrfToken} dictionary={dictionary} />
        <ExperienceGrid dictionary={dictionary} lang={locale} onOpenJobMatcher={() => setJobMatcherOpen(true)} />
        <Footer dictionary={dictionary} lang={locale} />
      </div>

      {jobMatcherOpen && (
        <JobMatcher isOpen onClose={() => setJobMatcherOpen(false)} dictionary={dictionary} locale={locale} />
      )}
    </div>
  )
}
